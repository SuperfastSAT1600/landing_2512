# 강원FC Unit 6–9 — 2회차 테마별 심화 복습

## Overview

강원 U-18 영어 인터뷰 수업의 Unit 6~9를 생성한다.  
각 유닛은 Unit 1~4와 **동일한 주제**지만 **다른 영상 + 새로운 10 Key Phrases**로 구성된 2회차 심화 학습이다.

| 유닛 | 주제 (Unit 1~4 동일) | 라운드 |
|------|----------------------|--------|
| Unit 6 | Self-Introduction & Joining the Team | Round 2 |
| Unit 7 | Post-Match Flash Interview | Round 2 |
| Unit 8 | Goals, Motivation & Ambition | Round 2 |
| Unit 9 | Injury, Recovery & Resilience | Round 2 |

구조는 unit4.html과 완전히 동일 (Hero → Watch → 10 Phrases → Homework).  
단, 영상·10 Key Phrases·숙제 단어 10개만 새로 구성한다.

---

## Requirements

### REQ-001: unit6.html — Self-Introduction & Joining the Team Round 2
- **Priority**: Must
- **Description**: Unit 1과 같은 주제(팀 합류 자기소개)의 2회차 수업. 다른 선수 인터뷰 영상, 새로운 10 Key Phrases, 숙제 포함. `public/partners/gangwon/units/unit6.html`로 생성.
- **Acceptance Criteria**: 페이지 열림 → 영상 섹션 존재 → 10개 표현 렌더링 → 숙제 Supabase 저장 unit='unit6'
- **Verification**: (BROWSER) 전체 섹션 스크롤, 숙제 제출 플로우 확인

### REQ-002: unit7.html — Post-Match Flash Interview Round 2
- **Priority**: Must
- **Description**: Unit 2와 같은 주제(경기 후 인터뷰)의 2회차 수업. Win/Loss 양쪽 표현 포함. `public/partners/gangwon/units/unit7.html`로 생성.
- **Acceptance Criteria**: 페이지 열림 → Win/Loss 구분 표현 10개 → 숙제 Supabase 저장 unit='unit7'
- **Verification**: (BROWSER) 전체 섹션 스크롤, 숙제 제출 플로우 확인

### REQ-003: unit8.html — Goals, Motivation & Ambition Round 2
- **Priority**: Must
- **Description**: Unit 3과 같은 주제(목표·동기·야망)의 2회차 수업. 다른 선수 인터뷰 영상, 새 10 Key Phrases. `public/partners/gangwon/units/unit8.html`로 생성.
- **Acceptance Criteria**: 페이지 열림 → 10개 표현 → 숙제 Supabase 저장 unit='unit8'
- **Verification**: (BROWSER) 전체 섹션 스크롤, 숙제 제출 플로우 확인

### REQ-004: unit9.html — Injury, Recovery & Resilience Round 2
- **Priority**: Must
- **Description**: Unit 4와 같은 주제(부상·회복·의지)의 2회차 수업. 다른 선수 인터뷰 영상, 새 10 Key Phrases. `public/partners/gangwon/units/unit9.html`로 생성.
- **Acceptance Criteria**: 페이지 열림 → 10개 표현 → 숙제 Supabase 저장 unit='unit9'
- **Verification**: (BROWSER) 전체 섹션 스크롤, 숙제 제출 플로우 확인

### REQ-005: gangwon-config.js 업데이트
- **Priority**: Must
- **Description**: `public/partners/gangwon-config.js`와 `public/b2bproj/gangwon-config.js` 양쪽 모두 GANGWON_UNITS 배열에 unit6~9 항목 추가. 기존 homework.html의 unit6 placeholder도 label 업데이트.
- **Acceptance Criteria**: gangwon.html 대시보드 숙제 탭에 Unit 6~9 버튼 표시
- **Verification**: (BROWSER) gangwon.html 로그인 후 숙제 탭에 Unit 6~9 확인

