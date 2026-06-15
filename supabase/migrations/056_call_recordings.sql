-- 통화 녹음 원본 메타데이터 + 보관/삭제 추적
-- 요약은 students.consultation_timeline에 적재되고, 원본 오디오는 expires_at 이후 cleanup으로 삭제한다.
CREATE TABLE IF NOT EXISTS call_recordings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,                 -- call-recordings 버킷 내 경로
  duration_sec  INTEGER,
  status        TEXT NOT NULL DEFAULT 'processing'
                CHECK (status IN ('processing', 'done', 'failed', 'purged')),
  error         TEXT,
  expires_at    TIMESTAMPTZ NOT NULL,          -- 원본 오디오 삭제 예정 시각 (요약 후 30일)
  purged_at     TIMESTAMPTZ,                   -- 실제 삭제 시각
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_recordings_student ON call_recordings(student_id);
-- 만료 정리(cleanup) 조회용 — 아직 안 지운 건만
CREATE INDEX IF NOT EXISTS idx_call_recordings_expiry ON call_recordings(expires_at)
  WHERE purged_at IS NULL;

COMMENT ON TABLE call_recordings IS 'CRM 통화 녹음 원본 메타데이터 + 30일 후 자동 삭제 추적';
