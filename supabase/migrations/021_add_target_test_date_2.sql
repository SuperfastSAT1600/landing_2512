-- 두 번째 목표 시험일 추가 (선택 입력)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS target_test_date_2 DATE;

COMMENT ON COLUMN students.target_test_date_2 IS '두 번째 목표 시험 날짜 (선택)';
