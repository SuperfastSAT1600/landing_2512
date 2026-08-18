-- REQ-001: service_status에 'ended'(종료) 추가
ALTER TABLE students
  DROP CONSTRAINT IF EXISTS students_service_status_check;

ALTER TABLE students
  ADD CONSTRAINT students_service_status_check
  CHECK (service_status IN ('active', 'partial_end', 'ended'));
