ALTER TABLE students
ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_students_last_contacted_at
ON students (last_contacted_at);
