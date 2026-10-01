-- vocab_access_codes: 리드 검색 모드 지원
-- instagram_id nullable로 변경, lead_id/label 컬럼 추가

ALTER TABLE vocab_access_codes
  ALTER COLUMN instagram_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES students(id),
  ADD COLUMN IF NOT EXISTS label text;
