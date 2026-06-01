-- payments 테이블에 product_category + product_subcategory 추가
-- product_category : SAT 정규 1:1 수업 | SAT 정규 그룹 수업 | AP 정규 1:1 수업 | 관리형 콘텐츠 | SAT 체험 1:1 수업
-- product_subcategory: 관리형 수업 | 원포인트 | 여름방학 특강 | 단어학습 | SuperTest | 인강 | 체험수업

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS product_category TEXT
  CHECK (product_category IN (
    'SAT 정규 1:1 수업',
    'SAT 정규 그룹 수업',
    'AP 정규 1:1 수업',
    '관리형 콘텐츠',
    'SAT 체험 1:1 수업'
  ));

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS product_subcategory TEXT
  CHECK (product_subcategory IN (
    '관리형 수업',
    '원포인트',
    '여름방학 특강',
    '단어학습',
    'SuperTest',
    '인강',
    '체험수업'
  ));

-- ─── 기존 데이터 마이그레이션 ─────────────────────────────────────────────────
-- 규칙:
--   product 컬럼(신규) 우선 → payment_type(구형 폴백)
--   과목 비어있는 수업료 레코드 → SAT 정규 1:1 수업 (과목 없음 = SAT)
--   콘텐츠 하위 분류: amount=60000 → SuperTest / amount=249000 → 인강 / 나머지 → 단어학습

UPDATE payments SET
  product_category = CASE
    WHEN product ILIKE 'AP%'                                  THEN 'AP 정규 1:1 수업'
    WHEN product ILIKE '%그룹%' OR product ILIKE '%여름방학%'  THEN 'SAT 정규 그룹 수업'
    WHEN product ILIKE '%체험%'                               THEN 'SAT 체험 1:1 수업'
    WHEN product ILIKE '%콘텐츠%'                             THEN '관리형 콘텐츠'
    WHEN product ILIKE 'SAT%'                                 THEN 'SAT 정규 1:1 수업'
    -- payment_type 폴백
    WHEN payment_type = '그룹수업'                            THEN 'SAT 정규 그룹 수업'
    WHEN payment_type = '체험수업'                            THEN 'SAT 체험 1:1 수업'
    WHEN payment_type = '콘텐츠'                              THEN '관리형 콘텐츠'
    WHEN payment_type IN ('수업료', '최초결제', '재결제', '원포인트') THEN 'SAT 정규 1:1 수업'
    ELSE NULL
  END,
  product_subcategory = CASE
    -- 콘텐츠: 먼저 처리 (SAT 접두사 오버랩 버그 방지)
    WHEN product ILIKE '%콘텐츠%' OR payment_type = '콘텐츠'
      THEN CASE
        WHEN amount = 60000  THEN 'SuperTest'
        WHEN amount = 249000 THEN '인강'
        ELSE '단어학습'
      END
    -- 그룹 / 여름방학
    WHEN product ILIKE '%그룹%' OR product ILIKE '%여름방학%'  THEN '여름방학 특강'
    WHEN payment_type = '그룹수업'                            THEN '여름방학 특강'
    -- 체험수업
    WHEN product ILIKE '%체험%' OR payment_type = '체험수업'   THEN '체험수업'
    -- 원포인트
    WHEN product ILIKE '%원포인트%' OR payment_type = '원포인트' THEN '원포인트'
    -- 1:1 정규 수업 (SAT / AP / 과목 없음 전부 포함)
    WHEN product ILIKE 'AP%'                                   THEN '관리형 수업'
    WHEN product ILIKE 'SAT%'                                  THEN '관리형 수업'
    WHEN payment_type IN ('수업료', '최초결제', '재결제')       THEN '관리형 수업'
    ELSE NULL
  END
WHERE product_category IS NULL;

COMMENT ON COLUMN payments.product_category    IS 'SAT 정규 1:1 수업 | SAT 정규 그룹 수업 | AP 정규 1:1 수업 | 관리형 콘텐츠 | SAT 체험 1:1 수업';
COMMENT ON COLUMN payments.product_subcategory IS '관리형 수업 | 원포인트 | 여름방학 특강 | 단어학습 | SuperTest | 인강 | 체험수업';
