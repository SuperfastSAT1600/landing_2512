import { describe, it, expect } from 'vitest';
import { netAmount } from '@/lib/payment-utils';

describe('netAmount — 부가세 역산', () => {
  it('과세 결제는 공급가액(amount / 1.1)을 반환한다', () => {
    // 1,100,000원(부가세 포함) → 공급가액 1,000,000원 + VAT 100,000원
    expect(netAmount({ amount: 1_100_000, tax_type: '과세' })).toBe(1_000_000);
  });

  it('과세 금액에서 10%를 빼는 방식(× 0.9)이 아니다', () => {
    // 과거 구현은 990,000원을 반환해 공급가액을 10,000원 과소 계상했다.
    expect(netAmount({ amount: 1_100_000, tax_type: '과세' })).not.toBe(990_000);
  });

  it('면세 결제는 금액을 그대로 반환한다', () => {
    expect(netAmount({ amount: 1_100_000, tax_type: '면세' })).toBe(1_100_000);
  });

  it('tax_type이 없거나 알 수 없는 값이면 금액을 그대로 반환한다', () => {
    expect(netAmount({ amount: 500_000 })).toBe(500_000);
    expect(netAmount({ amount: 500_000, tax_type: null })).toBe(500_000);
    expect(netAmount({ amount: 500_000, tax_type: '기타' })).toBe(500_000);
  });

  it('과세 환불(음수)도 같은 비율로 역산한다', () => {
    expect(netAmount({ amount: -1_100_000, tax_type: '과세' })).toBe(-1_000_000);
  });

  it('나누어떨어지지 않는 금액은 반올림한다', () => {
    // 1,000,000 / 1.1 = 909,090.909…
    expect(netAmount({ amount: 1_000_000, tax_type: '과세' })).toBe(909_091);
  });

  it('0원 결제는 0을 반환한다', () => {
    expect(netAmount({ amount: 0, tax_type: '과세' })).toBe(0);
  });
});
