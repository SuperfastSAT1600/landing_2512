ALTER TABLE srm_communications
  ADD COLUMN IF NOT EXISTS event_id TEXT,
  ADD COLUMN IF NOT EXISTS coach_id TEXT;

CREATE INDEX IF NOT EXISTS idx_srm_comm_event ON srm_communications(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_srm_comm_coach ON srm_communications(coach_id) WHERE coach_id IS NOT NULL;
