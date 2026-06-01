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

UPDATE payments SET
  product_category = CASE
    WHEN product ILIKE 'AP%'
      THEN 'AP 정규 1:1 수업'
    WHEN product ILIKE '%그룹%' OR product ILIKE '%여름방학%'
      THEN 'SAT 정규 그룹 수업'
    WHEN product ILIKE '%체험%'
      THEN 'SAT 체험 1:1 수업'
    WHEN product ILIKE '%콘텐츠%'
      THEN '관리형 콘텐츠'
    WHEN product ILIKE 'SAT%'
      THEN 'SAT 정규 1:1 수업'
    WHEN payment_type = '그룹수업'
      THEN 'SAT 정규 그룹 수업'
    WHEN payment_type = '체험수업'
      THEN 'SAT 체험 1:1 수업'
    WHEN payment_type = '콘텐츠'
      THEN '관리형 콘텐츠'
    WHEN payment_type IN ('수업료','최초결제','재결제','원포인트')
      THEN 'SAT 정규 1:1 수업'
    ELSE NULL
  END,
  product_subcategory = CASE
    WHEN product ILIKE '%콘텐츠%' OR payment_type = '콘텐츠'
      THEN CASE
        WHEN amount = 60000  THEN 'SuperTest'
        WHEN amount = 249000 THEN '인강'
        ELSE '단어학습'
      END
    WHEN product ILIKE '%그룹%' OR product ILIKE '%여름방학%'
      THEN '여름방학 특강'
    WHEN payment_type = '그룹수업'
      THEN '여름방학 특강'
    WHEN product ILIKE '%체험%' OR payment_type = '체험수업'
      THEN '체험수업'
    WHEN product ILIKE '%원포인트%' OR payment_type = '원포인트'
      THEN '원포인트'
    WHEN product ILIKE 'AP%'
      THEN '관리형 수업'
    WHEN product ILIKE 'SAT%'
      THEN '관리형 수업'
    WHEN payment_type IN ('수업료','최초결제','재결제')
      THEN '관리형 수업'
    ELSE NULL
  END;
