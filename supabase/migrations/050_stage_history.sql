-- 퍼널 스테이지 이동 이력 (상담 날짜와 함께 히스토리 관리)
-- 각 엔트리: {stage, label, entered_at}
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS stage_history JSONB NOT NULL DEFAULT '[]'::jsonb;
