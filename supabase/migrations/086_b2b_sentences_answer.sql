-- Add sentences_answer column to b2b_homework_submissions
-- Stores JSON: { "s01": { "ko": "...", "v1": "...", ... "v5": "..." }, "s02": {...}, "s03": {...} }
ALTER TABLE public.b2b_homework_submissions
  ADD COLUMN IF NOT EXISTS sentences_answer text;
