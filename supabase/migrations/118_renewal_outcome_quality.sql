-- Migration 118: 재결제 결과 품질 (좋은/나쁜 재결제 · 좋은/나쁜 이탈)
-- 선례: 111_renewal_targets_dropped
--
-- 110/111은 터미널 단계의 '건수'만 남긴다. 결제 완료 7건이 전부 정상 재결제인지,
-- 미전환 2건이 예견된 이탈인지 놓친 이탈인지 구분할 수 없어 전환율이 떨어져도
-- 무엇을 고쳐야 하는지 나오지 않는다. 터미널 단계마다 좋음/나쁨을 기록해
-- 주차별 코호트에서 품질 분포를 보게 한다.
-- 품질은 학생이 아니라 '주차 코호트 행'에 붙는다 — 같은 학생이 다음 주차 후보로
-- 다시 선정될 수 있으므로 students 로 올리면 이력이 덮인다.

-- 4·5단계에서만 채워진다 (converted_payment_id / drop_reason 과 같은 규약).
ALTER TABLE renewal_targets ADD COLUMN outcome_quality TEXT
  CHECK (outcome_quality IN ('good', 'bad'));

-- stage 와의 정합성을 DB 수준에서 강제한다 — 1~3단계 행이 품질을 들고 있는 상태를
-- 표현 불가능하게 만든다. 기존 행은 전부 NULL 이라 검증은 즉시 통과한다.
ALTER TABLE renewal_targets ADD CONSTRAINT renewal_targets_outcome_quality_stage_check
  CHECK (outcome_quality IS NULL OR stage IN ('4', '5'));

COMMENT ON COLUMN renewal_targets.outcome_quality IS
  '결과 품질 — stage=4 면 good/bad = 좋은 재결제/나쁜 재결제, stage=5 면 좋은 이탈/나쁜 이탈. NULL = 미분류';
