-- 유입 소스 '소개/추천' 시 소개자(referrer) 기록.
-- referral_student_id: 검색으로 선택한 기존 학생 id (외부 소개자면 null). 표시·집계용 name 스냅샷 별도.
ALTER TABLE students ADD COLUMN IF NOT EXISTS referral_student_id UUID REFERENCES students(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS referral_student_name TEXT;

COMMENT ON COLUMN students.referral_student_id IS '소개/추천 유입 시 소개한 학생 id(외부 소개자면 null)';
COMMENT ON COLUMN students.referral_student_name IS '소개자 표시용 이름(선택 학생명 또는 직접 입력). traffic_source=소개/추천일 때만 사용';
