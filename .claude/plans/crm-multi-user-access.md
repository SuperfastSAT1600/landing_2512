# CRM 멀티 유저 접속 & 입력자 기록

## Overview

현재 단일 비밀번호로만 운영되는 Admin 인증을 확장하여, 4명의 담당자가 각자의 access code로 로그인하고, CRM 데이터 입력 시 입력자가 자동으로 기록되도록 한다.

유저 맵:
- dlalswo → 이민재
- rladndud → 김우영
- rlaskawns → 김남준
- rlawodus → 김재연

## Requirements

### REQ-001: 멀티 유저 인증 (auth API)
- **Priority**: Must
- **Description**: `/api/admin/auth`가 기존 ADMIN_PASSWORD 외에 4개의 access code를 추가로 수락. 각 코드는 동일한 ADMIN_SECRET_KEY를 반환하되, `userName`도 함께 반환.
- **Acceptance Criteria**: 4개 코드 중 하나로 로그인 시 `{ success: true, apiKey: ..., userName: "이민재" }` 형태 반환
- **Verification**: (MANUAL) 각 코드로 로그인 시 사이드바에 이름 표시 확인

### REQ-002: useAdminAuth - userName 저장
- **Priority**: Must
- **Description**: `useAdminAuth` 훅에서 로그인 시 `admin_user_name`을 localStorage에 저장, `userName` 상태 노출
- **Acceptance Criteria**: 로그인 후 `userName`이 훅에서 반환됨, 새로고침 후에도 유지
- **Verification**: (MANUAL) 브라우저 localStorage에 `admin_user_name` 키 확인

### REQ-003: 사이드바에 로그인 유저 이름 표시
- **Priority**: Must
- **Description**: `layout.tsx` 사이드바 하단 로그아웃 버튼 위에 현재 로그인한 유저 이름 표시
- **Acceptance Criteria**: 로그인 후 "이민재님" 같은 형태로 이름 노출
- **Verification**: (BROWSER) 로그인 후 사이드바 확인

### REQ-004: students 테이블에 entered_by 컬럼 추가
- **Priority**: Must
- **Description**: Supabase students 테이블에 `entered_by text` nullable 컬럼 추가 (migration 052)
- **Acceptance Criteria**: migration 실행 후 students 테이블에 entered_by 컬럼 존재
- **Verification**: (MANUAL) Supabase 대시보드에서 컬럼 확인

### REQ-005: Student 타입 & API에 entered_by 추가
- **Priority**: Must
- **Description**: `Student` 인터페이스와 `CreateStudentInput`에 `entered_by` 추가. POST `/api/crm/students`에서 `entered_by`를 받아 저장.
- **Acceptance Criteria**: 신규 학생 생성 시 `entered_by` 필드가 DB에 저장됨
- **Verification**: (MANUAL) 생성된 학생 레코드에서 entered_by 확인

### REQ-006: CRM 폼에서 entered_by 자동 전송
- **Priority**: Must
- **Description**: 학생 등록 폼에서 `useAdminAuth`의 `userName`을 `entered_by`로 자동 포함하여 API 호출
- **Acceptance Criteria**: 로그인한 유저 이름이 학생 생성 요청의 `entered_by`로 전달됨
- **Verification**: (MANUAL) 신규 학생 생성 후 DB에서 entered_by 값 확인

## Technical Design

### Architecture

**인증 플로우 변경:**
- `ADMIN_USERS` 상수(auth route 내 정의)로 `{ code: string, name: string }[]` 관리
- 기존 ADMIN_PASSWORD도 계속 지원 (기존 유저 하위호환)
- 로그인 성공 시 `userName`을 응답에 포함
- localStorage에 `admin_key` + `admin_user_name` 두 키 저장

**입력자 기록 플로우:**
- useAdminAuth → userName 노출
- CRM AddStudentForm → userName을 entered_by로 API 전달
- /api/crm/students POST → entered_by를 students 테이블에 저장

### Key Files
- `src/app/api/admin/auth/route.ts` - 멀티유저 인증
- `src/lib/useAdminAuth.ts` - userName 상태 추가
- `src/app/admin/layout.tsx` - 사이드바 이름 표시
- `supabase/migrations/052_add_entered_by_to_students.sql` - DB 컬럼
- `src/types/crm.ts` - entered_by 타입
- `src/app/api/crm/students/route.ts` - entered_by 저장
- CRM AddStudentForm - userName 전달

## Traceability Matrix

| REQ ID  | Description                   | Verification | Status  |
|---------|-------------------------------|--------------|---------|
| REQ-001 | 멀티 유저 인증                 | (MANUAL)     | Pending |
| REQ-002 | userName localStorage 저장     | (MANUAL)     | Pending |
| REQ-003 | 사이드바 이름 표시             | (BROWSER)    | Pending |
| REQ-004 | DB entered_by 컬럼             | (MANUAL)     | Pending |
| REQ-005 | 타입 & API entered_by          | (MANUAL)     | Pending |
| REQ-006 | 폼에서 자동 전송               | (MANUAL)     | Pending |

## Implementation Order

1. REQ-001 — auth 기반부터
2. REQ-002 — auth 결과를 저장
3. REQ-003 — 저장된 값을 UI에 표시
4. REQ-004 — DB 컬럼 추가
5. REQ-005 — 타입 & API 연동
6. REQ-006 — 폼 연결

## Out of Scope

- 유저별 CRM 접근 권한 차등 (모든 유저 동일 권한)
- 기존 학생 레코드의 entered_by 소급 적용
- consultation_timeline의 manager_id 자동 설정 (별도 작업)
