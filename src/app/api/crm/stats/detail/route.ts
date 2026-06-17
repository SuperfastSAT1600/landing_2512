import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { buildStatsDetail, isStatsDetailMetric } from '@/lib/crm-stats-detail';

const err = (code: string, message: string, status: number) =>
  NextResponse.json({ error: { code, message } }, { status });

/**
 * GET /api/crm/stats/detail?metric=<m>&from=YYYY-MM-DD&to=YYYY-MM-DD
 * 오버뷰 카드 드릴다운: 집계 라우트와 동일 기준의 원본 목록을 반환.
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) return err('UNAUTHORIZED', '인증이 필요합니다.', 401);

  const { searchParams } = new URL(request.url);
  const metric = searchParams.get('metric') ?? '';
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) return err('MISSING_PARAMS', 'from, to 파라미터가 필요합니다.', 400);
  if (!isStatsDetailMetric(metric)) return err('BAD_METRIC', `알 수 없는 metric: ${metric}`, 400);

  // 기간 내 신규 리드 (집계 라우트와 동일한 필터)
  const { data: students, error: sErr } = await supabaseAdmin
    .from('students')
    .select(
      'id, name, funnel_stage, stage_history, lead_status, traffic_source, inquiry_date, created_at, retry_strategy_id'
    )
    .or(`inquiry_date.gte.${from},and(inquiry_date.is.null,created_at.gte.${from})`)
    .or(`inquiry_date.lte.${to},and(inquiry_date.is.null,created_at.lte.${to})`);

  if (sErr) return err('FETCH_FAILED', sErr.message, 500);

  // 기간 내 결제/환불 행
  const { data: payments, error: pErr } = await supabaseAdmin
    .from('payments')
    .select('id, student_id, student_name, product, amount, payment_type, tax_type, paid_at, created_by')
    .gte('paid_at', `${from}T00:00:00`)
    .lte('paid_at', `${to}T23:59:59`)
    .order('paid_at', { ascending: true });

  if (pErr) return err('FETCH_FAILED', pErr.message, 500);

  const result = buildStatsDetail(metric, students ?? [], payments ?? []);
  return NextResponse.json({ data: result });
}
