-- Add portal_token to students for parent-facing portal access
ALTER TABLE students ADD COLUMN IF NOT EXISTS portal_token TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS students_portal_token_idx ON students(portal_token);
