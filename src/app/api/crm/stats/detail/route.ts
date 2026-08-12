import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { buildStatsDetail, isStatsDetailMetric } from '@/lib/crm-stats-detail';
import {
  type CrmStatsSegment,
  parseStatsSegment,
  isCrmStatsSegment,
} from '@/lib/crm-stats-core';

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
  const source = searchParams.get('source') ?? undefined; // 유입 채널 드릴다운 필터

  if (!from || !to) return err('MISSING_PARAMS', 'from, to 파라미터가 필요합니다.', 400);

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return err('INVALID_DATE', '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)', 400);
  }

  if (!isStatsDetailMetric(metric)) return err('BAD_METRIC', `알 수 없는 metric: ${metric}`, 400);

  const rawSegment = searchParams.get('segment');
  const segment: CrmStatsSegment = parseStatsSegment(rawSegment);
  if (rawSegment !== null && !isCrmStatsSegment(rawSegment)) {
    return err('INVALID_SEGMENT', 'segment는 all, b2c, b2b 중 하나여야 합니다.', 400);
  }

  // 기간 내 신규 리드 (집계 라우트와 동일한 필터)
  let studentsQuery = supabaseAdmin
    .from('students')
    .select(
      'id, name, funnel_stage, stage_history, lead_status, churn_tag, traffic_source, inquiry_date, created_at, retry_strategy_id, consultation_timeline, company_id'
    )
    .or(`inquiry_date.gte.${from},and(inquiry_date.is.null,created_at.gte.${from})`)
    .or(`inquiry_date.lte.${to}T23:59:59,and(inquiry_date.is.null,created_at.lte.${to}T23:59:59)`);
  if (segment === 'b2c') studentsQuery = studentsQuery.is('company_id', null);
  if (segment === 'b2b') studentsQuery = studentsQuery.not('company_id', 'is', null);

  const { data: students, error: sErr } = await studentsQuery;

  if (sErr) return err('FETCH_FAILED', sErr.message, 500);

  // 기간 내 결제/환불 행. students 관계를 통해 segment 분류에 필요한 company_id를 함께 조회.
  const { data: payments, error: pErr } = await supabaseAdmin
    .from('payments')
    .select(
      'id, student_id, student_name, product, amount, payment_type, tax_type, paid_at, created_by, students:student_id(company_id)'
    )
    .gte('paid_at', `${from}T00:00:00+09:00`)
    .lte('paid_at', `${to}T23:59:59.999+09:00`)
    .order('paid_at', { ascending: true });

  if (pErr) return err('FETCH_FAILED', pErr.message, 500);

  const studentList = students ?? [];
  const filteredPayments = (payments ?? []).filter((p) => {
    if (segment === 'all') return true;
    const related = (p as { students?: { company_id: string | null }[] | null }).students;
    const companyId = related?.[0]?.company_id ?? null;
    return segment === 'b2b' ? companyId != null : companyId == null;
  });

  const result = buildStatsDetail(metric, studentList, filteredPayments, source);
  return NextResponse.json({ data: result });
}
