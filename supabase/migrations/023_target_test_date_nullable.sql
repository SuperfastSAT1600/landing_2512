-- 역사 데이터 import 시 목표 시험일이 없는 경우가 있으므로 nullable로 변경
ALTER TABLE students ALTER COLUMN target_test_date DROP NOT NULL;

COMMENT ON COLUMN students.target_test_date IS '목표 시험 날짜 (YYYY-MM-DD), 미정이면 NULL';
