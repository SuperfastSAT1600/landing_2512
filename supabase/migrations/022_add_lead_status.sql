ALTER TABLE students
  ADD COLUMN IF NOT EXISTS lead_status TEXT NOT NULL DEFAULT 'active'
    CHECK (lead_status IN ('active', 'inactive', 'reactivating'));

-- 기존 이탈 학생(funnel_stage='churned')은 비활성으로 일괄 전환
UPDATE students SET lead_status = 'inactive' WHERE funnel_stage = 'churned';

COMMENT ON COLUMN students.lead_status IS 'active=활성(칸반 표시) | inactive=비활성(숨김) | reactivating=재활성화 시도 중';
