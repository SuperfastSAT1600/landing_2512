# 재결제 후보 목록을 튜터링 목록과 일치시키기

## Overview

재결제 대상 추가 목록이 현재 튜터링중 화면과 동일한 학생 집합을 보여주도록 후보 조회 기준을 맞춘다. SFv2 상태 산정 API의 보호된 로직은 변경하지 않고, 기존 `EnrolledLeads`가 사용하는 enrolled 학생 목록과 tutoring 사용자 상태를 조합한다.

## Requirements

### REQ-001: 튜터링 목록과 동일한 기본 학생 집합
- **Priority**: Must
- **Description**: 후보 추가를 열면 `lead_status=enrolled` 학생을 기본 집합으로 조회하고 tutoring-users 응답으로 종료 학생만 제외한다.
- **Acceptance Criteria**: linked 여부와 관계없이 EnrolledLeads에 표시되는 enrolled 학생이 후보 목록에 포함된다. tutoring 상태가 `ended`인 학생은 포함되지 않는다.
- **Verification**: (TEST) 후보 데이터 조합 로직이 enrolled 학생을 유지하고 ended 학생만 제외하는지 검증한다.

### REQ-002: 기존 열린 재결제 대상 제외
- **Priority**: Must
- **Description**: stage 1–3의 renewal target에 이미 등록된 학생은 후보에서 제외한다. stage 4 완료 대상은 다시 선택 가능하다.
- **Acceptance Criteria**: 열린 target 학생은 보이지 않고, 완료 target 학생은 다시 후보에 나타난다.
- **Verification**: (TEST) 열린/완료 target 필터 동작을 검증한다.

### REQ-003: 후보 로딩 오류와 검색 동작 유지
- **Priority**: Must
- **Description**: 두 API를 인증 헤더와 함께 조회하고 기존 이름 검색·정렬·로딩/오류 UI를 유지한다.
- **Acceptance Criteria**: API 오류는 오류 메시지로 표시되고 정상 응답은 이름순으로 렌더링된다.
- **Verification**: (BROWSER) 재결제 대상 추가를 열어 튜터링 화면에 보이는 학생을 검색하고 선택한다.

## Technical Design

### Architecture

`RenewalCandidateAdd`가 `EnrolledLeads`와 동일하게 `/api/crm/students?lead_status=enrolled` 및 `/api/admin/srm/tutoring-users`를 병렬 조회한다. 순수 후보 조합 함수를 별도 유틸 파일로 분리해 테스트하며, `tutoring-users/route.ts`는 수정하지 않는다.

### Dependencies

기존 CRM 학생 API, tutoring-users API, `RenewalTarget` 타입, React Testing Library.

## Traceability Matrix

| REQ ID | Description | Verification | Test File | Status |
|---|---|---|---|---|
| REQ-001 | enrolled + tutoring 상태 조합 | (TEST) | `src/app/admin/crm/components/__tests__/renewal-candidate-source.test.ts` | Pending |
| REQ-002 | 열린 target 제외 | (TEST) | `src/app/admin/crm/components/__tests__/renewal-candidate-source.test.ts` | Pending |
| REQ-003 | 후보 컴포넌트 UI 및 API 조회 | (BROWSER) | 수동 브라우저 검증 | Pending |

## Implementation Order

1. REQ-001 — 순수 조합 로직 테스트를 먼저 작성한다.
2. REQ-002 — 중복 제외 규칙을 같은 테스트에 추가한다.
3. REQ-003 — 후보 컴포넌트의 API 호출을 수정하고 targeted 검증 후 브라우저에서 확인한다.

## Out of Scope

- `src/app/api/admin/srm/tutoring-users/route.ts`의 SFv2 상태 산정·후보 필터 로직 변경
- migration 실행, 커밋, 푸시
