-- Migration 122: 재결제 칸반 카드 메모
-- 선례: 119_renewal_targets_carry_over
--
-- 재결제 컨택은 "언제 다시 전화", "학부모가 미루는 이유" 같은 한 줄 상태가 다음 액션을 결정한다.
-- 학생 상담메모(students/timeline)는 생애 전체를 다루므로 이 주차의 컨택 상태가 묻힌다.
-- 카드 자체에 붙는 짧은 메모를 타깃 행에 둬서 보드에서 바로 읽고 쓰게 한다.

ALTER TABLE renewal_targets ADD COLUMN memo TEXT;

COMMENT ON COLUMN renewal_targets.memo IS
  '재결제 카드 메모 — 이 주차 컨택 상태를 보드에서 바로 적는 짧은 노트.
   단계·결과와 무관하게 기록하며, 이월 시 새 주차 행으로 따라가지 않는다.';
