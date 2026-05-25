# Parent Portal — 학부모 상담 이력 포털

## Overview

상담 완료 후 CRM에서 고유 링크를 생성하고, 학부모가 6자리 비밀번호로 접근하여
상담 이력(published memos)과 진단테스트 결과를 확인하는 페이지.

- 코치는 CRM StudentDetailPanel에서 "포털 링크 복사" 버튼으로 URL을 가져와 카카오/문자로 전달
- 학부모는 링크 최초 접속 시 6자리 비밀번호 설정, 이후 재방문 시 비밀번호로 인증
- 잠금 방어: 5회 오류 시 30분 잠금

## Requirements

### REQ-001: 포털 토큰 생성 (CRM)
- **Priority**: Must
- **Description**: CRM StudentDetailPanel에 "포털 링크" 버튼 추가. 학생에게 `portal_token`이 없으면 서버에서 생성 후 저장, 있으면 기존 토큰 반환. URL 형식: `/portal/[token]`
- **Acceptance Criteria**: 버튼 클릭 시 URL이 클립보드에 복사되고 "복사됨" 피드백 표시
- **Verification**: (BROWSER) StudentDetailPanel에서 복사 버튼 동작 확인

### REQ-002: 비밀번호 설정 (최초 접속)
- **Priority**: Must
- **Description**: `passcode_hash`가 없는 상태로 포털 접속 시 6자리 숫자 비밀번호 설정 화면 표시. bcrypt로 해시 후 저장.
- **Acceptance Criteria**: 설정 완료 후 포털 메인 콘텐츠로 이동. 6자리 미만이면 제출 불가.
- **Verification**: (TEST) POST /api/portal/[token]/auth?action=set

### REQ-003: 비밀번호 인증 (재방문)
- **Priority**: Must
- **Description**: `passcode_hash`가 있는 상태에서 포털 접속 시 비밀번호 입력 화면 표시. 5회 오류 시 30분 잠금. 인증 성공 시 httpOnly 쿠키 발급 (1시간).
- **Acceptance Criteria**: 정상 비밀번호 → 콘텐츠 표시. 오류 5회 → "30분 후 재시도" 메시지.
- **Verification**: (TEST) POST /api/portal/[token]/auth?action=verify

### REQ-004: 상담 이력 표시
- **Priority**: Must
- **Description**: `consultation_timeline` 중 `published: true`인 항목만 `ai_purified` 내용으로 최신순 표시. 날짜 포함.
- **Acceptance Criteria**: published 항목만 보임. raw_memo, manager_id 등 내부 필드는 절대 노출 안 됨.
- **Verification**: (TEST) GET /api/portal/[token]/data

### REQ-005: 진단테스트 결과 표시
- **Priority**: Must
- **Description**: `diagnostic_result_id`로 연결된 최신 진단테스트 결과를 요약 표시 (점수, 제출일시). 결과 없으면 "아직 진단테스트를 완료하지 않았습니다" 표시.
- **Acceptance Criteria**: 결과 있으면 점수/날짜 표시. 없으면 안내 문구 표시.
- **Verification**: (TEST) GET /api/portal/[token]/data

### REQ-006: 포털 토큰 DB 마이그레이션
- **Priority**: Must
- **Description**: `students` 테이블에 `portal_token TEXT UNIQUE` 컬럼 추가 마이그레이션.
- **Acceptance Criteria**: 마이그레이션 실행 후 컬럼 존재 확인.
- **Verification**: (MANUAL) psql로 컬럼 확인

## Technical Design

### Architecture

```
/portal/[token]/          ← 학부모 접근 페이지 (Next.js App Router)
  page.tsx               ← 비밀번호 설정/인증 + 콘텐츠 렌더링

/api/portal/[token]/
  route.ts               ← GET: 포털 존재 여부 확인 (비밀번호 설정 여부)
  auth/route.ts          ← POST: 비밀번호 설정(set) / 검증(verify)
  data/route.ts          ← GET: 인증 후 콘텐츠 반환 (published memos + test result)

/api/crm/students/[id]/
  portal-token/route.ts  ← POST: portal_token 생성/반환 (관리자 전용)
```

### Data Flow

1. CRM admin → `POST /api/crm/students/[id]/portal-token` → `portal_token` 생성 → URL 반환
2. 학부모 → `/portal/[token]` 접속
3. `GET /api/portal/[token]` → `{ hasPasscode: boolean }` 확인
4. 비밀번호 없음 → 설정 폼 → `POST /api/portal/[token]/auth?action=set`
5. 비밀번호 있음 → 입력 폼 → `POST /api/portal/[token]/auth?action=verify` → 쿠키 발급
6. 인증 후 → `GET /api/portal/[token]/data` (쿠키 검증) → memos + test result

### Security

- `portal_token`: `crypto.randomBytes(16).toString('hex')` (32자 hex)
- 비밀번호: bcrypt rounds 12
- 인증 쿠키: `httpOnly`, `secure`, `sameSite: strict`, 1시간 만료
- 잠금: `passcode_attempts >= 5` + `passcode_locked_until` (30분)
- `data` API: 쿠키에서 `portal_token` 검증, 일치하지 않으면 401

### Files to Create/Modify

**새로 만들기**:
- `supabase/migrations/031_add_portal_token.sql`
- `src/app/portal/[token]/page.tsx`
- `src/app/portal/[token]/components/PasscodeSetup.tsx`
- `src/app/portal/[token]/components/PasscodeEntry.tsx`
- `src/app/portal/[token]/components/PortalContent.tsx`
- `src/app/api/portal/[token]/route.ts`
- `src/app/api/portal/[token]/auth/route.ts`
- `src/app/api/portal/[token]/data/route.ts`
- `src/app/api/crm/students/[id]/portal-token/route.ts`

**수정**:
- `src/app/admin/crm/components/StudentDetailPanel.tsx` — 포털 링크 버튼 추가

## Traceability Matrix

| REQ ID  | Description               | Verification | Status  |
|---------|---------------------------|--------------|---------|
| REQ-001 | 포털 토큰 생성 (CRM)       | (BROWSER)    | Pending |
| REQ-002 | 비밀번호 설정              | (TEST)       | Pending |
| REQ-003 | 비밀번호 인증              | (TEST)       | Pending |
| REQ-004 | 상담 이력 표시             | (TEST)       | Pending |
| REQ-005 | 진단테스트 결과 표시        | (TEST)       | Pending |
| REQ-006 | DB 마이그레이션            | (MANUAL)     | Pending |

## Implementation Order

1. REQ-006 — DB 마이그레이션 (portal_token 컬럼)
2. REQ-001 — CRM portal-token API + UI 버튼
3. REQ-002, REQ-003 — 인증 API (set/verify)
4. REQ-004, REQ-005 — data API (콘텐츠 반환)
5. 포털 프론트엔드 페이지

## Out of Scope

- 이메일/SMS 자동 발송 (링크만 생성, 전달은 수동)
- 학부모 회원가입/계정 관리
- 비밀번호 변경 (잊어버리면 관리자가 초기화)
- 실시간 업데이트 알림
