-- Create diagnostic test access tokens table
CREATE TABLE IF NOT EXISTS diagnostic_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(255) UNIQUE NOT NULL,
  student_email VARCHAR(255) NOT NULL,
  student_name VARCHAR(255) NOT NULL,
  test_id VARCHAR(100) NOT NULL DEFAULT 'diagnostic-test-1',
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT token_format CHECK (token ~ '^[a-zA-Z0-9\-]{8,}$')
);

-- Create indexes for token lookups
CREATE INDEX IF NOT EXISTS idx_access_tokens_token ON diagnostic_access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_access_tokens_email ON diagnostic_access_tokens(student_email);
CREATE INDEX IF NOT EXISTS idx_access_tokens_test_id ON diagnostic_access_tokens(test_id);
CREATE INDEX IF NOT EXISTS idx_access_tokens_is_active ON diagnostic_access_tokens(is_active);

-- Create diagnostic test results table
CREATE TABLE IF NOT EXISTS diagnostic_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES diagnostic_access_tokens(id) ON DELETE CASCADE,
  student_email VARCHAR(255) NOT NULL,
  student_name VARCHAR(255) NOT NULL,
  test_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  total_time_seconds INTEGER,
  answers JSONB,
  confidence_levels JSONB,
  flagged_questions TEXT[],
  question_times JSONB,

  CONSTRAINT unique_token_test UNIQUE (token_id, test_id)
);

-- Create indexes for result lookups and filtering
CREATE INDEX IF NOT EXISTS idx_test_results_email ON diagnostic_test_results(student_email);
CREATE INDEX IF NOT EXISTS idx_test_results_test_id ON diagnostic_test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_test_results_token_id ON diagnostic_test_results(token_id);
CREATE INDEX IF NOT EXISTS idx_test_results_submitted_at ON diagnostic_test_results(submitted_at);
CREATE INDEX IF NOT EXISTS idx_test_results_created_at ON diagnostic_test_results(created_at);

-- Enable Row Level Security (optional, depends on your RLS policy)
ALTER TABLE diagnostic_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_test_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public access (adjust as needed for security)
-- Allow anyone to validate a token (read-only)
CREATE POLICY "Allow token validation"
  ON diagnostic_access_tokens
  FOR SELECT
  USING (is_active = true);

-- Allow authenticated users to insert test results
CREATE POLICY "Allow test result submission"
  ON diagnostic_test_results
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to view their own results via token_id (optional - adjust as needed)
CREATE POLICY "Allow result viewing"
  ON diagnostic_test_results
  FOR SELECT
  USING (true);
