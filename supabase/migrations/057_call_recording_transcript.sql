-- Phase 2: 화자 라벨링된 전사 텍스트 저장 (상담사/고객 구분)
-- 요약은 consultation_timeline에, 원문 전사는 여기에 보관(원본 오디오 삭제 후에도 참고 가능).
ALTER TABLE call_recordings ADD COLUMN IF NOT EXISTS transcript TEXT;

COMMENT ON COLUMN call_recordings.transcript IS '화자 라벨링(상담사/고객)된 통화 전사 텍스트';
