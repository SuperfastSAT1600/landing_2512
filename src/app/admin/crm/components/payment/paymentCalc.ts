import type { Product } from './productTree';

/** 금액 입력 문자열에서 파생되는 값. */
export function deriveAmount(amount: string) {
  // 0원 = 가결제(수업 시작, 실입금 전). 빈 값·음수만 막는다.
  const amountValue = Number(amount);
  const hasAmount = amount !== '' && Number.isFinite(amountValue) && amountValue >= 0;
  const isProvisional = hasAmount && amountValue === 0;
  return { amountValue, hasAmount, isProvisional };
}

/** 상품 선택·시간(필요 시)·금액이 모두 유효한지. */
export function isPaymentFormValid(
  selectedProduct: Product | undefined,
  hours: string,
  hasAmount: boolean
): boolean {
  return (
    !!selectedProduct &&
    (!selectedProduct.requiresHours || (hours !== '' && Number(hours) > 0)) &&
    hasAmount
  );
}
