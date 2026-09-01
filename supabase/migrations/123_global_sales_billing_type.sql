-- Migration 123: 글로벌 매출에 결제 방식(일회성/구독) 추가
--
-- 배경: 기존 payment_type(최초결제/재결제)은 "그 학생의 첫 결제인가"를 가리키는 축이라
--       "일회성 판매인가 구독인가"는 알 수 없었다. 둘은 직교한다
--       (구독의 첫 달 = 구독 + 최초결제). 별도 컬럼으로 받는다.
-- 기존 행은 기본값 '일회성'으로 채워진다 — 틀린 건은 목록에서 바로 고칠 수 있다.
-- 선례: 121_global_sales_country.sql
-- 사용자가 Supabase에서 직접 실행한다.

ALTER TABLE global_sales
  ADD COLUMN billing_type TEXT NOT NULL DEFAULT '일회성'
  CHECK (billing_type IN ('일회성', '구독'));

CREATE INDEX idx_global_sales_billing_type ON global_sales(billing_type);

COMMENT ON COLUMN global_sales.billing_type IS '결제 방식: 일회성 | 구독. payment_type(최초/재결제)과는 별개 축';
