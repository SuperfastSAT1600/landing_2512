-- 077_add_retry_strategies_type.sql
-- 스키마 드리프트 교정: 039는 retry_strategies 를 type 없이 생성했고 044는 type 의
-- CHECK/UPDATE 만 실행 — ADD COLUMN type DDL 이 마이그레이션 트리에 누락됨.
-- 라이브 DB엔 수동 추가돼 이미 존재하므로 idempotent 하게 보정만 한다(신규 환경 안전).

ALTER TABLE retry_strategies
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'retry';

-- 044 와 동일한 타입 도메인 보장 (이미 존재하면 재적용 안전)
DO $$
BEGIN
  ALTER TABLE retry_strategies DROP CONSTRAINT IF EXISTS retry_strategies_type_check;
  ALTER TABLE retry_strategies
    ADD CONSTRAINT retry_strategies_type_check
    CHECK (type IN ('initial_contact', 'initial_sales', 'retry'));
END $$;
