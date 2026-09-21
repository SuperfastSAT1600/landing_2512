-- 147: payments.product_subcategory CHECK 제약조건에 자기주도형 추가
--
-- 배경: PaymentModal 1:1 SAT 상품에 "SAT 정규 1:1 수업 (자기주도형)"을 추가했으나
--       125 마이그레이션의 payments_product_subcategory_check 는 기존 9개 값만 허용하여
--       결제 완료 시 아래 오류가 발생함:
--         new row for relation "payments" violates check constraint
--         "payments_product_subcategory_check"
--
-- 조치: 기존 제약조건을 삭제하고 TS ProductSubcategory 타입과 동일한 10개 값으로 재생성.

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_product_subcategory_check;

ALTER TABLE payments
  ADD CONSTRAINT payments_product_subcategory_check
  CHECK (product_subcategory IN (
    '관리형 수업',
    '원포인트',
    '대표코치',
    '자기주도형',
    '여름방학 특강',
    '추석특강',
    '단어학습',
    'SuperTest',
    '인강',
    '체험수업'
  ));

COMMENT ON COLUMN payments.product_subcategory IS '관리형 수업 | 원포인트 | 대표코치 | 자기주도형 | 여름방학 특강 | 추석특강 | 단어학습 | SuperTest | 인강 | 체험수업';
