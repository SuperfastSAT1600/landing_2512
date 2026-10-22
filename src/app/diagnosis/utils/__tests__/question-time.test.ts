import { describe, it, expect } from 'vitest';
import { questionElapsedSeconds } from '../question-time';

describe('questionElapsedSeconds', () => {
  it('REQ-009: returns whole seconds between question start and now', () => {
    expect(questionElapsedSeconds(1_000, 46_900, 40)).toBe(45);
  });

  it('REQ-009: caps at the effective time limit, not only a per-student override', () => {
    // 한 문제에 두 시간 머문 기록이 40분 제한을 넘어 저장되지 않는다
    expect(questionElapsedSeconds(0, 2 * 3600 * 1000, 40)).toBe(40 * 60);
  });

  it('REQ-009: applies no cap when there is no time limit', () => {
    expect(questionElapsedSeconds(0, 7_200_000, null)).toBe(7_200);
  });

  it('REQ-009: never returns a negative value', () => {
    expect(questionElapsedSeconds(5_000, 1_000, 30)).toBe(0);
  });
});
