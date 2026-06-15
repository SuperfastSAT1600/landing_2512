import { hasReachedStage } from '@/lib/funnel-stats';

export type StatsDetailMetric =
  | 'leads'
  | 'contacted'
  | 'paid'
  | 'revenue'
  | 'refund'
  | 'net_revenue'
  | 'net_profit';

export const STATS_DETAIL_METRICS: StatsDetailMetric[] = [
  'leads', 'contacted', 'paid', 'revenue', 'refund', 'net_revenue', 'net_profit',
];

export function isStatsDetailMetric(v: string): v is StatsDetailMetric {
  return (STATS_DETAIL_METRICS as string[]).includes(v);
}

/** kind=leads 항목: 리드/학생 명단 */
export interface LeadDetailItem {
  id: string;
  name: string;
  traffic_source: string | null;
  funnel_stage: string;
  lead_status: string;
  date: string | null; // inquiry_date ?? created_at
}

/** kind=payments 항목: 결제/환불 행 */
export interface PaymentDetailItem {
  student_name: string;
  product: string | null;
  amount: number;
  net_amount: number; // 과세면 amount*0.9, 면세면 amount
  tax_type: string | null;
  payment_type: string | null;
  paid_at: string;
}

export type StatsDetailResult =
  | { metric: StatsDetailMetric; kind: 'leads'; count: number; items: LeadDetailItem[] }
  | { metric: StatsDetailMetric; kind: 'payments'; count: number; items: PaymentDetailItem[] };

type StudentRow = {
  id: string;
  name: string;
  funnel_stage: string;
  stage_history?: { stage: string; label: string; entered_at: string }[] | null;
  lead_status: string;
  traffic_source: string | null;
  inquiry_date: string | null;
  created_at: string;
  retry_strategy_id?: string | null;
};

type PaymentRow = {
  student_id: string | null;
  student_name: string;
  product: string | null;
  amount: number;
  payment_type: string | null;
  tax_type: string | null;
  paid_at: string;
};

function netAmount(p: { amount: number; tax_type?: string | null }): number {
  return p.tax_type === '과세' ? Math.round(p.amount * 0.9) : p.amount;
}

function toLeadItem(s: StudentRow): LeadDetailItem {
  return {
    id: s.id,
    name: s.name,
    traffic_source: s.traffic_source,
    funnel_stage: s.funnel_stage,
    lead_status: s.lead_status,
    date: s.inquiry_date ?? s.created_at ?? null,
  };
}

function toPaymentItem(p: PaymentRow): PaymentDetailItem {
  return {
    student_name: p.student_name,
    product: p.product,
    amount: p.amount,
    net_amount: netAmount(p),
    tax_type: p.tax_type,
    payment_type: p.payment_type,
    paid_at: p.paid_at,
  };
}

/**
 * 집계 라우트와 동일한 기준으로 metric별 원본 목록을 구성한다(순수 함수, 테스트 대상).
 * students/payments는 이미 기간 필터된 행이라고 가정.
 */
export function buildStatsDetail(
  metric: StatsDetailMetric,
  students: StudentRow[],
  payments: PaymentRow[]
): StatsDetailResult {
  // 결제한 학생 집합 (최초결제 기준) — '결제 전환율' 분자와 동일
  const paidIds = new Set<string>();
  const paidNames = new Set<string>();
  for (const p of payments) {
    if (p.payment_type === '최초결제') {
      if (p.student_id) paidIds.add(p.student_id);
      if (p.student_name) paidNames.add(p.student_name);
    }
  }
  const isPaid = (s: StudentRow) => paidIds.has(s.id) || paidNames.has(s.name);

  switch (metric) {
    case 'leads': {
      const items = students.map(toLeadItem);
      return { metric, kind: 'leads', count: items.length, items };
    }
    case 'contacted': {
      const items = students
        .filter((s) => !s.retry_strategy_id)
        .filter((s) => hasReachedStage(s, '2'))
        .map(toLeadItem);
      return { metric, kind: 'leads', count: items.length, items };
    }
    case 'paid': {
      const items = students.filter(isPaid).map(toLeadItem);
      return { metric, kind: 'leads', count: items.length, items };
    }
    case 'revenue': {
      const items = payments.filter((p) => p.amount >= 0).map(toPaymentItem);
      return { metric, kind: 'payments', count: items.length, items };
    }
    case 'refund': {
      const items = payments.filter((p) => p.amount < 0).map(toPaymentItem);
      return { metric, kind: 'payments', count: items.length, items };
    }
    case 'net_revenue':
    case 'net_profit': {
      const items = payments.map(toPaymentItem);
      return { metric, kind: 'payments', count: items.length, items };
    }
  }
}
