# 재결제 후보를 튜터링중 메뉴와 동일하게 조회

## Overview

재결제 대상 추가 목록이 CRM의 튜터링중 메뉴와 동일한 데이터 조합을 사용하도록 맞춘다. enrolled 학생을 기본 목록으로 사용하고 tutoring-users의 linked 상태로 분류하되, 튜터링중 메뉴에 표시되지 않는 종료 학생만 제외한다.

## Requirements

### REQ-001: 동일한 API 데이터 조합
- **Priority**: Must
- **Description**: 후보 추가는 `/api/crm/students?lead_status=enrolled`와 `/api/admin/srm/tutoring-users`를 동일하게 조회한다.
- **Acceptance Criteria**: 튜터링중 메뉴와 동일한 enrolled 학생 집합 및 linked 상태 응답을 사용한다.
- **Verification**: (TEST) API 응답 조합 로직을 검증한다.

### REQ-002: 동일한 표시 제외 규칙
- **Priority**: Must
- **Description**: 튜터링중 메뉴에서 제외하는 `ended` 학생과 열린 renewal target만 후보에서 제외한다.
- **Acceptance Criteria**: active/paused/partial_end/sales/unlinked enrolled 학생은 후보에 표시되고, ended 및 열린 target은 표시되지 않는다.
- **Verification**: (TEST) 상태별 후보 집합과 열린/완료 target 필터를 검증한다.

### REQ-003: 후보 선택 UI 유지
- **Priority**: Must
- **Description**: 이름 검색, 이름순 정렬, 로딩/오류 및 추가 동작을 유지한다.
- **Acceptance Criteria**: 재결제 대상 추가 버튼을 누르면 동일한 학생 목록이 표시되고 검색하여 추가할 수 있다.
- **Verification**: (BROWSER) CRM 튜터링중 메뉴와 재결제 대상 추가 목록의 학생을 비교한다.

## Technical Design

`EnrolledLeads`의 `Promise.all` API 호출 및 `classifyEntries`와 동일한 입력 계약을 사용한다. 순수 후보 조합 함수는 별도 모듈에서 관리하고 `RenewalCandidateAdd`는 두 API를 병렬 호출한 뒤 해당 함수만 사용한다. `tutoring-users/route.ts`는 수정하지 않는다.

## Traceability Matrix

| REQ ID | Description | Verification | Test File | Status |
|---|---|---|---|---|
| REQ-001 | 동일 API 조합 | (TEST) | `src/app/admin/crm/components/__tests__/renewal-candidate-source.test.ts` | Pending |
| REQ-002 | 상태/target 제외 | (TEST) | `src/app/admin/crm/components/__tests__/renewal-candidate-source.test.ts` | Pending |
| REQ-003 | 브라우저 후보 목록 | (BROWSER) | 수동 브라우저 검증 | Pending |

## Implementation Order

1. REQ-001 — 실제 튜터링중 컴포넌트와 후보 로더의 API 계약을 대조한다.
2. REQ-002 — 순수 후보 조합 로직과 회귀 테스트를 보강한다.
3. REQ-003 — 컴포넌트 로더를 수정하고 targeted 검증 후 브라우저에서 확인한다.

## Out of Scope

- `src/app/api/admin/srm/tutoring-users/route.ts`의 SFv2 산정 로직 변경
- migration 실행
- 커밋 및 푸시
