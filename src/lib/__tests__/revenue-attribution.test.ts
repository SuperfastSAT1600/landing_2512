import { describe, it, expect } from 'vitest';
import { attributeRevenueByType, type AttributablePayment } from '@/lib/crm-stats-core';

function p(
  student: string,
  paid_at: string,
  amount: number,
  payment_type: string
): AttributablePayment {
  return { student_id: student, student_name: null, amount, payment_type, paid_at };
}

describe('attributeRevenueByType — 환불을 결제 유형에 귀속', () => {
  it('최초결제 뒤의 환불은 최초결제에서 차감한다', () => {
    const r = attributeRevenueByType([
      p('s1', '2026-01-10T00:00:00Z', 1_000_000, '최초결제'),
      p('s1', '2026-02-10T00:00:00Z', -300_000, '환불'),
    ]);
    expect(r.netFirst).toBe(700_000);
    expect(r.netRepayment).toBe(0);
    expect(r.unattributedRefund).toBe(0);
  });

  it('재결제 뒤의 환불은 재결제에서 차감한다', () => {
    const r = attributeRevenueByType([
      p('s1', '2026-01-10T00:00:00Z', 1_000_000, '최초결제'),
      p('s1', '2026-02-10T00:00:00Z', 500_000, '재결제'),
      p('s1', '2026-03-10T00:00:00Z', -200_000, '환불'),
    ]);
    expect(r.netFirst).toBe(1_000_000);
    expect(r.netRepayment).toBe(300_000);
    expect(r.unattributedRefund).toBe(0);
  });

  it('입력 순서가 뒤섞여 있어도 학생별 결제일 순으로 귀속한다', () => {
    const r = attributeRevenueByType([
      p('s1', '2026-03-10T00:00:00Z', -200_000, '환불'),
      p('s1', '2026-01-10T00:00:00Z', 1_000_000, '최초결제'),
      p('s1', '2026-02-10T00:00:00Z', 500_000, '재결제'),
    ]);
    expect(r.netRepayment).toBe(300_000);
    expect(r.unattributedRefund).toBe(0);
  });

  it('학생별로 독립 귀속한다 — 다른 학생의 결제를 끌어오지 않는다', () => {
    const r = attributeRevenueByType([
      p('s1', '2026-01-10T00:00:00Z', 1_000_000, '최초결제'),
      p('s2', '2026-02-10T00:00:00Z', -300_000, '환불'),
    ]);
    expect(r.netFirst).toBe(1_000_000);
    expect(r.unattributedRefund).toBe(-300_000);
  });

  describe('조회 기간 밖 선행 결제 (priorTypeByStudent)', () => {
    it('기간 내 선행 결제가 없어도 직전 유형을 넘겨받으면 귀속한다', () => {
      // 2025년 최초결제 → 2026년 환불. 2026년만 조회하면 기간 안에 선행 결제가 없다.
      const r = attributeRevenueByType(
        [p('s1', '2026-01-08T00:00:00Z', -325_000, '환불')],
        new Map([['s1', 'first' as const]])
      );
      expect(r.netFirst).toBe(-325_000);
      expect(r.unattributedRefund).toBe(0);
    });

    it('직전 유형이 재결제면 재결제에서 차감한다', () => {
      const r = attributeRevenueByType(
        [p('s1', '2026-01-08T00:00:00Z', -500_000, '환불')],
        new Map([['s1', 're' as const]])
      );
      expect(r.netRepayment).toBe(-500_000);
      expect(r.unattributedRefund).toBe(0);
    });

    it('기간 내 결제가 있으면 그쪽이 우선한다 — 기간 밖 유형에 덮이지 않는다', () => {
      const r = attributeRevenueByType(
        [
          p('s1', '2026-01-10T00:00:00Z', 800_000, '재결제'),
          p('s1', '2026-02-10T00:00:00Z', -300_000, '환불'),
        ],
        new Map([['s1', 'first' as const]])
      );
      expect(r.netFirst).toBe(0);
      expect(r.netRepayment).toBe(500_000);
      expect(r.unattributedRefund).toBe(0);
    });

    it('직전 유형도 없으면 미귀속으로 남긴다', () => {
      const r = attributeRevenueByType([p('s1', '2026-01-08T00:00:00Z', -325_000, '환불')], new Map());
      expect(r.unattributedRefund).toBe(-325_000);
    });
  });

  it('student_id가 없으면 student_name으로 묶는다', () => {
    const r = attributeRevenueByType([
      { student_id: null, student_name: '김학생', amount: 1_000_000, payment_type: '최초결제', paid_at: '2026-01-10T00:00:00Z' },
      { student_id: null, student_name: '김학생', amount: -400_000, payment_type: '환불', paid_at: '2026-02-10T00:00:00Z' },
    ]);
    expect(r.netFirst).toBe(600_000);
    expect(r.unattributedRefund).toBe(0);
  });

  it('빈 배열이면 전부 0이다', () => {
    expect(attributeRevenueByType([])).toEqual({ netFirst: 0, netRepayment: 0, unattributedRefund: 0 });
  });

  it('netFirst + netRepayment + unattributedRefund = 전체 합계 (불변식)', () => {
    const rows = [
      p('s1', '2026-01-10T00:00:00Z', 1_000_000, '최초결제'),
      p('s1', '2026-02-10T00:00:00Z', 500_000, '재결제'),
      p('s1', '2026-03-10T00:00:00Z', -200_000, '환불'),
      p('s2', '2026-02-01T00:00:00Z', -300_000, '환불'),
      p('s3', '2026-04-01T00:00:00Z', 700_000, '최초결제'),
    ];
    const r = attributeRevenueByType(rows);
    expect(r.netFirst + r.netRepayment + r.unattributedRefund).toBe(
      rows.reduce((s, x) => s + x.amount, 0)
    );
  });
});
