-- REQ-001: 학생 서비스 상태 컬럼 추가 (수업중/부분종료)
-- 휴원은 student_pauses 테이블이 관리하므로 여기서는 partial_end만 추가

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS service_status text NOT NULL DEFAULT 'active'
  CHECK (service_status IN ('active', 'partial_end'));
