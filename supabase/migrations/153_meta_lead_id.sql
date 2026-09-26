-- Meta Lead Ads webhook idempotency: 동일 lead_id 중복 수신 방지
ALTER TABLE students ADD COLUMN IF NOT EXISTS meta_lead_id TEXT UNIQUE;
