-- 브라우저 VoIP 상담 세션: 생성→통화→녹음→전사→메모 lifecycle 추적.
-- 녹음 원본은 Daily(클라우드)에 보관, 30일 후 cleanup cron이 Daily REST로 삭제.
CREATE TABLE IF NOT EXISTS call_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  public_token      TEXT NOT NULL UNIQUE,          -- 고객 링크용 우리 토큰 (Daily 토큰 아님)
  room_name         TEXT NOT NULL,                 -- Daily room name (webhook 매칭 키)
  room_url          TEXT NOT NULL,
  daily_room_id     TEXT,
  recording_id      TEXT,                          -- recording.ready-to-download payload.recording_id
  status            TEXT NOT NULL DEFAULT 'created'
                    CHECK (status IN ('created','active','ended','processing','done','failed','purged')),
  transcript        TEXT,                          -- 화자 라벨링된 전사
  summary           TEXT,                          -- 생성된 메모 초안 (감사/재시도용 보존)
  timeline_entry_id UUID,                          -- 생성한 ConsultationEntry.id (webhook idempotency)
  duration_sec      INTEGER,
  error             TEXT,
  expires_at        TIMESTAMPTZ NOT NULL,          -- 녹음 삭제 예정 (생성 + 30일)
  purged_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_sessions_student ON call_sessions(student_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_call_sessions_room ON call_sessions(room_name);
CREATE INDEX IF NOT EXISTS idx_call_sessions_expiry ON call_sessions(expires_at)
  WHERE purged_at IS NULL;

COMMENT ON TABLE call_sessions IS 'CRM 브라우저 VoIP 상담 세션 + 녹음/전사/메모 lifecycle';

-- 서버(service_role)에서만 접근한다. RLS 활성화 + 정책 없음 = anon/authenticated 차단, service_role 우회.
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;
