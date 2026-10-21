import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase-sfv2', () => ({ supabaseSFv2: {} }));
vi.mock('@/lib/slack-sfv2', () => ({ notifyScheduleInputStatus: vi.fn() }));

import { getWindow } from '../route';

describe('getWindow', () => {
  afterEach(() => vi.useRealTimers());

  it('08:00 KST 실행 시 전날 00:00 KST부터 현재까지', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-19T23:00:00Z')); // 10/20 08:00 KST

    const { windowStart, windowEnd, windowLabel } = getWindow();

    expect(windowStart.toISOString()).toBe('2026-10-18T15:00:00.000Z'); // 10/19 00:00 KST
    expect(windowEnd.toISOString()).toBe('2026-10-19T23:00:00.000Z');
    expect(windowLabel).toBe('10-19 00:00 ~ 10-20 08:00 KST');
  });
});
