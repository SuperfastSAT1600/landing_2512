-- Migration 113: 글로벌 매출 — 튜터링과 무관한 신규 상품 라인 테스트 판매 기록
--
-- 배경: 2026-08-11부터 튜터링과 전혀 다른 상품을 달러(USD)로 테스트 판매 중.
--       아직 정식 CRM 학생 등록 대상이 아니라 students/payments와 완전히 분리된
--       단순 기록(이름/최초·재결제 여부/금액/판매일)만 남긴다. 수정 기능은
--       없으므로(추가·조회·삭제만) updated_at 트리거도 두지 않는다.
-- 선례: 110_renewal_targets.sql (id/created_at + RLS 패턴)
-- 사용자가 Supabase에서 직접 실행한다.

CREATE TABLE global_sales (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name  TEXT NOT NULL,
  payment_type  TEXT NOT NULL CHECK (payment_type IN ('최초결제', '재결제')),
  amount_usd    NUMERIC NOT NULL CHECK (amount_usd > 0),
  sale_date     DATE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_global_sales_sale_date ON global_sales(sale_date DESC);

ALTER TABLE global_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON global_sales
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "anon_deny" ON global_sales
  FOR ALL TO anon USING (false);
