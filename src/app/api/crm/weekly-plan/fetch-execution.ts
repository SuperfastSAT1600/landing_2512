import { supabaseAdmin } from '@/lib/supabase-admin';
import { MAX_LEAD_ROWS } from '@/lib/crm-stats-core';
import {
  computeWeeklyExecution,
  type WeeklyExecutionPayment,
  type WeeklyExecutionStudent,
  type WeeklyFocusRef,
} from '@/lib/weekly-execution';
import type { WeeklyExecutionRow, WeeklyPlanSegment } from '@/types/crm';

// 주간 실행 집계용 조회 — 순수 계산은 lib/weekly-execution.ts.
// 선례: api/crm/strategy-stats/route.ts (같은 후보 리드 조회·청크 결제 조회 패턴).

const STUDENT_COLS =
  'id,name,funnel_stage,created_at,stage_history,strategy_history,retry_strategy_id,retry_assigned_at,company_id';
const PAY_COLS = 'id,student_id,student_name,amount,payment_type,paid_at';

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** 세그먼트 코호트: b2b=업체 연결 리드, b2c=업체 미연결 (stats·strategy-stats와 동일 규칙). */
function filterSegment<T extends { company_id?: string | null }>(rows: T[], segment: WeeklyPlanSegment): T[] {
  return segment === 'b2b' ? rows.filter((r) => r.company_id != null) : rows.filter((r) => r.company_id == null);
}

export async function fetchWeeklyExecution(
  segment: WeeklyPlanSegment,
  week: { start: string; end: string },
  focus: WeeklyFocusRef[],
): Promise<WeeklyExecutionRow[]> {
  const [studentsRes, strategiesRes] = await Promise.all([
    supabaseAdmin
      .from('students')
      .select(STUDENT_COLS)
      .or('strategy_history.neq.[],retry_strategy_id.not.is.null')
      .limit(MAX_LEAD_ROWS),
    supabaseAdmin.from('retry_strategies').select('id,name'),
  ]);

  if (studentsRes.error) {
    console.error('[weekly-plan execution students]', studentsRes.error);
    return [];
  }

  const candidates = filterSegment(
    (studentsRes.data ?? []) as unknown as (WeeklyExecutionStudent & { company_id?: string | null })[],
    segment,
  ) as WeeklyExecutionStudent[];
  if (candidates.length >= MAX_LEAD_ROWS) {
    console.warn(`[weekly-plan] 후보 리드가 MAX_LEAD_ROWS(${MAX_LEAD_ROWS})에 도달 — 집계 절단 가능`);
  }

  const strategyNames = new Map<string, string>((strategiesRes.data ?? []).map((r) => [r.id, r.name]));

  // 적용 리드의 결제 전부(anytime) — id 및 이름 매칭, 청크 병렬.
  const ids = candidates.map((s) => s.id);
  const names = [...new Set(candidates.map((s) => s.name).filter(Boolean))];
  const payChunks = await Promise.all([
    ...chunk(ids, 150).map((c) => supabaseAdmin.from('payments').select(PAY_COLS).in('student_id', c)),
    ...chunk(names, 150).map((c) => supabaseAdmin.from('payments').select(PAY_COLS).in('student_name', c)),
  ]);
  const paymentMap = new Map<string, WeeklyExecutionPayment & { id: string }>();
  for (const { data } of payChunks) {
    for (const p of (data ?? []) as (WeeklyExecutionPayment & { id: string })[]) paymentMap.set(p.id, p);
  }

  return computeWeeklyExecution(candidates, [...paymentMap.values()], week, strategyNames, focus);
}
