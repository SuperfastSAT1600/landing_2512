import { describe, it, expect } from 'vitest';
import { examTotal, isValidSectionScore, isValidExamMonth } from '@/lib/exam-score';

describe('examTotal', () => {
  it('RW·Math 가 모두 있으면 합을 낸다', () => {
    expect(examTotal(710, 780)).toBe(1490);
  });

  it('한쪽이라도 비면 총점을 만들지 않는다', () => {
    expect(examTotal(710, null)).toBeNull();
    expect(examTotal(null, 780)).toBeNull();
    expect(examTotal(null, null)).toBeNull();
  });
});

describe('isValidSectionScore', () => {
  it('200~800 범위의 10점 단위를 통과시킨다', () => {
    [200, 400, 710, 800].forEach((s) => expect(isValidSectionScore(s)).toBe(true));
  });

  it('범위를 벗어나면 거부한다', () => {
    [190, 810, 0, -10].forEach((s) => expect(isValidSectionScore(s)).toBe(false));
  });

  it('10점 단위가 아니면 거부한다', () => {
    expect(isValidSectionScore(715)).toBe(false);
  });

  it('숫자가 아니면 거부한다', () => {
    [NaN, Infinity, '710' as unknown as number, null as unknown as number].forEach((s) =>
      expect(isValidSectionScore(s)).toBe(false)
    );
  });
});

describe('isValidExamMonth', () => {
  it('YYYY-MM 만 통과시킨다', () => {
    expect(isValidExamMonth('2026-08')).toBe(true);
    expect(isValidExamMonth('2026-12')).toBe(true);
    expect(isValidExamMonth('2026-01')).toBe(true);
  });

  it('월 범위를 벗어나거나 형식이 다르면 거부한다', () => {
    ['2026-13', '2026-00', '26-08', '2026-8', '2026-08-15', '', '  '].forEach((m) =>
      expect(isValidExamMonth(m)).toBe(false)
    );
  });
});
