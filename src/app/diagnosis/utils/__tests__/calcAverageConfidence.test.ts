import { describe, it, expect } from 'vitest';
import { calcAverageConfidence } from '../calcAverageConfidence';

describe('calcAverageConfidence', () => {
  it('returns null for empty input', () => {
    expect(calcAverageConfidence({})).toBeNull();
  });

  it('returns the single value when only one entry', () => {
    expect(calcAverageConfidence({ q1: 75 })).toBe(75.0);
  });

  it('returns mean of percentage-based confidence values', () => {
    // 75 + 25 = 100 / 2 = 50
    expect(calcAverageConfidence({ q1: 75, q2: 25 })).toBe(50.0);
    // 100 + 50 + 0 = 150 / 3 = 50
    expect(calcAverageConfidence({ q1: 100, q2: 50, q3: 0 })).toBe(50.0);
    // 75 + 75 + 50 = 200 / 3 ≈ 66.7
    expect(calcAverageConfidence({ q1: 75, q2: 75, q3: 50 })).toBe(66.7);
  });
});
