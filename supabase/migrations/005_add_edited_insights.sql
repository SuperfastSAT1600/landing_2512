-- Migration: Add edited_insights column to diagnostic_test_results
-- Allows tutors/admins to override AI-generated insight text per result.

ALTER TABLE diagnostic_test_results
  ADD COLUMN IF NOT EXISTS edited_insights JSONB DEFAULT NULL;

COMMENT ON COLUMN diagnostic_test_results.edited_insights IS
  'Partial ReportInsights override — fields present here replace AI-generated insights on the report. NULL means no edits.';
