-- 학생 등록 시 입력자(담당자)를 기록하기 위한 컬럼 추가
ALTER TABLE students ADD COLUMN IF NOT EXISTS entered_by text;
