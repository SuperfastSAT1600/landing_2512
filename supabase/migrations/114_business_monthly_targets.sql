-- Migration 114: 사업 월별 목표(튜터링/글로벌) — Business 페이지 목표 대비 실적 그래프용
--
-- 배경: Business 페이지 "월별 추이" 라인 차트를 대신해, 월별로 설정한 매출 목표와
--       실제 실적을 비교하는 막대그래프를 기본으로 보여준다. 튜터링(B2C+B2B 합산)과
--       글로벌은 통화가 달라(원화/달러) 완전히 분리된 segment로 관리하고 절대 합산하지 않는다.
-- 선례: 110_renewal_targets.sql, 113_global_sales.sql (id/created_at + RLS 패턴)
-- 사용자가 Supabase에서 직접 실행한다.

CREATE TABLE business_monthly_targets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month          DATE NOT NULL,                 -- 해당 월의 1일 (예: 2026-08-01)
  segment        TEXT NOT NULL CHECK (segment IN ('tutoring', 'global')),
  target_amount  NUMERIC NOT NULL CHECK (target_amount > 0),
  currency       TEXT NOT NULL CHECK (currency IN ('KRW', 'USD')),  -- tutoring=KRW, global=USD
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (month, segment)
);

CREATE INDEX idx_business_monthly_targets_segment_month ON business_monthly_targets(segment, month);

ALTER TABLE business_monthly_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON business_monthly_targets
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "anon_deny" ON business_monthly_targets
  FOR ALL TO anon USING (false);

-- 초기 목표값. 글로벌은 원화 지시금액을 1달러=1400원으로 환산해 USD로 저장한다
-- (100만원→714, 1000만원→7143, 3000만원→21429, 5000만원→35714).
INSERT INTO business_monthly_targets (month, segment, target_amount, currency) VALUES
  ('2026-08-01', 'tutoring', 150000000, 'KRW'),
  ('2026-09-01', 'tutoring', 200000000, 'KRW'),
  ('2026-10-01', 'tutoring', 250000000, 'KRW'),
  ('2026-11-01', 'tutoring', 300000000, 'KRW'),
  ('2026-08-01', 'global',        714,  'USD'),
  ('2026-09-01', 'global',       7143,  'USD'),
  ('2026-10-01', 'global',      21429,  'USD'),
  ('2026-11-01', 'global',      35714,  'USD')
ON CONFLICT (month, segment) DO NOTHING;
