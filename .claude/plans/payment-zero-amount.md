# 0원 결제(가결제) 입력 허용

## Overview

수업은 시작했지만 실입금이 아직인 학생을 CRM에 등록하기 위해 "가결제"를 사용한다.
지금까지는 `payments.amount > 0` 제약 때문에 1원을 넣어 우회했다(예: 정예준 학생).
앞으로는 **0원 결제**를 정식으로 입력할 수 있게 하고, 기존 1원 우회 데이터를 0원으로 보정한다.

환불(음수 금액)은 기존 규칙을 그대로 유지한다.

## Requirements

### REQ-001: DB가 0원 결제를 허용
- **Priority**: Must
- **Description**: `payments_amount_check` 제약을 `환불 → amount < 0`, `그 외 → amount >= 0`으로 완화한다.
- **Acceptance Criteria**: `payment_type='최초결제', amount=0` INSERT/UPDATE가 성공하고, `환불`인데 `amount >= 0`이면 여전히 거부된다.
- **Verification**: (MANUAL) 사용자가 Supabase SQL Editor에서 마이그레이션 실행 후 0원 UPDATE 성공 확인

### REQ-002: 학생 상세 결제 API가 0원을 수락
- **Priority**: Must
- **Description**: `POST /api/crm/students/[id]/payment`의 `amount <= 0` 검증을 `amount < 0` + 숫자 타입 검증으로 교체한다.
- **Acceptance Criteria**: `amount: 0` 요청이 201로 저장되고, 음수/비숫자/누락은 400을 반환한다.
- **Verification**: (TEST) `src/app/api/crm/students/[id]/payment/__tests__/route.test.ts`

### REQ-003: 결제 목록 API가 0원을 수락하고 단계 전환을 유지
- **Priority**: Must
- **Description**: `POST /api/crm/payments`의 falsy 검증(`!body.amount`)이 0을 거르지 않도록 하고, 0원 결제도 학생을 "수업 중"으로 전환한다(가결제도 수업 시작이므로).
- **Acceptance Criteria**: `amount: 0` 요청이 201로 저장되고 `enrollStudentOnPayment`가 호출된다. 환불(`payment_type='환불'`)은 전환하지 않는다.
- **Verification**: (TEST) `src/app/api/crm/payments/__tests__/route.test.ts`

### REQ-004: 결제 모달에서 0원 입력 가능
- **Priority**: Must
- **Description**: `PaymentModal`의 `isValid`와 금액 input `min`이 0을 허용하도록 하고, 0원일 때 "가결제" 안내를 보여준다.
- **Acceptance Criteria**: 금액 0 입력 시 "결제 완료" 버튼이 활성화되고 0원·수익 0원이 표시되며, 빈 값/음수는 여전히 비활성.
- **Verification**: (BROWSER) 결제 모달에서 금액 0 입력 → 버튼 활성 + 가결제 안내 노출

### REQ-005: 정예준 학생 기존 1원 결제 보정
- **Priority**: Must
- **Description**: 결제 `f7605a85-9c4e-487a-8dff-dc09555d2f82`(정예준, 2026-08-10, 18시간)의 금액을 1원 → 0원으로 수정한다.
- **Acceptance Criteria**: 해당 레코드 `amount = 0`, 나머지 필드 불변.
- **Verification**: (MANUAL) REQ-001 적용 후 UPDATE 실행 및 재조회

### REQ-006: 가결제도 "결제 완료"로 집계
- **Priority**: Must
- **Description**: 통계의 결제 전환 판정(결제자 집합·결제 완료 카운트)에서 0원 결제를 양수 결제와 동일하게 취급한다. 과거 우회값 ₩1도 같은 기준으로 통일한다. 환불(음수)만 제외.
- **Acceptance Criteria**: 0원 최초결제 학생이 `stats`·`b2b/stats`·`strategy-stats`의 결제자/결제 완료에 포함된다. 매출 합계는 0원이라 영향 없음.
- **Verification**: (TEST) `src/lib/__tests__/strategy-stats.test.ts`

