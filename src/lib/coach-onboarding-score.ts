import type { CoachOnboardingSubmission, HeadCoachCriteria } from '@/types/coach-onboarding';

const IVY_LEAGUE = [
  'harvard', 'yale', 'princeton', 'columbia', 'penn', 'university of pennsylvania',
  'brown', 'dartmouth', 'cornell',
];

function isIvyLeague(university: string): boolean {
  const lower = university.toLowerCase();
  return IVY_LEAGUE.some(ivy => lower.includes(ivy));
}

export function calculateCompletenessScore(s: Omit<CoachOnboardingSubmission, 'id' | 'invite_id' | 'completeness_score' | 'head_coach_criteria' | 'head_coach_criteria_met' | 'is_head_coach_eligible' | 'status' | 'reviewed_at' | 'reviewed_by' | 'created_at'>): number {
  let score = 0;

  // 학력 (35점)
  if (s.high_school?.trim()) score += 5;
  if (s.university?.trim() && s.undergrad_major?.trim() && s.university_entry_year) score += 10;
  if (s.enrollment_status) score += 5;
  if (s.grad_school?.trim() && s.grad_major?.trim()) score += 10;
  if (s.sat_rw_score) score += 2.5;
  if (s.sat_math_score) score += 2.5;

  // 경력 수치 (40점)
  const years = s.teaching_years ?? 0;
  if (years >= 1) score += 3;
  if (years >= 5) score += 4;
  if (years >= 10) score += 3;

  if ((s.teaching_hours_total ?? 0) >= 1) score += 5;
  if ((s.students_taught ?? 0) >= 1) score += 5;
  if (s.past_academies && s.past_academies.length >= 1) score += 5;
  if (s.subjects && s.subjects.length >= 1) score += 5;

  const hasSubjectDirections = s.subject_directions &&
    Object.values(s.subject_directions).some(v => v?.trim());
  if (hasSubjectDirections) score += 5;
  if (s.language_preference) score += 5;

  // 증빙 (25점)
  const screenshots = s.score_improvement_screenshot_urls ?? [];
  if (screenshots.length >= 1) score += 10;
  if (screenshots.length >= 5) score += 15;

  return Math.round(score);
}

export function calculateHeadCoachCriteria(s: Omit<CoachOnboardingSubmission, 'id' | 'invite_id' | 'completeness_score' | 'head_coach_criteria' | 'head_coach_criteria_met' | 'is_head_coach_eligible' | 'status' | 'reviewed_at' | 'reviewed_by' | 'created_at'>): HeadCoachCriteria {
  const screenshots = s.score_improvement_screenshot_urls ?? [];
  const academies = s.past_academies ?? [];

  return {
    ivy_league: isIvyLeague(s.university ?? ''),
    senior_or_grad: s.enrollment_status === 'graduated',
    five_years_experience: (s.teaching_years ?? 0) >= 5,
    ten_years_experience: (s.teaching_years ?? 0) >= 10,
    digital_sat_1550:
      s.sat_rw_score != null &&
      s.sat_math_score != null &&
      s.sat_rw_score + s.sat_math_score >= 1550,
    academy_instructor: academies.some(a => a.role === 'instructor'),
    thousand_hours: (s.teaching_hours_total ?? 0) >= 1000,
    five_score_screenshots: screenshots.length >= 5,
  };
}

export function countCriteriaMet(criteria: HeadCoachCriteria): number {
  // ten_years_experience is a sub-criterion of five_years_experience, count separately
  return Object.values(criteria).filter(Boolean).length;
}

export const HEAD_COACH_ELIGIBLE_THRESHOLD = 4;
