-- 재시도 전략 설명 컬럼 추가
ALTER TABLE retry_strategies
  ADD COLUMN IF NOT EXISTS description TEXT;
