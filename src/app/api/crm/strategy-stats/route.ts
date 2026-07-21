import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { MAX_LEAD_ROWS } from '@/lib/crm-stats-core';
import {
  computeStrategyStats,
  type StrategyStatsStudent,
  type StrategyStatsPayment,
  type StrategyTypeStats,
} from '@/lib/strategy-stats';
import type { StrategyHistoryType } from '@/types/crm';

export type { StrategyTypeStats };

const VALID_TYPES: StrategyHistoryType[] = ['initial_contact', 'initial_sales', 'retry'];
const VALID_SEGMENTS = ['b2b', 'b2c'] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const STUDENT_COLS =
  'id,name,funnel_stage,funnel_stage_updated_at,created_at,stage_history,strategy_history,retry_strategy_id,retry_assigned_at,company_id';

// segment 코호트 필터: b2b=업체 연결 리드, b2c=업체 미연결. 없으면 전체.
function filterSegment<T extends { company_id?: string | null }>(rows: T[], segment: string | null): T[] {
  if (segment === 'b2b') return rows.filter((r) => r.company_id != null);
  if (segment === 'b2c') return rows.filter((r) => r.company_id == null);
  return rows;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * GET /api/crm/strategy-stats?type=<initial_contact|initial_sales|retry>&from=YYYY-MM-DD&to=YYYY-MM-DD
 * 세일즈 로직(전략) 타입별 롤업 + 개별 전략 통계. 코호트 기준일 = strategy_history.applied_at.
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sp = new URL(request.url).searchParams;
  const type = sp.get('type') as StrategyHistoryType | null;
  const from = sp.get('from');
  const to = sp.get('to');
  const segment = sp.get('segment');

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: 'type은 initial_contact|initial_sales|retry 중 하나여야 합니다.' }, { status: 400 });
  }
  if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json({ error: 'from/to는 YYYY-MM-DD 형식이어야 합니다.' }, { status: 400 });
  }
  if (segment && !(VALID_SEGMENTS as readonly string[]).includes(segment)) {
    return NextResponse.json({ error: 'segment은 b2b|b2c 중 하나여야 합니다.' }, { status: 400 });
  }

  // ── 전략 배정 이력이 있는 후보 리드 조회 ──
  const { data: students, error: sErr } = await supabaseAdmin
    .from('students')
    .select(STUDENT_COLS)
    .or('strategy_history.neq.[],retry_strategy_id.not.is.null')
    .limit(MAX_LEAD_ROWS);

  if (sErr) {
    console.error('[strategy-stats students]', sErr);
    return NextResponse.json({ error: '리드 데이터를 불러오지 못했습니다.' }, { status: 500 });
  }
  // segment(b2b/b2c) 코호트 pre-filter — computeStrategyStats lib은 무변경
  const candidates = filterSegment(
    (students ?? []) as unknown as (StrategyStatsStudent & { company_id?: string | null })[],
    segment,
  ) as StrategyStatsStudent[];
  if (candidates.length >= MAX_LEAD_ROWS) {
    console.warn(`[strategy-stats] 후보 리드가 MAX_LEAD_ROWS(${MAX_LEAD_ROWS})에 도달 — 집계 절단 가능`);
  }

  // ── 해당 타입 전략 이름 맵 (0건 전략 시드 포함) ──
  const { data: strategies } = await supabaseAdmin
    .from('retry_strategies')
    .select('id,name')
    .eq('type', type);
  const strategyNames = new Map<string, string>((strategies ?? []).map((r) => [r.id, r.name]));

  // ── 후보 리드의 결제 전부(anytime) 조회 — id 및 name 매칭 ──
  const ids = candidates.map((s) => s.id);
  const names = [...new Set(candidates.map((s) => s.name).filter(Boolean))];
  const paymentMap = new Map<string, StrategyStatsPayment & { id: string }>();

  const pushPayments = (rows: (StrategyStatsPayment & { id: string })[] | null) => {
    for (const p of rows ?? []) paymentMap.set(p.id, p);
  };

  for (const c of chunk(ids, 150)) {
    const { data } = await supabaseAdmin
      .from('payments')
      .select('id,student_id,student_name,amount,payment_type,tax_type,paid_at')
      .in('student_id', c);
    pushPayments(data as (StrategyStatsPayment & { id: string })[] | null);
  }
  for (const c of chunk(names, 150)) {
    const { data } = await supabaseAdmin
      .from('payments')
      .select('id,student_id,student_name,amount,payment_type,tax_type,paid_at')
      .in('student_name', c);
    pushPayments(data as (StrategyStatsPayment & { id: string })[] | null);
  }
  const payments = [...paymentMap.values()];

  const data = computeStrategyStats(type, candidates, payments, { from, to }, strategyNames);

  return NextResponse.json({ data });
}
