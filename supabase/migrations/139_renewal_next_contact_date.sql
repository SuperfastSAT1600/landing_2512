-- Migration 139: 재결제 카드 컨택 예정일
-- 선례: 122_renewal_targets_memo
--
-- 진행 단계(1~3)의 다음 액션은 "언제 다시 연락하는가"다. 지금은 메모에 자연어로만 남아
-- 정렬도 우선순위도 기계가 읽을 수 없다. 날짜 컬럼으로 분리해 보드를 임박순으로 세운다.
-- 터미널(4·5)은 결과가 확정된 행이므로 값을 갖지 않는다.

ALTER TABLE renewal_targets ADD COLUMN next_contact_date DATE;

CREATE INDEX idx_renewal_targets_next_contact
  ON renewal_targets(next_contact_date)
  WHERE next_contact_date IS NOT NULL;

COMMENT ON COLUMN renewal_targets.next_contact_date IS
  '컨택 예정일 (KST 기준 날짜) — 1~3단계에서만 기록. 보드는 이 날짜 오름차순으로 정렬한다.
   메모와 달리 이월 시 새 주차 행으로 따라간다(미래 약속이므로).';
