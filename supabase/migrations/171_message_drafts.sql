-- message_drafts: 수업 관리 업무에서 에이전트가 만든 메시지 초안과 근무자가 실제로 보낸 내용.
-- 초안 대비 수정 정도로 에이전트가 사람 확인 없이 보내도 될지 판단한다(발송은 아직 사람이 한다).
CREATE TABLE IF NOT EXISTS message_drafts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id   TEXT        NOT NULL,           -- 학생 profile id 또는 coach:<key>
  target_name TEXT        NOT NULL,
  purposes    TEXT[]      NOT NULL DEFAULT '{}',
  draft       TEXT        NOT NULL,
  basis       TEXT[]      NOT NULL DEFAULT '{}',
  handoff     TEXT,                           -- 직원이 직접 대응해야 하는 이유
  model       TEXT        NOT NULL,
  created_by  TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_text   TEXT,
  sent_by     TEXT,
  sent_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_message_drafts_target ON message_drafts (target_id, created_at DESC);

ALTER TABLE message_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON message_drafts
  FOR ALL TO service_role USING (true) WITH CHECK (true);
