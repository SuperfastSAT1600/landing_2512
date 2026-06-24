-- 이슈 해결책 직접 입력 필드 추가
ALTER TABLE srm_event_issues ADD COLUMN IF NOT EXISTS resolution_note TEXT;
ALTER TABLE srm_student_issues ADD COLUMN IF NOT EXISTS resolution_note TEXT;
