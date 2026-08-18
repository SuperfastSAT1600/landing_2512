-- 리드 등급(lead_tier) 개념 폐기: students.lead_tier 컬럼 제거.
-- A/B/C 등급 UI·자동분류(autoLeadTier)·전략 상관 차원까지 코드에서 모두 제거됨.
-- 053_add_lead_tier.sql 에서 추가했던 컬럼과 CHECK 제약을 되돌린다.

ALTER TABLE students DROP COLUMN IF EXISTS lead_tier;
