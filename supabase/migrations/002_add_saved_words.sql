-- Step 1: Add saved_words column to diagnostic_test_results table
-- This migration adds support for tracking vocabulary words students mark as unknown during tests

ALTER TABLE diagnostic_test_results
ADD COLUMN IF NOT EXISTS saved_words JSONB DEFAULT '[]'::jsonb;

-- Create index for efficient queries on saved_words
CREATE INDEX IF NOT EXISTS idx_test_results_saved_words
ON diagnostic_test_results USING GIN (saved_words);
