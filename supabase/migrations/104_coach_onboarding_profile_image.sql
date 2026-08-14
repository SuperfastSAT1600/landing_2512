-- Add profile_image_url to coach_onboarding_submissions
ALTER TABLE coach_onboarding_submissions
  ADD COLUMN IF NOT EXISTS profile_image_url text;
