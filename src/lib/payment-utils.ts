/** 부가세율 10% — 과세 결제 금액은 공급가액 + VAT 로 저장된다. */
const VAT_RATE = 0.1;

/**
 * 결제 금액에서 부가세를 제외한 실수익(공급가액).
 * 과세 건은 amount 가 VAT 포함가이므로 `amount / 1.1` 로 역산한다.
 * (amount * 0.9 는 10%를 "빼는" 계산이라 공급가액보다 작게 나온다.)
 * 면세·미지정은 그대로 반환한다.
 */
export function netAmount(p: { amount: number; tax_type?: string | null }): number {
  return p.tax_type === '과세' ? Math.round(p.amount / (1 + VAT_RATE)) : p.amount;
}
