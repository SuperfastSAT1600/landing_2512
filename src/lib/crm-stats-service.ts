/**
 * CRM 통계 집계 서비스 — Supabase 조회 + 집계를 한곳에 모은다.
 *
 * 라우트(/api/crm/stats)와 크론(/api/cron/weekly-business-report)이 함께 쓴다.
 * 크론이 이 모듈을 직접 부르는 이유: Vercel 크론은 SSO로 보호된 배포 URL
 * (https://*.vercel.app)로 요청하므로, 함수 안에서 자기 도메인을 HTTP로 되부르면
 * SSO 페이지(HTTP 200 + HTML)를 받아 조용히 실패한다. in-process 호출은
 * origin·인증 헤더·네트워크 타임아웃이라는 실패 축을 아예 없앤다.
 *
 * 이 파일은 조회 단계만 맡는다. 집계 계산부(순수 함수)는
 * @/lib/crm-stats-totals(overview)·@/lib/crm-stats-breakdowns(채널·월·주·단계 흐름)에 있고,
 * 공용 코호트 쿼리·판정 헬퍼는 @/lib/crm-stats-core 에 있다.
 */
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  MAX_LEAD_ROWS,
  leadCohortQuery,
  paidCohortQuery,
  type CrmStatsSegment,
  paymentMatchesSegment,
  type RelatedCompanyRef,
  type PaidCohortRow,
} from '@/lib/crm-stats-core';
import { kstDayStart, kstDayEnd } from '@/lib/kst-day';
import {
  buildOverview,
  computeLeadCounts,
  computePaymentTotals,
  makeContactedChecker,
  makePaidChecker,
  type StatsLead,
  type StatsPayment,
} from '@/lib/crm-stats-totals';
import {
  computeBySource,
  computeMonthly,
  computeStageFlowRows,
  computeWeekly,
} from '@/lib/crm-stats-breakdowns';
import type { CrmStatsData } from '@/lib/crm-stats-types';

export type {
  StatsBySource,
  StatsMonthly,
  StatsWeekly,
  CrmStatsData,
} from '@/lib/crm-stats-types';

export type CrmStatsResult =
  | { ok: true; data: CrmStatsData }
  | { ok: false; code: 'FETCH_FAILED'; message: string };

/** 조회 단계의 산출물 — 집계 함수들이 그대로 받는다. */
interface StatsInputs {
  leadList: StatsLead[];
  paymentList: StatsPayment[];
  priorPayRows: StatsPayment[];
  firstPayRows: PaidCohortRow[];
  companyName: Map<string, string>;
  legacyDiagIds: Set<string>;
}

/** 구 진단(2025) 응시 학생 id. 테이블이 없거나 조회가 실패하면 '이력 없음'으로 본다. */
async function fetchLegacyDiagIds(): Promise<Set<string>> {
  // 구 진단은 students 에 컬럼이 없어 따로 읽는다. 테이블이 없거나 조회가 실패하면
  // '구 진단 이력 없음'과 같으므로 0건으로 두고 현행 기준만으로 집계한다.
  const legacyDiag = await supabaseAdmin
    .from('legacy_diagnostic_results')
    .select('student_id')
    .not('student_id', 'is', null)
    .eq('is_internal', false);
  if (legacyDiag.error) console.warn('[stats] 구 진단 이력 조회 생략:', legacyDiag.error.message);
  return new Set(((legacyDiag.data ?? []) as Array<{ student_id: string }>).map((r) => r.student_id));
}

