import { describe, it, expect } from 'vitest';
import { deriveAmount, isPaymentFormValid } from '../payment/paymentCalc';
import { getProducts, PRODUCT_TREE } from '../payment/productTree';

// 특성화 테스트 — PaymentModal 분리 직전 구현의 계산 결과를 고정한다.

describe('deriveAmount', () => {
  it('빈 값은 금액 없음', () => {
    expect(deriveAmount('')).toEqual({ amountValue: 0, hasAmount: false, isProvisional: false });
  });
  it('0원은 가결제', () => {
    expect(deriveAmount('0')).toEqual({ amountValue: 0, hasAmount: true, isProvisional: true });
  });
  it('양수는 일반 결제', () => {
    expect(deriveAmount('2990000')).toEqual({ amountValue: 2990000, hasAmount: true, isProvisional: false });
  });
  it('음수와 숫자가 아닌 값은 막는다', () => {
    expect(deriveAmount('-1').hasAmount).toBe(false);
    expect(deriveAmount('abc').hasAmount).toBe(false);
  });
});

describe('isPaymentFormValid', () => {
  const withHours = PRODUCT_TREE['1:1'].SAT![0];
  const noHours = PRODUCT_TREE['콘텐츠']._![0];

  it('상품이 없으면 무효', () => {
    expect(isPaymentFormValid(undefined, '2', true)).toBe(false);
  });
  it('시간이 필요한 상품은 0보다 큰 시간이 있어야 한다', () => {
    expect(isPaymentFormValid(withHours, '', true)).toBe(false);
    expect(isPaymentFormValid(withHours, '0', true)).toBe(false);
    expect(isPaymentFormValid(withHours, '10', true)).toBe(true);
  });
  it('시간이 필요 없는 상품은 금액만 있으면 된다', () => {
    expect(isPaymentFormValid(noHours, '', true)).toBe(true);
    expect(isPaymentFormValid(noHours, '', false)).toBe(false);
  });
});

describe('getProducts', () => {
  it('수업 유형이 없으면 빈 목록', () => {
    expect(getProducts(null, 'SAT')).toEqual([]);
  });
  it('콘텐츠는 과목 없이 상품 3개', () => {
    expect(getProducts('콘텐츠', null).map((p) => p.id)).toEqual([
      'content_vocab', 'content_supertest', 'content_lecture',
    ]);
  });
  it('그 외 유형은 과목이 있어야 목록이 나온다', () => {
    expect(getProducts('1:1', null)).toEqual([]);
    expect(getProducts('1:1', 'SAT')).toHaveLength(5);
    expect(getProducts('1:1', 'AP').map((p) => p.id)).toEqual(['ap_1on1']);
    expect(getProducts('그룹', 'AP')).toEqual([]);
  });
});
