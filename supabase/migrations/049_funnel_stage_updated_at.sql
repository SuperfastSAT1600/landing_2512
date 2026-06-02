-- 현재 퍼널 스테이지에 진입한 시각을 기록하는 컬럼
-- NULL = 마이그레이션 이전 데이터 (created_at으로 폴백)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS funnel_stage_updated_at TIMESTAMPTZ DEFAULT NULL;