### REQ-006: 기존 유닛(1~5) nav 업데이트
- **Priority**: Must
- **Description**: unit1~5.html의 UNITS JS 배열에 unit6~9 링크 추가. 드롭다운 메뉴에서 모든 유닛 접근 가능.
- **Acceptance Criteria**: 어떤 유닛 페이지에서도 Unit 6~9로 이동 가능
- **Verification**: (BROWSER) unit1.html에서 드롭다운 → Unit 6~9 클릭 이동 확인

---

## Technical Design

### Architecture
- 각 파일: `public/partners/gangwon/units/unit{N}.html` (N = 6,7,8,9)
- unit4.html을 베이스로 복제 후 아래 항목만 교체:
  - `UNIT_ID`, `HW_UNIT`, `HW_LS_KEY`, `SESSION_LS_KEY`
  - `SECTIONS` 배열의 이름 문자열
  - `UNITS` 배열 (current 위치 변경 + unit6~9 추가)
  - 영상 YouTube embed URL
  - 10 Key Phrases HTML 블록
  - 숙제 Vocab 10단어 (`VOCAB_LIST`)
  - 페이지 제목, eyebrow, hero 문구

### Supabase Config (기존과 동일)
```
SB_URL  = 'https://ualucbrrfvysmfytkdew.supabase.co'
SB_ANON = 'sb_publishable_nmqBIh-y6etZMXmxrUxbqA_t5uIIIOp'
```
기존 테이블 재사용: `b2b_homework_submissions`, `b2b_vocab_events`, `b2b_students`

### Student Roster (기존 동일)
황은총, 김어진, 이용재, 이정현, 조원우

---

## Content Design

### Unit 6 — Self-Introduction & Joining the Team (Round 2)

**참조 영상**: Jude Bellingham — Real Madrid 합류 인터뷰  
YouTube ID: `_iHb4KWvMRQ` (교사가 원하는 영상으로 교체 가능)

**10 Key Phrases**:
| # | 영어 원문 | 한국어 |
|---|-----------|--------|
| 01 | "It means everything to me to be here." | 여기 있다는 것이 저에게 모든 것을 의미합니다. |
| 02 | "I'm ready to give everything for this team." | 이 팀을 위해 모든 것을 다 바칠 준비가 되어 있습니다. |
| 03 | "I want to make the fans proud." | 팬들을 자랑스럽게 만들고 싶습니다. |
| 04 | "Playing at this level is a dream I've worked for my whole life." | 이 수준에서 뛰는 것은 평생 노력해온 꿈입니다. |
| 05 | "I know what this club means to the people here." | 이 클럽이 여기 사람들에게 어떤 의미인지 알고 있습니다. |
| 06 | "I'm here to work hard and earn my place." | 저는 열심히 해서 제 자리를 얻기 위해 여기 있습니다. |
| 07 | "I feel at home already." | 이미 집에 온 것 같은 느낌이 듭니다. |
| 08 | "Every training session, I will give 100 percent." | 모든 훈련 세션에서 100%를 다하겠습니다. |
| 09 | "I've heard so many great things about this place." | 이곳에 대해 정말 좋은 이야기를 많이 들었습니다. |
| 10 | "This is where I want to prove myself." | 여기가 바로 제 자신을 증명하고 싶은 곳입니다. |

**숙제 Vocab (10단어)**: honor, represent, settle, adapt, passion, dedication, foundation, potential, responsibility, unity

---

### Unit 7 — Post-Match Flash Interview (Round 2)

**참조 영상**: Marcus Rashford / Arsenal post-match interview (승리·패배 혼합)  
YouTube ID: `dQw4w9WgXcQ` (교사가 원하는 영상으로 교체 가능 — 기본 placeholder)

