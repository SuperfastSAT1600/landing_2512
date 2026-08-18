-- 수동 지정 이탈 단계 — stage_history로 자동 도출되지 않는(구 데이터 '미상') 리드의
-- 이탈 직전 단계를 매니저가 직접 지정. NULL이면 stage_history 기반 자동값 사용.
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS churn_stage_manual TEXT DEFAULT NULL
    CHECK (
      churn_stage_manual IS NULL
      OR churn_stage_manual IN ('0', '1', '2', '3a', '3b', '4', '5a', '5b', '6', '7', '8')
    );

COMMENT ON COLUMN students.churn_stage_manual IS '수동 지정 이탈 직전 단계. NULL이면 stage_history 기반 자동 도출';
