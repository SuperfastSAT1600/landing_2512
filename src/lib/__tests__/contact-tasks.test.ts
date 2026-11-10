import { describe, it, expect } from 'vitest';
import { buildContactTasks, reasonLabel } from '@/lib/contact-tasks';
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
  noSchedule: [entry('s2', '나은'), entry('c1', '마루', { remainingHours: 7 }), entry('s3', '다인')],
  neverScheduled: [entry('s4', '라희', { isNew: true })],
  coaches: [
    coach('ben', 'Ben', [student('c1', '마루', 0, 7), student('c2', '바다', 2, 10), student('c3', '사랑', 0, 0)]),
    coach('amy', 'Amy', [student('c4', '아름', 3, 9)]),
    coach('kim', 'Kim', [student('c5', '자두', 0, 4.5), student('c6', '차미', 0, 2), student('c1', '마루', 0, 7)]),
  ],
};

describe('buildContactTasks (REQ-008)', () => {
  const { students, coaches } = buildContactTasks(payload);

  it('학생마다 한 줄로 묶고 해당하는 용건을 모두 담는다', () => {
    expect(students.find(s => s.studentId === 'c1')).toEqual({
      studentId: 'c1', name: '마루', remainingHours: 7,
      reasons: [{ kind: 'coachRoom', coachNames: ['Ben', 'Kim'] }, { kind: 'noSchedule' }],
    });
  });

  it('코칭룸 미예약 → 곧 끝남 → 없음 → 한 번도 안 잡음 순으로, 각 목록 안의 순서를 지킨다', () => {
    expect(students.map(s => s.name)).toEqual(['마루', '자두', '차미', '가윤', '나은', '다인', '라희']);
  });

  it('코칭룸 미예약은 예약 0시간이고 잔여가 남은 학생만', () => {
    expect(students.some(s => s.name === '사랑' || s.name === '바다')).toBe(false);
  });

  it('마지막 일정과 신규 여부를 용건에 담는다', () => {
    expect(students.find(s => s.studentId === 's1')!.reasons).toEqual([{ kind: 'endingSoon', lastDate: '2026-11-12T10:00:00.000Z' }]);
    expect(students.find(s => s.studentId === 's4')!.reasons).toEqual([{ kind: 'neverScheduled', isNew: true }]);
  });

  it('코치는 미예약 학생이 있는 코치만, coach: 를 붙여 따로 담는다', () => {
    expect(coaches).toEqual([
      { targetId: 'coach:ben', name: 'Ben', studentNames: ['마루'] },
      { targetId: 'coach:kim', name: 'Kim', studentNames: ['자두', '차미', '마루'] },
    ]);
  });
});

describe('reasonLabel', () => {
  it('용건 이름. 모르는 값은 그대로', () => {
    expect(reasonLabel('coachRoom')).toBe('코칭룸 미예약');
    expect(reasonLabel('noSchedule')).toBe('스터디홀/보캡 없음');
    expect(reasonLabel('other')).toBe('기타');
    expect(reasonLabel('xyz')).toBe('xyz');
  });
});
