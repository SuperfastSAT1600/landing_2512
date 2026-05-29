-- 직전 SAT 응시 월 추가 (YYYY-MM 형식, 예: '2025-03')
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS previous_test_date text DEFAULT NULL;

COMMENT ON COLUMN students.previous_test_date IS
  '직전 SAT 응시 연월 (YYYY-MM). previous_score_status=scored 일 때만 유효.';
