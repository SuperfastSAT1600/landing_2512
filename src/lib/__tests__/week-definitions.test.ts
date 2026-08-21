import { describe, it, expect } from 'vitest';
import {
  getCurrentWeekDef,
  getRecentWeeks,
  getWeekDef,
  getWeekLabel,
} from '../week-definitions';

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

describe('getCurrentWeekDef', () => {
  it('오늘이 속한 주차를 돌려준다', () => {
    expect(getCurrentWeekDef(new Date('2026-08-20T05:00:00Z'))).toMatchObject({
      label: '26년 08월 03주차',
      start: '2026-08-17',
    });
  });

  it('월요일 이른 아침(KST)에도 그 주차로 판정한다 — UTC 날짜로 자르면 지난 주차가 된다', () => {
    // 2026-08-16T23:00Z = 08-17(월) 08:00 KST
    expect(getCurrentWeekDef(new Date('2026-08-16T23:00:00Z'))?.start).toBe('2026-08-17');
  });

  it('일요일 늦은 밤(KST)은 아직 그 주차다', () => {
    // 2026-08-16T14:00Z = 08-16(일) 23:00 KST
    expect(getCurrentWeekDef(new Date('2026-08-16T14:00:00Z'))?.start).toBe('2026-08-10');
  });

  it('정의 범위 밖이면 null', () => {
    expect(getCurrentWeekDef(new Date('2030-01-01T00:00:00Z'))).toBeNull();
  });
});
