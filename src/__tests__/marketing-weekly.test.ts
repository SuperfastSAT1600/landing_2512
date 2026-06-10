import { describe, it, expect } from 'vitest';

// ISO 주차 유틸 — route에서 복사해서 직접 테스트
function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getISOWeekBounds(year: number, week: number): { start: string; end: string } {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1 + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  };
}

function getDaysElapsed(weekStart: string, today: string): number {
  const start = new Date(weekStart);
  const end = new Date(today);
  const diff = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  return Math.max(1, Math.min(diff, 7));
}

describe('ISO week number', () => {
  it('2026-01-05 (월) is week 2', () => {
    expect(getISOWeekNumber(new Date('2026-01-05'))).toBe(2);
  });

  it('2026-01-01 (목) is week 1', () => {
    expect(getISOWeekNumber(new Date('2026-01-01'))).toBe(1);
  });

  it('2025-12-29 (월) is week 1 of 2026', () => {
    expect(getISOWeekNumber(new Date('2025-12-29'))).toBe(1);
  });

  it('2026-06-09 (화) is week 24', () => {
    expect(getISOWeekNumber(new Date('2026-06-09'))).toBe(24);
  });
});

describe('ISO week bounds', () => {
  it('week 24 of 2026 starts on Monday 2026-06-08', () => {
    const { start, end } = getISOWeekBounds(2026, 24);
    expect(start).toBe('2026-06-08');
    expect(end).toBe('2026-06-14');
  });

  it('week 1 of 2026 starts on 2025-12-29', () => {
    const { start } = getISOWeekBounds(2026, 1);
    expect(start).toBe('2025-12-29');
  });

  it('start is always Monday and end is always Sunday', () => {
    for (let w = 1; w <= 52; w++) {
      const { start, end } = getISOWeekBounds(2026, w);
      const startDay = new Date(start).getUTCDay();
      const endDay = new Date(end).getUTCDay();
      expect(startDay).toBe(1); // Monday
      expect(endDay).toBe(0);  // Sunday
    }
  });

  it('end is always 6 days after start', () => {
    const { start, end } = getISOWeekBounds(2026, 24);
    const diff = (new Date(end).getTime() - new Date(start).getTime()) / 86400000;
    expect(diff).toBe(6);
  });
});

describe('getDaysElapsed', () => {
  it('Monday = 1 day elapsed', () => {
    expect(getDaysElapsed('2026-06-08', '2026-06-08')).toBe(1);
  });

  it('Tuesday = 2 days elapsed', () => {
    expect(getDaysElapsed('2026-06-08', '2026-06-09')).toBe(2);
  });

  it('Sunday = 7 days elapsed', () => {
    expect(getDaysElapsed('2026-06-08', '2026-06-14')).toBe(7);
  });

  it('never returns less than 1', () => {
    expect(getDaysElapsed('2026-06-08', '2026-06-07')).toBe(1);
  });

  it('never returns more than 7', () => {
    expect(getDaysElapsed('2026-06-08', '2026-07-01')).toBe(7);
  });
});

describe('pace prediction formula', () => {
  it('10 leads on Tuesday → pace 35', () => {
    const daysElapsed = 2;
    const thisWeekTotal = 10;
    const pace = Math.floor((thisWeekTotal / daysElapsed) * 7);
    expect(pace).toBe(35);
  });

  it('5 leads on Monday → pace 35', () => {
    const pace = Math.floor((5 / 1) * 7);
    expect(pace).toBe(35);
  });

  it('0 leads → pace 0', () => {
    const pace = Math.floor((0 / 3) * 7);
    expect(pace).toBe(0);
  });
});

describe('traffic light thresholds', () => {
  function getSignal(actual: number, expected: number): '🟢' | '🟡' | '🔴' | '—' {
    if (expected === 0) return '—';
    if (actual >= expected * 0.9) return '🟢';
    if (actual >= expected * 0.5) return '🟡';
    return '🔴';
  }

  it('actual = expected → 🟢', () => {
    expect(getSignal(10, 10)).toBe('🟢');
  });

  it('actual = 90% of expected → 🟢', () => {
    expect(getSignal(9, 10)).toBe('🟢');
  });

  it('actual = 89% of expected → 🟡', () => {
    expect(getSignal(8, 9)).toBe('🟡'); // 8/9 = 88.9%
  });

  it('actual = 50% of expected → 🟡', () => {
    expect(getSignal(5, 10)).toBe('🟡');
  });

  it('actual = 49% of expected → 🔴', () => {
    expect(getSignal(4, 9)).toBe('🔴'); // 4/9 = 44.4%
  });

  it('expected = 0 → —', () => {
    expect(getSignal(0, 0)).toBe('—');
    expect(getSignal(3, 0)).toBe('—');
  });
});
