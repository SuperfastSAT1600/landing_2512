-- 096: payments.product_category CHECK 제약조건에 1:2 수업 카테고리 추가
--
-- 배경: PaymentModal.tsx / types/crm.ts 는 1:2 수업 상품을 지원하도록 확장됐으나
--       048 마이그레이션의 payments_product_category_check 제약조건은 1:1 값만 허용하여
--       "SAT 정규 1:2 수업" 등 결제 완료 시 아래 오류가 발생함:
--         new row for relation "payments" violates check constraint "payments_product_category_check"
--
-- 조치: 기존 제약조건을 삭제하고 TS ProductCategory 타입과 동일한 8개 값으로 재생성.

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_product_category_check;

ALTER TABLE payments
  ADD CONSTRAINT payments_product_category_check
  CHECK (product_category IN (
    'SAT 정규 1:1 수업',
    'SAT 정규 1:2 수업',
    'SAT 정규 그룹 수업',
    'AP 정규 1:1 수업',
    'AP 정규 1:2 수업',
    '관리형 콘텐츠',
    'SAT 체험 1:1 수업',
    'SAT 체험 1:2 수업'
  ));
