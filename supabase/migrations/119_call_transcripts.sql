-- Migration 119: 세일즈 상담 통화 전사 보관 테이블
--
-- 배경: Plaud 메모 라우트는 매 녹음마다 Qwen fun-asr 전사를 생성하지만
-- 요약만 저장하고 전사는 버려왔다(plaud-memo/route.ts). 전사는 이미 생성·과금된
-- 산출물이고, 전환 예측 모델 학습 코퍼스의 유일한 원천이다.
--
-- students.consultation_timeline(JSONB)에 넣지 않는 이유: 해당 컬럼은 CRM 전반의
-- `select *`에 딸려 나가므로(usePanelData, strategy-brief 등), 수 KB 전사를 넣으면
-- 아무도 렌더하지 않는 페이로드로 모든 페이지 로드가 무거워진다.
CREATE TABLE IF NOT EXISTS call_transcripts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  timeline_entry_id UUID,                          -- 이 전사를 요약한 ConsultationEntry.id (JSONB 내부라 FK 불가)
  source            TEXT NOT NULL
                    CHECK (source IN ('plaud','voip')),
  external_id       TEXT,                          -- plaud: file_id / voip: call_sessions.recording_id
  recording_name    TEXT,
  recorded_at       TIMESTAMPTZ,
  duration_sec      INTEGER,
  transcript        TEXT NOT NULL
                    CHECK (length(btrim(transcript)) > 0),
  asr_model         TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_transcripts_student
  ON call_transcripts(student_id);
CREATE INDEX IF NOT EXISTS idx_call_transcripts_recorded_at
  ON call_transcripts(recorded_at);

-- 백필 멱등성의 근거. 같은 녹음을 두 번 전사·삽입할 수 없다.
-- external_id가 없는 행(수동 입력 등)은 제약 대상에서 제외한다.
CREATE UNIQUE INDEX IF NOT EXISTS idx_call_transcripts_source_external
  ON call_transcripts(source, external_id)
  WHERE external_id IS NOT NULL;

COMMENT ON TABLE call_transcripts IS '세일즈 상담 통화 전사 원문 (화자 라벨 포함). 요약은 students.consultation_timeline에 유지.';
COMMENT ON COLUMN call_transcripts.timeline_entry_id IS '이 전사에서 생성된 ConsultationEntry.id. JSONB 배열 내부 항목이라 FK를 걸 수 없다.';
COMMENT ON COLUMN call_transcripts.external_id IS '소스 시스템의 녹음 식별자. (source, external_id) 부분 유니크로 백필 중복 삽입을 막는다.';

-- 서버(service_role)에서만 접근한다. RLS 활성화 + 정책 없음 = anon/authenticated 차단, service_role 우회.
-- 미성년자·학부모 대화 원문이므로 클라이언트 노출 경로를 만들지 않는다.
ALTER TABLE call_transcripts ENABLE ROW LEVEL SECURITY;
