-- Migration 121: 글로벌 매출에 국가(country_code) 추가
--
-- 배경: 전 세계 대상 테스트 판매가 늘면서 어느 국가에서 매출이 나오는지 알아야
--       채널·가격 판단이 가능하다. ISO 3166-1 alpha-2 코드로 저장하고
--       국가명/국기는 앱(src/lib/countries.ts)에서 파생한다.
-- 기존 행은 국가 미상이므로 NULL 허용 — UI에서 "미지정"으로 묶는다.
-- 선례: 113_global_sales.sql
-- 사용자가 Supabase에서 직접 실행한다.

ALTER TABLE global_sales
  ADD COLUMN country_code TEXT
  CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$');

CREATE INDEX idx_global_sales_country_code ON global_sales(country_code);

COMMENT ON COLUMN global_sales.country_code IS 'ISO 3166-1 alpha-2 (대문자). NULL = 국가 미지정';
