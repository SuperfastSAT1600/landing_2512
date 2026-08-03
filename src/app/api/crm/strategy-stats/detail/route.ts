import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { MAX_LEAD_ROWS } from '@/lib/crm-stats-core';
import { buildStatsDetail, isStatsDetailMetric } from '@/lib/crm-stats-detail';
import { assignedStrategyOf, type StrategyStatsStudent } from '@/lib/strategy-stats';
import type { StrategyHistoryType } from '@/types/crm';

const VALID_TYPES: StrategyHistoryType[] = ['initial_contact', 'initial_sales', 'retry'];
const VALID_SEGMENTS = ['b2b', 'b2c'] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// buildStatsDetail가 요구하는 컬럼 + 귀속 판정 컬럼 + segment 필터용 company_id
const COLS =
  'id,name,funnel_stage,stage_history,lead_status,churn_tag,traffic_source,inquiry_date,created_at,strategy_history,retry_strategy_id,retry_assigned_at,company_id,consultation_timeline';

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * GET /api/crm/strategy-stats/detail?type=&strategy_id=&metric=&from=&to=
 * 특정 전략 코호트에 대한 metric별 원본 리드/결제 목록.
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sp = new URL(request.url).searchParams;
  const type = sp.get('type') as StrategyHistoryType | null;
  const strategyId = sp.get('strategy_id');
  const metric = sp.get('metric') ?? '';
  const from = sp.get('from');
  const to = sp.get('to');
  const segment = sp.get('segment');

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: 'type이 올바르지 않습니다.' }, { status: 400 });
  }
  if (segment && !(VALID_SEGMENTS as readonly string[]).includes(segment)) {
    return NextResponse.json({ error: 'segment이 올바르지 않습니다.' }, { status: 400 });
  }
  if (!strategyId) {
    return NextResponse.json({ error: 'strategy_id가 필요합니다.' }, { status: 400 });
  }
  if (!isStatsDetailMetric(metric)) {
    return NextResponse.json({ error: 'metric이 올바르지 않습니다.' }, { status: 400 });
  }
  if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json({ error: 'from/to는 YYYY-MM-DD 형식이어야 합니다.' }, { status: 400 });
  }

  const { data: students, error: sErr } = await supabaseAdmin
    .from('students')
    .select(COLS)
    .or('strategy_history.neq.[],retry_strategy_id.not.is.null')
    .limit(MAX_LEAD_ROWS);
  if (sErr) {
    console.error('[strategy-stats/detail students]', sErr);
    return NextResponse.json({ error: '리드 데이터를 불러오지 못했습니다.' }, { status: 500 });
  }

  const { data: strategies } = await supabaseAdmin
    .from('retry_strategies')
    .select('id,name')
    .eq('type', type);
  const strategyNames = new Map<string, string>((strategies ?? []).map((r) => [r.id, r.name]));

  // segment(b2b/b2c) + 이 전략 귀속 코호트만 필터
  const cohort = (students ?? [])
    .filter((s) => {
      const cid = (s as { company_id?: string | null }).company_id;
      if (segment === 'b2b') return cid != null;
      if (segment === 'b2c') return cid == null;
      return true;
    })
    .filter(
      (s) => assignedStrategyOf(s as unknown as StrategyStatsStudent, type, { from, to }, strategyNames) === strategyId
    );

  // 코호트 결제(anytime)
  const ids = cohort.map((s) => s.id);
  const names = [...new Set(cohort.map((s) => s.name).filter(Boolean))];
  const payMap = new Map<string, Record<string, unknown>>();
  for (const c of chunk(ids, 150)) {
    const { data } = await supabaseAdmin
      .from('payments')
      .select('id,student_id,student_name,product,amount,payment_type,tax_type,paid_at,created_by')
      .in('student_id', c);
    for (const p of data ?? []) payMap.set(p.id, p);
  }
  for (const c of chunk(names, 150)) {
    const { data } = await supabaseAdmin
      .from('payments')
      .select('id,student_id,student_name,product,amount,payment_type,tax_type,paid_at,created_by')
      .in('student_name', c);
    for (const p of data ?? []) payMap.set(p.id, p);
  }

  // buildStatsDetail: source 미지정(코호트는 이미 필터됨), includeRetryInContacted=true
  const data = buildStatsDetail(
    metric,
    cohort as never[],
    [...payMap.values()] as never[],
    undefined,
    { includeRetryInContacted: true }
  );

  return NextResponse.json({ data });
}
