import { describe, it, expect } from 'vitest';
import { classifyRWQuestion, classifyRWStudent } from '../rw-profile';

describe('classifyRWQuestion', () => {
  it('correct + confidence ≥ 75 → sniper', () => {
    expect(classifyRWQuestion({ isCorrect: true, confidence: 75,  chosenOptionIdx: 2, correctOptionIdx: 2 })).toBe('sniper');
    expect(classifyRWQuestion({ isCorrect: true, confidence: 100, chosenOptionIdx: 0, correctOptionIdx: 0 })).toBe('sniper');
  });

  it('correct + confidence ≤ 50 → doubt', () => {
    expect(classifyRWQuestion({ isCorrect: true, confidence: 50, chosenOptionIdx: 1, correctOptionIdx: 1 })).toBe('doubt');
    expect(classifyRWQuestion({ isCorrect: true, confidence: 25, chosenOptionIdx: 3, correctOptionIdx: 3 })).toBe('doubt');
    expect(classifyRWQuestion({ isCorrect: true, confidence: 0,  chosenOptionIdx: 2, correctOptionIdx: 2 })).toBe('doubt');
  });

  it('wrong before correct option appeared → hasty', () => {
    // correct is at index 2, student picked index 0
    expect(classifyRWQuestion({ isCorrect: false, confidence: 3, chosenOptionIdx: 0, correctOptionIdx: 2 })).toBe('hasty');
    // correct is at index 3, student picked index 1
    expect(classifyRWQuestion({ isCorrect: false, confidence: 5, chosenOptionIdx: 1, correctOptionIdx: 3 })).toBe('hasty');
  });

  it('wrong after correct option appeared → avoider', () => {
    // correct is at index 0, student picked index 2
    expect(classifyRWQuestion({ isCorrect: false, confidence: 2, chosenOptionIdx: 2, correctOptionIdx: 0 })).toBe('avoider');
    // correct is at index 1, student picked index 3
    expect(classifyRWQuestion({ isCorrect: false, confidence: 4, chosenOptionIdx: 3, correctOptionIdx: 1 })).toBe('avoider');
  });

  it('invalid indices → avoider fallback', () => {
    expect(classifyRWQuestion({ isCorrect: false, confidence: 2, chosenOptionIdx: -1, correctOptionIdx: 2 })).toBe('avoider');
    expect(classifyRWQuestion({ isCorrect: false, confidence: 2, chosenOptionIdx: 1, correctOptionIdx: -1 })).toBe('avoider');
  });
});

describe('classifyRWStudent', () => {
  it('empty input → no-data profile', () => {
    const result = classifyRWStudent([]);
    expect(result.headline).toContain('데이터');
  });

  it('avoider ≥ 30% → avoider profile', () => {
    const types = ['avoider', 'avoider', 'avoider', 'sniper', 'sniper', 'sniper', 'sniper', 'sniper', 'sniper', 'sniper'] as const;
    const result = classifyRWStudent([...types]);
    expect(result.profileType).toBe('avoider');
  });

  it('hasty ≥ 30% → hasty profile', () => {
    const types = ['hasty', 'hasty', 'hasty', 'sniper', 'sniper', 'sniper', 'sniper', 'sniper', 'sniper', 'sniper'] as const;
    const result = classifyRWStudent([...types]);
    expect(result.profileType).toBe('hasty');
  });

  it('doubt ≥ 30% → doubt profile', () => {
    const types = ['doubt', 'doubt', 'doubt', 'sniper', 'sniper', 'sniper', 'sniper', 'sniper', 'sniper', 'sniper'] as const;
    const result = classifyRWStudent([...types]);
    expect(result.profileType).toBe('doubt');
  });

  it('hasty ≥ 25% AND avoider ≥ 25% → chaotic (takes priority over individual rules)', () => {
    // 3/10 = 30% hasty, 3/10 = 30% avoider — chaotic wins over hasty/avoider solo
    const types = ['hasty', 'hasty', 'hasty', 'avoider', 'avoider', 'avoider', 'sniper', 'sniper', 'sniper', 'sniper'] as const;
    const result = classifyRWStudent([...types]);
    expect(result.profileType).toBe('chaotic');
  });

  it('(sniper + doubt) ≥ 70% → master', () => {
    const types = ['sniper', 'sniper', 'sniper', 'sniper', 'sniper', 'doubt', 'doubt', 'hasty', 'avoider', 'avoider'] as const;
    // sniper=5, doubt=2, hasty=1, avoider=2 → (5+2)/10 = 70% → master
    const result = classifyRWStudent([...types]);
    expect(result.profileType).toBe('master');
  });

  it('profile contains headline, evidence, and prescription', () => {
    const result = classifyRWStudent(['sniper', 'doubt', 'hasty', 'avoider']);
    expect(result.headline).toBeTruthy();
    expect(result.evidence).toContain('4문제');
    expect(result.prescription).toBeTruthy();
  });

  it('evidence includes all non-zero type counts', () => {
    const result = classifyRWStudent(['sniper', 'sniper', 'hasty', 'avoider', 'avoider', 'avoider']);
    expect(result.evidence).toContain('직격수 2문제');
    expect(result.evidence).toContain('성급한 선점 1문제');
    expect(result.evidence).toContain('정답 회피 3문제');
  });
});
