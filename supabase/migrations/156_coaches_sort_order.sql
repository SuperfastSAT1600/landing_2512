-- 156: 코치 표시 순서 — CRM '코치 현황' 탭에서 직접 정한 순서로 코치를 나열한다.
-- 기존 코치는 등록순(created_at 오름차순)으로 채운다. 새 코치는 NULL(맨 뒤, 등록순)이다.
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS sort_order int;

UPDATE coaches c
   SET sort_order = o.rn
  FROM (SELECT slug, row_number() OVER (ORDER BY created_at, slug) - 1 AS rn FROM coaches) o
 WHERE c.slug = o.slug AND c.sort_order IS NULL;
