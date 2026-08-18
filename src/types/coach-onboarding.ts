export type EnrollmentStatus = 'graduated' | 'enrolled';
export type LanguagePreference = 'english' | 'korean' | 'any';
export type AcademyRole = 'instructor' | 'ta' | 'other';
export type SubmissionStatus = 'submitted' | 'reviewed' | 'approved' | 'rejected';

export interface PastAcademy {
  name: string;
  role: AcademyRole;
}

export interface HeadCoachCriteria {
  ivy_league: boolean;
  senior_or_grad: boolean;
  five_years_experience: boolean;
  ten_years_experience: boolean;
  digital_sat_1550: boolean;
  academy_instructor: boolean;
  thousand_hours: boolean;
  five_score_screenshots: boolean;
}

export interface CoachOnboardingInvite {
  id: string;
  token: string;
  coach_name: string;
  coach_email: string | null;
  expires_at: string;
  used_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CoachOnboardingSubmission {
  id: string;
  invite_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  high_school: string;
  university: string;
  undergrad_major: string;
  university_entry_year: number;
  enrollment_status: EnrollmentStatus;
  grad_school: string | null;
  grad_major: string | null;
  sat_rw_score: number | null;
  sat_math_score: number | null;
  teaching_years: number;
  teaching_hours_total: number;
  students_taught: number;
  past_academies: PastAcademy[] | null;
  appeal_points: string;
  subjects: string[];
  subjects_other: string | null;
  language_preference: LanguagePreference;
  teaching_philosophy: string;
  subject_directions: Record<string, string> | null;
  score_improvement_screenshot_urls: string[] | null;
  profile_image_url: string | null;
  completeness_score: number | null;
  head_coach_criteria: HeadCoachCriteria | null;
  head_coach_criteria_met: number;
  is_head_coach_eligible: boolean;
  status: SubmissionStatus;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
}

// Step-specific form data types
export interface OnboardingStep1 {
  name: string;
  phone: string;
  email: string;
  high_school: string;
  university: string;
  undergrad_major: string;
  university_entry_year: number | '';
  enrollment_status: EnrollmentStatus | '';
  grad_school: string;
  grad_major: string;
  sat_rw_score: number | '';
  sat_math_score: number | '';
}

export interface OnboardingStep2 {
  teaching_years: number | '';
  teaching_hours_total: number | '';
  students_taught: number | '';
  past_academies: PastAcademy[];
  appeal_points: string;
  subjects: string[];
  subjects_other: string;
  language_preference: LanguagePreference | '';
}

export interface OnboardingStep3 {
  teaching_philosophy: string;
  subject_directions: Record<string, string>;
  score_improvement_screenshots: File[];
}
