-- REQ-003: Add previous SAT score columns to diagnostic_test_results
ALTER TABLE diagnostic_test_results
  ADD COLUMN IF NOT EXISTS previous_score_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS previous_test_date DATE,
  ADD COLUMN IF NOT EXISTS previous_rw_score SMALLINT,
  ADD COLUMN IF NOT EXISTS previous_math_score SMALLINT;

ALTER TABLE diagnostic_test_results
  ADD CONSTRAINT chk_previous_score_status
    CHECK (previous_score_status IN ('scored', 'never_taken', 'dont_remember')),
  ADD CONSTRAINT chk_previous_rw_score
    CHECK (previous_rw_score IS NULL OR previous_rw_score BETWEEN 200 AND 800),
  ADD CONSTRAINT chk_previous_math_score
    CHECK (previous_math_score IS NULL OR previous_math_score BETWEEN 200 AND 800);
