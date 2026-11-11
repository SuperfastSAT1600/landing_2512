-- work_log_dismissals: 업무 로그에서 사람이 삭제(숨김)한 업무.
-- Slack 글·tutoring 데이터는 그대로 두고 목록에서만 뺀다. 행을 지우면 복구된다.
-- kind: slack(운영 할 일, target_key = message_ts) | contact(수업 관리 업무, target_key = 학생 profile id 또는 coach:<key>)
CREATE TABLE IF NOT EXISTS work_log_dismissals (
  kind         TEXT        NOT NULL CHECK (kind IN ('slack', 'contact')),
  target_key   TEXT        NOT NULL,
  target_name  TEXT        NOT NULL,
  dismissed_by TEXT        NOT NULL,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, target_key)
);

ALTER TABLE work_log_dismissals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON work_log_dismissals
  FOR ALL TO service_role USING (true) WITH CHECK (true);
