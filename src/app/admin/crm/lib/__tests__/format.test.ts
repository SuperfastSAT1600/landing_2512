import { describe, it, expect } from 'vitest';
import { won, manwon, kstShortDate, daysSince } from '../format';

describe('won / manwon', () => {
  // REQ-007 (crm-quality-cleanup): StrategyStats·StatsDetailModal·B2bStats 공용
  it('원 단위 천 단위 구분', () => {
    expect(won(1200000)).toBe(`${(1200000).toLocaleString()}원`);
  });

  it('만 단위 반올림, 0은 그대로 0', () => {
    expect(manwon(1234567)).toBe(`${(123).toLocaleString()}만`);
    expect(manwon(0)).toBe('0');
  });
});

describe('kstShortDate', () => {
  it('KST 기준 월·일 — UTC 15시는 KST 다음 날', () => {
    expect(kstShortDate('2026-10-02T15:30:00Z')).toBe('10. 03.');
    expect(kstShortDate('2026-10-02T14:30:00Z')).toBe('10. 02.');
  });

  it('값이 없으면 -', () => {
    expect(kstShortDate(null)).toBe('-');
    expect(kstShortDate(undefined)).toBe('-');
    expect(kstShortDate('')).toBe('-');
  });
});

describe('daysSince', () => {
  it('경과 일수를 내림한다', () => {
    const now = Date.parse('2026-10-10T12:00:00Z');
    expect(daysSince('2026-10-01T12:00:00Z', now)).toBe(9);
    expect(daysSince('2026-10-09T13:00:00Z', now)).toBe(0);
  });
});
