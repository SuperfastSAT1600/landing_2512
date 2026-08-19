// Business 페이지 "목표 대비 실적" 그래프 — 순수 병합 로직. I/O 없음.
// 튜터링(KRW)과 글로벌(USD)은 완전히 분리된 segment로 다뤄지며 이 함수는 그 중 하나만 받는다
// — 두 통화를 섞어 계산하지 않는다.

export type BusinessTargetSegment = 'tutoring' | 'global';
export type BusinessTargetCurrency = 'KRW' | 'USD';

export interface MonthlyTargetRow {
  month: string; // 'YYYY-MM-01' 또는 'YYYY-MM'
  target_amount: number;
  currency: BusinessTargetCurrency;
}

export interface TargetVsActualRow {
  month: string; // 'YYYY-MM'
  target: number;
  actual: number;
}

/** 목표 목록 + 실적 맵(월키→금액)을 병합해 월 오름차순 그래프 데이터로 만든다. */
export function buildTargetVsActual(
  targets: MonthlyTargetRow[],
  actualByMonth: Record<string, number>,
): TargetVsActualRow[] {
  return [...targets]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((t) => {
      const month = t.month.slice(0, 7);
      return { month, target: t.target_amount, actual: actualByMonth[month] ?? 0 };
    });
}

// "전체" 탭에서 한국비즈니스(KRW)와 글로벌(USD)을 합산할 때 쓰는 고정 환율.
// 월별 목표 시드값(마이그레이션 114)을 만들 때 쓴 것과 같은 값 — 한 곳에서만 정의해 어긋나지 않게 한다.
export const USD_TO_KRW_RATE = 1400;

/** USD 시계열을 KRW로 환산한 새 배열을 반환한다(원본 불변). */
export function convertToKrw(rows: TargetVsActualRow[], rate: number = USD_TO_KRW_RATE): TargetVsActualRow[] {
  return rows.map((r) => ({ month: r.month, target: r.target * rate, actual: r.actual * rate }));
}

/** 같은 통화로 맞춘 두 시계열을 월별로 합산한다(합집합, 월 오름차순). */
export function sumTargetVsActual(a: TargetVsActualRow[], b: TargetVsActualRow[]): TargetVsActualRow[] {
  const byMonth = new Map<string, TargetVsActualRow>();
  for (const r of [...a, ...b]) {
    const cur = byMonth.get(r.month) ?? { month: r.month, target: 0, actual: 0 };
    byMonth.set(r.month, { month: r.month, target: cur.target + r.target, actual: cur.actual + r.actual });
  }
  return [...byMonth.values()].sort((x, y) => x.month.localeCompare(y.month));
}

// "전체" 탭의 월별 추이 차트 — CrmStatsData['monthly'](StatsMonthly)와 구조적으로 호환되는
// 최소 형태만 정의해, 이 파일이 API 라우트 타입에 의존하지 않게 한다.
export interface MonthlyRevenueRow {
  month: string; // 'YYYY-MM'
  leads: number;
  contacted: number;
  paid: number;
  gross_revenue: number;
  refund: number;
  revenue: number;
  net_revenue: number;
}

const EMPTY_MONTH = (month: string): MonthlyRevenueRow => ({
  month,
  leads: 0,
  contacted: 0,
  paid: 0,
  gross_revenue: 0,
  refund: 0,
  revenue: 0,
  net_revenue: 0,
});

/**
 * 한국비즈니스 월별 매출(KRW)에 글로벌 월별 매출(USD→KRW 환산)을 더한다.
 * 리드·컨택·결제 건수, 환불은 한국비즈니스 값 그대로 둔다 — 글로벌엔 그 개념이 없다.
 */
export function combineMonthlyRevenue(
  tutoring: MonthlyRevenueRow[],
  globalUsdByMonth: Record<string, number>,
  rate: number = USD_TO_KRW_RATE,
): MonthlyRevenueRow[] {
  const byMonth = new Map<string, MonthlyRevenueRow>(tutoring.map((m) => [m.month, { ...m }]));
  for (const [month, usd] of Object.entries(globalUsdByMonth)) {
    const krw = usd * rate;
    const cur = byMonth.get(month) ?? EMPTY_MONTH(month);
    byMonth.set(month, {
      ...cur,
      gross_revenue: cur.gross_revenue + krw,
      revenue: cur.revenue + krw,
      net_revenue: cur.net_revenue + krw,
    });
  }
  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
}
