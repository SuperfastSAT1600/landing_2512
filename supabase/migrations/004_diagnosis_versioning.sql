-- Diagnostic test versioning system
-- Questions move from hardcoded TS file to DB, with version tracking

CREATE TABLE IF NOT EXISTS diagnostic_test_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number  INTEGER NOT NULL,
  title           VARCHAR(255) NOT NULL,
  time_limit_minutes INTEGER NOT NULL DEFAULT 30,
  directions      TEXT,
  questions       JSONB NOT NULL,
  is_current      BOOLEAN NOT NULL DEFAULT false,
  created_from    UUID REFERENCES diagnostic_test_versions(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Enforce at most one current version at the DB level
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_current_version
  ON diagnostic_test_versions(is_current)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_test_versions_version_number
  ON diagnostic_test_versions(version_number);

-- Add version FK to tokens (nullable for backward compat)
ALTER TABLE diagnostic_access_tokens
  ADD COLUMN IF NOT EXISTS test_version_id UUID REFERENCES diagnostic_test_versions(id);

-- Add version FK to results (nullable for backward compat)
ALTER TABLE diagnostic_test_results
  ADD COLUMN IF NOT EXISTS test_version_id UUID REFERENCES diagnostic_test_versions(id);

CREATE INDEX IF NOT EXISTS idx_tokens_test_version_id
  ON diagnostic_access_tokens(test_version_id);
CREATE INDEX IF NOT EXISTS idx_results_test_version_id
  ON diagnostic_test_results(test_version_id);

-- RLS for versions table
ALTER TABLE diagnostic_test_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow reading test versions"
  ON diagnostic_test_versions FOR SELECT USING (true);
