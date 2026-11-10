-- work_item_completions: 운영 업무 채널 글(할 일)에 처음 ✅ 반응이 달린 시각.
-- Slack 은 반응 시각을 돌려주지 않아 reaction_added 이벤트로 기록한다. ✅ 가 모두 빠지면 지운다.
CREATE TABLE IF NOT EXISTS work_item_completions (
  channel    TEXT        NOT NULL,
  message_ts TEXT        NOT NULL,
  done_at    TIMESTAMPTZ NOT NULL,
  done_by    TEXT        NOT NULL,
  PRIMARY KEY (channel, message_ts)
);

ALTER TABLE work_item_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON work_item_completions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
