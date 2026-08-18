-- lead_status CHECK 제약에 'enrolled' 추가
ALTER TABLE students
  DROP CONSTRAINT IF EXISTS students_lead_status_check;

ALTER TABLE students
  ADD CONSTRAINT students_lead_status_check
  CHECK (lead_status IN ('active', 'inactive', 'reactivating', 'enrolled'));

-- 결제 기록이 있는 학생을 enrolled로 일괄 업데이트
UPDATE students s
SET lead_status = 'enrolled'
WHERE lead_status = 'active'
  AND EXISTS (
    SELECT 1 FROM payments p
    WHERE p.student_id = s.id
      AND p.payment_type = '최초결제'
  );

-- 확인
SELECT lead_status, COUNT(*) FROM students GROUP BY lead_status ORDER BY lead_status;
