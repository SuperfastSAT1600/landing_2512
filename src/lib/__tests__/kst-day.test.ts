import { describe, it, expect } from 'vitest';
import { toKstDay, toMs } from '@/lib/kst-day';

describe('toKstDay', () => {
  it('naive 문자열은 KST 벽시계로 간주해 날짜만 자른다', () => {
    expect(toKstDay('2026-08-17 09:30:00')).toBe('2026-08-17');
    expect(toKstDay('2026-08-17T23:59:59')).toBe('2026-08-17');
  });

  it('Z/offset이 붙은 인스턴트는 KST로 변환한다', () => {
    // 2026-08-16T23:00Z = 2026-08-17 08:00 KST
    expect(toKstDay('2026-08-16T23:00:00Z')).toBe('2026-08-17');
    // 2026-08-17T15:30Z = 2026-08-18 00:30 KST
    expect(toKstDay('2026-08-17T15:30:00Z')).toBe('2026-08-18');
    expect(toKstDay('2026-08-17T09:00:00+09:00')).toBe('2026-08-17');
  });

  it('빈 값·잘못된 값은 null', () => {
    expect(toKstDay(null)).toBeNull();
    expect(toKstDay(undefined)).toBeNull();
    expect(toKstDay('')).toBeNull();
    expect(toKstDay('nonsense-date-Z')).toBeNull();
  });
});

describe('toMs', () => {
  it('naive는 KST 벽시계로 해석한다', () => {
    expect(toMs('2026-08-17T00:00:00')).toBe(Date.UTC(2026, 7, 16, 15, 0, 0));
  });

  it('Z 인스턴트는 그대로 파싱한다', () => {
    expect(toMs('2026-08-17T00:00:00Z')).toBe(Date.UTC(2026, 7, 17, 0, 0, 0));
  });

  it('naive와 Z 표기가 같은 순간이면 동일한 ms', () => {
    expect(toMs('2026-08-17T09:00:00')).toBe(toMs('2026-08-17T00:00:00Z'));
  });

  it('빈 값·잘못된 값은 null', () => {
    expect(toMs(null)).toBeNull();
    expect(toMs('2026-13')).toBeNull();
  });
});
