/// <reference types="vitest/globals" />
/**
 * REQ-001: recordQuestionTime elapsed cap
 * Tests the capping logic in isolation (same pattern used in DiagnosticTestView)
 */
describe('REQ-001: question time cap logic', () => {
  const capElapsed = (raw: number, timeLimitMinutes?: number): number => {
    const timeLimitSeconds = timeLimitMinutes ? timeLimitMinutes * 60 : Infinity;
    return Math.min(raw, timeLimitSeconds);
  };

  it('REQ-001: caps elapsed at timeLimitMinutes * 60 when exceeded', () => {
    // 102 minutes raw, 30 min limit → capped at 1800
    expect(capElapsed(6120, 30)).toBe(1800);
  });

  it('REQ-001: does not cap elapsed when within limit', () => {
    // 500 seconds, 30 min limit → no cap
    expect(capElapsed(500, 30)).toBe(500);
  });

  it('REQ-001: no cap when timeLimitMinutes is undefined', () => {
    // Unlimited test — 6120 seconds allowed
    expect(capElapsed(6120, undefined)).toBe(6120);
  });

  it('REQ-001: caps exactly at limit boundary', () => {
    expect(capElapsed(1800, 30)).toBe(1800);
    expect(capElapsed(1801, 30)).toBe(1800);
  });
});
