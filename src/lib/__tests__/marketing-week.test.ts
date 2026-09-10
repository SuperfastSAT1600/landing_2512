import { describe, it, expect } from 'vitest';
import {
  kstDateStr,
  isoWeekOf,
  isoWeekBounds,
  mondayOf,
  weekEndOf,
  monthWeekLabel,
  isoWeekLabel,
  weekLabelOf,
  shiftWeekStart,
  recentWeekStarts,
  daysElapsedInWeek,
} from '../marketing-week';

// REQ-001: 마케팅 주차 유틸 — 주차 키는 KST 기준 해당 주 월요일
describe('kstDateStr', () => {
  it('월요일 00:30 KST 를 그 월요일로 계산한다 (UTC 기준 버그 회귀 방지)', () => {
    // 2026-09-07(월) 00:30 KST = 2026-09-06(일) 15:30 UTC
    const now = new Date('2026-09-06T15:30:00Z');
    expect(kstDateStr(now)).toBe('2026-09-07');
    expect(now.toISOString().slice(0, 10)).toBe('2026-09-06'); // UTC 로는 아직 일요일
  });

  it('일요일 23:59 KST 는 아직 그 주 일요일이다', () => {
    // 2026-09-06(일) 23:59 KST = 2026-09-06 14:59 UTC
    expect(kstDateStr(new Date('2026-09-06T14:59:00Z'))).toBe('2026-09-06');
  });

  it('월요일 09:00 KST 이후에도 같은 날짜를 유지한다', () => {
    expect(kstDateStr(new Date('2026-09-07T00:00:00Z'))).toBe('2026-09-07');
  });
});

describe('isoWeekOf', () => {
  it('현행 마케팅 페이지와 동일한 주차를 낸다', () => {
    expect(isoWeekOf('2026-08-31')).toEqual({ year: 2026, week: 36 });
    expect(isoWeekOf('2026-09-03')).toEqual({ year: 2026, week: 36 });
    expect(isoWeekOf('2026-09-07')).toEqual({ year: 2026, week: 37 });
  });

  it('시각이 붙은 문자열도 날짜만 사용한다', () => {
    expect(isoWeekOf('2026-09-03T18:20:00+09:00')).toEqual({ year: 2026, week: 36 });
  });

  it('연말 롤오버에서 ISO 주차 연도를 쓴다', () => {
    // 2025-12-29(월) 은 ISO 로 2026년 1주차 — 달력 연도(2025)가 아니다
    expect(isoWeekOf('2025-12-29')).toEqual({ year: 2026, week: 1 });
    expect(isoWeekOf('2026-12-28')).toEqual({ year: 2026, week: 53 });
    expect(isoWeekOf('2027-01-04')).toEqual({ year: 2027, week: 1 });
  });
});

describe('isoWeekBounds', () => {
  it('월요일~일요일 경계를 낸다', () => {
    expect(isoWeekBounds(2026, 36)).toEqual({ start: '2026-08-31', end: '2026-09-06' });
  });

  it('연말 주차도 경계가 이어진다', () => {
    expect(isoWeekBounds(2026, 53)).toEqual({ start: '2026-12-28', end: '2027-01-03' });
    expect(isoWeekBounds(2027, 1)).toEqual({ start: '2027-01-04', end: '2027-01-10' });
  });
});

describe('mondayOf', () => {
  it('주중 아무 날이든 그 주 월요일을 낸다', () => {
    expect(mondayOf('2026-09-03')).toBe('2026-08-31');
    expect(mondayOf('2026-08-31')).toBe('2026-08-31');
    expect(mondayOf('2026-09-06')).toBe('2026-08-31'); // 일요일은 같은 주
    expect(mondayOf('2026-09-07')).toBe('2026-09-07');
  });

  it('timestamp 문자열에서도 동작한다 (inquiry_date 버킷팅용)', () => {
    expect(mondayOf('2026-09-03T18:20:00+09:00')).toBe('2026-08-31');
  });
});

describe('weekEndOf', () => {
  it('주차 시작(월)에 대한 종료일(일)을 낸다', () => {
    expect(weekEndOf('2026-08-31')).toBe('2026-09-06');
    expect(weekEndOf('2026-12-28')).toBe('2027-01-03');
  });
});

describe('monthWeekLabel / weekLabelOf', () => {
  it('팀 라벨 형식 "YY년 MM월 NN주차" 를 낸다', () => {
    expect(monthWeekLabel('2026-08-31')).toBe('26년 09월 01주차');
    expect(weekLabelOf('2026-08-31')).toBe('26년 09월 01주차');
  });

  it('달을 걸친 주는 목요일이 속한 달로 센다', () => {
    // 2026-08-31 ~ 09-06 의 목요일은 09-03 → 9월 첫째 주
    expect(monthWeekLabel('2026-08-31')).toBe('26년 09월 01주차');
    expect(monthWeekLabel('2026-08-24')).toBe('26년 08월 04주차');
    expect(monthWeekLabel('2026-09-07')).toBe('26년 09월 02주차');
  });

  it('week-definitions.ts 수동 주차표와 전부 일치한다', async () => {
    const { WEEK_DEFINITIONS } = await import('@/lib/week-definitions');
    const mismatched = WEEK_DEFINITIONS.filter((w) => monthWeekLabel(w.start) !== w.label);
    expect(mismatched).toEqual([]);
  });

  it('주차표가 끝나는 2026-12-27 이후에도 계산된다', () => {
    expect(monthWeekLabel('2027-01-04')).toBe('27년 01월 01주차');
    expect(monthWeekLabel('2027-02-01')).toBe('27년 02월 01주차');
  });

  it('ISO 주차 라벨은 YoY 정렬용으로 남는다', () => {
    expect(isoWeekLabel(2026, 36)).toBe('2026년 36주차');
  });
});

describe('shiftWeekStart', () => {
  it('주 단위로 이동한다', () => {
    expect(shiftWeekStart('2026-08-31', -1)).toBe('2026-08-24');
    expect(shiftWeekStart('2026-08-31', 1)).toBe('2026-09-07');
    expect(shiftWeekStart('2026-08-31', 0)).toBe('2026-08-31');
  });

  it('연도를 넘어서도 이동한다', () => {
    expect(shiftWeekStart('2027-01-04', -1)).toBe('2026-12-28');
    expect(shiftWeekStart('2026-12-28', 1)).toBe('2027-01-04');
  });
});

describe('recentWeekStarts', () => {
  it('과거에서 현재 순으로 count 개를 낸다', () => {
    expect(recentWeekStarts(3, '2026-08-31')).toEqual([
      '2026-08-17',
      '2026-08-24',
      '2026-08-31',
    ]);
  });

  it('count 가 1이면 기준 주차만 낸다', () => {
    expect(recentWeekStarts(1, '2026-08-31')).toEqual(['2026-08-31']);
  });
});

describe('daysElapsedInWeek', () => {
  it('월요일은 1일, 목요일은 4일 경과다', () => {
    expect(daysElapsedInWeek('2026-08-31', '2026-08-31')).toBe(1);
    expect(daysElapsedInWeek('2026-08-31', '2026-09-03')).toBe(4);
    expect(daysElapsedInWeek('2026-08-31', '2026-09-06')).toBe(7);
  });

  it('주차 범위를 벗어난 날짜는 1~7 로 클램프한다', () => {
    expect(daysElapsedInWeek('2026-08-31', '2026-08-30')).toBe(1);
    expect(daysElapsedInWeek('2026-08-31', '2026-09-20')).toBe(7);
  });
});
