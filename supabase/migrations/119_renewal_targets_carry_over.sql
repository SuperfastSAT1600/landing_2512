-- Migration 119: 재결제 미결 대상의 주차 이월
-- 선례: 118_renewal_outcome_quality
--
-- 아직 결제하지 않은 대상(1~3단계)은 다음 주차 대상자가 될 수 없었다. POST가 열린 행을
-- 가진 학생을 주차 무관하게 409로 막고, 보드 기본 스코프는 이번 주차라, 주가 바뀌면
-- 지난주 미결 인원이 화면에서 통째로 사라진다.
-- 주차가 바뀌면 미결 행을 새 주차에 복제하고(원 행은 그대로 두고) 원 행에 이월 표시를
-- 남긴다. 그 주차의 '선정' 인원과 전환율은 보존되면서 '진행 중'에서만 빠져 마감된다.
-- 미전환(stage 5)과는 별개 축이다 — 이월을 미전환으로 닫으면 118의 좋은/나쁜 이탈
-- 통계가 오염된다.

-- 이 행이 어느 주차로 넘어갔는지. NOT NULL 이면 종결된 행(진행 중 아님).
ALTER TABLE renewal_targets ADD COLUMN carried_to_week DATE;

-- 이 행이 어느 주차에서 넘어왔는지. 주차별 '선정'을 신규/이월유입으로 분해하는 데 쓴다.
ALTER TABLE renewal_targets ADD COLUMN carried_from_week DATE;

-- 터미널(4·5) 행은 이월될 수 없다 — outcome_quality 와 같은 정합성 규약.
ALTER TABLE renewal_targets ADD CONSTRAINT renewal_targets_carried_stage_check
  CHECK (carried_to_week IS NULL OR stage IN ('1', '2', '3'));

COMMENT ON COLUMN renewal_targets.carried_to_week IS
  '이월된 대상 주차 — NOT NULL 이면 이 행은 그 주차로 넘어가 종결됐다. 1~3단계에서만 기록';
COMMENT ON COLUMN renewal_targets.carried_from_week IS
  '이월돼 들어온 출처 주차 — NULL 이면 그 주차에 새로 선정된 행';
