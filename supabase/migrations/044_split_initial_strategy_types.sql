-- 최초 전략을 '최초 컨텍 전략'과 '최초 세일즈 전략'으로 분리
-- 기존 'initial' → 'initial_sales' 마이그레이션

-- 1. CHECK 제약 교체
ALTER TABLE retry_strategies
  DROP CONSTRAINT IF EXISTS retry_strategies_type_check;

ALTER TABLE retry_strategies
  ADD CONSTRAINT retry_strategies_type_check
  CHECK (type IN ('initial_contact', 'initial_sales', 'retry'));

-- 2. 기존 'initial' 레코드를 'initial_sales'로 변환
UPDATE retry_strategies SET type = 'initial_sales' WHERE type = 'initial';

-- 3. 학생에 최초 컨텍 전략 배정 컬럼 추가
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS initial_contact_strategy_id UUID REFERENCES retry_strategies(id) ON DELETE SET NULL;
