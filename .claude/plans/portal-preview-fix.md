# 학부모 포털 미리보기 버그 수정

## Overview

관리자가 CRM에서 "미리보기" 버튼을 클릭했을 때 학부모 포털이 정상적으로 표시되지 않는 문제를 수정한다.
두 가지 독립적인 버그가 존재한다.

## Root Cause Analysis

### Bug 1: Popup Blocker (usePortalActions.ts)
`handlePreviewPortal()`에서 `await fetchPortalToken()` 이후에 `window.open()`을 호출한다.
비동기 작업 이후 `window.open()`은 브라우저 팝업 차단기에 의해 블록된다.
유저 제스처의 직접적인 콜스택에서 벗어나기 때문이다.

### Bug 2: Missing Session Cookie (portal/[token]/page.tsx + /api/portal/[token]/data)
Admin preview 모드(`?preview=admin`)에서 어드민 키 검증 후 React state를 `'authenticated'`로 설정하지만,
`/api/portal/${token}/data` 엔드포인트는 `portal_session_{token}` 쿠키를 요구한다.
이 쿠키는 오직 `/api/portal/[token]/auth`의 `issueSession()`을 통해서만 설정되므로,
admin preview 모드에서는 쿠키가 없어 데이터 조회가 401로 실패한다.

## Requirements

### REQ-001: Popup Blocker 우회
- **Priority**: Must
- **Description**: `window.open()`을 async 작업 이전에 동기적으로 호출하고, 이후 URL을 설정한다.
- **Acceptance Criteria**: 미리보기 버튼 클릭 시 새 탭이 팝업 차단 없이 바로 열린다.
- **Verification**: (MANUAL) 브라우저 팝업 차단 설정이 있어도 새 탭이 열리는지 확인

### REQ-002: Admin Preview 세션 쿠키 발급
- **Priority**: Must
- **Description**: `/api/portal/[token]/auth`에 GET 핸들러를 추가하여 어드민 키로 인증 시 세션 쿠키를 발급한다.
- **Acceptance Criteria**: `GET /api/portal/${token}/auth` with `x-admin-key` 헤더 → 세션 쿠키 설정
- **Verification**: (TEST) GET 핸들러가 유효한 admin key로 200 + 쿠키를 반환하는지 확인

### REQ-003: Admin Preview 플로우에서 세션 쿠키 요청
- **Priority**: Must
- **Description**: `portal/[token]/page.tsx`의 admin preview 분기에서 어드민 검증 후 세션 쿠키 발급 엔드포인트를 호출한다.
- **Acceptance Criteria**: 미리보기 열면 포털 데이터(상담 기록, 학생 정보)가 정상 표시된다.
- **Verification**: (BROWSER) CRM에서 미리보기 클릭 → 포털 콘텐츠가 로드되는지 확인

## Technical Design

### Architecture

**변경 파일**:
1. `src/app/admin/crm/components/panel/hooks/usePortalActions.ts`
   - `handlePreviewPortal()`: `window.open('', '_blank')` 먼저 호출 후 URL 설정

2. `src/app/api/portal/[token]/auth/route.ts`
   - GET 핸들러 추가: `isAuthenticated` 검증 후 `issueSession(token)` 호출

3. `src/app/portal/[token]/page.tsx`
   - admin preview 분기에서 `/api/admin/verify` 검증 후 `GET /api/portal/${token}/auth` 호출

### Dependencies
- `isAuthenticated` from `@/lib/server-auth` (이미 사용 중)

## Traceability Matrix

| REQ ID  | Description                     | Verification | Status  |
|---------|---------------------------------|--------------|---------|
| REQ-001 | Popup blocker 우회              | (MANUAL)     | Pending |
| REQ-002 | Admin preview 세션 쿠키 발급    | (MANUAL)     | Pending |
| REQ-003 | Preview 플로우 세션 쿠키 요청   | (BROWSER)    | Pending |

## Implementation Order

1. REQ-002 — auth 라우트 GET 핸들러 (서버 사이드, 독립적)
2. REQ-003 — page.tsx 업데이트 (REQ-002에 의존)
3. REQ-001 — usePortalActions.ts 팝업 수정 (독립적이지만 마지막에 검증)

## Out of Scope

- 기존 passcode 인증 로직 변경 없음
- 세션 만료 시간 변경 없음
