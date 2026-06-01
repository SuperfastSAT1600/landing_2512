-- 재시도 세일즈 전략 배정 일자 추가
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS retry_assigned_at TIMESTAMPTZ;
