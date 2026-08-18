ALTER TABLE srm_communications
  ADD COLUMN IF NOT EXISTS trigger_type TEXT CHECK (trigger_type IN ('no_show','late','no_class','no_study_hall','manual')) DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS auto_count   INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reason       TEXT,
  ADD COLUMN IF NOT EXISTS resolution   TEXT CHECK (resolution IN ('scheduled','will_contact','no_intent','unreachable','resolved','other')),
  ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT;
