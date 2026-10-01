-- Migration 140: 재결제 카드 메모를 주차 이월 시 승계
-- 선례: 122_renewal_targets_memo, 139_renewal_next_contact_date
--
-- 122 는 메모를 '그 주차의 컨택 상태' 로 보고 이월에서 제외했다. 실제 운영에서는 메모가
-- "9/17 마지막 수업", "10월 시험 접수해둠, 혼자 해보다 연락 주기로 함" 처럼 그 학생을 지금
-- 어떻게 설득하는 중인가에 대한 이어지는 맥락이라, 주차가 바뀌었다는 이유로 비면 매니저가
-- 매주 같은 내용을 다시 적어야 한다. 139(예정일)와 같은 규약으로 승계한다.
--
-- 스키마 변경은 없다 — 승계는 renewal-carry-over.ts 의 INSERT 가 하고, 이 파일은 컬럼
-- 주석(정본 문서)을 코드와 다시 맞춘다.

COMMENT ON COLUMN renewal_targets.memo IS
  '재결제 카드 메모 — 이 학생을 어떻게 설득하는 중인가에 대한 짧은 노트.
   단계·결과와 무관하게 기록하며, 이월 시 새 주차 행으로 따라간다(140).';

COMMENT ON COLUMN renewal_targets.next_contact_date IS
  '컨택 예정일 (KST 기준 날짜) — 1~3단계에서만 기록. 보드는 이 날짜 오름차순으로 정렬한다.
   메모와 함께 이월 시 새 주차 행으로 따라간다.';

-- 이미 이월돼 메모가 비어 버린 행 복구.
-- 원 행(carried_to_week 로 이 행을 가리키는 바로 그 행)의 메모만 가져오고, 메모가 비어
-- 있는 행만 건드린다 — 매니저가 일부러 지운 메모를 되살리지 않기 위한 조건이다.
-- 멱등하다. 2주 이상 연속 이월된 사슬은 한 번 실행에 한 칸씩 전파되므로,
-- 끝까지 채우려면 갱신 건수가 0 이 될 때까지 반복 실행하면 된다.
UPDATE renewal_targets AS dst
SET memo = src.memo
FROM renewal_targets AS src
WHERE dst.memo IS NULL
  AND dst.carried_from_week IS NOT NULL
  AND src.student_id = dst.student_id
  AND src.week_start = dst.carried_from_week
  AND src.carried_to_week = dst.week_start
  AND src.memo IS NOT NULL;
