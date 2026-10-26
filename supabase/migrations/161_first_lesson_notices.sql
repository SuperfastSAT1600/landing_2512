-- first_lesson_notices: 매칭(학생-코치 쌍)의 첫 수업 슬랙 알림을 이미 보낸 매칭 (중복 전송 방지)
CREATE TABLE IF NOT EXISTS first_lesson_notices (
  matching_id  UUID        PRIMARY KEY,
  notified_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE first_lesson_notices IS 'cron 이 행을 먼저 선점(insert)한 뒤 전송한다. 전송 실패 시 행을 지워 다음 실행에서 재시도.';

ALTER TABLE first_lesson_notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON first_lesson_notices
  FOR ALL TO service_role USING (true) WITH CHECK (true);
