-- PaymentModal이 보내는 product/hours 컬럼 추가
-- student_name은 student_id로 조회 가능하므로 nullable로 변경
ALTER TABLE payments ALTER COLUMN student_name DROP NOT NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS product TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS hours  INTEGER CHECK (hours IS NULL OR hours > 0);
