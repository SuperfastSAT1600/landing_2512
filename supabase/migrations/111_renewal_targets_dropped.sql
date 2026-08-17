-- Migration 111: 재결제 세일즈 '미전환' 터미널 단계
-- 선례: 110_renewal_targets
--
-- 110에는 종결 수단이 하드 삭제뿐이었다. 결제하지 않은 대상이 1~3단계에 영구히 남고,
-- 삭제한 대상은 주차별 선정 인원에서도 사라져 전환율 분모가 실제보다 작아진다.
-- 5(미전환)를 터미널 단계로 추가해 코호트 분모를 보존하고 사유를 기록한다.

ALTER TABLE renewal_targets DROP CONSTRAINT renewal_targets_stage_check;

ALTER TABLE renewal_targets ADD CONSTRAINT renewal_targets_stage_check
  CHECK (stage IN ('1','2','3','4','5'));

-- 5단계에서만 채워진다 (4단계의 converted_payment_id 와 같은 규약).
ALTER TABLE renewal_targets ADD COLUMN drop_reason TEXT;

COMMENT ON COLUMN renewal_targets.stage IS
  '1 최초 컨택 전 / 2 컨택 중 / 3 결제 대기 / 4 결제 완료(터미널) / 5 미전환(터미널)';
COMMENT ON COLUMN renewal_targets.drop_reason IS
  '미전환 사유 — stage=5 에서만 기록. 예산 / 휴학·졸업 / 타학원 이전 / 응답 없음 / 기타';
