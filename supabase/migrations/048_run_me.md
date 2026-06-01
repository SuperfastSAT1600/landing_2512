# Migration 048 — product_category / product_subcategory

`ALTER TABLE` 은 이미 완료됨. 아래 UPDATE만 실행하면 됨.

## 실행 SQL

```sql
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
  END
WHERE product_category IS NULL;
```

## 결과 확인

```sql
SELECT product_category, product_subcategory, COUNT(*)
FROM payments
GROUP BY 1, 2
ORDER BY 1, 2;
```

## 매핑 룰 요약

| 조건 | product_category | product_subcategory |
|---|---|---|
| product LIKE 'AP%' | AP 정규 1:1 수업 | 관리형 수업 |
| product/payment_type 에 그룹/여름방학 | SAT 정규 그룹 수업 | 여름방학 특강 |
| product/payment_type 에 체험 | SAT 체험 1:1 수업 | 체험수업 |
| product/payment_type 에 콘텐츠 + amount=60,000 | 관리형 콘텐츠 | SuperTest |
| product/payment_type 에 콘텐츠 + amount=249,000 | 관리형 콘텐츠 | 인강 |
| product/payment_type 에 콘텐츠 + 그 외 금액 | 관리형 콘텐츠 | 단어학습 |
| product LIKE 'SAT%' | SAT 정규 1:1 수업 | 관리형 수업 |
| payment_type 수업료/최초결제/재결제/원포인트 | SAT 정규 1:1 수업 | 관리형 수업/원포인트 |
