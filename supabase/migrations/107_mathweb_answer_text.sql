-- Add answer_text to math_problems (REQ: answer can be image OR text)
ALTER TABLE public.math_problems
  ADD COLUMN IF NOT EXISTS answer_text TEXT;

-- Rollback:
-- ALTER TABLE public.math_problems DROP COLUMN IF EXISTS answer_text;
