/**
 * CRM 통계 응답 타입. crm-stats-service 가 그대로 재노출한다.
 * 집계 계산부(crm-stats-totals / crm-stats-breakdowns)가 서비스를 거꾸로 import 하지 않도록 분리했다.
 */
import type { StageFlowRow } from '@/lib/funnel-stats';

export interface StatsBySource {
  source: string;
  leads: number;
  contacted: number;
  contact_rate: number;
  paid: number; // 이 채널 리드 중 결제 인원(컨택 여부 무관) — conversion_rate 의 분자
  conversion_rate: number;
  revenue: number;
  net_revenue: number;
  avg_first_response_seconds: number | null; // 문의시각(inquiry_date, 없으면 created_at) → 첫 메시지 발송 평균 시간(초). 데이터 없으면 null
}

export interface StatsMonthly {
  month: string; // "2026-01"
  leads: number;
  contacted: number;
  paid: number;
  gross_revenue: number; // 매출(양수 결제 합)
  refund: number;        // 환불(음수 합계, 음수값)
  revenue: number;       // 순매출(매출 − 환불 = sum(amount))
  net_revenue: number;   // 순수익(부가세 차감 후 = sum(netAmount))
}

export interface StatsWeekly {
  week: string; // "25년 05월 03주차"
  leads: number;
  contacted: number;
  paid: number;
  revenue: number;
  net_revenue: number;
}

export interface CrmStatsData {
  period: { from: string; to: string };
  overview: {
    total_leads: number;
    contacted: number;
    contacted_base: number; // 컨택 성공률 분모 (재시도 제외 초기 리드 수)
    contact_rate: number;
    paid: number; // 기간 내 인입 리드 중 결제 인원(컨택 여부 무관) — conversion_rate 의 분자
    // 진단테스트 완료 — 현행(퍼널 4·5 또는 결과 연결) + 2025 구 진단 응시를 함께 센다.
    diagnostic_done: number;
    diagnostic_rate: number; // 코호트 리드 중 진단 완료 비율(%)
    conversion_rate: number; // paid / contacted. 정의상 100%를 넘을 수 있다(아래 주석 참고)

    total_revenue: number; // 순매출(결제 − 환불)
    total_net_revenue: number; // 부가세 제외 실수익
    gross_revenue: number; // 환불 전 총 결제(양수 합)
    total_refund: number; // 환불 합(음수)
    first_payment_revenue: number; // 최초결제 합(양수, 환불 전)
    repayment_revenue: number; // 재결제 합(양수, 환불 전)
    net_first_payment_revenue: number; // 최초결제 순매출(직전 결제 귀속 환불 차감)
    net_repayment_revenue: number; // 재결제 순매출(직전 결제 귀속 환불 차감)
    unattributed_refund: number; // 귀속 불가 환불(직전 결제 없음, 음수)
    // 기간 내 결제 트랜잭션 건수 — 코호트 전환 인원(paid)과 다른 값이다.
    gross_count: number; // 양수 결제 건수
    refund_count: number; // 환불 건수
    first_payment_count: number; // 최초결제(양수) 건수
    repayment_count: number; // 재결제(양수) 건수
  };
  by_source: StatsBySource[];
  monthly: StatsMonthly[];
  weekly: StatsWeekly[];
  stage_flow: StageFlowRow[];
}
