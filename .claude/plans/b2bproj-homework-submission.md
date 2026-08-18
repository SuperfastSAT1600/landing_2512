# B2B 프로젝트 — 숙제 제출 & 현황판 기능

## Overview

강원 U-18 영어 인터뷰 수업(unit1~6.html) 숙제 섹션에 학생 제출 폼을 추가하고, 코치가 수업 시작 시 한눈에 제출 현황을 볼 수 있는 보드 페이지를 만든다. 로그인 없음, 최대한 가벼운 구조. 텍스트 제출만 온라인으로 처리하고 음성/영상 녹화 숙제는 카카오톡 제출 안내.

## Requirements

### REQ-001: Supabase 테이블 — b2b_homework_submissions
- **Priority**: Must
- **Description**: 숙제 제출 데이터를 저장할 테이블. 로그인 없으므로 anon INSERT + SELECT 허용.
- **Acceptance Criteria**: 테이블에 `id, unit, student_name, rewatch_answer, prepare_answer, submitted_at` 컬럼 존재. anon 키로 insert/select 성공.
- **Verification**: (MANUAL) Supabase 대시보드에서 테이블 확인 + curl test

### REQ-002: 숙제 섹션 — 제출 폼 (unit2.html)
- **Priority**: Must
- **Description**: 기존 homework 섹션 하단에 제출 폼 추가. 이름 + REWATCH 답 + PREPARE 답 입력, 제출 버튼. RECORD(녹화)는 카카오톡 안내 문구만 표시.
- **Acceptance Criteria**: 폼 제출 시 Supabase에 row 저장됨. 제출 후 "제출 완료" 상태로 전환. 같은 브라우저에서 중복 제출 방지(localStorage로 체크).
- **Verification**: (BROWSER) 폼 작성 → 제출 → Supabase 대시보드 row 확인

### REQ-003: 숙제 현황판 — homework.html
- **Priority**: Must
- **Description**: `/b2bproj/homework.html` 별도 페이지. unit 선택 드롭다운 + 전체 제출 목록 카드형 표시. 코치가 수업 시작 전 이 페이지를 열어 누가 제출했는지 확인.
- **Acceptance Criteria**: unit 선택 시 해당 unit 제출 목록 실시간 로드. 학생 이름 + 제출 내용 + 제출 시각 표시. 미제출자는 표시 안 함(제출한 사람만 보임).
- **Verification**: (BROWSER) unit2 제출 후 homework.html 열어 카드 확인

### REQ-004: 학생 간 제출 공유 뷰 (unit 페이지 내)
- **Priority**: Should
- **Description**: 폼 제출 완료 후, 같은 unit 전체 제출 목록을 페이지 내에서 바로 볼 수 있음. "다른 팀원 답변 보기" 토글.
- **Acceptance Criteria**: 제출 완료 상태에서 "팀원 답변 보기" 버튼 클릭 시 목록 인라인 표시.
- **Verification**: (BROWSER) 제출 후 버튼 클릭 → 다른 학생 카드 표시

### REQ-005: unit1.html에도 동일한 폼 적용
- **Priority**: Should
- **Description**: unit2와 동일한 패턴으로 unit1.html 숙제 섹션에도 제출 폼 추가.
- **Acceptance Criteria**: unit1 숙제 폼 작동, homework.html에서 unit1 선택 시 조회 가능.
- **Verification**: (BROWSER) unit1 제출 → homework.html unit1 탭에서 확인

## Technical Design

### Architecture

- **Storage**: Supabase (anon key, public RLS). Next.js API route 없이 HTML에서 Supabase JS CDN 직접 호출.
- **파일 구조**:
  ```
  public/b2bproj/
    unit1.html      ← homework 섹션에 제출 폼 추가
    unit2.html      ← homework 섹션에 제출 폼 추가
    homework.html   ← 신규 현황판 페이지
  ```
- **Supabase table**: `b2b_homework_submissions`
  ```sql
  id            uuid  default gen_random_uuid() primary key
  unit          text  not null  -- 'unit1', 'unit2', ...
  student_name  text  not null
  rewatch_answer text
  prepare_answer text
  submitted_at  timestamptz default now()
  ```
- **RLS**: `anon` role SELECT + INSERT 허용 (no auth required)
- **중복 방지**: localStorage `b2b_hw_submitted_unit2` = true 로 같은 브라우저 재제출 방지

### UX Flow

```
학생:  숙제 섹션 스크롤 → 이름 입력 + 답변 작성 → 제출 버튼
       → 완료 메시지 + "팀원 답변 보기" 버튼 노출

코치:  homework.html 접속 → unit 드롭다운 선택
       → 제출 목록 카드 (이름 / 답변 / 제출시각)
```

### Design System
- unit1/2.html 동일한 CSS 변수 사용 (--night, --white, --mute, --line, --bg-l 등)
- 폼은 light 섹션(--bg-l) 아래 dark 섹션으로 구분
- RECORD 항목: 카카오톡 아이콘(🟡) 대신 텍스트 뱃지로 "카카오톡 제출" 표시

### Dependencies
- Supabase JS CDN: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js`
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (하드코딩 허용 — public anon key)

## Traceability Matrix

| REQ ID  | Description              | Verification | Status  |
|---------|--------------------------|--------------|---------|
| REQ-001 | Supabase 테이블 생성     | (MANUAL)     | Pending |
| REQ-002 | unit2 제출 폼            | (BROWSER)    | Pending |
| REQ-003 | homework.html 현황판     | (BROWSER)    | Pending |
| REQ-004 | 팀원 답변 보기           | (BROWSER)    | Pending |
| REQ-005 | unit1 제출 폼            | (BROWSER)    | Pending |

## Implementation Order

1. REQ-001 — Supabase 테이블 + RLS (모든 것의 기반)
2. REQ-002 — unit2 제출 폼 (핵심 기능)
3. REQ-003 — homework.html 현황판 (코치 뷰)
4. REQ-004 — 팀원 답변 보기 인라인 (제출 완료 후 UX)
5. REQ-005 — unit1 동일 적용

## Out of Scope

- 로그인/인증 시스템
- 음성/영상 파일 업로드 (카카오톡 제출 안내로 대체)
- 숙제 수정/삭제 기능
- 코치 전용 관리자 뷰 (homework.html은 모두 접근 가능)
- 알림(push/email) 기능
