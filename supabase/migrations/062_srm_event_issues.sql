-- srm_event_issues: 스케줄 이벤트 이슈 트래킹
CREATE TABLE IF NOT EXISTS srm_event_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('cancellation', 'coach_change', 'no_show', 'custom')),
  title TEXT NOT NULL,
  description TEXT,
  checklist JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_by TEXT,
  student_name TEXT,
  coach_name TEXT
);

CREATE INDEX IF NOT EXISTS srm_event_issues_event_id ON srm_event_issues(event_id);
CREATE INDEX IF NOT EXISTS srm_event_issues_status ON srm_event_issues(status);
CREATE INDEX IF NOT EXISTS srm_event_issues_created_at ON srm_event_issues(created_at DESC);
