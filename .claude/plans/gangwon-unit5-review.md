# 강원FC Unit 5 — Units 1-4 핵심 표현 복습 페이지

## Overview

강원 U-18 영어 인터뷰 수업 Unit 5를 생성한다. 이 유닛은 새 콘텐츠 없이 Units 1~4에서 배운 핵심 표현들을 복습하는 Review 유닛이다. `public/partners/gangwon/units/unit5.html`로 생성하며, 기존 유닛들과 동일한 디자인 시스템(검은 배경, 대문자 디스플레이 타입, 0.5px 라인 등)을 유지한다.

## Requirements

### REQ-001: 전체 마스터 표현 리스트 (30 Phrases)
- **Priority**: Must
- **Description**: Unit 1~4의 핵심 표현 전체(Unit1: 8개, Unit2: 5개, Unit3: 5개, Unit4: 10개)를 유닛별로 색션 나눠 표시
- **Acceptance Criteria**: 각 표현에 영어 원문, 한국어 번역, 출처(유닛 + 선수/상황) 표시
- **Verification**: (BROWSER) 모든 표현이 올바르게 표시되는지 확인

### REQ-002: 플래시카드 모드 (Flashcard Drill)
- **Priority**: Must
- **Description**: 영어 표현을 카드로 표시하고 클릭하면 한국어 번역이 나타나는 인터랙티브 플래시카드. 셔플 기능 포함.
- **Acceptance Criteria**: 카드 클릭 시 KO 번역 토글, 다음/이전 카드 이동, 셔플 버튼
- **Verification**: (BROWSER) 플래시카드 클릭, 이동, 셔플 동작 확인

### REQ-003: 유닛별 빠른 복습 섹션 (Quick Recap)
- **Priority**: Must
- **Description**: 4개 유닛의 테마와 대표 표현 2개씩을 요약 카드로 표시
- **Acceptance Criteria**: Unit 1~4 각각 제목, 부제, 대표 표현 2개
- **Verification**: (BROWSER) 4개 유닛 카드가 그리드로 표시되는지 확인

### REQ-004: 빈칸 채우기 드릴 (Mix Drill)
- **Priority**: Must
- **Description**: Units 1~4 혼합 빈칸 드릴 6문항. 어느 유닛의 표현인지 힌트 제공.
- **Acceptance Criteria**: 6개 빈칸 드릴 아이템, 각 아이템에 Unit 출처 표시
- **Verification**: (BROWSER) 드릴 섹션 라이트 배경에서 올바르게 렌더링

### REQ-005: 풀 인터뷰 롤플레이 (Final Challenge)
- **Priority**: Must
- **Description**: 4개 상황(팀 합류 → 경기 후 → 목표 선언 → 부상 복귀)을 하나의 롤플레이로 통합. 각 상황별 빈칸 포함.
- **Acceptance Criteria**: 4개 상황 시나리오, 각 상황에 사용할 표현 힌트
- **Verification**: (BROWSER) 레이아웃 확인

### REQ-006: 네비게이션 연동
- **Priority**: Must
- **Description**: 기존 unit1~4 nav와 동일하게 unit5가 목차에 표시되고, unit1~4에서 unit5로 링크 추가
- **Acceptance Criteria**: unit5.html 내 nav에 Unit 1~4 링크, unit5가 Review로 표시
- **Verification**: (BROWSER) 네비 드롭다운에서 모든 유닛 접근 가능

### REQ-007: 강사 바 & 섹션 진행
- **Priority**: Must
- **Description**: 기존 instructor-bar와 동일한 방식으로 섹션 이동 가능
- **Acceptance Criteria**: ibar-dots, 이전/다음 버튼 동작
- **Verification**: (BROWSER) 섹션 이동 확인

## Technical Design

### Architecture
- 단일 정적 HTML 파일: `public/partners/gangwon/units/unit5.html`
- 기존 unit4.html을 베이스로 CSS/JS 패턴 재사용
- 플래시카드는 localStorage 불필요, 순수 in-memory 상태 관리
- Supabase 숙제 제출 없음 (Review 유닛은 숙제 없음)

### Key Expressions to Include
**Unit 1 (8)**: incredibly proud / cannot wait / give everything / new chapter / dream come true / just amazing / so happy to be back / looking forward to
**Unit 2 (5)**: worked really hard / credit to the whole team / tough game but kept going / gutted but bounce back / manager set us up
**Unit 3 (5)**: focus on helping the team / one of them / first dream then goal / give my life for this shirt / pleasure to be
**Unit 4 (10)**: played through it / hides the pain / take all the blame / 60 per cent / support helped me / patient and trust / came back stronger / never lost faith / never thought about giving up / happy to be back

## Traceability Matrix

| REQ ID  | Description               | Verification | Status  |
|---------|---------------------------|--------------|---------|
| REQ-001 | 전체 마스터 표현 리스트   | (BROWSER)    | Pending |
| REQ-002 | 플래시카드 드릴           | (BROWSER)    | Pending |
| REQ-003 | 유닛별 빠른 복습          | (BROWSER)    | Pending |
| REQ-004 | 빈칸 채우기 드릴          | (BROWSER)    | Pending |
| REQ-005 | 풀 인터뷰 롤플레이        | (BROWSER)    | Pending |
| REQ-006 | 네비게이션 연동           | (BROWSER)    | Pending |
| REQ-007 | 강사 바                   | (BROWSER)    | Pending |

## Implementation Order

1. REQ-001 — 핵심 콘텐츠 먼저 (모든 표현 목록)
2. REQ-003 — Quick Recap 카드
3. REQ-002 — 플래시카드 인터랙션
4. REQ-004 — 빈칸 드릴
5. REQ-005 — 풀 롤플레이
6. REQ-006 + REQ-007 — 네비게이션 & 강사 바

## Out of Scope

- 숙제 제출 폼 (Review 유닛은 숙제 없음)
- 새로운 영상 콘텐츠
- unit1~4 파일 수정 (네비 추가 제외)
