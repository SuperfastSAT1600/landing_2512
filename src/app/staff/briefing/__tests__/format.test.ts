import { describe, expect, it } from 'vitest';
import { daysSince, formatDelta, formatKstDateTime, formatKstMonthDay, formatRatio, lastContactLabel } from '../format';

const now = new Date('2026-10-22T03:00:00Z'); // 10/22 12:00 KST

describe('staff briefing format', () => {
  it('마지막 연락은 KST 날짜 기준 일수', () => {
    expect(daysSince('2026-10-22T01:00:00Z', now)).toBe(0);
    expect(daysSince('2026-10-21T16:00:00Z', now)).toBe(0); // 10/22 01:00 KST
    expect(daysSince('2026-10-21T10:00:00Z', now)).toBe(1); // 10/21 19:00 KST
    expect(daysSince('2026-10-12T10:00:00Z', now)).toBe(10);
  });

  it('연락 라벨', () => {
    expect(lastContactLabel(undefined, now)).toBe('연락 기록 없음');
    expect(lastContactLabel('2026-10-22T01:00:00Z', now)).toBe('마지막 연락 오늘');
    expect(lastContactLabel('2026-10-19T01:00:00Z', now)).toBe('마지막 연락 3일 전');
  });

  it('KST 날짜·시각 표기', () => {
    expect(formatKstMonthDay('2026-10-21T16:00:00Z')).toBe('10/22');
    expect(formatKstDateTime('2026-10-21T16:05:00Z')).toBe('10/22 01:05');
  });

  it('비율과 변동치', () => {
    expect(formatRatio(null)).toBe('-');
    expect(formatRatio(37.4)).toBe('37%');
    expect(formatDelta(null)).toBe('-');
    expect(formatDelta(3.24)).toBe('▲3.2%p');
    expect(formatDelta(-1)).toBe('▼1.0%p');
    expect(formatDelta(0.01)).toBe('변동 없음');
  });
});
