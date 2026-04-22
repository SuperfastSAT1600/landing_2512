# Fix: Diagnosis Test Infinite Duplicate Submission Bug

## Overview

`pancake0913@gmail.com` 유저의 진단 테스트 결과가 약 2초 간격으로 DB에 반복 삽입됨.
원인은 `DiagnosticTestView.tsx`의 타이머 자동 제출 `useEffect` 의존성 배열에 `submitted` state가
누락되어 무한 루프가 발생한다. 제한시간이 있는 모든 진단 테스트에서 타이머가 0이 되는 순간 발동된다.

## Requirements

### REQ-001: 타이머 effect에 submitted 조건 추가
- **Priority**: Must
- **Description**: `timer.remaining === 0` 조건 체크에 `!submitted` 추가 및 의존성 배열에 `submitted` 포함
- **Acceptance Criteria**: `submitted=true` 상태에서 타이머 effect가 재실행되어도 `handleSubmit`을 호출하지 않음
- **Verification**: (TEST) `submitted=true`일 때 handleSubmit이 재호출되지 않음을 확인

### REQ-002: ref 기반 동기 submit guard 추가
- **Priority**: Must
- **Description**: `isSubmittingRef`를 사용해 async race condition 중 중복 제출 방지
- **Acceptance Criteria**: 동시에 두 번 호출되어도 API는 1번만 호출됨
- **Verification**: (TEST) isSubmittingRef guard로 동시 호출이 1번만 실행됨을 확인

### REQ-003: API 60초 중복 제출 방지 (idempotency)
- **Priority**: Should
- **Description**: 동일 (student_email, test_id) 조합으로 60초 이내 중복 제출 시 기존 resultId 반환
- **Acceptance Criteria**: 60초 이내 동일 조합 재제출 시 200 반환 + 기존 id, 새 레코드 미생성
- **Verification**: (TEST) API가 60초 이내 중복 요청을 거부하고 기존 ID 반환

## Technical Design

### Architecture
- `src/app/diagnosis/components/DiagnosticTestView.tsx` — 타이머 effect 및 handleSubmit 수정
- `src/app/api/diagnosis/submit/route.ts` — INSERT 전 중복 체크 추가

### Dependencies
- Supabase (diagnostic_test_results 테이블)

## Traceability Matrix

| REQ ID  | Description                        | Verification | Test File                                          | Status  |
|---------|------------------------------------|-------------|----------------------------------------------------|---------|
| REQ-001 | 타이머 effect submitted 조건 추가  | (TEST)      | `src/__tests__/DiagnosticTestView.test.tsx`        | Pending |
| REQ-002 | ref 기반 submit guard              | (TEST)      | `src/__tests__/DiagnosticTestView.test.tsx`        | Pending |
| REQ-003 | API 60초 중복 방지                 | (TEST)      | `src/__tests__/diagnosis-submit.test.ts`           | Pending |

## Implementation Order

1. REQ-001 — 핵심 버그 수정, 즉각 효과
2. REQ-002 — async race condition 방어, REQ-001 이후 추가
3. REQ-003 — API 레벨 최후 방어선

## Out of Scope

- DB 중복 레코드 정리 (수동 SQL 작업 — 이 PR 범위 밖)
- 타이머 로직 자체 변경
