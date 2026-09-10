-- payments.hours: 정수 → 소수 허용 (예: 41.5시간)
-- 결제 모달에서 41.5시간 입력 시 "invalid input syntax for type integer" 로 실패하던 문제.
-- 기존 CHECK (hours IS NULL OR hours > 0) 은 numeric 에서도 그대로 유효하므로 유지한다.
ALTER TABLE payments
  ALTER COLUMN hours TYPE NUMERIC(6,2) USING hours::numeric;
