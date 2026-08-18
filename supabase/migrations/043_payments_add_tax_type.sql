-- 결제 세금 유형 추가 (면세 / 과세)
-- 면세: 매출액 = 수익 / 과세: 수익 = 매출액 × 0.9 (10% 부가세 제외)
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS tax_type TEXT NOT NULL DEFAULT '면세'
    CHECK (tax_type IN ('면세', '과세'));
