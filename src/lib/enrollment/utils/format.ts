import type { Locale } from '@/lib/enrollment/i18n/types';

const KRW_TO_USD = 1450;

function krwToUsd(krw: number): number {
  return Math.round(krw / KRW_TO_USD);
}

export function formatWon(price: number, locale?: Locale): string {
  if (locale === 'en') {
    const usd = krwToUsd(price);
    return `$${usd.toLocaleString('en-US')}`;
  }
  // Korean: use 만원 for large round amounts
  const man = price / 10000;
  if (man >= 100 && Number.isInteger(man)) {
    return `${man.toLocaleString()}만원`;
  }
  return `${new Intl.NumberFormat('ko-KR').format(price)}원`;
}
