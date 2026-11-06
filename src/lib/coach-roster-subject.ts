import { byStatusThenName, type RosterCoach, type RosterStatus, type RosterStudent } from './coach-roster';

/** 코치 한 명을 한 과목으로 좁힌다 — 그 과목 매칭 학생만, 상태·숫자도 그 과목 기준 */
export function coachForSubject(coach: RosterCoach, subject: string): RosterCoach {
  const students: RosterStudent[] = coach.students.flatMap((s) => {
    const hit = s.subjects.find((x) => x.subject === subject);
    return hit ? [{ ...s, status: hit.status, subjects: [hit] }] : [];
  }).sort(byStatusThenName);
  const count = (st: RosterStatus) => students.filter((s) => s.status === st).length;
  return { ...coach, students, activeCount: count('active'), onboardingCount: count('onboarding'), pausedCount: count('paused') };
}
