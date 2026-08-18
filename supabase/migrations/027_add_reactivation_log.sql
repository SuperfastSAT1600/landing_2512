-- CRM: students 테이블에 재활성화 로그 컬럼 추가
-- reactivation_log: ReactivationEntry[] (JSONB 배열)
-- 각 항목: { id, attempted_at, strategy, outcome, notes? }

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS reactivation_log JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 재활성화 시도 중인 학생 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_students_reactivating
  ON students(lead_status)
  WHERE lead_status = 'reactivating';
