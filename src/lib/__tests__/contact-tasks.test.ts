import { describe, it, expect } from 'vitest';
import { buildContactTasks } from '@/lib/contact-tasks';
import type { BriefingPayload } from '@/app/api/cron/schedule-input-status/briefing-payload';

const entry = (userId: string, name: string, extra: Partial<BriefingPayload['endingSoon'][number]> = {}) => ({
  userId, name, remainingHours: 10, isNew: false, studyHallMinutes: 0, vocabMinutes: 0, lastDate: null, ...extra,
});
const student = (userId: string, name: string, scheduledHours: number, remainingHours: number) =>
  ({ userId, name, scheduledHours, remainingHours, ratio: remainingHours > 0 ? (scheduledHours / remainingHours) * 100 : null });
const coach = (key: string, name: string, students: ReturnType<typeof student>[]) =>
  ({ key, name, studentCount: students.length, scheduledHours: 0, remainingHours: 0, ratio: null, deltaPp: null, students });

const payload: BriefingPayload = {
  generatedAt: '2026-11-10T23:00:00.000Z',
  endingSoon: [entry('s1', '가윤', { lastDate: '2026-11-12T10:00:00.000Z' })],
  noSchedule: [entry('s2', '나은'), entry('s3', '다인')],
  neverScheduled: [entry('s4', '라희', { isNew: true })],
  coaches: [
    coach('ben', 'Ben', [student('c1', '마루', 0, 7), student('c2', '바다', 2, 10), student('c3', '사랑', 0, 0)]),
    coach('amy', 'Amy', [student('c4', '아름', 3, 9)]),
    coach('kim', 'Kim', [student('c5', '자두', 0, 4.5), student('c6', '차미', 0, 2), student('c1', '마루', 0, 7)]),
  ],
};

describe('buildContactTasks (REQ-005)', () => {
  const groups = buildContactTasks(payload);
  const byKind = Object.fromEntries(groups.map(g => [g.kind, g]));

  it('그룹은 코칭룸 미예약 → 코치 → 곧 끝남 → 없음 → 한 번도 안 잡음 순이다', () => {
    expect(groups.map(g => g.kind)).toEqual(['coachRoom', 'coach', 'endingSoon', 'noSchedule', 'neverScheduled']);
  });

  it('코칭룸 미예약은 예약 0시간이고 잔여가 남은 학생만, 코치가 여럿이면 한 줄에 모아 담는다', () => {
    expect(byKind.coachRoom.tasks).toEqual([
      { targetId: 'c1', name: '마루', remainingHours: 7, coachNames: ['Ben', 'Kim'] },
      { targetId: 'c5', name: '자두', remainingHours: 4.5, coachNames: ['Kim'] },
      { targetId: 'c6', name: '차미', remainingHours: 2, coachNames: ['Kim'] },
    ]);
  });

  it('코치는 미예약 학생이 있는 코치만, 해당 학생 이름과 함께 담는다', () => {
    expect(byKind.coach.tasks).toEqual([
      { targetId: 'ben', name: 'Ben', studentNames: ['마루'] },
      { targetId: 'kim', name: 'Kim', studentNames: ['자두', '차미', '마루'] },
    ]);
  });

  it('스터디홀/보캡 목록은 브리핑 순서를 유지하고 마지막 일정·신규 여부를 담는다', () => {
    expect(byKind.endingSoon.tasks).toEqual([{ targetId: 's1', name: '가윤', remainingHours: 10, lastDate: '2026-11-12T10:00:00.000Z' }]);
    expect(byKind.noSchedule.tasks.map(t => t.name)).toEqual(['나은', '다인']);
    expect(byKind.neverScheduled.tasks).toEqual([{ targetId: 's4', name: '라희', remainingHours: 10, isNew: true }]);
  });
});
