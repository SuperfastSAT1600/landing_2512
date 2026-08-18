ALTER TABLE coach_onboarding_invites
  ADD COLUMN IF NOT EXISTS draft_data jsonb,
  ADD COLUMN IF NOT EXISTS draft_saved_at timestamptz;
