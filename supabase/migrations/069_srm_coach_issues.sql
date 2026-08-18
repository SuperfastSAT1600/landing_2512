-- srm_coach_issues: 코치 단위로 발생하는 이슈 트래킹
CREATE TABLE IF NOT EXISTS srm_coach_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id TEXT,
  coach_name TEXT,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('schedule', 'payment_no_response', 'request_no_response', 'custom')),
  title TEXT NOT NULL,
  description TEXT,
  checklist JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_by TEXT,
  resolution_note TEXT
);

CREATE INDEX IF NOT EXISTS srm_coach_issues_coach_id ON srm_coach_issues(coach_id);
CREATE INDEX IF NOT EXISTS srm_coach_issues_status ON srm_coach_issues(status);
CREATE INDEX IF NOT EXISTS srm_coach_issues_created_at ON srm_coach_issues(created_at DESC);
CREATE INDEX IF NOT EXISTS srm_coach_issues_issue_type ON srm_coach_issues(issue_type);
