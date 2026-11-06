import { describe, it, expect } from 'vitest';
import { coachForSubject } from '../coach-roster-subject';
import type { RosterCoach } from '../coach-roster';

const coach: RosterCoach = {
  key: 'ben', slug: 'ben', name: 'Ben', subjects: ['SAT', 'AP'], linked: true, registered: true,
  activeCount: 2, onboardingCount: 0, pausedCount: 1,
  students: [
    { profileId: 'p1', crmStudentId: null, name: '둘 다', status: 'active', subjects: [{ subject: 'AP', status: 'paused' }, { subject: 'SAT', status: 'active' }] },
    { profileId: 'p2', crmStudentId: null, name: 'AP만', status: 'active', subjects: [{ subject: 'AP', status: 'active' }] },
    { profileId: 'p3', crmStudentId: null, name: 'SAT만', status: 'paused', subjects: [{ subject: 'SAT', status: 'paused' }] },
  ],
};

// REQ-003 (coach-roster-by-subject)
describe('coachForSubject', () => {
  it('그 과목 매칭 학생만 남기고, 학생 상태·칩·숫자는 그 과목 기준', () => {
    const sat = coachForSubject(coach, 'SAT');
    expect(sat.students.map((s) => [s.name, s.status, s.subjects.map((x) => x.subject)])).toEqual([['둘 다', 'active', ['SAT']], ['SAT만', 'paused', ['SAT']]]);
    expect([sat.activeCount, sat.onboardingCount, sat.pausedCount]).toEqual([1, 0, 1]);

    const ap = coachForSubject(coach, 'AP');
    // 재원 → 휴원 순
    expect(ap.students.map((s) => [s.name, s.status])).toEqual([['AP만', 'active'], ['둘 다', 'paused']]);
    expect([ap.activeCount, ap.pausedCount]).toEqual([1, 1]);
  });

  it('그 과목 학생이 없으면 0명', () => {
    const r = coachForSubject({ ...coach, students: [coach.students[2]] }, 'AP');
    expect(r.students).toEqual([]);
    expect(r.activeCount).toBe(0);
  });
});
