/**
 * CRM 통계 — overview 구간의 순수 계산부 (결제 합계 · 리드 카운트 · overview 조립).
 * crm-stats-service 의 computeCrmStats 에서 분리했다. DB 접근 없음.
 */
import { netAmount } from '@/lib/payment-utils';
import {
  attributeRevenueByType,
  buildPriorTypeMap,
  contactRate,
  isContactedWithImpliedPartner,
  ratePct,
  type AttributablePayment,
  type LeadCohortRow,
  type PaidCohortRow,
  type RelatedCompanyRef,
} from '@/lib/crm-stats-core';
import { isDiagnosticDone } from '@/lib/diagnostic-status';
import type { CrmStatsData } from '@/lib/crm-stats-types';

/** select 에 진단 컬럼까지 포함한 코호트 리드 행. */
export interface StatsLead extends LeadCohortRow {
  diagnostic_funnel_stage?: number | null;
  diagnostic_result_id?: string | null;
}

/** 기간 내 결제 1건 (students 임베드는 segment 필터용). */
export interface StatsPayment extends AttributablePayment {
  student_id: string | null;
  student_name: string;
  tax_type?: string | null;
  students?: RelatedCompanyRef;
}

export type PaidChecker = (s: { id: string; name: string }) => boolean;
export type ContactedChecker = (s: StatsLead) => boolean;

export type PaymentTotals = Pick<
  CrmStatsData['overview'],
  | 'total_revenue' | 'total_net_revenue' | 'gross_revenue' | 'total_refund'
  | 'first_payment_revenue' | 'repayment_revenue'
  | 'net_first_payment_revenue' | 'net_repayment_revenue' | 'unattributed_refund'
  | 'gross_count' | 'refund_count' | 'first_payment_count' | 'repayment_count'
>;

export interface LeadCounts {
  total: number;
  contacted: number;
  contactedBase: number;
  paid: number;
  diagnosticDone: number;
}

/** 기간 내 결제 합계와 유형별 순매출. priorPayRows 는 환불 귀속의 출발점(기간 이전 양수 결제). */
export function computePaymentTotals(
  paymentList: StatsPayment[],
  priorPayRows: StatsPayment[]
): PaymentTotals {
  let totalRevenue = 0;
  let totalNetRevenue = 0;
  let grossRevenue = 0;
  let totalRefund = 0;
  let firstPaymentRevenue = 0;
  let repaymentRevenue = 0;
  let grossCount = 0;
  let refundCount = 0;
  let firstPaymentCount = 0;
  let repaymentCount = 0;

  for (const p of paymentList) {
    totalRevenue += p.amount;
    totalNetRevenue += netAmount(p);
    if (p.amount >= 0) grossRevenue += p.amount;
    else totalRefund += p.amount;
    if (p.amount >= 0) {
      grossCount++;
      if (p.payment_type === '최초결제') {
        firstPaymentRevenue += p.amount;
        firstPaymentCount++;
      } else if (p.payment_type === '재결제') {
        repaymentRevenue += p.amount;
        repaymentCount++;
      }
    } else {
      refundCount++;
    }
  }

  // 환불을 직전 양수 결제 유형에 귀속시켜 유형별 순매출을 계산한다.
  // 기간 이전 결제까지 출발점으로 삼아야 "작년 결제 → 올해 환불"이 미귀속으로 새지 않는다.
  const attributed = attributeRevenueByType(paymentList, buildPriorTypeMap(priorPayRows));

  return {
    total_revenue: totalRevenue,
    total_net_revenue: totalNetRevenue,
    gross_revenue: grossRevenue,
    total_refund: totalRefund,
    first_payment_revenue: firstPaymentRevenue,
    repayment_revenue: repaymentRevenue,
    net_first_payment_revenue: attributed.netFirst,
    net_repayment_revenue: attributed.netRepayment,
    unattributed_refund: attributed.unattributedRefund,
    gross_count: grossCount,
    refund_count: refundCount,
    first_payment_count: firstPaymentCount,
    repayment_count: repaymentCount,
  };
}

