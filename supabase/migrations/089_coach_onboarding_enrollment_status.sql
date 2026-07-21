-- Simplify enrollment_status: remove 3학년/2학년 distinction
ALTER TABLE coach_onboarding_submissions
  DROP CONSTRAINT IF EXISTS coach_onboarding_submissions_enrollment_status_check;

ALTER TABLE coach_onboarding_submissions
  ADD CONSTRAINT coach_onboarding_submissions_enrollment_status_check
  CHECK (enrollment_status IN ('graduated', 'enrolled'));
