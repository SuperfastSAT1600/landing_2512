# B2B 레슨 피드백 포털

## Overview

강원 U-18 영어 수업 코치가 수업 후 피드백을 작성하면,
구단과 학부모가 6자리 PIN으로 열람하는 정적 HTML 포털.
별도 로그인 없이 PIN 하나로 접근 제어.

## Requirements

### REQ-001: Supabase 테이블 — b2b_lesson_feedback
- **Priority**: Must
- **Description**: unit, lesson_date, lesson_content, student_notes(JSON), homework, pin, created_at
- **Acceptance Criteria**: migration SQL 실행 후 INSERT/SELECT 성공
- **Verification**: (MANUAL) Supabase Dashboard에서 테이블 확인

### REQ-002: 강사 작성 폼
- **Priority**: Must
- **Description**: unit 선택, 날짜 자동입력(오늘), lesson_content 자동완성(유닛별 템플릿)+편집 가능, 학생별 메모 행 추가/삭제, 숙제 입력, 6자리 PIN 설정 후 저장
- **Acceptance Criteria**: 저장 후 Supabase에 레코드 생성됨. PIN은 plaintext 저장.
- **Verification**: (MANUAL) 제출 후 DB에서 레코드 확인

### REQ-003: 구단/학부모 열람 (PIN 인증)
- **Priority**: Must
- **Description**: 6자리 PIN 입력 → DB에서 일치하는 레코드 조회 → 피드백 읽기 전용 표시
- **Acceptance Criteria**: 올바른 PIN → 피드백 표시. 틀린 PIN → 오류 메시지.
- **Verification**: (BROWSER) PIN 입력 후 피드백 화면 확인

### REQ-004: 유닛별 수업 내용 템플릿 자동완성
- **Priority**: Must
- **Description**: unit1 선택 시 "Self-Introduction & Joining the Team" 내용 사전 입력, unit2 선택 시 Win/Lose 인터뷰 템플릿 사전 입력
- **Acceptance Criteria**: unit 변경 시 lesson_content 필드가 해당 템플릿으로 채워짐
- **Verification**: (BROWSER) unit 드롭다운 변경 시 텍스트 변화 확인

### REQ-005: 유닛 페이지 topnav에 레슨 피드백 링크 추가
- **Priority**: Must
- **Description**: unit1.html, unit2.html의 .nav-right에 "레슨 피드백" 링크 추가
- **Acceptance Criteria**: 링크 클릭 시 lesson-feedback.html로 이동
- **Verification**: (BROWSER) topnav에서 클릭 테스트

## Technical Design

### Architecture
- 파일: `/workspace/public/b2bproj/lesson-feedback.html` (정적 HTML, Supabase JS CDN)
- 마이그레이션: `/workspace/supabase/migrations/076_b2b_lesson_feedback.sql`
- 미러: `/workspace/b2bproj/lesson-feedback.html`
- 같은 페이지 내 두 섹션: 상단=강사 폼, 하단=PIN 열람
- 스크롤 또는 탭으로 구분

### PIN 저장 방식
- 6자리 숫자 텍스트 plaintext 저장 (학교 B2B, 저위험)
- RLS: anon SELECT (pin 칼럼 포함) — 클라이언트가 WHERE pin = ? 로 조회
- anon INSERT — 강사가 직접 제출

### Dependencies
- Supabase JS v2 (CDN)
- 기존 SpaceX 다크 디자인 시스템 (--night, --white, --mute 등)

## Traceability Matrix

| REQ ID  | Description              | Verification | Status  |
|---------|--------------------------|--------------|---------|
| REQ-001 | Supabase 테이블 생성     | (MANUAL)     | Pending |
| REQ-002 | 강사 작성 폼             | (MANUAL)     | Pending |
| REQ-003 | PIN 열람                 | (BROWSER)    | Pending |
| REQ-004 | 유닛 템플릿 자동완성     | (BROWSER)    | Pending |
| REQ-005 | topnav 링크 추가         | (BROWSER)    | Pending |

## Implementation Order

1. REQ-001 — 테이블 먼저
2. REQ-002 + REQ-004 — 강사 폼 (같은 파일)
3. REQ-003 — 열람 섹션
4. REQ-005 — topnav 링크

## Out of Scope

- 강사 인증 (코치는 URL로만 접근)
- 여러 피드백 목록 보기 (PIN 1개 = 1회 수업)
- 피드백 수정/삭제