/** 최초결제 코호트로 '학생이 결제했는지' 판정기를 만든다(id 또는 이름 일치). */
export function makePaidChecker(firstPayRows: PaidCohortRow[]): PaidChecker {
  const paidStudentIds = new Set<string>();
  const paidStudentNames = new Set<string>();
  for (const p of firstPayRows) {
    if (p.student_id) paidStudentIds.add(p.student_id);
    if (p.student_name) paidStudentNames.add(p.student_name);
  }
  return (s) => paidStudentIds.has(s.id) || paidStudentNames.has(s.name);
}

/**
 * 컨택 성공 판정기 — B2B 탭(/api/crm/b2b/stats)과 동일 기준.
 * 센터형 파트너 소속 리드는 세일즈 퍼널을 거치지 않고 등록되므로 단계와 무관하게 컨택 성공으로 본다.
 */
export function makeContactedChecker(companyName: Map<string, string>): ContactedChecker {
  return (s) =>
    isContactedWithImpliedPartner(s, s.company_id ? companyName.get(s.company_id) : undefined);
}

/** 컨택 성공률 대상 — 최초 세일즈 리드(retry_strategy_id 없음)만. */
export function isInitialLead(s: { retry_strategy_id?: string | null }): boolean {
  return !s.retry_strategy_id;
}

/** overview 의 리드 기반 카운트(총 리드·컨택·결제·진단 완료). */
export function computeLeadCounts(
  leadList: StatsLead[],
  isPaid: PaidChecker,
  isContactedLead: ContactedChecker,
  legacyDiagIds: Set<string>
): LeadCounts {
  const initialLeads = leadList.filter(isInitialLead);
  // 결제 전환율 분자 — 기간 내 인입 리드 중 언제든 최초결제한 **전체** 인원.
  //
  // 분모(contacted)는 컨택 성공자라 분자가 분모의 부분집합이 아니다. 통상적인
  // 비율과 형태가 다르지만 **의도된 회사 표준 정의**다: 컨택 기록이 유실된 채 결제까지
  // 간 리드(시트 마이그레이션 유입 등)를 전환 실적에서 빼지 않으려는 것이다 —
  // 결제했다면 실제로는 컨택된 것이고, 2단계 기록이 안 남았을 뿐이다.
  //
  // 그 결과 conversion_rate 가 100%를 넘을 수 있다. 버그가 아니므로 '고치지' 말 것.
  // 정의는 stats/__tests__/route.test.ts 의 '결제 전환율 정의 (회사 표준)' 이 고정한다.
  return {
    total: leadList.length,
    contacted: initialLeads.filter((s) => isContactedLead(s)).length,
    contactedBase: initialLeads.length,
    paid: leadList.filter((s) => isPaid(s)).length,
    diagnosticDone: leadList.filter((s) =>
      isDiagnosticDone({
        diagnostic_result_id: s.diagnostic_result_id ?? null,
        diagnostic_funnel_stage: s.diagnostic_funnel_stage ?? null,
        legacy_diagnostic_taken_at: legacyDiagIds.has(s.id) ? 'legacy' : null,
      })
    ).length,
  };
}

/** 리드 카운트와 결제 합계를 overview 응답 형태로 조립한다. */
export function buildOverview(counts: LeadCounts, totals: PaymentTotals): CrmStatsData['overview'] {
  return {
    total_leads: counts.total,
    contacted: counts.contacted,
    contacted_base: counts.contactedBase,
    contact_rate: contactRate(counts.contacted, counts.contactedBase),
    paid: counts.paid,
    diagnostic_done: counts.diagnosticDone,
    diagnostic_rate: ratePct(counts.diagnosticDone, counts.total),
    // 결제 전환율 = 전체 결제 인원 / 컨택 성공 인원 (회사 표준 — computeLeadCounts 주석 참고)
    conversion_rate:
      counts.contacted > 0 ? Math.round((counts.paid / counts.contacted) * 10000) / 100 : 0,
    ...totals,
  };
}
