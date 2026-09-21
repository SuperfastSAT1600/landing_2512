-- 146: 전략 라이브러리 카테고리 동적화
--
-- 배경: retry_strategies.type 은 카테고리(진열용)와 kind(재시도 칸반·통계·FK 배정에
--       쓰이는 기능 분류)를 겸하고 있었다. 카테고리를 자유롭게 만들고 옮길 수 있게
--       하려면 이 둘을 분리해야 한다.
-- 정책: type 컬럼은 이름만 kind로 바꾸고 의미·제약은 그대로 유지한다(재시도 칸반/
--       통계/학생 FK 배정은 계속 kind를 본다). 신규 strategy_categories 테이블은
--       segment별로 자유 생성/삭제 가능한 순수 진열 그룹이며, 기존 3개 그룹은
--       이 테이블에 seed되어 category_id로 백필된다. 삭제 규칙은 모든 카테고리에
--       동일하게 적용(비어있을 때만 삭제 가능) — "시스템 카테고리" 특별 취급 없음.
-- 롤백: category_id → kind 매핑이 백필 소스이므로 strategy_categories/category_id
--       드롭만으로 원복 가능. kind 컬럼은 그대로 유지되므로(이름 변경만 했으므로)
--       추가 백업 테이블 불필요.

BEGIN;

ALTER TABLE retry_strategies RENAME COLUMN type TO kind;
ALTER TABLE retry_strategies RENAME CONSTRAINT retry_strategies_type_check TO retry_strategies_kind_check;

CREATE TABLE strategy_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment TEXT NOT NULL CHECK (segment IN ('b2c', 'b2b')),
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_strategy_categories_segment_order ON strategy_categories (segment, sort_order);

-- 기존 3개 그룹을 세그먼트별로 시드 (b2c/b2b 각 3개 = 6행)
INSERT INTO strategy_categories (segment, name, sort_order)
VALUES
  ('b2c', '최초 컨텍 전략',     0),
  ('b2c', '최초 세일즈 전략',   1),
  ('b2c', '재시도 세일즈 전략', 2),
  ('b2b', '최초 컨텍 전략',     0),
  ('b2b', '최초 세일즈 전략',   1),
  ('b2b', '재시도 세일즈 전략', 2);

ALTER TABLE retry_strategies
  ADD COLUMN category_id UUID REFERENCES strategy_categories(id) ON DELETE RESTRICT;

UPDATE retry_strategies rs
SET category_id = sc.id
FROM strategy_categories sc
WHERE sc.segment = rs.segment
  AND sc.name = CASE rs.kind
    WHEN 'initial_contact' THEN '최초 컨텍 전략'
    WHEN 'initial_sales'   THEN '최초 세일즈 전략'
    WHEN 'retry'           THEN '재시도 세일즈 전략'
  END;

DO $$
DECLARE unmatched INT;
BEGIN
  SELECT COUNT(*) INTO unmatched FROM retry_strategies WHERE category_id IS NULL;
  IF unmatched > 0 THEN
    RAISE EXCEPTION 'strategy_categories backfill incomplete: % rows unmatched', unmatched;
  END IF;
END $$;

ALTER TABLE retry_strategies ALTER COLUMN category_id SET NOT NULL;
CREATE INDEX idx_retry_strategies_category_id ON retry_strategies(category_id);

COMMIT;
