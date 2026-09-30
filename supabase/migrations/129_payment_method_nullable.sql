-- Migration 129: payment_method 기본값 제거 + 기존 '계좌이체' 를 NULL 로 정리
--
-- 배경: 028에서 payment_method 를 NOT NULL DEFAULT '계좌이체' 로 만들었는데, 결제 완료 모달이
--       이 필드를 보내지 않아 수기 결제가 실제 수단과 무관하게 전부 '계좌이체' 로 기록됐다
--       (765건 중 574건). 토스결제(182)·Stripe(8)·Rho(1)만 연동/수기로 실제 값이 들어간 것이고,
--       '계좌이체' 는 "계좌이체다"와 "입력 안 됐다"를 구분하지 못한다.
-- 조치: 기본값·NOT NULL 을 없애 NULL 이 "기록되지 않음"을 뜻하게 하고, 기존 '계좌이체' 를 NULL 로
--       되돌린다. 앞으로는 모달에서 고른 값만 채워진다.
-- 주의: 되돌릴 수 있도록 백업 테이블을 먼저 만든다. 실제 수단을 소급 복원할 근거는 없다.
-- 사용자가 Supabase에서 직접 실행한다.

-- 1) 백업 (id → 기존 값)
CREATE TABLE IF NOT EXISTS payments_method_backup_202609 AS
SELECT id, payment_method, now() AS backed_up_at FROM payments;

-- 2) 기본값·NOT NULL 해제
ALTER TABLE payments ALTER COLUMN payment_method DROP DEFAULT;
ALTER TABLE payments ALTER COLUMN payment_method DROP NOT NULL;

-- 3) 기본값으로 박힌 '계좌이체' 를 NULL 로 (토스결제·Stripe·Rho 는 그대로 둔다)
UPDATE payments SET payment_method = NULL WHERE payment_method = '계좌이체';

COMMENT ON COLUMN payments.payment_method IS
  '계좌이체 | 신용카드 | 토스결제 | Stripe | 기타. NULL = 기록되지 않음(추측 금지).';

-- 확인
-- SELECT coalesce(payment_method, '(미기록)') AS 결제수단, count(*)
-- FROM payments GROUP BY 1 ORDER BY 2 DESC;