**10 Key Phrases** (Win 5개 + Loss 5개):
| # | 영어 원문 | 상황 | 한국어 |
|---|-----------|------|--------|
| 01 | "We showed real character out there today." | WIN | 오늘 진짜 투지를 보여줬습니다. |
| 02 | "It wasn't pretty but we got the three points." | WIN | 예쁜 경기는 아니었지만 3점을 땄습니다. |
| 03 | "Every player on the pitch gave absolutely everything." | WIN | 필드 위 모든 선수가 모든 걸 다 했습니다. |
| 04 | "We don't celebrate too long — we focus on the next game." | WIN | 너무 오래 축하하지 않습니다 — 다음 경기에 집중합니다. |
| 05 | "The manager's game plan worked perfectly today." | WIN | 오늘 감독님의 경기 계획이 완벽하게 작동했습니다. |
| 06 | "We have to take this on the chin and move on." | LOSS | 이것을 받아들이고 앞으로 나아가야 합니다. |
| 07 | "It's not the result we wanted but we keep believing." | LOSS | 원하던 결과는 아니지만 계속 믿어야 합니다. |
| 08 | "Credit to the other team — they were better today." | LOSS | 상대팀을 인정합니다 — 오늘 그들이 더 잘했습니다. |
| 09 | "We have to look at what went wrong and fix it." | LOSS | 무엇이 잘못됐는지 보고 고쳐야 합니다. |
| 10 | "The dressing room is disappointed but we'll bounce back together." | LOSS | 라커룸은 실망했지만 함께 반등할 것입니다. |

**숙제 Vocab (10단어)**: grit, composure, tactics, momentum, confidence, discipline, resilience, teamwork, setback, determination

---

### Unit 8 — Goals, Motivation & Ambition (Round 2)

**참조 영상**: Jude Bellingham / Phil Foden — 동기·야망 인터뷰  
YouTube ID: `ScMzIvxBSi4` (교사가 원하는 영상으로 교체 가능)

**10 Key Phrases**:
| # | 영어 원문 | 한국어 |
|---|-----------|--------|
| 01 | "I want to keep improving every single day." | 매일 매일 계속 발전하고 싶습니다. |
| 02 | "Winning trophies is what drives me forward." | 트로피를 따는 것이 저를 앞으로 나아가게 합니다. |
| 03 | "I look up to players who have won everything." | 모든 것을 이긴 선수들을 존경합니다. |
| 04 | "My goal is to reach the very top of the game." | 제 목표는 축구의 최정상에 도달하는 것입니다. |
| 05 | "I push myself because I know what I'm capable of." | 제가 무엇을 할 수 있는지 알기 때문에 스스로를 밀어붙입니다. |
| 06 | "Every player should aim for the highest level possible." | 모든 선수는 가능한 가장 높은 수준을 목표로 해야 합니다. |
| 07 | "I want to play in the biggest games in the world." | 세계에서 가장 큰 경기에 출전하고 싶습니다. |
| 08 | "I train as if every session could change my career." | 모든 훈련이 내 커리어를 바꿀 수 있다는 생각으로 훈련합니다. |
| 09 | "Success only comes through sacrifice and hard work." | 성공은 희생과 노력을 통해서만 옵니다. |
| 10 | "When I retire, I want to say I gave everything." | 은퇴할 때 모든 것을 다 쏟아부었다고 말하고 싶습니다. |

**숙제 Vocab (10단어)**: aspiration, drive, pursuit, excellence, consistency, discipline, achievement, sacrifice, perseverance, legacy

---

### Unit 9 — Injury, Recovery & Resilience (Round 2)

**참조 영상**: Kevin De Bruyne 또는 Pedri — 부상 복귀 인터뷰  
YouTube ID: `tgbNymZ7vqY` (교사가 원하는 영상으로 교체 가능)

