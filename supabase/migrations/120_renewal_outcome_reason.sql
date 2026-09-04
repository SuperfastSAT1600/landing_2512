-- Migration 120: 재결제 결과 사유 (태그 + 메모)
-- 선례: 118_renewal_outcome_quality
--
-- 118은 좋음/나쁨 두 글자만 남긴다. 왜 나쁜 재결제였는지, 왜 좋은 이탈이었는지가
-- 기록되지 않아 분포는 보이는데 원인이 안 보인다. 사유를 함께 받아 나중에
-- '나쁜 재결제 중 할인 요구가 몇 건'처럼 집계할 수 있게 한다.
-- 태그와 메모를 나누는 이유: 기존 drop_reason 은 "{태그}: {메모}" 로 합쳐져 있어
-- 되돌릴 수 없고 집계가 불가능하다. 같은 실수를 반복하지 않는다.

-- 4·5단계에서만 채워진다 (outcome_quality 와 같은 규약).
ALTER TABLE renewal_targets ADD COLUMN outcome_reason_tag TEXT;
ALTER TABLE renewal_targets ADD COLUMN outcome_reason_note TEXT;

ALTER TABLE renewal_targets ADD CONSTRAINT renewal_targets_outcome_reason_stage_check
  CHECK (outcome_reason_tag IS NULL OR stage IN ('4', '5'));

-- 기존 drop_reason("{태그}: {메모}" 또는 태그만)을 두 컬럼으로 분리해 옮긴다.
-- 값 자체는 그대로 둔다 — 옛 태그를 새 목록으로 임의 재해석하면 원본이 훼손된다.
UPDATE renewal_targets
SET
  outcome_reason_tag = CASE
    WHEN position(':' in drop_reason) > 0
      THEN btrim(substring(drop_reason from 1 for position(':' in drop_reason) - 1))
    ELSE btrim(drop_reason)
  END,
  outcome_reason_note = CASE
    WHEN position(':' in drop_reason) > 0
      THEN NULLIF(btrim(substring(drop_reason from position(':' in drop_reason) + 1)), '')
    ELSE NULL
  END
WHERE drop_reason IS NOT NULL
  AND btrim(drop_reason) <> ''
  AND stage IN ('4', '5');

COMMENT ON COLUMN renewal_targets.outcome_reason_tag IS
  '결과 사유 태그 — 품질(outcome_quality)별로 다른 목록에서 고른다. 4·5단계에서만 기록';
COMMENT ON COLUMN renewal_targets.outcome_reason_note IS
  '결과 사유 자유 메모 — 선택 입력';
COMMENT ON COLUMN renewal_targets.drop_reason IS
  '(레거시) 120에서 outcome_reason_tag/note 로 이관됐다. 더 이상 쓰지 않는다';
