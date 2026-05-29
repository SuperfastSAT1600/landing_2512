-- META 광고 추적 필드 추가
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS ad_name    TEXT,
  ADD COLUMN IF NOT EXISTS adset_name TEXT;

COMMENT ON COLUMN students.ad_name    IS 'META 광고명 (ad name)';
COMMENT ON COLUMN students.adset_name IS 'META 광고세트명 (adset name)';
