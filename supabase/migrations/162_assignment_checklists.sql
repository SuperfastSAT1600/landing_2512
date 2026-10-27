-- assignment_checklists: 학생 배정 요청 스레드에 달린 업무 체크리스트 진행 상태 (미완료 DM 알림용)
CREATE TABLE IF NOT EXISTS assignment_checklists (
  channel          TEXT        NOT NULL,
  message_ts       TEXT        NOT NULL,
  request_text     TEXT        NOT NULL DEFAULT '',
  checked_ids      TEXT[]      NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at     TIMESTAMPTZ,
  last_reminded_at TIMESTAMPTZ,
  PRIMARY KEY (channel, message_ts)
);

COMMENT ON TABLE assignment_checklists IS '체크리스트 게시 시 행 생성, 체크마다 checked_ids/completed_at 갱신. cron 이 completed_at IS NULL 인 행을 3시간마다 DM 으로 알린다.';

CREATE INDEX IF NOT EXISTS assignment_checklists_open_idx ON assignment_checklists (created_at) WHERE completed_at IS NULL;

ALTER TABLE assignment_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON assignment_checklists
  FOR ALL TO service_role USING (true) WITH CHECK (true);
