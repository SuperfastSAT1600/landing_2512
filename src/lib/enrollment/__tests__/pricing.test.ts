import { describe, it, expect } from 'vitest';
import {
  HOUR_PACKAGES,
  getBasePrice,
  getSelectedTotalPrice,
  getSelectedOptionSummary,
} from '../data/pricing';

const PREMIUM_ID = '1on1-premium-10h';

describe('대표 코치 프리미엄 수업권 (pricing)', () => {
  const premium = HOUR_PACKAGES['one-on-one'].find((p) => p.id === PREMIUM_ID);

  // REQ-001
  it('1:1 시간 패키지에 프리미엄 상품이 존재한다', () => {
    expect(premium).toBeDefined();
    expect(premium?.premium).toBe(true);
    expect(premium?.hours).toBe(10);
    expect(premium?.totalPrice).toBe(1_800_000);
    expect(premium?.pricePerHour).toBe(180_000);
  });

  it('프리미엄 추가 후에도 getBasePrice(one-on-one)는 165,000으로 유지된다', () => {
    expect(getBasePrice('one-on-one')).toBe(165_000);
  });

  it('프리미엄 패키지는 할인 라벨/할인율이 없다', () => {
    expect(premium?.discountRate).toBeUndefined();
    expect(premium?.salesLabel).toBeUndefined();
  });

  it('getSelectedTotalPrice가 프리미엄 선택 시 1,800,000을 반환한다', () => {
    const total = getSelectedTotalPrice('one-on-one', {
      type: 'hour-package',
      packageId: PREMIUM_ID,
    });
    expect(total).toBe(1_800_000);
  });

  // REQ-002
  it('요약 라벨이 프리미엄 상품명으로 표기된다 (t 없음)', () => {
    const summary = getSelectedOptionSummary('one-on-one', {
      type: 'hour-package',
      packageId: PREMIUM_ID,
    });
    expect(summary).toBe('대표 코치와의 수업권');
  });

  it('요약 라벨이 i18n 키 summary.summaryPremiumPackage를 사용한다', () => {
    const summary = getSelectedOptionSummary(
      'one-on-one',
      { type: 'hour-package', packageId: PREMIUM_ID },
      (key) => `t:${key}`
    );
    expect(summary).toBe('t:summary.summaryPremiumPackage');
  });

  it('일반 10시간 패키지는 프리미엄과 구분된 요약을 유지한다', () => {
    const summary = getSelectedOptionSummary('one-on-one', {
      type: 'hour-package',
      packageId: '1on1-10h',
    });
    expect(summary).not.toBe('대표 코치와의 수업권');
    expect(summary).toContain('10시간');
  });
});
