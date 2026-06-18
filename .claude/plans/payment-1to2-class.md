# 결제 추가 — 1:2 수업 유형 지원

## Overview

결제 완료 처리 모달(`PaymentModal`)의 "수업 유형" 선택에 **1:2 수업**을 추가한다.
구성은 1:1 수업과 동일하게 SAT(관리형/원포인트/체험) + AP(관리형)로 구성한다.
저장되는 상품 카테고리를 위해 `ProductCategory`에 1:2 정규/체험 카테고리를 추가한다.

## Requirements

### REQ-001: ProductCategory에 1:2 카테고리 추가
- **Priority**: Must
- **Description**: `ProductCategory`에 `'SAT 정규 1:2 수업'`, `'AP 정규 1:2 수업'`,
  `'SAT 체험 1:2 수업'`를 추가한다. 서브카테고리는 기존 값(관리형 수업/원포인트/체험수업) 재사용.
- **Acceptance Criteria**: 타입체크 통과, 기존 카테고리 소비처 영향 없음.
- **Verification**: (MANUAL) tsc 통과.

### REQ-002: PaymentModal에 1:2 수업 유형
- **Priority**: Must
- **Description**: `ClassType`에 `'1:2'` 추가. `PRODUCT_TREE['1:2']`를 1:1과 동일 구조로 구성
  (SAT: 관리형·원포인트·체험, AP: 관리형). Step 1 수업 유형 목록에 "1:2 수업"(SAT · AP) 버튼 추가.
  과목(Step 2)·상품(Step 3) 흐름은 기존 분기 재사용.
- **Acceptance Criteria**: 결제 모달에서 1:2 수업 선택 → SAT/AP 과목 → 1:2 상품 선택 → 시간·금액 입력 후 결제 완료까지 동작.
- **Verification**: (MANUAL) 모달 흐름 + payment API 페이로드 확인.

## Technical Design

- `src/types/crm.ts` — `ProductCategory` 유니온 확장.
- `src/app/admin/crm/components/PaymentModal.tsx` — `ClassType`에 `'1:2'`, `PRODUCT_TREE` 항목,
  Step 1 버튼 라벨/서브텍스트 추가.

## Traceability Matrix

| REQ ID  | Description                | Verification | Test File | Status  |
|---------|----------------------------|--------------|-----------|---------|
| REQ-001 | ProductCategory 1:2 추가    | (MANUAL)     | —         | Pending |
| REQ-002 | PaymentModal 1:2 수업 유형  | (MANUAL)     | —         | Pending |

## Out of Scope

- 1:2 전용 상품 관리 페이지(`admin/products`) 추가.
- 가격 자동 산정/정책 변경.
