CREATE TABLE IF NOT EXISTS portal_narrative_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL,
  report_date TEXT NOT NULL,
  item_type TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  narrative TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS portal_narrative_cache_lookup
  ON portal_narrative_cache (profile_id, report_date, item_type, input_hash);
