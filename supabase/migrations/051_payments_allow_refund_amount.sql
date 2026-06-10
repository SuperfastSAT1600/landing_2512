-- 환불 시 음수 금액을 허용하도록 amount check constraint 수정
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_amount_check;

ALTER TABLE payments ADD CONSTRAINT payments_amount_check
  CHECK (
    (payment_type = '환불' AND amount < 0) OR
    (payment_type != '환불' AND amount > 0)
  );
