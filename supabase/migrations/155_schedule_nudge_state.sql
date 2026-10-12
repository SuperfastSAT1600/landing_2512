-- schedule_nudge_state: 학생·코치 스케줄 넛지 이메일 상태 추적
CREATE TABLE IF NOT EXISTS schedule_nudge_state (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sfv2_profile_id  TEXT        NOT NULL,
  user_type        TEXT        NOT NULL CHECK (user_type IN ('student', 'coach')),
  email            TEXT        NOT NULL,
  name             TEXT        NOT NULL,
  last_sent_at     TIMESTAMPTZ,
  next_allowed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  snooze_reason    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sfv2_profile_id, user_type)
);

CREATE INDEX IF NOT EXISTS idx_nudge_state_next_allowed
  ON schedule_nudge_state (next_allowed_at)
  WHERE last_sent_at IS NOT NULL OR next_allowed_at <= now();

ALTER TABLE schedule_nudge_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON schedule_nudge_state
  FOR ALL TO service_role USING (true) WITH CHECK (true);
