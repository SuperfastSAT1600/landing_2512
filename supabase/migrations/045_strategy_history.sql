-- 학생별 전략 적용 히스토리 (컨텍/최초세일즈/재시도)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS strategy_history JSONB NOT NULL DEFAULT '[]'::jsonb;
