import { describe, it, expect } from 'vitest';
import { isWithinAvailability, outsideAvailability } from '../availability-window';
import type { AvailabilitySlot } from '../student-availability';

// 학생 현지(LA) 월요일 16:30~22:00 — KST로는 화요일 새벽 (PDT 기준 08:30~14:00)
const slot: AvailabilitySlot = {
  weekday: 0, start_minute_local: 16 * 60 + 30, end_minute_local: 22 * 60, tz: 'America/Los_Angeles',
  effective_from: '2026-10-19', effective_until: '2026-11-30', notes: null,
};

describe('isWithinAvailability', () => {
  it('가능 시간 안(KST로 환산된 시각)이면 true', () => {
    expect(isWithinAvailability('2026-10-27T11:00:00+09:00', [slot])).toBe(true); // LA 월 19:00 PDT
  });
  it('시작 시각은 포함, 종료 시각은 제외', () => {
    expect(isWithinAvailability('2026-10-27T08:30:00+09:00', [slot])).toBe(true);
    expect(isWithinAvailability('2026-10-27T14:00:00+09:00', [slot])).toBe(false);
  });
  it('요일이 다르면 false', () => {
    expect(isWithinAvailability('2026-10-28T11:00:00+09:00', [slot])).toBe(false);
  });
  it('DST 전환 뒤에는 KST 시각이 1시간 밀린다 (11/2 월 19:00 PST = 11/3 12:00 KST)', () => {
    expect(isWithinAvailability('2026-11-03T12:00:00+09:00', [slot])).toBe(true);
    expect(isWithinAvailability('2026-11-03T11:00:00+09:00', [slot])).toBe(true); // 18:00 PST도 구간 안
    expect(isWithinAvailability('2026-11-03T07:00:00+09:00', [slot])).toBe(false); // 14:00 PST
  });
  it('유효 기간 밖이면 false', () => {
    expect(isWithinAvailability('2026-12-08T11:00:00+09:00', [slot])).toBe(false);
  });
  it('입력한 가능 시간이 없으면 제한하지 않는다', () => {
    expect(isWithinAvailability('2026-10-28T11:00:00+09:00', [])).toBe(true);
  });
});

describe('outsideAvailability', () => {
  it('밖에 있는 시각만 돌려주고 null은 건너뛴다', () => {
    expect(outsideAvailability(['2026-10-27T11:00:00+09:00', '2026-10-28T11:00:00+09:00', null], [slot]))
      .toEqual(['2026-10-28T11:00:00+09:00']);
  });
});
