/**
 * 글로벌(USD) 매출의 국가별 집계 — 순수 함수.
 *
 * 패널이 쓰고, 주간 리포트에서도 같은 숫자를 낼 수 있도록 UI와 분리해 둔다.
 */
import { countryLabel } from './countries';
import type { GlobalSalePaymentType } from './global-sales-service';

export interface CountrySaleLike {
  country_code: string | null;
  payment_type: GlobalSalePaymentType;
  amount_usd: number;
}

export interface CountryStatRow {
  countryCode: string | null; // null = 국가 미지정
  label: string; // "🇵🇰 파키스탄" 또는 "미지정"
  total: number;
  count: number;
  firstTotal: number;
  repeatTotal: number;
  share: number; // 전체 매출 대비 %
}

/**
 * 국가별 매출 합계를 내림차순으로 반환한다.
 * 미지정(country_code=null)은 금액과 무관하게 항상 마지막 — 비교 대상이 아니라 미입력 잔여분이다.
 */
export function aggregateByCountry(entries: CountrySaleLike[]): CountryStatRow[] {
  if (entries.length === 0) return [];

  const buckets = new Map<string, CountryStatRow>();
  let grandTotal = 0;

  for (const entry of entries) {
    const code = entry.country_code ?? null;
    const key = code ?? '__unknown__';
    const row = buckets.get(key) ?? {
      countryCode: code,
      label: countryLabel(code),
      total: 0,
      count: 0,
      firstTotal: 0,
      repeatTotal: 0,
      share: 0,
    };

    row.total += entry.amount_usd;
    row.count += 1;
    if (entry.payment_type === '재결제') row.repeatTotal += entry.amount_usd;
    else row.firstTotal += entry.amount_usd;

    buckets.set(key, row);
    grandTotal += entry.amount_usd;
  }

  const rows = [...buckets.values()];
  for (const row of rows) {
    row.share = grandTotal > 0 ? (row.total / grandTotal) * 100 : 0;
  }

  return rows.sort((a, b) => {
    if (a.countryCode === null) return 1;
    if (b.countryCode === null) return -1;
    return b.total - a.total;
  });
}

/** 국가 미지정을 제외한 실제 판매 국가 수. */
export function countDistinctCountries(entries: CountrySaleLike[]): number {
  return new Set(entries.map((e) => e.country_code).filter((c): c is string => !!c)).size;
}
