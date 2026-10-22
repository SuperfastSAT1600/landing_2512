import { describe, expect, it } from 'vitest';
import type { CoachRoster, RosterCoach, RosterStudent } from '@/lib/coach-roster';
import { applyDelta, buildCoachRatios } from '../coach-ratio';

const student = (profileId: string, status: RosterStudent['status']): RosterStudent =>
  ({ profileId, crmStudentId: null, name: profileId, status, subjects: [] });

const coach = (key: string, name: string, students: RosterStudent[]): RosterCoach => ({
  key, slug: key, name, linked: true, registered: true,
  activeCount: 0, onboardingCount: 0, pausedCount: 0, students,
});

const roster = (coaches: RosterCoach[]): CoachRoster => ({ coaches, unassigned: [] });

describe('buildCoachRatios', () => {
  it('재원·온보딩 학생의 예약 시간 합 ÷ 잔여 수업권 합', () => {
    const r = buildCoachRatios(
      roster([coach('a', '가', [student('s1', 'active'), student('s2', 'onboarding')])]),
      new Map([['s1', 120], ['s2', 60]]),
      new Map([['s1', 6], ['s2', 4]]),
    );
    expect(r).toEqual([{
      key: 'a', name: '가', studentCount: 2, scheduledHours: 3, remainingHours: 10, ratio: 30, deltaPp: null,
      students: [
        { name: 's2', scheduledHours: 1, remainingHours: 4, ratio: 25 },
        { name: 's1', scheduledHours: 2, remainingHours: 6, ratio: expect.closeTo(33.33, 1) },
      ],
    }]);
  });

  it('휴원 학생은 제외하고, 남은 학생이 없는 코치는 목록에서 뺀다', () => {
    const r = buildCoachRatios(
      roster([coach('a', '가', [student('s1', 'paused')]), coach('b', '나', [student('s2', 'active'), student('s3', 'paused')])]),
      new Map([['s2', 60], ['s3', 600]]),
      new Map([['s2', 2], ['s3', 50]]),
    );
    expect(r.map(c => [c.key, c.studentCount, c.scheduledHours, c.remainingHours])).toEqual([['b', 1, 1, 2]]);
  });

  it('잔여 수업권이 0이면 비율은 null', () => {
    const r = buildCoachRatios(roster([coach('a', '가', [student('s1', 'active')])]), new Map(), new Map());
    expect(r[0].ratio).toBeNull();
  });

  it('학생은 비율이 낮은 순, 잔여 0인 학생은 맨 뒤', () => {
    const r = buildCoachRatios(
      roster([coach('a', '가', [student('x', 'active'), student('y', 'active'), student('z', 'active')])]),
      new Map([['x', 120], ['y', 60]]),
      new Map([['x', 2], ['y', 4]]),
    );
    expect(r[0].students.map(s => [s.name, s.ratio])).toEqual([['y', 25], ['x', 100], ['z', null]]);
  });

  it('코치 현황 정렬 순서를 유지', () => {
    const r = buildCoachRatios(
      roster([coach('z', '하', [student('s1', 'active')]), coach('a', '가', [student('s2', 'active')])]),
      new Map(), new Map(),
    );
    expect(r.map(c => c.key)).toEqual(['z', 'a']);
  });
});

describe('applyDelta', () => {
  const base = { key: 'a', name: '가', studentCount: 1, scheduledHours: 3, remainingHours: 10, ratio: 30, deltaPp: null, students: [] };

  it('전날 비율과의 차이를 %p로 계산', () => {
    const prev = new Map([['a', { scheduled_hours: 2, remaining_hours: 10 }]]);
    expect(applyDelta([base], prev)[0].deltaPp).toBeCloseTo(10);
  });

  it('전날 스냅샷이 없거나 전날 잔여가 0이면 null', () => {
    expect(applyDelta([base], new Map())[0].deltaPp).toBeNull();
    const zero = new Map([['a', { scheduled_hours: 0, remaining_hours: 0 }]]);
    expect(applyDelta([base], zero)[0].deltaPp).toBeNull();
  });
});
