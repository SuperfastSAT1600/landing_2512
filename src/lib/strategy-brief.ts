/**
 * 선제 진단용 공유 헬퍼 — strategy-agent(proactive)와 insight-brief 엔드포인트가 공유.
 * 기간 윈도우·정체 집계·health 스냅샷 로직의 단일 소스.
 */
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isStageStalled, FUNNEL_STAGE_LABELS, kstDateStr, type FunnelStage } from '@/types/crm';
import { buildHealthSnapshot, type StalledCount, type HealthSnapshot } from '@/lib/strategy-health';
import type { CrmStatsData } from '@/app/api/crm/stats/route';

/**
 * 해당월(이번 달) 기준 기간 + 추세 비교용 직전 달 동기간(같은 일자까지).
 * 예: 오늘이 6/19면 current = 6/1~6/19, previous = 5/1~5/19.
 */
function monthRanges(todayStr: string) {
  const [y, m, d] = todayStr.split('-').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  const pY = m === 1 ? y - 1 : y;
  const pM = m === 1 ? 12 : m - 1;
  const prevLastDay = new Date(pY, pM, 0).getDate(); // pM은 1-indexed → 해당 월 말일
  return {
    curFrom: `${y}-${pad(m)}-01`,
    curTo: todayStr,
    prevFrom: `${pY}-${pad(pM)}-01`,
    prevTo: `${pY}-${pad(pM)}-${pad(Math.min(d, prevLastDay))}`,
    periodDays: d,
  };
}

/** 같은 서버의 stats 엔드포인트를 내부 호출해 기간별 지표를 가져온다. */
export async function fetchStatsPeriod(
  origin: string,
  adminKey: string,
  from: string,
  to: string
): Promise<CrmStatsData | null> {
  try {
    const res = await fetch(`${origin}/api/crm/stats?from=${from}&to=${to}`, {
      headers: { 'x-admin-key': adminKey },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? null) as CrmStatsData | null;
  } catch {
    return null;
  }
}

/** 진행 중(active) 리드 중 단계 SLA를 초과한 정체 리드를 단계별로 집계. */
export async function fetchStalledCounts(): Promise<StalledCount[]> {
  const { data } = await supabaseAdmin
    .from('students')
    .select('funnel_stage, funnel_stage_updated_at, created_at')
    .eq('lead_status', 'active');
  const now = Date.now();
  const map = new Map<string, number>();
  for (const s of data ?? []) {
    if (isStageStalled(s as { funnel_stage: FunnelStage; funnel_stage_updated_at: string | null; created_at: string }, now)) {
      map.set(s.funnel_stage, (map.get(s.funnel_stage) ?? 0) + 1);
    }
  }
  return [...map.entries()].map(([stage, count]) => ({
    stage: stage as FunnelStage,
    label: FUNNEL_STAGE_LABELS[stage as FunnelStage] ?? stage,
    count,
  }));
}

/** 해당월(이번 달, 1일~오늘) 지표 + 직전 달 동기간 비교 + 정체 리드로 KPI 건강 스냅샷 구성. stats 실패 시 null. */
export async function buildBriefHealth(origin: string, adminKey: string): Promise<HealthSnapshot | null> {
  const today = kstDateStr(Date.now());
  const r = monthRanges(today);
  const [current, previous, stalled] = await Promise.all([
    fetchStatsPeriod(origin, adminKey, r.curFrom, r.curTo),
    fetchStatsPeriod(origin, adminKey, r.prevFrom, r.prevTo),
    fetchStalledCounts(),
  ]);
  if (!current || !previous) return null;
  return buildHealthSnapshot({
    current,
    previous,
    stalled,
    periodDays: r.periodDays,
    periodLabel: `이번 달(1일~오늘, ${r.periodDays}일차) vs 지난 달 같은 기간`,
  });
}
