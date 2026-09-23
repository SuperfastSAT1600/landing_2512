ALTER TABLE test_codes ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'untimed'
  CHECK (mode IN ('timed', 'untimed', 'per_question'));
