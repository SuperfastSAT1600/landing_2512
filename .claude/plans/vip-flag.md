# VIP 학생 플래그 기능

## Overview

결제 입력 시 해당 학생을 VIP로 체크할 수 있는 기능 추가. 수업 중 탭에서 VIP 학생만 별도로 조회할 수 있는 뷰 제공.

## Requirements

### REQ-001: DB — is_vip 컬럼 추가
- **Priority**: Must
- **Description**: students 테이블에 `is_vip boolean default false` 컬럼 추가
- **Acceptance Criteria**: migration 실행 후 students 테이블에 is_vip 컬럼 존재
- **Verification**: (MANUAL) Supabase에서 컬럼 확인

### REQ-002: Student 타입 업데이트
- **Priority**: Must
- **Description**: `src/types/crm.ts`의 Student 인터페이스에 `is_vip: boolean | null` 추가
- **Acceptance Criteria**: 타입 오류 없이 빌드 통과
- **Verification**: (TEST) tsc --noEmit

### REQ-003: PaymentModal — VIP 체크박스
- **Priority**: Must
- **Description**: Step 3 결제 정보 입력 시 세금 유형 아래에 VIP 체크박스 추가. 체크 시 결제 API 요청에 `is_vip: true` 포함
- **Acceptance Criteria**: 체크박스 표시, 체크/언체크 동작, API 요청에 is_vip 포함
- **Verification**: (BROWSER) PaymentModal Step 3에서 VIP 체크박스 확인

### REQ-004: Payment API — is_vip 반영
- **Priority**: Must
- **Description**: `/api/crm/students/[id]/payment` POST에서 body의 `is_vip` 값을 students 테이블 update에 포함
- **Acceptance Criteria**: is_vip=true로 결제 처리 시 students.is_vip가 true로 업데이트됨
- **Verification**: (MANUAL) DB에서 직접 확인

### REQ-005: EnrolledLeads — VIP 탭
- **Priority**: Must
- **Description**: 수업 중 섹션에 "전체" / "VIP" 탭 추가. VIP 탭 선택 시 is_vip=true인 학생만 조회
- **Acceptance Criteria**: VIP 탭 클릭 시 VIP 학생 목록 표시, VIP 배지 노출
- **Verification**: (BROWSER) VIP 탭에서 김윤서01 등 VIP 학생 확인

### REQ-006: 학생 카드 VIP 배지
- **Priority**: Should
- **Description**: EnrolledCard에서 is_vip=true인 학생에게 VIP 배지 표시
- **Acceptance Criteria**: VIP 학생 카드에 금색 "VIP" 배지 노출
- **Verification**: (BROWSER) VIP 학생 카드에 배지 확인

## Technical Design

### Architecture
- Migration: `supabase/migrations/056_add_is_vip_to_students.sql`
- Type: `src/types/crm.ts` Student 인터페이스
- Modal: `src/app/admin/crm/components/PaymentModal.tsx`
- API: `src/app/api/crm/students/[id]/payment/route.ts`
- Component: `src/app/admin/crm/components/EnrolledLeads.tsx`
- API 조회: `/api/crm/students?lead_status=enrolled&is_vip=true`로 VIP 필터링

### API 필터링
students API(`/api/crm/students/route.ts`)에서 `is_vip` 쿼리 파라미터 지원 추가.

## Traceability Matrix

| REQ ID  | Description           | Verification | Status  |
|---------|-----------------------|--------------|---------|
| REQ-001 | DB is_vip 컬럼        | (MANUAL)     | Pending |
| REQ-002 | Student 타입          | (TEST)       | Pending |
| REQ-003 | PaymentModal 체크박스 | (BROWSER)    | Pending |
| REQ-004 | Payment API           | (MANUAL)     | Pending |
| REQ-005 | EnrolledLeads VIP 탭  | (BROWSER)    | Pending |
| REQ-006 | VIP 배지              | (BROWSER)    | Pending |

## Implementation Order

1. REQ-001 — DB 먼저
2. REQ-002 — 타입 정의
3. REQ-004 — API
4. REQ-003 — Modal
5. REQ-005, REQ-006 — UI

## Out of Scope

- VIP 학생에 대한 별도 알림/슬랙 연동
- VIP 등급 세분화 (1단계만)
- 기존 학생 일괄 VIP 설정 UI (DB에서 직접 처리)
