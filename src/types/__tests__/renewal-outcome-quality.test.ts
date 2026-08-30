import { describe, it, expect } from 'vitest';
import {
  RENEWAL_OUTCOME_QUALITIES,
  RENEWAL_PAID_QUALITY_LABELS,
  RENEWAL_DROP_QUALITY_LABELS,
  getRenewalOutcomeQualityLabel,
} from '@/types/crm';

describe('재결제 결과 품질 라벨 (REQ-002)', () => {
  it('저장값은 두 가지뿐이다', () => {
    expect([...RENEWAL_OUTCOME_QUALITIES]).toEqual(['good', 'bad']);
  });

  it('같은 값이 단계에 따라 다르게 읽힌다', () => {
    expect(getRenewalOutcomeQualityLabel('4', 'good')).toBe('좋은 재결제');
    expect(getRenewalOutcomeQualityLabel('4', 'bad')).toBe('나쁜 재결제');
    expect(getRenewalOutcomeQualityLabel('5', 'good')).toBe('좋은 이탈');
    expect(getRenewalOutcomeQualityLabel('5', 'bad')).toBe('나쁜 이탈');
  });

  it('두 라벨 맵이 모든 값을 덮는다', () => {
    for (const q of RENEWAL_OUTCOME_QUALITIES) {
      expect(RENEWAL_PAID_QUALITY_LABELS[q]).toBeTruthy();
      expect(RENEWAL_DROP_QUALITY_LABELS[q]).toBeTruthy();
    }
  });
});
