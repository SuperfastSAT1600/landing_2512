import type { CoachRoster } from '@/lib/coach-roster';

export interface CoachStudentCount { active: number; onboarding: number }

// 코치 현황과 같은 기준(SRM 진행 중 매칭)의 코치별 담당 학생 수. CRM에 등록된 코치(slug 있음)만 담는다.
export function studentCountsBySlug(roster: CoachRoster): Map<string, CoachStudentCount> {
  const counts = new Map<string, CoachStudentCount>();
  for (const c of roster.coaches) {
    if (c.slug) counts.set(c.slug, { active: c.activeCount, onboarding: c.onboardingCount });
  }
  return counts;
}
