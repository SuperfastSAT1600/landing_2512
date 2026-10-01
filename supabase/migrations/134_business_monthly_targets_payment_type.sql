-- Migration 134: business_monthly_targets에 payment_type 컬럼 추가
--
-- 배경: 한국 사업 탭에서 최초결제/재결제별 목표 매출을 별도로 설정하고
--       달성률(실적/목표)을 표시하기 위해 payment_type 축을 추가한다.
-- 선례: Migration 114 (business_monthly_targets 최초 생성)

-- 1. 컬럼 추가 (기존 rows는 DEFAULT 'all'로 채워짐)
ALTER TABLE business_monthly_targets
  ADD COLUMN payment_type TEXT NOT NULL DEFAULT 'all'
  CHECK (payment_type IN ('all', 'first', 're'));

-- 2. 기존 unique(month, segment) 제약을 unique(month, segment, payment_type)으로 교체
ALTER TABLE business_monthly_targets
  DROP CONSTRAINT business_monthly_targets_month_segment_key;

ALTER TABLE business_monthly_targets
  ADD CONSTRAINT business_monthly_targets_month_segment_payment_type_key
  UNIQUE (month, segment, payment_type);

-- 3. 인덱스 재생성
DROP INDEX IF EXISTS idx_business_monthly_targets_segment_month;
CREATE INDEX idx_business_monthly_targets_segment_month_type
  ON business_monthly_targets(segment, month, payment_type);
