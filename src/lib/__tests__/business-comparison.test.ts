import { calcDiff, buildComparisonRows } from '../business-comparison';
import type { CrmStatsData } from '../crm-stats-service';

const makeData = (overrides: Partial<CrmStatsData['overview']> = {}): CrmStatsData =>
  ({
    overview: {
      total_leads: 100,
      contact_rate: 60,
      conversion_rate: 30,
      gross_revenue: 10_000_000,
      total_refund: -500_000,
      total_revenue: 9_500_000,
      total_net_revenue: 8_000_000,
      contacted: 60,
      contacted_base: 100,
      paid: 30,
      net_first_payment_revenue: 6_000_000,
      net_repayment_revenue: 3_500_000,
      unattributed_refund: 0,
      ...overrides,
    },
    by_source: [],
    monthly: [],
    weekly: [],
  } as unknown as CrmStatsData);

describe('calcDiff', () => {
  it('양수 증감 계산', () => {
    expect(calcDiff(120, 100)).toEqual({ abs: 20, pct: 20 });
  });
  it('음수 증감 계산', () => {
    expect(calcDiff(80, 100)).toEqual({ abs: -20, pct: -20 });
  });
  it('b=0이면 pct null', () => {
    expect(calcDiff(50, 0)).toEqual({ abs: 50, pct: null });
  });
  it('동일하면 abs=0, pct=0', () => {
    expect(calcDiff(100, 100)).toEqual({ abs: 0, pct: 0 });
  });
});

describe('buildComparisonRows', () => {
  it('8개 행을 반환한다', () => {
    const rows = buildComparisonRows(makeData(), makeData(), 70, 60);
    expect(rows).toHaveLength(8);
  });

  it('각 행의 key가 고유하다', () => {
    const rows = buildComparisonRows(makeData(), makeData(), null, null);
    const keys = rows.map((r) => r.key);
    expect(new Set(keys).size).toBe(8);
  });

  it('환불은 절대값으로 표시된다', () => {
    const a = makeData({ total_refund: -500_000 });
    const b = makeData({ total_refund: -300_000 });
    const refundRow = buildComparisonRows(a, b, null, null).find((r) => r.key === 'refund')!;
    expect(refundRow.a).toBe(500_000);
    expect(refundRow.b).toBe(300_000);
  });

  it('재결제 전환율이 null이면 0으로 처리', () => {
    const rows = buildComparisonRows(makeData(), makeData(), null, null);
    const row = rows.find((r) => r.key === 'renewal_rate')!;
    expect(row.a).toBe(0);
    expect(row.b).toBe(0);
  });
});
