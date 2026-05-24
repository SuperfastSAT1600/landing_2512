-- CRM: diagnostic_test_results에 student_id FK 추가
-- 기존 데이터 보호를 위해 nullable

ALTER TABLE diagnostic_test_results
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE SET NULL;

CREATE INDEX idx_diagnostic_results_student ON diagnostic_test_results(student_id)
  WHERE student_id IS NOT NULL;
