import { describe, expect, it } from 'vitest';
import { classifySchedules, type StudentSchedule } from '../classify';

const now = new Date('2026-10-21T23:00:00Z');
const hoursLater = (h: number) => new Date(now.getTime() + h * 3600 * 1000);

const student = (over: Partial<StudentSchedule> & { name: string }): StudentSchedule => ({
  userId: over.name,
  remainingHours: 10,
  everScheduled: true,
  isNew: false,
  studyHallMinutes: 0,
  vocabMinutes: 0,
  lastDate: null,
  ...over,
});

describe('classifySchedules', () => {
  it('마지막 일정이 48시간 이내면 종료 임박', () => {
    const r = classifySchedules([student({ name: '가', lastDate: hoursLater(30), studyHallMinutes: 60 })], now);
    expect(r.endingSoon.map(e => e.name)).toEqual(['가']);
    expect(r.noSchedule).toEqual([]);
  });

  it('마지막 일정이 48시간 이후면 어느 목록에도 없음', () => {
    const r = classifySchedules([student({ name: '가', lastDate: hoursLater(72) })], now);
    expect(r).toEqual({ endingSoon: [], noSchedule: [], neverScheduled: [] });
  });

  it('미래 일정이 없고 과거에 있었으면 지금 없음', () => {
    const r = classifySchedules([student({ name: '나윤진', everScheduled: true })], now);
    expect(r.noSchedule.map(e => e.name)).toEqual(['나윤진']);
  });

  it('일정이 한 번도 없으면 한 번도 없음', () => {
    const r = classifySchedules([student({ name: '신규', everScheduled: false })], now);
    expect(r.neverScheduled.map(e => e.name)).toEqual(['신규']);
  });

  it('new 여부는 항목에 그대로 전달', () => {
    const r = classifySchedules([student({ name: '신규', everScheduled: false, isNew: true })], now);
    expect(r.neverScheduled[0].isNew).toBe(true);
  });

  it('각 목록은 잔여 수업 시간이 적은 순, 같으면 이름순', () => {
    const r = classifySchedules([
      student({ name: '다', remainingHours: 5 }),
      student({ name: '나', remainingHours: 0 }),
      student({ name: '가', remainingHours: 5 }),
    ], now);
    expect(r.noSchedule.map(e => e.name)).toEqual(['나', '가', '다']);
  });
});
