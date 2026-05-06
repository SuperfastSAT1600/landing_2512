-- Migration 007: Add diagnostic_applications table and phone_number to tokens

-- Diagnostic test applications (신청 목록)
CREATE TABLE IF NOT EXISTS diagnostic_applications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  phone          TEXT NOT NULL,
  preferred_date DATE NOT NULL,
  preferred_time TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'contacted', 'code_issued', 'cancelled')),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Optional phone number on access tokens (for Meta CAPI pixel matching)
ALTER TABLE diagnostic_access_tokens
  ADD COLUMN IF NOT EXISTS phone_number TEXT;
