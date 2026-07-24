-- 097: 전략 시스템 B2B/B2C 세그먼트 분리
--
-- 배경: retry_strategies(전략 라이브러리)·growth_experiments(실험)는 B2B/B2C 구분 없이
--       공유돼 왔다. B2B 영업 전략을 B2C와 완전히 분리 관리하기 위해 segment 컬럼 추가.
-- 정책: 기존 행은 전부 B2C로 귀속(DEFAULT 'b2c'). (weekly_plans.segment 패턴과 동일)

ALTER TABLE retry_strategies
  ADD COLUMN IF NOT EXISTS segment TEXT NOT NULL DEFAULT 'b2c'
  CHECK (segment IN ('b2c', 'b2b'));

ALTER TABLE growth_experiments
  ADD COLUMN IF NOT EXISTS segment TEXT NOT NULL DEFAULT 'b2c'
  CHECK (segment IN ('b2c', 'b2b'));
