-- 결제 내역에 담당자(입력한 CRM 사용자) 기록 — "누가 결제를 입력했는지" 추적용.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_by TEXT;
COMMENT ON COLUMN payments.created_by IS '결제/환불을 입력한 담당자명 (CRM 로그인 사용자)';
