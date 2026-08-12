-- 가결제(0원) 입력을 허용하도록 amount check constraint 완화
-- 051에서 환불(음수)을 허용했고, 여기서 0원을 추가로 허용한다.
-- 환불은 여전히 음수만 허용.
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_amount_check;

ALTER TABLE payments ADD CONSTRAINT payments_amount_check
  CHECK (
    (payment_type = '환불' AND amount < 0) OR
    (payment_type != '환불' AND amount >= 0)
  );

COMMENT ON COLUMN payments.amount IS '결제 금액. 0 = 가결제(수업 시작, 실입금 전). 음수 = 환불.';
