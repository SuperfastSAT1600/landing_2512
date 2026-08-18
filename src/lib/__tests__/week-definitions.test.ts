import { describe, it, expect } from 'vitest';
import { getRecentWeeks, getWeekDef, getWeekLabel } from '../week-definitions';

describe('getRecentWeeks', () => {
  it('returns the requested number of weeks ending with the week containing the date, newest first', () => {
    const weeks = getRecentWeeks(3, '2026-08-17');
    expect(weeks.map((w) => w.start)).toEqual(['2026-08-17', '2026-08-10', '2026-08-03']);
  });

  it('includes the current week even mid-week', () => {
    const weeks = getRecentWeeks(1, '2026-08-19');
    expect(weeks).toHaveLength(1);
    expect(weeks[0].label).toBe(getWeekLabel('2026-08-19'));
  });

  it('clamps at the start of the definition table instead of returning short-of-range holes', () => {
    const weeks = getRecentWeeks(500, '2026-08-17');
    expect(weeks[weeks.length - 1].start).toBe('2024-11-11');
    expect(weeks.every((w) => getWeekDef(w.start) !== null)).toBe(true);
  });

  it('falls back to the last week before an out-of-range future date', () => {
    const weeks = getRecentWeeks(2, '2030-01-01');
    expect(weeks[0].start).toBe('2026-12-21');
    expect(weeks[1].start).toBe('2026-12-14');
  });

  it('returns an empty array for a date before the first defined week', () => {
    expect(getRecentWeeks(4, '2020-01-01')).toEqual([]);
  });
});
