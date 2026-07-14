import type { Locale } from '@/lib/enrollment/i18n/types';

const KRW_TO_USD = 1450;

function krwToUsd(krw: number): number {
  return Math.round(krw / KRW_TO_USD);
}

interface FormatWonOptions {
  /** 이 값 이상이고 만원 단위로 떨어지면 "N만원"으로 표기 (기본 100 = 100만원 이상만) */
  manThreshold?: number;
}

export function formatWon(price: number, locale?: Locale, options?: FormatWonOptions): string {
  if (locale === 'en') {
    const usd = krwToUsd(price);
    return `$${usd.toLocaleString('en-US')}`;
  }
  // Korean: use 만원 for round amounts at or above the threshold
  const man = price / 10000;
  if (man >= (options?.manThreshold ?? 100) && Number.isInteger(man)) {
    return `${man.toLocaleString()}만원`;
  }
  return `${new Intl.NumberFormat('ko-KR').format(price)}원`;
}
