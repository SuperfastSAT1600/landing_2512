-- srm_student_issues: 스케줄 없이 학생 단위로 발생하는 이슈 트래킹
CREATE TABLE IF NOT EXISTS srm_student_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  sfv2_profile_id TEXT,
  student_name TEXT,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('schedule_pending', 'coach_pending', 'renewal_needed', 'custom')),
  title TEXT NOT NULL,
  description TEXT,
  checklist JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS srm_student_issues_student_id ON srm_student_issues(student_id);
CREATE INDEX IF NOT EXISTS srm_student_issues_sfv2_profile_id ON srm_student_issues(sfv2_profile_id);
CREATE INDEX IF NOT EXISTS srm_student_issues_status ON srm_student_issues(status);
CREATE INDEX IF NOT EXISTS srm_student_issues_created_at ON srm_student_issues(created_at DESC);
