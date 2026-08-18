-- Migration 033: Test Contents
-- Adds instagram_id to fulltest_submissions and creates practice_submissions table

ALTER TABLE fulltest_submissions ADD COLUMN IF NOT EXISTS instagram_id text;

CREATE TABLE IF NOT EXISTS practice_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id text NOT NULL DEFAULT 'june-2026-subskill-300',
  instagram_id text NOT NULL,
  student_name text,
  answers jsonb NOT NULL DEFAULT '{}',
  correct_count int NOT NULL DEFAULT 0,
  total_count int NOT NULL DEFAULT 0,
  submitted_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_practice_submissions_test_id ON practice_submissions(test_id);
CREATE INDEX IF NOT EXISTS idx_practice_submissions_submitted_at ON practice_submissions(submitted_at DESC);