### REQ-007: 결제 금액·시간 수정 API
- **Priority**: Must
- **Description**: `PATCH /api/crm/payments/[id]`가 `amount`, `hours` 수정을 허용한다. 부호는 결과 결제 유형 기준으로 검증한다(환불이면 음수, 그 외 0 이상).
- **Acceptance Criteria**: 0원 가결제를 실입금액으로 수정 가능. 환불 건에 0 이상, 일반 건에 음수, 정수 아닌 값, 0 이하 시간은 400.
- **Verification**: (TEST) `src/app/api/crm/payments/[id]/__tests__/route.test.ts`

### REQ-008: 결제 히스토리 인라인 수정
- **Priority**: Must
- **Description**: 결제 히스토리 각 항목에 수정 버튼을 두고 금액·시간을 인라인 편집·저장한다.
- **Acceptance Criteria**: 저장 시 PATCH 호출 후 목록·총 결제액이 갱신되고, 취소하면 원복. 실패 시 롤백 + 알림.
- **Verification**: (TEST) `src/app/admin/crm/components/panel/sections/__tests__/PaymentHistoryRow.test.tsx`

## Technical Design

### Architecture
- `supabase/migrations/106_payments_allow_zero_amount.sql` — 제약 완화 (051의 후속)
- `src/app/api/crm/students/[id]/payment/route.ts` — 모달이 쓰는 주 경로
- `src/app/api/crm/payments/route.ts` — 목록/임포트 경로
- `src/app/api/crm/payments/[id]/route.ts` — 금액·시간 수정
- `src/app/admin/crm/components/PaymentModal.tsx` — 입력 UI
- `src/app/admin/crm/components/panel/sections/PaymentHistoryRow.tsx` — 신규. 행 표시 + 인라인 편집 (Section 파일 200줄 초과 방지)
- 통계 결제자 판정: `stats/route.ts`, `b2b/stats/route.ts`, `strategy-stats.ts`

### 결정 사항
- 가결제(0원)는 **실입금과 동일하게** 취급한다: 퍼널 "수업 중" 전환 + 결제 완료 집계 포함.
- `strategy-stats`의 기존 `amount > 1`(₩1 placeholder 제외)은 `>= 0`으로 통일한다 — ₩1도 동일한 가결제 우회값이므로 다른 통계와 기준을 맞춘다. 전략별 전환율 수치가 소폭 상승할 수 있다.

## Traceability Matrix

| REQ ID  | Description                   | Verification | Test File                                                   | Status  |
|---------|-------------------------------|--------------|-------------------------------------------------------------|---------|
| REQ-001 | DB 제약 0원 허용              | (MANUAL)     | `supabase/migrations/106_payments_allow_zero_amount.sql`     | Done (적용·검증) |
| REQ-002 | 학생 결제 API 0원 수락        | (TEST)       | `src/app/api/crm/students/[id]/payment/__tests__/route.test.ts` | Done (7) |
| REQ-003 | 결제 목록 API 0원 수락        | (TEST)       | `src/app/api/crm/payments/__tests__/route.test.ts`           | Done (5) |
| REQ-004 | 모달 0원 입력                 | (TEST)       | `src/app/admin/crm/components/__tests__/PaymentModal.zero-amount.test.tsx` | Done (4) |
| REQ-005 | 정예준 1원 → 0원              | (MANUAL)     | —                                                            | Done |
| REQ-006 | 0원도 결제 완료로 집계        | (TEST)       | `src/lib/__tests__/strategy-stats.test.ts`                    | Done (2) |
| REQ-007 | 금액·시간 수정 API            | (TEST)       | `src/app/api/crm/payments/[id]/__tests__/route.test.ts`       | Done (13) |
| REQ-008 | 히스토리 인라인 수정          | (TEST/BROWSER) | `.../__tests__/PaymentHistoryRow.test.tsx` + `tests/e2e/crm-payment-zero-amount.spec.ts` | Done (7+1) |
