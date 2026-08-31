-- Migration 120: 전사 유니크 제약을 "녹음 단위"에서 "상담메모 단위"로 교정
--
-- 119는 UNIQUE (source, external_id) — 녹음 1건 = 행 1건을 강제했다.
-- 실제 운영에서는 한 통화가 상담메모 여럿에 붙는다:
--   · 자매 학생 두 레코드에 같은 통화를 각각 기록 (예: "OO,OO 어머니" 스케줄 조율 콜)
--   · 같은 녹음으로 메모를 두 번 생성
-- 이 상태로 백필하면 두 번째 메모의 삽입이 거부되고, 자매 중 한쪽은 전사를 영영 못 받는다.
--
-- 교정: 메모(timeline_entry_id)까지 포함해 유일성을 정의한다.
-- "같은 메모에 같은 녹음이 두 번 붙는 것"만 막고, 서로 다른 메모는 허용한다.
-- timeline_entry_id가 없는 행(수동 입력 등)은 대상에서 제외한다 — NULL은 유일성 판단 불가.
--
-- 전사 본문 중복은 제약이 아니라 코드로 막는다: 백필은 삽입 전에 (source, external_id)로
-- 기존 전사를 찾아 재사용하므로, 같은 오디오를 두 번 전사(=과금)하지 않는다.

DROP INDEX IF EXISTS idx_call_transcripts_source_external;

CREATE UNIQUE INDEX IF NOT EXISTS idx_call_transcripts_entry_recording
  ON call_transcripts(source, external_id, timeline_entry_id)
  WHERE external_id IS NOT NULL AND timeline_entry_id IS NOT NULL;

-- 재사용 조회 경로. (source, external_id)로 기존 전사를 찾는다.
CREATE INDEX IF NOT EXISTS idx_call_transcripts_source_external_lookup
  ON call_transcripts(source, external_id)
  WHERE external_id IS NOT NULL;

COMMENT ON INDEX idx_call_transcripts_entry_recording IS
  '한 상담메모에 같은 녹음이 두 번 붙는 것만 막는다. 한 녹음이 여러 메모에 붙는 것은 정상(자매 학생, 메모 중복 생성).';
