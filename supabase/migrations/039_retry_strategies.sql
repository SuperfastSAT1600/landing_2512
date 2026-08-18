-- 재시도 세일즈 전략 테이블
CREATE TABLE IF NOT EXISTS retry_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 학생에 재시도 세일즈 필드 추가
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS retry_strategy_id UUID REFERENCES retry_strategies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS retry_stage TEXT CHECK (
    retry_stage IS NULL OR
    retry_stage IN ('연락 시도', '상담 중', '제안 완료', '결제 완료')
  );
