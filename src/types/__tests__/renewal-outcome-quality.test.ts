import { describe, it, expect } from 'vitest';
import {
  RENEWAL_OUTCOME_QUALITIES,
  RENEWAL_PAID_QUALITY_LABELS,
  RENEWAL_DROP_QUALITY_LABELS,
  getRenewalOutcomeQualityLabel,
  getRenewalOutcomeReasons,
  RENEWAL_PAID_REASONS,
  RENEWAL_DROP_REASONS,
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

describe('결과 사유 목록 (REQ-002)', () => {
  it('단계와 품질 조합마다 다른 목록을 준다', () => {
    expect(getRenewalOutcomeReasons('4', 'good')).toBe(RENEWAL_PAID_REASONS.good);
    expect(getRenewalOutcomeReasons('4', 'bad')).toBe(RENEWAL_PAID_REASONS.bad);
    expect(getRenewalOutcomeReasons('5', 'good')).toBe(RENEWAL_DROP_REASONS.good);
    expect(getRenewalOutcomeReasons('5', 'bad')).toBe(RENEWAL_DROP_REASONS.bad);
  });

  it('좋음과 나쁨의 사유가 섞이지 않는다', () => {
    // '예산 부담인데 좋은 이탈' 같은 조합이 애초에 불가능해야 한다.
    expect(RENEWAL_DROP_REASONS.good).not.toContain('예산 부담');
    expect(RENEWAL_DROP_REASONS.bad).not.toContain('목표 점수 달성');
    expect(RENEWAL_PAID_REASONS.good).not.toContain('할인·조건 요구');
  });

  it('네 목록 모두 기타를 마지막에 둔다', () => {
    for (const list of [
      RENEWAL_PAID_REASONS.good,
      RENEWAL_PAID_REASONS.bad,
      RENEWAL_DROP_REASONS.good,
      RENEWAL_DROP_REASONS.bad,
    ]) {
      expect(list.at(-1)).toBe('기타');
    }
  });
});
