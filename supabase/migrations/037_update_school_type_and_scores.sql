-- 학제 필드 변경: school_type enum → TEXT (한국 학제 | AP | IB)
-- 2차 목표 점수 필드 추가

-- 1. school_type TEXT로 변환
ALTER TABLE students
  ALTER COLUMN school_type TYPE TEXT USING school_type::TEXT;

-- 2. 기존 enum 값 → 새 학제 값 매핑
UPDATE students SET school_type = '한국 학제'
  WHERE school_type IN ('domestic_us', 'korean_special');
UPDATE students SET school_type = 'AP'
  WHERE school_type = 'international';
UPDATE students SET school_type = 'IB'
  WHERE school_type = 'other';

-- 3. 기존 enum 타입 제거
DROP TYPE IF EXISTS school_type_enum;

-- 4. 2차 목표 점수 컬럼 추가
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS target_score_2 INTEGER;
