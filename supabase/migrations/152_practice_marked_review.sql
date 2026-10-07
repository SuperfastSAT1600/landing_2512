ALTER TABLE practice_progress
  ADD COLUMN IF NOT EXISTS marked_for_review jsonb NOT NULL DEFAULT '[]';

ALTER TABLE practice_submissions
  ADD COLUMN IF NOT EXISTS marked_for_review jsonb NOT NULL DEFAULT '[]';
