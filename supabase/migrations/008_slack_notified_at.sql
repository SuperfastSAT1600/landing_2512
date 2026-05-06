-- Migration 008: Add slack_notified_at to diagnostic_access_tokens
-- Tracks whether an expiry-without-submission Slack alert has been sent
-- NULL = not yet notified, TIMESTAMPTZ = notification was sent at this time

ALTER TABLE diagnostic_access_tokens
  ADD COLUMN IF NOT EXISTS slack_notified_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN diagnostic_access_tokens.slack_notified_at
  IS 'Set when a Slack alert is sent for an expired token with no submission. Prevents duplicate alerts.';
