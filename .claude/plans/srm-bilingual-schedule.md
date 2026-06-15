# SRM 스케줄 이중언어 메시지 & 학생별 언어 설정

## Overview

SRM 스케줄 뷰에서 학생에게 보낼 알림 메시지를 한국어/영어 중 선택할 수 있도록 한다.
담당자가 학생별 소통 언어를 SRM에서 설정하고, 스케줄 뷰에서 KO/EN 배지로 즉시 확인하며
올바른 언어의 메시지를 복사할 수 있어야 한다.

## Requirements

### REQ-001: DB — comm_language 컬럼 추가
- **Priority**: Must
- **Description**: `students` 테이블에 `comm_language varchar(2) DEFAULT 'ko'` 추가
- **Acceptance Criteria**: Supabase에서 enrolled 학생의 comm_language 읽기/쓰기 가능
- **Verification**: (MANUAL) Supabase SQL Editor에서 컬럼 추가 후 SELECT 확인

### REQ-002: API — 학생 언어 목록 조회
- **Priority**: Must
- **Description**: `/api/admin/srm/student-languages` GET — enrolled 학생의 sfv2_profile_id → comm_language 맵 반환
- **Acceptance Criteria**: `{ [sfv2ProfileId]: 'ko' | 'en' }` JSON 반환
- **Verification**: (MANUAL) curl 또는 브라우저로 응답 확인

### REQ-003: API — 학생 언어 설정 저장
- **Priority**: Must
- **Description**: `/api/admin/srm/student/[profileId]/route.ts` PATCH에 comm_language 저장 or 별도 PATCH 엔드포인트
- **Acceptance Criteria**: StudentPanel에서 KO/EN 토글 후 DB 반영
- **Verification**: (BROWSER) 토글 후 새로고침해도 유지

### REQ-004: StudentPanel — 언어 토글 UI
- **Priority**: Must
- **Description**: 학생 정보 영역에 KO | EN 토글 버튼 추가, 선택 시 즉시 저장
- **Acceptance Criteria**: 현재 언어 설정이 강조 표시되고 클릭 시 DB 업데이트
- **Verification**: (BROWSER) StudentPanel 열어서 토글 확인

### REQ-005: UnifiedTimeline — 언어 배지 표시
- **Priority**: Must
- **Description**: 스케줄 뷰 학생 이름 옆에 KO/EN 작은 배지 표시
- **Acceptance Criteria**: EN 학생은 파란 "EN" 배지, KO는 표시 없음(기본값이므로)
- **Verification**: (BROWSER) 스케줄 뷰에서 EN 설정 학생 확인

### REQ-006: 복사 메시지 영어 버전
- **Priority**: Must
- **Description**: 학생 언어가 'en'이면 영어 메시지로 복사
- **Acceptance Criteria**: 코치룸 EN: `<Alert> You have a class today at HH:MM (Korea time)! Don't miss it and study hard!` / 스터디홀 EN: `Today's Study Hall starts at HH:MM (KST). Don't be late!`
- **Verification**: (BROWSER) EN 학생이 있는 이벤트의 복사 버튼 클릭 후 클립보드 내용 확인

## Technical Design

### Architecture
- `students.comm_language` (varchar 2, default 'ko') — CRM DB 컬럼
- `/api/admin/srm/student-languages` — sfv2ProfileId → language 맵 (vip-students API와 동일 패턴)
- `UnifiedTimeline` props에 `studentLanguages?: Map<string, 'ko' | 'en'>` 추가
- 스케줄 행에서 studentId → language 조회 → EN이면 배지 + EN 메시지 생성
- StudentPanel 좌측 컬럼 학생정보 영역에 언어 토글 추가
- 언어 변경 PATCH: `/api/admin/srm/student/[profileId]` 또는 크m studentId 기반 별도 엔드포인트

### Dependencies
- Supabase migration (사용자가 실행): `ALTER TABLE students ADD COLUMN IF NOT EXISTS comm_language varchar(2) DEFAULT 'ko';`
- lucide-react (이미 사용 중)

## Traceability Matrix

| REQ ID  | Description               | Verification | Status  |
|---------|---------------------------|--------------|---------|
| REQ-001 | DB comm_language 컬럼     | (MANUAL)     | Pending |
| REQ-002 | 언어 목록 API             | (MANUAL)     | Pending |
| REQ-003 | 언어 저장 API             | (BROWSER)    | Pending |
| REQ-004 | StudentPanel 토글         | (BROWSER)    | Pending |
| REQ-005 | 스케줄 배지               | (BROWSER)    | Pending |
| REQ-006 | 영어 메시지               | (BROWSER)    | Pending |

## Implementation Order

1. REQ-001 — Supabase 마이그레이션 (사용자 실행)
2. REQ-002 — student-languages API
3. REQ-003 — 언어 저장 PATCH API
4. REQ-004 — StudentPanel 토글 UI
5. REQ-005 — UnifiedTimeline 배지
6. REQ-006 — 영어 메시지 빌더

## Out of Scope

- 메시지 내용 커스터마이징
- 언어 외 다른 소통 설정
- 이벤트 단위 언어 오버라이드
