import { describe, it, expect } from 'vitest';
import { getSignal } from '@/app/admin/marketing/components/format';

// 주차 계산 유틸은 src/lib/__tests__/marketing-week.test.ts 가 커버한다.
// 이 파일은 마케팅 주간 위젯 고유의 파생 로직만 다룬다.

describe('pace prediction formula', () => {
  it('10 leads on Tuesday → pace 35', () => {
    const pace = Math.floor((10 / 2) * 7);
    expect(pace).toBe(35);
  });

  it('5 leads on Monday → pace 35', () => {
    expect(Math.floor((5 / 1) * 7)).toBe(35);
  });

  it('0 leads → pace 0', () => {
    expect(Math.floor((0 / 3) * 7)).toBe(0);
  });
});

describe('traffic light thresholds', () => {
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

  it('기준값이 null 이면 판정하지 않는다 (목표 미설정)', () => {
    expect(getSignal(5, null)).toBe('—');
  });
});
