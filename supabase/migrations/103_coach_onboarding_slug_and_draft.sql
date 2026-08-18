ALTER TABLE coach_onboarding_invites
  ADD COLUMN IF NOT EXISTS coach_slug text REFERENCES coaches(slug) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_coach_onboarding_invites_coach_slug
  ON coach_onboarding_invites(coach_slug);

ALTER TABLE coach_onboarding_submissions
  ADD COLUMN IF NOT EXISTS blog_post_draft text;
