import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { buildStatsDetail, isStatsDetailMetric } from '@/lib/crm-stats-detail';
import {
  leadCohortQuery,
  paidCohortQuery,
  type CrmStatsSegment,
  parseStatsSegment,
  isCrmStatsSegment,
  paymentMatchesSegment,
  type RelatedCompanyRef,
} from '@/lib/crm-stats-core';
import { apiError } from '@/lib/api-response';
import { kstDayStart, kstDayEnd } from '@/lib/kst-day';

/**
 * GET /api/crm/stats/detail?metric=<m>&from=YYYY-MM-DD&to=YYYY-MM-DD
 * 오버뷰 카드 드릴다운: 집계 라우트와 동일 기준의 원본 목록을 반환.
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401);

  const { searchParams } = new URL(request.url);
  const metric = searchParams.get('metric') ?? '';
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const source = searchParams.get('source') ?? undefined; // 유입 채널 드릴다운 필터

  if (!from || !to) return apiError('MISSING_PARAMS', 'from, to 파라미터가 필요합니다.', 400);

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return apiError('INVALID_DATE', '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)', 400);
  }

  if (!isStatsDetailMetric(metric)) return apiError('BAD_METRIC', `알 수 없는 metric: ${metric}`, 400);

  const rawSegment = searchParams.get('segment');
  const segment: CrmStatsSegment = parseStatsSegment(rawSegment);
  if (rawSegment !== null && !isCrmStatsSegment(rawSegment)) {
    return apiError('INVALID_SEGMENT', 'segment는 all, b2c, b2b 중 하나여야 합니다.', 400);
  }

  // 기간 내 신규 리드 (집계 라우트와 동일한 필터)
  // overview(/api/crm/stats)와 반드시 같은 코호트를 봐야 한다 — 공용 조회 사용.
  const studentsQuery = leadCohortQuery(
    supabaseAdmin,
    'id, name, funnel_stage, stage_history, lead_status, churn_tag, traffic_source, inquiry_date, created_at, retry_strategy_id, consultation_timeline, company_id',
    from,
    to,
    segment,
  );

  const [studentsRes, paymentsRes, paidCohortRes] = await Promise.all([
    studentsQuery,
    // 기간 내 결제/환불 행. students 관계를 통해 segment 분류에 필요한 company_id를 함께 조회.
    supabaseAdmin
      .from('payments')
      .select(
        'id, student_id, student_name, product, amount, payment_type, tax_type, paid_at, created_by, students:student_id(company_id)'
      )
      .gte('paid_at', kstDayStart(from))
      .lte('paid_at', kstDayEnd(to))
      .order('paid_at', { ascending: true }),
    // paid/is_paid 판정용 '언제든 최초결제' 코호트 — overview의 paid 분자와 같은 집합.
    paidCohortQuery(supabaseAdmin),
  ]);

  const { data: students, error: sErr } = studentsRes;
  if (sErr) return apiError('FETCH_FAILED', sErr.message, 500);

  const { data: payments, error: pErr } = paymentsRes;
  if (pErr) return apiError('FETCH_FAILED', pErr.message, 500);

  if (paidCohortRes.error) {
    console.error('[stats/detail] paidCohort fetch failed:', paidCohortRes.error.message);
  }

  const inSegment = (p: { students?: RelatedCompanyRef }) => paymentMatchesSegment(p, segment);
  const studentList = students ?? [];
  const filteredPayments = (payments ?? []).filter((p) =>
    inSegment(p as { students?: RelatedCompanyRef }),
  );
  const paidCohort = (paidCohortRes.data ?? [])
    .filter((p) => inSegment(p as { students?: RelatedCompanyRef }))
    .map((p) => ({ student_id: p.student_id, student_name: p.student_name }));

  const result = buildStatsDetail(metric, studentList, filteredPayments, source, { paidCohort });
  return NextResponse.json({ data: result });
}