/** 기간·세그먼트에 필요한 원천 데이터를 조회한다. 리드 조회 실패만 치명적이다. */
async function fetchStatsInputs(
  from: string,
  to: string,
  segment: CrmStatsSegment
): Promise<{ ok: true; inputs: StatsInputs } | { ok: false; message: string }> {
  // 기간 내 신규 리드 = inquiry_date(실제 인입 시각)가 [from, to]에 든 리드만.
  // created_at(레코드 생성 시각) 폴백은 쓰지 않는다 — 레거시 대량 임포트(inquiry_date NULL)가
  // 생성 시각 기준으로 특정 기간 신규 리드로 둔갑해 과대집계되는 문제(예: 595건)를 막는다.
  // B2C 개인 리드 + B2B 업체 리드를 함께 집계한다(업체 제외 필터 없음).
  // 매출(payments)에는 업체 필터가 없으므로 리드만 제외하면 리드-매출 기준이 어긋난다.
  // 업체별 세부 집계는 /api/crm/b2b/stats에서 별도로 본다.
  // 서로 독립인 다섯 조회를 병렬 실행:
  // 기간 리드 / 기간 결제 / 기간 이전 결제(환불 귀속용) / 최초결제 코호트 / 업체 로스터.
  const studentsQuery = leadCohortQuery<StatsLead>(
    supabaseAdmin,
    'id, name, funnel_stage, funnel_stage_updated_at, stage_history, lead_status, traffic_source, inquiry_date, created_at, first_message_sent_at, retry_strategy_id, company_id, diagnostic_funnel_stage, diagnostic_result_id',
    from,
    to,
    segment,
  );

  const [studentsRes, paymentsRes, priorPayRes, firstPayRes, companiesRes] = await Promise.all([
    studentsQuery,
    // 기간 내 payments (매출·환불 집계용, 기간=paid_at KST).
    // students 관계를 함께 조회해 segment 필터에서 학생의 company_id를 직접 본다.
    supabaseAdmin
      .from('payments')
      .select(
        'student_id, student_name, amount, payment_type, paid_at, tax_type, students:student_id(company_id)'
      )
      .gte('paid_at', kstDayStart(from))
      .lte('paid_at', kstDayEnd(to)),
    // 기간 이전 양수 결제 — 환불을 유형별로 귀속시킬 때 "직전 결제 유형"의 출발점이 된다.
    // 이게 없으면 작년 결제에 대한 올해 환불이 어느 유형에도 안 잡혀 비중 합이 100%를 넘는다.
    supabaseAdmin
      .from('payments')
      .select('student_id, student_name, amount, payment_type, paid_at, students:student_id(company_id)')
      .lt('paid_at', kstDayStart(from))
      .gte('amount', 0),
    paidCohortQuery(supabaseAdmin),
    // 업체 로스터 — 센터형 파트너 컨택 판정용 company_id → name 맵
    supabaseAdmin.from('companies').select('id, name'),
  ]);
  const { data: students, error: sErr } = studentsRes;
  if (sErr) return { ok: false, message: sErr.message };
  // 무음 절단 방어: 반환 행수가 상한에 닿으면 집계가 잘렸을 수 있으니 경고(정상 기간 조회는 도달 불가).
  if ((students?.length ?? 0) >= MAX_LEAD_ROWS) {
    console.warn(`[stats] lead rows hit MAX_LEAD_ROWS(${MAX_LEAD_ROWS}) for ${from}~${to} — 집계가 절단됐을 수 있음`);
  }

  // segment에 따라 결제/최초결제를 필터링한다 (임베드된 students.company_id 기준).
  const inSegment = (p: { students?: RelatedCompanyRef }) => paymentMatchesSegment(p, segment);

  // 결제 전환율(코호트 기준): 인입 리드가 '언제든' 최초결제했는지로 판단한다.
  // 기간(paid_at) 내 결제만 세면 인입 후 다음 달에 결제한 리드를 놓쳐 전환율이 과소집계된다.
  if (firstPayRes.error) console.error('[stats] firstPayRows fetch failed:', firstPayRes.error.message);
  if (priorPayRes.error) console.error('[stats] priorPayRows fetch failed:', priorPayRes.error.message);
  if (companiesRes.error) console.error('[stats] companies fetch failed:', companiesRes.error.message);

  return {
    ok: true,
    inputs: {
      leadList: students ?? [],
      paymentList: (paymentsRes.error ? [] : (paymentsRes.data ?? [])).filter(inSegment),
      priorPayRows: (priorPayRes.data ?? []).filter(inSegment),
      firstPayRows: (firstPayRes.data ?? []).filter(inSegment),
      companyName: new Map<string, string>((companiesRes.data ?? []).map((c) => [c.id, c.name])),
      legacyDiagIds: await fetchLegacyDiagIds(),
    },
  };
}

/**
 * 기간·세그먼트별 CRM 통계를 집계한다.
 * from/to 는 YYYY-MM-DD (호출자가 검증한다). 조회 실패는 예외 대신 결과값으로 돌려준다.
 */
export async function computeCrmStats({
  from,
  to,
  segment,
}: {
  from: string;
  to: string;
  segment: CrmStatsSegment;
}): Promise<CrmStatsResult> {
  const fetched = await fetchStatsInputs(from, to, segment);
  if (!fetched.ok) {
    return { ok: false, code: 'FETCH_FAILED', message: fetched.message };
  }
  const { leadList, paymentList, priorPayRows, firstPayRows, companyName, legacyDiagIds } =
    fetched.inputs;

  const isPaid = makePaidChecker(firstPayRows);
  const isContactedLead = makeContactedChecker(companyName);

  const data: CrmStatsData = {
    period: { from, to },
    overview: buildOverview(
      computeLeadCounts(leadList, isPaid, isContactedLead, legacyDiagIds),
      computePaymentTotals(paymentList, priorPayRows)
    ),
    by_source: computeBySource(leadList, paymentList, isPaid, isContactedLead),
    monthly: computeMonthly(leadList, paymentList, isPaid, isContactedLead),
    weekly: computeWeekly(leadList, paymentList, isPaid, isContactedLead),
    stage_flow: computeStageFlowRows(leadList),
  };

  return { ok: true, data };
}
