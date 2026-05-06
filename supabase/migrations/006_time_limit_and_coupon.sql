-- Migration 006: Per-student time limit and coupon support
-- Run this in Supabase SQL editor or via Supabase CLI

-- Allow admins to set a custom time limit (in minutes) per access token.
-- Default 30 matches the existing hardcoded behaviour.
ALTER TABLE diagnostic_access_tokens
  ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER NOT NULL DEFAULT 30;

-- Store the effective time limit on each result row so reports always
-- reflect the actual limit the student was given, even if the token is
-- later changed or deleted.
ALTER TABLE diagnostic_test_results
  ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER NOT NULL DEFAULT 30;

-- Coupon JSONB: { discountPercent: number, expiresAt: string (ISO) }
-- Null = no active coupon for this report.
ALTER TABLE diagnostic_test_results
  ADD COLUMN IF NOT EXISTS coupon JSONB DEFAULT NULL;
