# 강원FC Unit 3 & Unit 4 교재 페이지

## Overview

강원 FC U-18 영어 인터뷰 수업의 Unit 3(목표·동기·야망 인터뷰)와 Unit 4(부상·회복·의지 인터뷰) HTML 교재 페이지를 생성하고, gangwon.html 대시보드에 해당 유닛을 등록한다.

Unit 1·2와 동일한 구조(영상 시청 → 표현 분석 → 드릴 → 마스터리스트 → 롤플레이 → 숙제)를 따르며, 플래시카드 Leitner 시스템과 Supabase 숙제 제출 기능을 포함한다.

## Requirements

### REQ-001: unit3.html 생성
- **Priority**: Must
- **Description**: Unit 3 — Goals, Motivation & Ambition 교재 페이지. 영상 2개(목표 인터뷰 참조), 핵심 표현 분석, 빈칸 드릴, 5 Key Phrases, 롤플레이, 숙제(Vocab 10단어 + Study 3문장).
- **Acceptance Criteria**: `/b2bproj/unit3.html`이 열리고, 모든 섹션이 렌더링되고, 숙제 제출이 Supabase `b2b_homework_submissions`에 unit='unit3'으로 저장된다.
- **Verification**: (BROWSER) 페이지 접속 → 섹션 스크롤 → 숙제 제출 플로우 확인

### REQ-002: unit4.html 생성
- **Priority**: Must
- **Description**: Unit 4 — Injury, Recovery & Resilience 교재 페이지. 영상 2개(부상/회복 인터뷰 참조), 핵심 표현 분석, 빈칸 드릴, 5 Key Phrases, 롤플레이, 숙제(Vocab 10단어 + Study 3문장).
- **Acceptance Criteria**: `/b2bproj/unit4.html`이 열리고, 모든 섹션이 렌더링되고, 숙제 제출이 Supabase에 unit='unit4'으로 저장된다.
- **Verification**: (BROWSER) 페이지 접속 → 섹션 스크롤 → 숙제 제출 플로우 확인

### REQ-003: gangwon.html 업데이트
- **Priority**: Must
- **Description**: gangwon.html의 UNIT_LABELS에 unit3/unit4 라벨 추가, HW_UNITS에 'unit3'·'unit4' 추가.
- **Acceptance Criteria**: 대시보드 숙제 탭에 Unit 3, Unit 4 버튼이 표시된다.
- **Verification**: (BROWSER) gangwon.html 로그인 후 숙제 탭 확인

## Technical Design

### Architecture
- `public/b2bproj/unit3.html` — unit2.html 구조 복제, 내용만 교체
- `public/b2bproj/unit4.html` — unit2.html 구조 복제, 내용만 교체
- `public/b2bproj/gangwon.html` — UNIT_LABELS, HW_UNITS 수정
- 두 사본 모두 `partners/gangwon.html`도 동기화 필요

### Unit 3 주제: GOALS, MOTIVATION & AMBITION
- 참조 영상 1 (목표): Erling Haaland — Champions League 우승 후 야망 인터뷰
- 참조 영상 2 (동기): Son Heung-Min — 동기·꿈 인터뷰
- 핵심 표현: "My goal is to…", "I'm motivated by…", "I want to…at the highest level", "Every day I work to improve", "I believe in myself"
- 숙제 Vocab: ambition, motivated, consistent, dedicated, focused, hunger, commitment, belief, target, milestone

### Unit 4 주제: INJURY, RECOVERY & RESILIENCE
- 참조 영상 1 (부상): Heung-Min Son — 부상 후 복귀 인터뷰
- 참조 영상 2 (회복): 선수 회복 인터뷰 (Vinicius Jr. 또는 유사)
- 핵심 표현: "I had to be patient", "It was a tough period", "I came back stronger", "The support helped me a lot", "I never lost faith"
- 숙제 Vocab: injury, recover, patience, resilience, setback, strength, rehabilitation, faith, determination, comeback

### Dependencies
- Supabase: `b2b_homework_submissions`, `b2b_vocab_events`, `b2b_students` (기존 테이블 재사용)
- 모든 학생 이름(ROSTER)은 unit1/unit2와 동일: 황은총, 김어진, 이용재, 이정현, 조원우

## Traceability Matrix

| REQ ID  | Description         | Verification | Status  |
|---------|---------------------|--------------|---------|
| REQ-001 | unit3.html 생성      | (BROWSER)    | Pending |
| REQ-002 | unit4.html 생성      | (BROWSER)    | Pending |
| REQ-003 | gangwon.html 업데이트 | (BROWSER)    | Pending |

## Implementation Order

1. REQ-001 — unit3.html (unit2.html 기반으로 주제 교체)
2. REQ-002 — unit4.html (unit3.html 기반으로 주제 교체)
3. REQ-003 — gangwon.html 라벨/HW_UNITS 업데이트

## Out of Scope

- 새 Supabase 테이블 생성 (기존 테이블 재사용)
- 강사 피드백 페이지 수정
- unit5, unit6 이후 유닛
