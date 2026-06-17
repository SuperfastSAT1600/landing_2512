# Partner Portal Admin Passcode

## Overview

파트너 포털에 관리자 전용 마스터 비밀번호를 추가한다. 고객(학부모)이 자체 비밀번호를 설정해도, 관리자는 별도의 환경변수 기반 비밀번호로 항상 접속할 수 있다. 잠금 카운터에 영향을 주지 않는다.

## Requirements

### REQ-001: 환경변수로 관리자 비밀번호 설정
- **Priority**: Must
- **Description**: `.env.local`에 `PARTNER_ADMIN_PASSCODE` 환경변수를 추가한다.
- **Acceptance Criteria**: 환경변수 값이 설정되면 auth 라우트에서 읽을 수 있다.
- **Verification**: (MANUAL) `.env.local`에 값 확인

### REQ-002: verify 시 관리자 비밀번호 우선 체크
- **Priority**: Must
- **Description**: `action: 'verify'` 시 입력값이 `PARTNER_ADMIN_PASSCODE`와 일치하면 잠금 상태·시도 횟수와 무관하게 세션을 발급한다.
- **Acceptance Criteria**: 260615 입력 시 포털 접속 성공. 잠금 상태여도 통과. 시도 카운터 증가 없음.
- **Verification**: (MANUAL) 브라우저에서 260615 입력 후 접속 확인

## Technical Design

### Architecture
- `src/app/api/partner/[token]/auth/route.ts` — verify 블록 상단에 admin passcode 체크 추가
- 환경변수: `PARTNER_ADMIN_PASSCODE`
- 체크 순서: admin 비밀번호 → 잠금 체크 → 일반 비밀번호 체크

### Dependencies
- 기존 bcrypt 불필요 (plain string 비교로 충분, 환경변수는 서버 사이드)

## Traceability Matrix

| REQ ID  | Description               | Verification | Status  |
|---------|---------------------------|--------------|---------|
| REQ-001 | 환경변수 설정              | (MANUAL)     | Pending |
| REQ-002 | admin passcode verify 우선 체크 | (MANUAL) | Pending |

## Implementation Order

1. REQ-001 — .env.local에 변수 추가
2. REQ-002 — auth route verify 로직 수정

## Out of Scope

- 포털별 개별 관리자 비밀번호 (전체 공통 1개)
- 관리자 비밀번호 변경 UI
