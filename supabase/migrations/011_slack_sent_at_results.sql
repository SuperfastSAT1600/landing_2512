-- Track Slack notification status per diagnostic test result
ALTER TABLE diagnostic_test_results
  ADD COLUMN IF NOT EXISTS slack_sent_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS slack_error    TEXT        DEFAULT NULL;
