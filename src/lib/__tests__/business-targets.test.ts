import { describe, it, expect } from 'vitest';
import {
  buildTargetVsActual,
  combineMonthlyRevenue,
  convertToKrw,
  sumTargetVsActual,
  USD_TO_KRW_RATE,
  type MonthlyRevenueRow,
  type MonthlyTargetRow,
  type TargetVsActualRow,
} from '@/lib/business-targets';

function target(month: string, target_amount: number): MonthlyTargetRow {
  return { month, target_amount, currency: 'KRW' };
}

describe('buildTargetVsActual', () => {
  it('월 오름차순으로 정렬한다', () => {
    const rows = buildTargetVsActual(
      [target('2026-10-01', 250_000_000), target('2026-08-01', 150_000_000), target('2026-09-01', 200_000_000)],
      {},
    );
    expect(rows.map((r) => r.month)).toEqual(['2026-08', '2026-09', '2026-10']);
  });

  it('실적 맵에 값이 있으면 매칭해서 채운다', () => {
    const rows = buildTargetVsActual(
      [target('2026-08-01', 150_000_000)],
      { '2026-08': 62_770_000 },
    );
    expect(rows).toEqual([{ month: '2026-08', target: 150_000_000, actual: 62_770_000 }]);
  });

  it('실적이 없는 달(아직 오지 않은 미래 달 등)은 0으로 채운다', () => {
    const rows = buildTargetVsActual([target('2026-11-01', 300_000_000)], {});
    expect(rows).toEqual([{ month: '2026-11', target: 300_000_000, actual: 0 }]);
  });

  it('목표가 없으면 빈 배열', () => {
    expect(buildTargetVsActual([], { '2026-08': 1000 })).toEqual([]);
  });

  it('저장된 month가 YYYY-MM-01 형태여도 YYYY-MM으로 축약한다', () => {
    const rows = buildTargetVsActual([target('2026-08-01', 1)], {});
    expect(rows[0].month).toBe('2026-08');
  });
});

function row(month: string, target: number, actual: number): TargetVsActualRow {
  return { month, target, actual };
}

describe('USD_TO_KRW_RATE', () => {
  it('1달러 = 1400원 고정 환율', () => {
    expect(USD_TO_KRW_RATE).toBe(1400);
  });
});

describe('convertToKrw', () => {
  it('target·actual 모두 환율을 곱한다', () => {
    expect(convertToKrw([row('2026-08', 714, 10)])).toEqual([row('2026-08', 714 * 1400, 10 * 1400)]);
  });

  it('환율을 직접 지정할 수 있다', () => {
    expect(convertToKrw([row('2026-08', 100, 50)], 1000)).toEqual([row('2026-08', 100_000, 50_000)]);
  });

  it('빈 배열은 그대로', () => {
    expect(convertToKrw([])).toEqual([]);
  });

  it('원본 배열을 변형하지 않는다', () => {
    const input = [row('2026-08', 100, 50)];
    convertToKrw(input);
    expect(input).toEqual([row('2026-08', 100, 50)]);
  });
});

describe('sumTargetVsActual', () => {
  it('같은 달은 target·actual을 각각 더한다', () => {
    const a = [row('2026-08', 150_000_000, 62_000_000)];
    const b = [row('2026-08', 1_000_000, 500_000)];
    expect(sumTargetVsActual(a, b)).toEqual([row('2026-08', 151_000_000, 62_500_000)]);
  });

  it('한쪽에만 있는 달도 포함한다', () => {
    const a = [row('2026-08', 150_000_000, 62_000_000)];
    const b = [row('2026-09', 7_000_000, 0)];
    const result = sumTargetVsActual(a, b);
    expect(result).toEqual([row('2026-08', 150_000_000, 62_000_000), row('2026-09', 7_000_000, 0)]);
  });

  it('월 오름차순으로 정렬한다', () => {
    const a = [row('2026-10', 1, 1)];
    const b = [row('2026-08', 2, 2)];
    expect(sumTargetVsActual(a, b).map((r) => r.month)).toEqual(['2026-08', '2026-10']);
  });

  it('둘 다 비어 있으면 빈 배열', () => {
    expect(sumTargetVsActual([], [])).toEqual([]);
  });
});

function monthly(month: string, over: Partial<MonthlyRevenueRow> = {}): MonthlyRevenueRow {
  return { month, leads: 0, contacted: 0, paid: 0, gross_revenue: 0, refund: 0, revenue: 0, net_revenue: 0, ...over };
}

describe('combineMonthlyRevenue', () => {
  it('같은 달은 매출 필드(gross_revenue·revenue·net_revenue)에 환산된 글로벌 금액을 더한다', () => {
    const tutoring = [monthly('2026-08', { gross_revenue: 62_770_000, revenue: 60_150_000, net_revenue: 53_870_000 })];
    const result = combineMonthlyRevenue(tutoring, { '2026-08': 10 }, 1400);
    expect(result).toEqual([
      monthly('2026-08', { gross_revenue: 62_784_000, revenue: 60_164_000, net_revenue: 53_884_000 }),
    ]);
  });

  it('환불은 한국비즈니스 값 그대로 유지한다(글로벌은 환불 개념 없음)', () => {
    const tutoring = [monthly('2026-08', { refund: -2_625_525 })];
    const result = combineMonthlyRevenue(tutoring, { '2026-08': 10 }, 1400);
    expect(result[0].refund).toBe(-2_625_525);
  });

  it('리드·컨택·결제 건수는 한국비즈니스 값 그대로 유지한다', () => {
    const tutoring = [monthly('2026-08', { leads: 33, contacted: 18, paid: 7 })];
    const result = combineMonthlyRevenue(tutoring, {}, 1400);
    expect(result[0]).toEqual(expect.objectContaining({ leads: 33, contacted: 18, paid: 7 }));
  });

  it('한국비즈니스에 없는 달에 글로벌만 있으면 새 행을 만든다', () => {
    const result = combineMonthlyRevenue([], { '2026-09': 5 }, 1400);
    expect(result).toEqual([monthly('2026-09', { gross_revenue: 7000, revenue: 7000, net_revenue: 7000 })]);
  });

  it('월 오름차순으로 정렬한다', () => {
    const tutoring = [monthly('2026-10'), monthly('2026-08')];
    const result = combineMonthlyRevenue(tutoring, { '2026-09': 1 }, 1400);
    expect(result.map((r) => r.month)).toEqual(['2026-08', '2026-09', '2026-10']);
  });

  it('둘 다 비어 있으면 빈 배열', () => {
    expect(combineMonthlyRevenue([], {}, 1400)).toEqual([]);
  });
});
