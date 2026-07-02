/**
 * 선제 진단용 공유 헬퍼 — strategy-agent(proactive)와 insight-brief 엔드포인트가 공유.
 * 기간 윈도우·정체 집계·health 스냅샷 로직의 단일 소스.
 */
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isStageStalled, FUNNEL_STAGE_LABELS, kstDateStr, effectiveLeadTier, type FunnelStage, type TrafficSource, type LeadTier, type InsightPeriod } from '@/types/crm';
import { buildHealthSnapshot, type StalledCount, type HealthSnapshot } from '@/lib/strategy-health';
import { buildCorrelationBlock, type CorrelationStudent } from '@/lib/strategy-correlations';
import type { CrmStatsData } from '@/app/api/crm/stats/route';
import { parseISO, addDays, differenceInCalendarDays, format } from 'date-fns';

interface PeriodRange {
  curFrom: string;
  curTo: string;
  prevFrom: string;
  prevTo: string;
  periodDays: number;
  periodLabel: string;
}

/**
 * 해당월(이번 달) 기준 기간 + 추세 비교용 직전 달 동기간(같은 일자까지).
 * 예: 오늘이 6/19면 current = 6/1~6/19, previous = 5/1~5/19.
 */
function monthRanges(todayStr: string): PeriodRange {
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
    periodLabel: `이번 달(1일~오늘, ${d}일차) vs 지난 달 같은 기간`,
  };
}

/**
 * 사용자가 고른 임의 기간 → current 구간 + 직전 '동일 길이' 구간 비교.
 * 예: 6/1~6/30(30일) 선택 시 previous = 5/2~5/31(직전 30일).
 * period 미지정이면 monthRanges(오늘) 기본으로 폴백.
 */
export function resolvePeriod(period?: InsightPeriod): PeriodRange {
  if (!period?.from || !period?.to) return monthRanges(kstDateStr(Date.now()));
  const fromD = parseISO(period.from);
  const toD = parseISO(period.to);
  const len = differenceInCalendarDays(toD, fromD) + 1; // 양끝 포함 일수
  const prevTo = addDays(fromD, -1);
  const prevFrom = addDays(prevTo, -(len - 1));
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
  return {
    curFrom: period.from,
    curTo: period.to,
    prevFrom: fmt(prevFrom),
    prevTo: fmt(prevTo),
    periodDays: len,
    periodLabel: `${period.from}~${period.to} (${len}일) vs 직전 ${len}일(${fmt(prevFrom)}~${fmt(prevTo)})`,
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 요청 본문에서 분석 기간(from/to)을 파싱·검증. 형식 불량·from>to·미지정이면 undefined
 * (→ buildBriefHealth/buildMemoSignals가 이번 달 기본으로 폴백).
 */
export function parsePeriod(body: unknown): InsightPeriod | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const { from, to } = body as { from?: unknown; to?: unknown };
  if (typeof from !== 'string' || typeof to !== 'string') return undefined;
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) return undefined;
  if (from > to) return undefined;
  return { from, to };
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

/**
 * 선택 기간(없으면 이번 달, 1일~오늘) 지표 + 직전 동일 길이 구간 비교 + 정체 리드로
 * KPI 건강 스냅샷 구성. stats 실패 시 null.
 */
export async function buildBriefHealth(
  origin: string,
  adminKey: string,
  period?: InsightPeriod
): Promise<HealthSnapshot | null> {
  const r = resolvePeriod(period);
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
    periodLabel: r.periodLabel,
  });
}

const CORR_COLS =
  'id, name, lead_status, funnel_stage, stage_history, lead_tier, traffic_source, target_score, target_test_date, last_contacted_at, inquiry_date, first_message_sent_at, consultation_timeline';

type CorrStudentRow = Pick<
  CorrelationStudent,
  'id' | 'lead_status' | 'funnel_stage' | 'stage_history' | 'inquiry_date' | 'first_message_sent_at'
> & {
  name: string | null;
  lead_tier: LeadTier | null;
  traffic_source: TrafficSource | null;
  target_score: number | null;
  target_test_date: string | null;
  last_contacted_at: string | null;
  consultation_timeline: unknown[] | null;
};

/**
 * 교차 상관/이상치 신호 블록을 만든다(I/O). 표본 확보를 위해 KPI(이번 달)보다 넓은 최근 90일 인입 코호트.
 * '코드 산출 상관 후보'로 명시 — 모수 정렬 주장이 아니라 표본 충분한 패턴 발견용. 실패 시 빈 문자열 degrade.
 * 어휘 약점(진단) 상관은 진단 테이블 조인이 붙기 전까지 자동 비활성(vocab_weakness_level=null → 게이트 드롭).
 */
export async function buildCorrelationSignals(nowMs: number = Date.now()): Promise<string> {
  try {
    const windowStart = kstDateStr(nowMs - 90 * 86_400_000);
    const [studentsRes, paymentsRes] = await Promise.all([
      supabaseAdmin.from('students').select(CORR_COLS).gte('inquiry_date', windowStart),
      supabaseAdmin.from('payments').select('student_id, student_name'),
    ]);
    const studentRows = (studentsRes.data ?? []) as CorrStudentRow[];
    if (studentRows.length === 0) return '';
    const paidIds = new Set<string>();
    const paidNames = new Set<string>();
    for (const p of paymentsRes.data ?? []) {
      if (p.student_id) paidIds.add(p.student_id);
      if (p.student_name) paidNames.add(p.student_name);
    }
    const projected: CorrelationStudent[] = studentRows.map((s) => ({
      id: s.id,
      isPaid: paidIds.has(s.id) || (s.name ? paidNames.has(s.name) : false),
      lead_status: s.lead_status,
      funnel_stage: s.funnel_stage,
      stage_history: s.stage_history,
      tier: effectiveLeadTier(s, nowMs),
      consultation_timeline_len: Array.isArray(s.consultation_timeline) ? s.consultation_timeline.length : 0,
      inquiry_date: s.inquiry_date,
      first_message_sent_at: s.first_message_sent_at,
      vocab_weakness_level: null,
    }));
    return buildCorrelationBlock(projected);
  } catch (err) {
    console.error('[strategy-brief] correlation signals failed (degrading):', err);
    return '';
  }
}
