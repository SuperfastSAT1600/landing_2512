-- 리드 A/B/C 등급 (Hot/Warm/Cold) — 매니저 수동 확정값.
-- NULL이면 autoLeadTier()로 자동 분류한 값을 사용한다.
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS lead_tier TEXT DEFAULT NULL
    CHECK (lead_tier IS NULL OR lead_tier IN ('A', 'B', 'C'));

COMMENT ON COLUMN students.lead_tier IS '수동 확정 등급 (A=Hot/B=Warm/C=Cold). NULL이면 자동 분류 사용';
