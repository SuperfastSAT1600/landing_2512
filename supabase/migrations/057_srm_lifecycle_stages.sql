-- Migration 057: SRM lifecycle stage tracking
-- Tracks each enrolled student through onboarding and recurring lesson cycles

CREATE TYPE srm_stage AS ENUM (
  'onboarding_coach',
  'onboarding_first_class',
  'onboarding_studyhall',
  'onboarding_prep',
  'active',
  'cycle_next_class',
  'cycle_studyhall',
  'cycle_active',
  'renewal_pending',
  'churned'
);

CREATE TABLE srm_lifecycle_stages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID REFERENCES students(id) ON DELETE CASCADE,
  sfv2_profile_id TEXT,
  stage         srm_stage NOT NULL,
  due_date      DATE,
  completed_at  TIMESTAMPTZ,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_has_identifier CHECK (student_id IS NOT NULL OR sfv2_profile_id IS NOT NULL)
);

CREATE INDEX idx_srm_lifecycle_student    ON srm_lifecycle_stages(student_id);
CREATE INDEX idx_srm_lifecycle_sfv2       ON srm_lifecycle_stages(sfv2_profile_id);
CREATE INDEX idx_srm_lifecycle_due_date   ON srm_lifecycle_stages(due_date) WHERE completed_at IS NULL;

COMMENT ON TABLE srm_lifecycle_stages IS
  'One row per lifecycle stage attempt. The active stage is the most recent row with completed_at IS NULL.';
