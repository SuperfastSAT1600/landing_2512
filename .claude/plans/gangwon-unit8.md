# 강원FC Unit 8 — Goals, Motivation & Ambition Round 2 (Short Video Edition)

## Overview

Unit 3(Goals, Motivation & Ambition) 복습 유닛. Unit 7과 동일한 Short Video Edition 포맷 적용:
**영상을 5분(end=300) 이내로 제한**, 새 선수/새 표현으로 구성.
GOALS 5개 + MOTIVATION 5개, 총 10 Key Phrases.
베이스 파일: `public/partners/gangwon/units/unit7.html`
출력 파일: `public/partners/gangwon/units/unit8.html`

---

## Requirements

### REQ-001: unit8.html 생성 — 기본 구조
- **Priority**: Must
- **Description**: unit7.html을 베이스로 unit8.html 생성. UNIT_ID='unit8', HW_UNIT='unit8', 제목·eyebrow·hero 텍스트 변경. UNITS 배열에서 unit8을 current로, unit7은 일반 링크로 변경.
- **Acceptance Criteria**: 페이지 열림, Hero 섹션 "GOALS, MOTIVATION & AMBITION — ROUND 2" 렌더링, 드롭다운에서 Unit 8이 current로 표시됨
- **Verification**: (BROWSER)

### REQ-002: 5분 이내 영상 2개 (GOALS + MOTIVATION)
- **Priority**: Must
- **Description**: GOALS 인터뷰 영상 1개 + MOTIVATION 인터뷰 영상 1개, 각 embed에 `end=300` 파라미터. Before You Watch 질문 3개 각 영상 앞에 포함.
- GOALS 영상 ID: `8bUuH5H1CgU` (Phil Foden — career goals interview, placeholder 교사 교체 가능)
- MOTIVATION 영상 ID: `j0x5TOiZtQw` (Bukayo Saka — motivation interview, placeholder 교사 교체 가능)
- **Acceptance Criteria**: 두 섹션 존재, 각 영상 재생 가능, 5분 제한 확인
- **Verification**: (BROWSER)

### REQ-003: 10 Key Phrases (Goals 5 + Motivation 5) with Drill System
- **Priority**: Must
- **Description**: unit7.html의 phrase-item 구조 그대로 사용. Goals 5개 + Motivation 5개. 각 phrase: ① 영상 문장 → ② 변형 → ③ 빈칸 드릴 3단계. Unit 3 표현(My focus should be on / give my life for 등)과 중복 없이 구성.
- **Acceptance Criteria**: 10개 phrase-item 렌더링, 각 단계 표시
- **Verification**: (BROWSER)

### REQ-004: 숙제 — Vocab 10단어 + Sentences + Blanks
- **Priority**: Must
- **Description**: Vocab 10단어(Unit 3 단어와 중복 없이), 문장 쓰기 3개, 빈칸 4개. Supabase unit='unit8'.
- **Acceptance Criteria**: 로그인 → vocab 플립 → 숙제 작성 → 저장 → Supabase unit8 레코드 확인
- **Verification**: (BROWSER)

### REQ-005: gangwon-config.js에 unit8 current로 설정
- **Priority**: Must
- **Description**: `public/partners/gangwon-config.js`와 `public/b2bproj/gangwon-config.js` 양쪽에서 unit8 항목의 status를 'active'(또는 current 표시) 확인. (이미 unit8 항목이 배열에 있으므로 url만 확인)
- **Acceptance Criteria**: gangwon.html 숙제 탭에 Unit 8 버튼 표시
- **Verification**: (BROWSER)

---

## Technical Design

### Architecture
- 베이스: `public/partners/gangwon/units/unit7.html`
- 출력: `public/partners/gangwon/units/unit8.html`
- 변경 항목: UNIT_ID, HW_UNIT, 제목, hero eyebrow, 영상 IDs, 섹션명(win→goals, lose→motivation), 10 phrases, vocab, 숙제 sentences/blanks

### Video Strategy (5분 제한)
- GOALS embed: `?autoplay=1&rel=0&end=300`
- MOTIVATION embed: `?autoplay=1&rel=0&end=300`
- hero 배경 ambient: 기존 unit7 배경 ID 재사용 가능

### 10 Key Phrases