**10 Key Phrases**:
| # | 영어 원문 | 한국어 |
|---|-----------|--------|
| 01 | "It was the hardest period of my career." | 제 커리어에서 가장 힘든 시간이었습니다. |
| 02 | "I had to dig really deep mentally." | 정신적으로 깊이 파고들어야 했습니다. |
| 03 | "The medical team deserves all the credit." | 의료팀이 모든 공을 받아야 합니다. |
| 04 | "Every setback makes you appreciate the game more." | 모든 역경은 경기를 더욱 감사하게 만듭니다. |
| 05 | "I focused only on what I could control." | 내가 통제할 수 있는 것에만 집중했습니다. |
| 06 | "I used that time to study the game and get smarter." | 그 시간을 경기를 공부하고 더 현명해지는 데 사용했습니다. |
| 07 | "The road back was long but I kept my head down and worked." | 돌아오는 길은 멀었지만 고개를 숙이고 노력했습니다. |
| 08 | "I told myself — this challenge will make me better." | 이 도전이 나를 더 나은 사람으로 만들 것이라고 스스로에게 말했습니다. |
| 09 | "When you face that kind of challenge, you find out who you really are." | 그런 도전에 직면하면 자신이 정말 어떤 사람인지 알게 됩니다. |
| 10 | "I'm grateful for the experience — it taught me so much." | 그 경험에 감사합니다 — 정말 많은 것을 가르쳐 줬습니다. |

**숙제 Vocab (10단어)**: rehabilitation, mentality, recovery, endurance, gratitude, awareness, persistence, challenge, breakthrough, reflection

---

## UNITS Navigation Array (완성본 — 모든 파일 공통)

```js
const UNITS = [
  { id: 'unit1', label: 'Unit 1', subtitle: 'Self-Introduction & Joining the Team', url: 'unit1.html' },
  { id: 'unit2', label: 'Unit 2', subtitle: 'Post-Match Flash Interview', url: 'unit2.html' },
  { id: 'unit3', label: 'Unit 3', subtitle: 'Goals, Motivation & Ambition', url: 'unit3.html' },
  { id: 'unit4', label: 'Unit 4', subtitle: 'Injury, Recovery & Resilience', url: 'unit4.html' },
  { id: 'unit5', label: 'Unit 5', subtitle: 'Review — 4 Units, 28 Phrases', url: 'unit5.html' },
  { id: 'unit6', label: 'Unit 6', subtitle: 'Self-Introduction & Joining the Team — Round 2', url: 'unit6.html' },
  { id: 'unit7', label: 'Unit 7', subtitle: 'Post-Match Flash Interview — Round 2', url: 'unit7.html' },
  { id: 'unit8', label: 'Unit 8', subtitle: 'Goals, Motivation & Ambition — Round 2', url: 'unit8.html' },
  { id: 'unit9', label: 'Unit 9', subtitle: 'Injury, Recovery & Resilience — Round 2', url: 'unit9.html' },
];
```

---

## Traceability Matrix

| REQ ID  | Description                    | Verification | Status  |
|---------|--------------------------------|--------------|---------|
| REQ-001 | unit6.html 생성                | (BROWSER)    | Pending |
| REQ-002 | unit7.html 생성                | (BROWSER)    | Pending |
| REQ-003 | unit8.html 생성                | (BROWSER)    | Pending |
| REQ-004 | unit9.html 생성                | (BROWSER)    | Pending |
| REQ-005 | gangwon-config.js 업데이트     | (BROWSER)    | Pending |
| REQ-006 | 기존 unit1~5 nav 업데이트      | (BROWSER)    | Pending |

---

## Implementation Order

1. REQ-001 — unit6.html (unit4.html 기반, 내용 교체)
2. REQ-002 — unit7.html
3. REQ-003 — unit8.html
4. REQ-004 — unit9.html
5. REQ-005 — gangwon-config.js 양쪽 파일 업데이트
6. REQ-006 — unit1~5.html UNITS 배열 nav 업데이트

## Out of Scope

- 새 Supabase 테이블 생성
- 플래시카드 시스템 추가 (unit5 방식)
- YouTube 썸네일 이미지 변경 (교사가 직접 교체)
