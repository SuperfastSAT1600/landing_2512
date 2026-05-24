-- students 테이블에 matching_stage 컬럼 추가
-- funnel_stage='9' (결제 완료) 이후 코치 매칭 보드 단계 추적

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS matching_stage TEXT
    CHECK (matching_stage IN (
      'schedule_pending',
      'schedule_done',
      'offer_sent',
      'awaiting_response',
      'matched'
    ));

CREATE INDEX idx_students_matching_stage ON students(matching_stage)
  WHERE matching_stage IS NOT NULL;
