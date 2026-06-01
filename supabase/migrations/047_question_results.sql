ALTER TABLE practice_submissions
ADD COLUMN IF NOT EXISTS question_results jsonb DEFAULT '{}'::jsonb;
