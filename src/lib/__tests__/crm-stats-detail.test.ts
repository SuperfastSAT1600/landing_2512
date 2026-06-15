import { describe, it, expect } from 'vitest';
import { buildStatsDetail, isStatsDetailMetric } from '@/lib/crm-stats-detail';

type StudentArg = Parameters<typeof buildStatsDetail>[1][number];
type PaymentArg = Parameters<typeof buildStatsDetail>[2][number];

const student = (over: Partial<StudentArg> & { name: string }): StudentArg => ({
  id: 'id-' + over.name,
  funnel_stage: '1',
  stage_history: null,
  lead_status: 'active',
  traffic_source: '네이버 블로그',
  inquiry_date: '2026-06-01',
  created_at: '2026-06-01T00:00:00Z',
  retry_strategy_id: null,
  ...over,
});

// 2단계+ 도달 = 컨택 성공. stage_history에 '2' 기록이 있거나 현재 단계가 2 이상.
const reached2 = (name: string, extra: Partial<StudentArg> = {}): StudentArg =>
  student({ name, funnel_stage: '4', stage_history: [{ stage: '2', label: '', entered_at: '' }], ...extra });

const pay = (over: Partial<PaymentArg> & { student_name: string; amount: number }): PaymentArg => ({
  student_id: over.student_id ?? null,
  product: over.product ?? 'SAT 정규 1:1 수업',
  payment_type: over.payment_type ?? '최초결제',
  tax_type: over.tax_type ?? '면세',
  paid_at: over.paid_at ?? '2026-06-05T00:00:00Z',
  ...over,
});

describe('isStatsDetailMetric', () => {
  it('유효 metric만 통과', () => {
    expect(isStatsDetailMetric('leads')).toBe(true);
    expect(isStatsDetailMetric('net_profit')).toBe(true);
    expect(isStatsDetailMetric('bogus')).toBe(false);
  });
});

describe('buildStatsDetail — leads 계열', () => {
  const students = [
    student({ name: 'A' }), // 1단계, 미컨택
    reached2('B'), // 컨택 성공
    reached2('C', { retry_strategy_id: 'r1' }), // 컨택했지만 재시도 리드 → contacted 제외
  ];
  const payments = [pay({ student_id: 'id-B', student_name: 'B', amount: 1000 })];

  it('leads = 전체 신규 리드', () => {
    const r = buildStatsDetail('leads', students, payments);
    expect(r.kind).toBe('leads');
    expect(r.count).toBe(3);
  });

  it('contacted = 재시도 제외 + 2단계 도달', () => {
    const r = buildStatsDetail('contacted', students, payments);
    expect(r.count).toBe(1);
    expect(r.kind === 'leads' && r.items.map((i) => i.name)).toEqual(['B']);
  });

  it('paid = 최초결제한 학생', () => {
    const r = buildStatsDetail('paid', students, payments);
    expect(r.count).toBe(1);
    expect(r.kind === 'leads' && r.items[0].name).toBe('B');
  });

  it('재결제/환불은 paid 집합에 넣지 않음', () => {
    const r = buildStatsDetail('paid', students, [
      pay({ student_name: 'A', amount: 500, payment_type: '재결제' }),
    ]);
    expect(r.count).toBe(0);
  });
});

describe('buildStatsDetail — payments 계열', () => {
  const payments = [
    pay({ student_name: 'A', amount: 1000000, tax_type: '과세' }), // net 900000
    pay({ student_name: 'B', amount: 500000, tax_type: '면세' }), // net 500000
    pay({ student_name: 'C', amount: -200000, payment_type: '환불' }),
  ];

  it('revenue = 양수만', () => {
    const r = buildStatsDetail('revenue', [], payments);
    expect(r.count).toBe(2);
    expect(r.kind === 'payments' && r.items.every((i) => i.amount >= 0)).toBe(true);
  });

  it('refund = 음수만', () => {
    const r = buildStatsDetail('refund', [], payments);
    expect(r.count).toBe(1);
    expect(r.kind === 'payments' && r.items[0].amount).toBe(-200000);
  });

  it('net_revenue = 전체 행', () => {
    const r = buildStatsDetail('net_revenue', [], payments);
    expect(r.count).toBe(3);
  });

  it('과세 행은 net_amount = amount*0.9, 면세는 동일', () => {
    const r = buildStatsDetail('revenue', [], payments);
    const a = r.kind === 'payments' ? r.items.find((i) => i.student_name === 'A') : undefined;
    const b = r.kind === 'payments' ? r.items.find((i) => i.student_name === 'B') : undefined;
    expect(a?.net_amount).toBe(900000);
    expect(b?.net_amount).toBe(500000);
  });
});
