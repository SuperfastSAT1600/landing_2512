-- payment_type CHECK 제약을 4개 실제 결제 유형으로 확장
-- 기존: 최초결제 | 재결제 | 원포인트
-- 신규: 수업료 | 그룹수업 | 체험수업 | 콘텐츠 | (기존 유지)

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_payment_type_check;

ALTER TABLE payments
  ADD CONSTRAINT payments_payment_type_check
  CHECK (payment_type IN (
    '수업료',
    '그룹수업',
    '체험수업',
    '콘텐츠',
    '최초결제',
    '재결제',
    '원포인트'
  ));

COMMENT ON COLUMN payments.payment_type IS
  '수업료 | 그룹수업 | 체험수업 | 콘텐츠 | 최초결제 | 재결제 | 원포인트';
