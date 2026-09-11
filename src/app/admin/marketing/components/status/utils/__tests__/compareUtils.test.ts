import { describe, it, expect } from 'vitest';
import {
  calcDeltaRate,
  getMonthRange,
  getQuarterRange,
  getCurrentQuarter,
  getPreviousQuarter,
  getMonthLabel,
  getQuarterLabel,
} from '../compareUtils';

describe('calcDeltaRate', () => {
  it('정상 케이스: 증가', () => {
    expect(calcDeltaRate(150, 100)).toBe(50);
  });

  it('정상 케이스: 감소', () => {
    expect(calcDeltaRate(80, 100)).toBe(-20);
  });

  it('previous=0이면 null 반환', () => {
    expect(calcDeltaRate(50, 0)).toBeNull();
  });

  it('소수점 1자리 반올림', () => {
    expect(calcDeltaRate(110, 300)).toBe(-63.3);
  });

  it('current=0, previous=0이면 null', () => {
    expect(calcDeltaRate(0, 0)).toBeNull();
  });
});

describe('getMonthRange', () => {
  it('일반 월 (7월)', () => {
    expect(getMonthRange(2026, 7)).toEqual({ from: '2026-07-01', to: '2026-07-31' });
  });

  it('2월 평년 (2025)', () => {
    expect(getMonthRange(2025, 2)).toEqual({ from: '2025-02-01', to: '2025-02-28' });
  });

  it('2월 윤년 (2024)', () => {
    expect(getMonthRange(2024, 2)).toEqual({ from: '2024-02-01', to: '2024-02-29' });
  });

  it('12월 말일', () => {
    expect(getMonthRange(2026, 12)).toEqual({ from: '2026-12-01', to: '2026-12-31' });
  });

  it('1월', () => {
    expect(getMonthRange(2026, 1)).toEqual({ from: '2026-01-01', to: '2026-01-31' });
  });
});

describe('getQuarterRange', () => {
  it('Q1: 1~3월', () => {
    expect(getQuarterRange(2026, 1)).toEqual({ from: '2026-01-01', to: '2026-03-31' });
  });

  it('Q2: 4~6월', () => {
    expect(getQuarterRange(2026, 2)).toEqual({ from: '2026-04-01', to: '2026-06-30' });
  });

  it('Q3: 7~9월', () => {
    expect(getQuarterRange(2026, 3)).toEqual({ from: '2026-07-01', to: '2026-09-30' });
  });

  it('Q4: 10~12월', () => {
    expect(getQuarterRange(2026, 4)).toEqual({ from: '2026-10-01', to: '2026-12-31' });
  });
});

describe('getCurrentQuarter', () => {
  it('1월 → Q1', () => {
    expect(getCurrentQuarter(new Date('2026-01-15'))).toEqual({ year: 2026, quarter: 1 });
  });

  it('4월 → Q2', () => {
    expect(getCurrentQuarter(new Date('2026-04-01'))).toEqual({ year: 2026, quarter: 2 });
  });

  it('9월 → Q3', () => {
    expect(getCurrentQuarter(new Date('2026-09-10'))).toEqual({ year: 2026, quarter: 3 });
  });

  it('12월 → Q4', () => {
    expect(getCurrentQuarter(new Date('2026-12-31'))).toEqual({ year: 2026, quarter: 4 });
  });
});

describe('getPreviousQuarter', () => {
  it('Q2 → Q1 (같은 해)', () => {
    expect(getPreviousQuarter(2026, 2)).toEqual({ year: 2026, quarter: 1 });
  });

  it('Q1 → 이전 해 Q4', () => {
    expect(getPreviousQuarter(2026, 1)).toEqual({ year: 2025, quarter: 4 });
  });

  it('Q4 → Q3 (같은 해)', () => {
    expect(getPreviousQuarter(2026, 4)).toEqual({ year: 2026, quarter: 3 });
  });
});

describe('레이블 함수', () => {
  it('getMonthLabel', () => {
    expect(getMonthLabel(2026, 8)).toBe('2026년 8월');
    expect(getMonthLabel(2026, 1)).toBe('2026년 1월');
  });

  it('getQuarterLabel', () => {
    expect(getQuarterLabel(2026, 3)).toBe('2026년 Q3');
    expect(getQuarterLabel(2025, 4)).toBe('2025년 Q4');
  });
});
