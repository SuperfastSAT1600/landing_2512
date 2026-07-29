ALTER TABLE coach_onboarding_submissions
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text;