**GOALS (5개)**:
| # | 영어 원문 | 한국어 |
|---|-----------|--------|
| 01 | "I want to be the best version of myself every single day." | 저는 매일 최고의 제 자신이 되고 싶습니다. |
| 02 | "My goal is simple — to win and keep winning." | 제 목표는 단순합니다 — 이기고 계속 이기는 것입니다. |
| 03 | "I'm always hungry for more — trophies, goals, records." | 저는 항상 더 많은 것을 원합니다 — 트로피, 골, 기록. |
| 04 | "Whatever I achieve, I always want to push for the next level." | 무엇을 이루든 항상 다음 단계를 향해 나아가고 싶습니다. |
| 05 | "I grew up watching the greats and I want to be talked about like them." | 위대한 선수들을 보며 자랐고 그들처럼 언급되고 싶습니다. |

**MOTIVATION (5개)**:
| # | 영어 원문 | 한국어 |
|---|-----------|--------|
| 06 | "My family is the reason I work so hard every day." | 제 가족이 매일 이렇게 열심히 일하는 이유입니다. |
| 07 | "When I was young, nothing was given to me — I had to earn everything." | 어렸을 때 아무것도 주어지지 않았습니다 — 모든 것을 얻어야 했습니다. |
| 08 | "Doubters give me the most motivation." | 의심하는 사람들이 제게 가장 큰 동기를 줍니다. |
| 09 | "Every morning I wake up with one goal — to be better than yesterday." | 매일 아침 하나의 목표로 일어납니다 — 어제보다 나아지는 것. |
| 10 | "Football gave me everything, so I give everything back to football." | 축구가 제게 모든 것을 주었으니 저도 축구에 모든 것을 돌려줍니다. |

### Vocab (10단어 — Unit 3과 중복 없음)
Unit 3 vocab: ambition, motivated, consistent, dedicated, hunger, commitment, belief, target, legacy, push

Unit 8 new vocab:
| 단어 | 한국어 | 영어 예문 |
|------|--------|-----------|
| aspire | 열망하다, 꿈꾸다 | aspire to be the best |
| drive | 추진력, 의지 | the drive to succeed |
| relentless | 끊임없는, 지치지 않는 | relentless hard work |
| perseverance | 인내, 끈기 | perseverance pays off |
| sacrifice | 희생 | sacrifice everything for the game |
| inspire | 영감을 주다 | inspire the next generation |
| grind | 꾸준히 노력하다 | the daily grind |
| breakthrough | 돌파구, 성과 | a career breakthrough |
| purpose | 목적, 사명감 | play with purpose |
| champion | 챔피언이 되다/챔피언 | think like a champion |

### 숙제 Sentences (3문장)
1. "I want to be the best version of myself every single day."
2. "Doubters give me the most motivation."
3. "Football gave me everything, so I give everything back to football."

### 숙제 Blanks (4개)
1. My goal is simple — to win and keep _______. (winning / improving / going)
2. I'm always _______ for more — trophies, goals, records. (hungry / pushing / reaching)
3. _______ give me the most motivation. (Doubters / Critics / Challenges)
4. Every morning I wake up with one goal — to be _______ than yesterday. (better / stronger / sharper)

### Hero eyebrow / 섹션 레이블
- hero eyebrow: `GOALS, MOTIVATION & AMBITION — ROUND 2`
- 영상 섹션 1 레이블: `CAREER GOALS — SHORT CLIP`
- 영상 섹션 2 레이블: `PERSONAL MOTIVATION — SHORT CLIP`
- phrases 헤더: `10 PHRASES.<br>GOALS & MOTIVATION.`

---

## Traceability Matrix

| REQ ID  | Description                       | Verification | Status  |
|---------|-----------------------------------|--------------|---------|
| REQ-001 | unit8.html 기본 구조               | (BROWSER)    | Pending |
| REQ-002 | 5분 영상 GOALS + MOTIVATION        | (BROWSER)    | Pending |
| REQ-003 | 10 Key Phrases + Drill             | (BROWSER)    | Pending |
| REQ-004 | 숙제 Vocab + Study                 | (BROWSER)    | Pending |
| REQ-005 | gangwon-config.js unit8 확인       | (BROWSER)    | Pending |

## Implementation Order
1. REQ-001 — unit7.html 복제, 기본 변수 교체
2. REQ-002 — 영상 섹션 (GOALS + MOTIVATION) 교체
3. REQ-003 — 10 Key Phrases 블록 교체
4. REQ-004 — vocab, sentences, blanks 교체
5. REQ-005 — config 확인 (이미 배열에 있음, url 일치 확인)

## Out of Scope
- unit9 생성 (별도 요청)
- 새 Supabase 테이블 생성
- YouTube 클립 편집
