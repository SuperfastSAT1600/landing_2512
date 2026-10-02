import { describe, it, expect } from 'vitest';
import {
  buildOverview,
  computeLeadCounts,
  computePaymentTotals,
  isInitialLead,
  makeContactedChecker,
  makePaidChecker,
  type StatsLead,
  type StatsPayment,
} from '../crm-stats-totals';

// 특성화 테스트 — computeCrmStats 분리 직전 구현이 내던 값을 고정한다.

function lead(over: Partial<StatsLead>): StatsLead {
  return {
    id: 'x', name: '학생', funnel_stage: '1', lead_status: 'active',
    traffic_source: null, inquiry_date: '2026-07-30T10:00:00', created_at: '2026-07-30T01:00:00Z',
    stage_history: [], ...over,
  };
}

function pay(over: Partial<StatsPayment>): StatsPayment {
  return {
    student_id: 'x', student_name: '학생', amount: 0, payment_type: '최초결제',
    paid_at: '2026-07-30T01:00:00Z', ...over,
  };
}

describe('computePaymentTotals', () => {
  it('매출·환불·유형별 합계와 건수를 센다 (과세는 공급가액으로 환산)', () => {
    const rows = [
      pay({ student_id: 'a', amount: 110000, payment_type: '최초결제', tax_type: '과세', paid_at: '2026-07-01T00:00:00Z' }),
      pay({ student_id: 'b', amount: 50000, payment_type: '재결제', paid_at: '2026-07-02T00:00:00Z' }),
      pay({ student_id: 'a', amount: -30000, payment_type: '환불', paid_at: '2026-07-03T00:00:00Z' }),
    ];
    expect(computePaymentTotals(rows, [])).toEqual({
      total_revenue: 130000,
      total_net_revenue: 120000, // 100000 + 50000 - 30000
      gross_revenue: 160000,
      total_refund: -30000,
      first_payment_revenue: 110000,
      repayment_revenue: 50000,
      net_first_payment_revenue: 80000, // 환불은 직전 결제(a의 최초결제)에 귀속
      net_repayment_revenue: 50000,
      unattributed_refund: 0,
      gross_count: 2,
      refund_count: 1,
      first_payment_count: 1,
      repayment_count: 1,
    });
  });

  it('기간 이전 결제가 있어야 올해 환불이 유형에 귀속된다', () => {
    const refund = [pay({ student_id: 'a', amount: -10000, payment_type: '환불' })];
    expect(computePaymentTotals(refund, []).unattributed_refund).toBe(-10000);
    const prior = [pay({ student_id: 'a', amount: 90000, payment_type: '재결제', paid_at: '2025-12-01T00:00:00Z' })];
    const t = computePaymentTotals(refund, prior);
    expect(t.unattributed_refund).toBe(0);
    expect(t.net_repayment_revenue).toBe(-10000);
    expect(t.net_first_payment_revenue).toBe(0);
  });

  it('결제가 없으면 전부 0이다', () => {
    const t = computePaymentTotals([], []);
    expect(Object.values(t).every((v) => v === 0)).toBe(true);
  });
});

describe('makePaidChecker', () => {
  const isPaid = makePaidChecker([
    { student_id: 'id1', student_name: '이름1' },
    { student_id: null, student_name: '이름2' },
  ]);
  it('id 또는 이름이 최초결제 코호트에 있으면 결제로 본다', () => {
    expect(isPaid({ id: 'id1', name: '다른이름' })).toBe(true);
    expect(isPaid({ id: 'zz', name: '이름2' })).toBe(true);
    expect(isPaid({ id: 'zz', name: '이름3' })).toBe(false);
  });
  it('빈 이름은 코호트에 넣지 않는다', () => {
    const empty = makePaidChecker([{ student_id: null, student_name: '' }]);
    expect(empty({ id: 'a', name: '' })).toBe(false);
  });
});

describe('makeContactedChecker / isInitialLead', () => {
  const isContacted = makeContactedChecker(new Map([['c1', '공부하는 아이들'], ['c2', '기타']]));
  it('2단계 이상 도달 이력이 있으면 컨택 성공', () => {
    expect(isContacted(lead({ funnel_stage: '2' }))).toBe(true);
    expect(isContacted(lead({ funnel_stage: '1' }))).toBe(false);
  });
  it('센터형 파트너 소속은 단계와 무관하게 컨택 성공', () => {
    expect(isContacted(lead({ funnel_stage: '1', company_id: 'c1' }))).toBe(true);
    expect(isContacted(lead({ funnel_stage: '1', company_id: 'c2' }))).toBe(false);
    expect(isContacted(lead({ funnel_stage: '1', company_id: 'unknown' }))).toBe(false);
  });
  it('재시도 전략이 붙은 리드는 초기 리드가 아니다', () => {
    expect(isInitialLead({ retry_strategy_id: null })).toBe(true);
    expect(isInitialLead({})).toBe(true);
    expect(isInitialLead({ retry_strategy_id: 'r1' })).toBe(false);
  });
});

describe('computeLeadCounts', () => {
  const leads = [
    lead({ id: 'a', name: 'A', funnel_stage: '2' }),
    lead({ id: 'b', name: 'B', funnel_stage: '1' }),
    lead({ id: 'c', name: 'C', funnel_stage: '3', retry_strategy_id: 'r' }), // 재시도: 분모·컨택 제외
    lead({ id: 'd', name: 'D', funnel_stage: '1', diagnostic_result_id: 'res' }),
    lead({ id: 'e', name: 'E', funnel_stage: '1' }),
  ];
  const isPaid = makePaidChecker([
    { student_id: 'b', student_name: 'B' }, // 컨택 안 됐지만 결제
    { student_id: 'c', student_name: 'C' },
  ]);
  const isContacted = makeContactedChecker(new Map());

  it('컨택은 초기 리드만, 결제는 전체 리드, 진단은 현행+구 진단을 합산한다', () => {
    expect(computeLeadCounts(leads, isPaid, isContacted, new Set(['e']))).toEqual({
      total: 5,
      contacted: 1,
      contactedBase: 4,
      paid: 2,
      diagnosticDone: 2, // d(현행 결과 연결) + e(구 진단)
    });
  });

  it('리드가 없으면 전부 0', () => {
    expect(computeLeadCounts([], isPaid, isContacted, new Set())).toEqual({
      total: 0, contacted: 0, contactedBase: 0, paid: 0, diagnosticDone: 0,
    });
  });
});

describe('buildOverview', () => {
  const totals = computePaymentTotals([], []);

  it('비율을 2자리로 반올림하고 결제 합계를 이어 붙인다', () => {
    const o = buildOverview({ total: 7, contacted: 3, contactedBase: 6, paid: 2, diagnosticDone: 1 }, totals);
    expect(o.contact_rate).toBe(50);
    expect(o.diagnostic_rate).toBe(14.29);
    expect(o.conversion_rate).toBe(66.67);
    expect(o.total_leads).toBe(7);
    expect(o.contacted_base).toBe(6);
    expect(o.gross_count).toBe(0);
  });

  it('전환율은 100%를 넘을 수 있다 (회사 표준 정의)', () => {
    const o = buildOverview({ total: 4, contacted: 1, contactedBase: 4, paid: 2, diagnosticDone: 0 }, totals);
    expect(o.conversion_rate).toBe(200);
  });

  it('컨택이 0이면 전환율은 0', () => {
    const o = buildOverview({ total: 3, contacted: 0, contactedBase: 3, paid: 2, diagnosticDone: 0 }, totals);
    expect(o.conversion_rate).toBe(0);
    expect(o.contact_rate).toBe(0);
  });
});
