-- 164: 코치 현황 과목 칸별 순서 — SAT 칸(sort_order_sat), AP 칸(sort_order_ap)을 따로 정한다.
-- 처음에는 지금 전체 순서(sort_order)를 그대로 복사한다. NULL이면 그 칸 맨 뒤(전체 순서 → 등록순).
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS sort_order_sat int;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS sort_order_ap int;

UPDATE coaches SET sort_order_sat = sort_order WHERE sort_order_sat IS NULL;
UPDATE coaches SET sort_order_ap = sort_order WHERE sort_order_ap IS NULL;
