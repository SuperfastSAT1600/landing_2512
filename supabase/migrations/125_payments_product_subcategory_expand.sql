-- 125: payments.product_subcategory CHECK 제약조건에 대표코치 / 추석특강 추가
--
-- 배경: PaymentModal 상품 목록에 "SAT 정규 1:1 수업 (대표코치)"와
--       "SAT 정규 그룹 수업 (추석특강)"을 추가했으나 048 마이그레이션의
--       payments_product_subcategory_check 제약조건은 기존 7개 값만 허용하여
--       결제 완료 시 아래 오류가 발생함:
--         new row for relation "payments" violates check constraint
--         "payments_product_subcategory_check"
--
-- 조치: 기존 제약조건을 삭제하고 TS ProductSubcategory 타입과 동일한 9개 값으로 재생성.

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_product_subcategory_check;

ALTER TABLE payments
  ADD CONSTRAINT payments_product_subcategory_check
  CHECK (product_subcategory IN (
    '관리형 수업',
    '원포인트',
    '대표코치',
    '여름방학 특강',
    '추석특강',
    '단어학습',
    'SuperTest',
    '인강',
    '체험수업'
  ));

COMMENT ON COLUMN payments.product_subcategory IS '관리형 수업 | 원포인트 | 대표코치 | 여름방학 특강 | 추석특강 | 단어학습 | SuperTest | 인강 | 체험수업';
