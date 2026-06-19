/**
 * 선제 진단용 공유 헬퍼 — strategy-agent(proactive)와 insight-brief 엔드포인트가 공유.
 * 기간 윈도우·정체 집계·health 스냅샷 로직의 단일 소스.
 */
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isStageStalled, FUNNEL_STAGE_LABELS, kstDateStr, type FunnelStage } from '@/types/crm';
import { buildHealthSnapshot, type StalledCount, type HealthSnapshot } from '@/lib/strategy-health';
import type { CrmStatsData } from '@/app/api/crm/stats/route';

const DAY_MS = 86400000;

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

/** 최근 30일 vs 직전 30일 + 정체 리드로 KPI 건강 스냅샷을 구성. stats 조회 실패 시 null. */
export async function buildBriefHealth(origin: string, adminKey: string): Promise<HealthSnapshot | null> {
  const now = Date.now();
  const today = kstDateStr(now);
  const [current, previous, stalled] = await Promise.all([
    fetchStatsPeriod(origin, adminKey, kstDateStr(now - 29 * DAY_MS), today),
    fetchStatsPeriod(origin, adminKey, kstDateStr(now - 59 * DAY_MS), kstDateStr(now - 30 * DAY_MS)),
    fetchStalledCounts(),
  ]);
  if (!current || !previous) return null;
  return buildHealthSnapshot({ current, previous, stalled, periodDays: 30 });
}
