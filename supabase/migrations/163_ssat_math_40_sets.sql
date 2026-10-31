-- SSAT Math: allow sets 1-40 (original check capped set_number at 10)
ALTER TABLE ssat_math_questions
  DROP CONSTRAINT IF EXISTS ssat_math_questions_set_number_check;

ALTER TABLE ssat_math_questions
  ADD CONSTRAINT ssat_math_questions_set_number_check
  CHECK (set_number BETWEEN 1 AND 40);
