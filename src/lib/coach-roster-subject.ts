import { rollUpSrmStatus } from '@/lib/srm-status';
import { byStatusThenName, type RosterCoach, type RosterStatus, type RosterStudent } from './coach-roster';

export const ROSTER_SUBJECTS = ['SAT', 'AP'] as const;
export type RosterSubject = (typeof ROSTER_SUBJECTS)[number];

/** 칸마다 담는 SRM 매칭 과목 — special은 SAT 칸에 함께 */
const MATCHES: Record<RosterSubject, string[]> = { SAT: ['SAT', 'special'], AP: ['AP'] };

/** 코치 한 명을 한 과목 칸으로 좁힌다 — 그 칸 과목 매칭 학생만, 상태·숫자도 그 과목 기준 */
export function coachForSubject(coach: RosterCoach, subject: RosterSubject): RosterCoach {
  const students: RosterStudent[] = coach.students.flatMap((s) => {
    const hits = s.subjects.filter((x) => MATCHES[subject].includes(x.subject));
    return hits.length ? [{ ...s, status: rollUpSrmStatus(hits.map((h) => h.status)) as RosterStatus, subjects: hits }] : [];
  }).sort(byStatusThenName);
  const count = (st: RosterStatus) => students.filter((s) => s.status === st).length;
  return { ...coach, students, activeCount: count('active'), onboardingCount: count('onboarding'), pausedCount: count('paused') };
}

/** 그 과목 칸 순서 — 정한 순서(null은 뒤), 같으면 API 순서(sort_order → 등록순) 유지 */
export function sortForSubject(coaches: RosterCoach[], subject: RosterSubject): RosterCoach[] {
  return coaches.map((c, i) => ({ c, i })).sort((a, b) => {
    const x = a.c.order[subject], y = b.c.order[subject];
    if (x !== y) {
      if (x === null) return 1;
      if (y === null) return -1;
      return x - y;
    }
    return a.i - b.i;
  }).map(({ c }) => c);
}
