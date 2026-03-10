# Admin 코드 관리 개선

## Overview

Admin이 발급한 접속 코드의 상태(미사용/시험완료)를 확인하고, 유효기간을 정확한 날짜+시간으로 설정할 수 있도록 개선.

## Requirements

### REQ-001: 발급 코드 목록 조회
- **Priority**: Must
- **Description**: "코드 관리" 탭에서 발급한 모든 코드를 테이블로 표시 (학생명, 이메일, 코드, 만료일시, 상태)
- **Acceptance Criteria**: 코드 생성 후 목록에 즉시 반영, 최신순 정렬
- **Verification**: (BROWSER)

### REQ-002: 코드 사용 상태 표시
- **Priority**: Must
- **Description**: 각 코드의 상태를 표시: "대기중" (미사용), "완료" (시험 제출됨), "만료" (유효기간 초과)
- **Acceptance Criteria**: 시험 제출 여부를 `diagnostic_test_results.token_id`로 매칭하여 판단
- **Verification**: (BROWSER)

### REQ-003: 유효기간 datetime 입력
- **Priority**: Must
- **Description**: 코드 생성 시 유효기간을 `datetime-local` input으로 정확한 날짜+시간 지정
- **Acceptance Criteria**: 기본값은 24시간 후, 직접 날짜+시간 수정 가능
- **Verification**: (BROWSER)

### REQ-004: 코드 목록 조회 API
- **Priority**: Must
- **Description**: `GET /api/admin/diagnosis/tokens` — 발급 코드 목록 + 사용 상태 반환
- **Acceptance Criteria**: 각 코드에 `status` 필드 포함 (pending/completed/expired)
- **Verification**: (MANUAL) curl로 확인

## Traceability Matrix

| REQ ID  | Description           | Verification | Status  |
|---------|-----------------------|--------------|---------|
| REQ-001 | 코드 목록 표시          | (BROWSER)    | Pending |
| REQ-002 | 사용 상태 표시          | (BROWSER)    | Pending |
| REQ-003 | datetime 유효기간 입력  | (BROWSER)    | Pending |
| REQ-004 | 코드 목록 API          | (MANUAL)     | Pending |

## Implementation Order

1. REQ-004 — API 먼저 (데이터 소스)
2. REQ-003 — 유효기간 UI 변경 (독립적)
3. REQ-001 + REQ-002 — 코드 목록 + 상태 표시 (API 필요)

## Files to modify
- `src/app/api/admin/diagnosis/tokens/route.ts` — GET 핸들러 추가
- `src/app/admin/diagnosis/components/GenerateTokenTab.tsx` — datetime 입력 + 코드 목록 UI

## Out of Scope
- 코드 비활성화/삭제 기능
- 코드 재발급
