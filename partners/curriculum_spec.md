# Learners × 강원 U-18 — 영어 인터뷰 수업 커리큘럼 스펙
> Claude Code 작업용 레퍼런스 문서  
> 마지막 업데이트: 2026-07-06

---

## 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 대상 | 강원 U-18 축구 선수 6명 |
| 수업 기간 | 12주 · 주 2회 · 총 24회차 |
| 1회차 시간 | 50분 |
| 수업 목표 | 실전 영어 인터뷰 자립 능력 — 기자 앞에서 자연스럽게 영어로 답변 |
| 강사 역할 | 리포터 = 강사. 선수가 인터뷰이 |
| 숙제 방식 | 실제 선수 인터뷰 영상 시청 → 핵심 표현 암기 → 나만의 문장 → 1분 영상 녹화 |

---

## 페이지 구조 (HTML 웹페이지 기준)

각 Unit은 하나의 HTML 파일 (`unit1.html` ~ `unit6.html`) 로 구성.  
아래 섹션 순서를 모든 Unit에 동일하게 적용.

```
[섹션 순서]
1. Hero          → Unit 번호 + 테마 타이틀
2. Watch         → 레퍼런스 영상 (손흥민/이강인 또는 Unit별 영상)
3. Analysis      → 영상 표현 분석 (Quote List)
4. Compare       → 두 영상 비교 (해당 Unit만)
5. Drill         → 빈칸 채우기 + 힌트 + 예시
6. Phrases       → 핵심 표현 총정리 5개
7. Roleplay      → 롤플레이 카드 (강사 질문 + 선수 프로필 카드)
8. Homework      → 숙제 3단계 (Rewatch / Prepare / Record)
```

---

## 템플릿 스펙 (확정)

8개 템플릿의 포함/제외 요소가 확정되어 있음.  
새 Unit 제작 시 아래 스펙을 그대로 적용.

| 템플릿 | 포함 요소 | 제외 요소 |
|---|---|---|
| **A — Hero** | nav, h1, glow | eyebrow, sub, cta, footer |
| **B — Split Panel** | play, h1, qlist | meta, link, eyebrow, sub, cta |
| **C — Quote List** | h1, tag, en, ko, note | eyebrow, cta |
| **D — Two Column** | h1, colEyebrow, items, common | eyebrow, cta |
| **E — Drill (Light)** | nav, h1, hint, example | sub, cta |
| **F — Master List** | h1, srcTag, en, ko | eyebrow, cta |
| **G — Card Pair** | h1, fields, label | eyebrow, sub, cta |
| **H — Mission** | eyebrow, h1, stepTitle, stepBody | stepEyebrow, next, cta |

---

## YouTube 영상 설정

### Unit 1 — 손흥민 / 이강인 (확정)

```js
// 손흥민 LAFC 입단 기자회견 (2025.08.06)
{
  videoId: '54uYp3aI-Ys',
  channel: 'LAFC 공식',
  startSec: 1320,   // 22:00 — 손흥민 직접 발언 시작
  endSec:   1680,   // 28:00 — 핵심 발언 완료
  // 앞 22분은 구단주·시의원 발언. 수업 표현 3개 모두 22~28분 구간에 등장
}

// 이강인 PSG 입단 인터뷰 (2023.07.09)
{
  videoId: 'sBTfsCVtRwI',
  channel: 'PSG 공식',
  startSec: 0,      // 처음부터 — 영상 자체가 짧은 단독 클립 (1~2분)
  endSec:   null,   // 전체 시청
  // "It's incredible...", "one of the biggest clubs...", "I can't wait..."
  // 모두 영상 초반부터 등장
}
```

### Unit 2~6 — 영상 선정 가이드

아직 확정되지 않음. Unit별 테마에 맞는 영상을 선정할 것.

| Unit | 테마 | 추천 영상 유형 |
|---|---|---|
| Unit 2 | 경기 후 즉석 인터뷰 | 손흥민 경기 후 믹스드존, 이강인 골 후 인터뷰 |
| Unit 3 | 목표·동기·야망 | 이적 발표 인터뷰, 시즌 시작 전 포부 인터뷰 |
| Unit 4 | 돌발·어려운 질문 | 부진/부상 관련 인터뷰, 이적설 질문 대처 |
| Unit 5 | 팀·감독·동료 | 팀 승리 후 감독/동료 언급 인터뷰 |
| Unit 6 | 프레스 컨퍼런스 | 공식 기자회견 풀 버전 |

---

## Unit별 콘텐츠 스펙

---

### Unit 1 · 1–2주 · 자기소개 & 팀 합류 인터뷰

**학습 목표**
1. 포지션·출신·이력을 짧게 소개
2. 팀 합류 소감을 1~2문장으로 표현
3. 인터뷰 기본 구조(질문 → 짧은 답변 → 이유) 이해

**회차 구성 (4회차)**

| 회차 | 포커스 | 수업 내용 | 활동 |
|---|---|---|---|
| 1 | 영상 분석 | 레퍼런스 영상 시청 → 구조 분석 (강사 설명) | 영상 속 표현 5개 추출 → 한국어 의미 + 언제 쓰는지 토론 |
| 2 | 표현 드릴 | 핵심 문장 반복 발화 훈련 (청크 → 문장) | 빈칸 채우기 → 나만의 문장 만들기 |
| 3 | 롤플레이 ① | 강사 = 리포터 / 선수 순서대로 인터뷰 | 강사 질문 3개 → 즉석 답변 → 선수 피드백 1개씩 |
| 4 | 롤플레이 ② | Unit 1 전체 복습 + 재연습 | 1분 자기소개 영상 녹화 (개인별) → 강사 피드백 |

**레퍼런스 영상**
- 손흥민: `54uYp3aI-Ys` (start: 1320s, end: 1680s)
- 이강인: `sBTfsCVtRwI` (start: 0s, 전체)

**Quote List — 손흥민 발언 (3개)**

| 태그 | 영어 원문 | 한국어 | Note |
|---|---|---|---|
| JOINING | "I'm incredibly proud to be joining LAFC." | LAFC에 합류하게 되어 정말 자랑스럽습니다. | incredibly proud — 강한 감정 + 품위를 동시에 표현 |
| COMMITMENT | "I have come to L.A. to lift trophies and give everything for this club." | 트로피를 위해, 이 클럽을 위해 모든 것을 바치러 왔습니다. | give everything for ~ — 헌신을 표현하는 핵심 구문 |
| EXCITEMENT | "I cannot wait to get started." | 빨리 시작하고 싶어 못 견디겠습니다. | I cannot wait to + 동사 — 4단어로 강한 기대감 전달 |

**Quote List — 이강인 발언 (3개)**

| 태그 | 영어 원문 | 한국어 | Note |
|---|---|---|---|
| JOINING | "It's incredible to be able to join Paris Saint-Germain." | PSG에 합류할 수 있게 되어 정말 믿기 어려울 정도로 기쁩니다. | It's incredible to ~ — 손흥민의 'proud'와 다른 선택. 같은 상황, 다른 단어 |
| PRESTIGE | "It's one of the biggest clubs in the world, with some of the greatest players." | 세계에서 가장 큰 클럽 중 하나, 최고의 선수들이 있습니다. | one of the biggest ~ — 팀을 칭찬하는 공식 표현 |
| EXCITEMENT | "I can't wait to start this new adventure." | 이 새로운 모험을 빨리 시작하고 싶습니다. | I can't wait to ~ — 손흥민과 동일 구조. 두 선수 모두 사용한 필수 표현 |

**Two Column 비교**

| 손흥민 (SON · LAFC 2025) | 이강인 (LEE · PSG 2023) |
|---|---|
| I'm incredibly proud to be joining ~. | It's incredible to be able to join ~. |
| I have come here to lift trophies. | It's one of the biggest clubs in the world. |
| I cannot wait to get started. | I can't wait to start this new adventure. |
| I will give everything for this club. | There are some of the greatest players here. |

공통 포인트: Both used **"I can't wait to ~"**

**Drill 빈칸 4개**

| No. | 템플릿 | 힌트 | 예시 |
|---|---|---|---|
| 01 | I'm incredibly _______ to be joining _______. | ① proud / excited / honored ② 팀 이름 | I'm incredibly proud to be joining the team. |
| 02 | I have come here to _______ and give everything for _______. | ① win / improve / prove myself ② this team / this club | I have come here to improve and give everything for this team. |
| 03 | I can't wait to _______ with _______. | ① get started / train / play ② the team / my new teammates | I can't wait to get started with the team. |
| 04 | It's _______ to be part of _______. | ① incredible / amazing / an honor ② this club / this team | It's incredible to be part of this club. |

**Master List — 핵심 표현 8개**

| No. | 출처 | 영어 | 한국어 |
|---|---|---|---|
| 01 | SON | I'm incredibly proud to be joining ~. | ~에 합류하게 되어 정말 자랑스럽습니다. |
| 02 | SON | I cannot wait to get started. | 빨리 시작하고 싶어 못 견디겠습니다. |
| 03 | SON | I have come here to give everything. | 모든 것을 바치기 위해 왔습니다. |
| 04 | BASE | It's a new chapter for me. | 저에게는 새로운 챕터입니다. |
| 05 | LEE | It's incredible to be able to join ~. | ~에 합류할 수 있게 되어 믿기지 않습니다. |
| 06 | LEE | It's one of the biggest clubs in the world. | 세계에서 가장 큰 클럽 중 하나입니다. |
| 07 | LEE | I can't wait to start this new adventure. | 이 새로운 모험을 빨리 시작하고 싶습니다. |
| 08 | BASE | I'm looking forward to working with the team. | 팀과 함께 일하는 것이 기대됩니다. |

**Card Pair — 롤플레이**

프로필 카드 필드:
- NAME: My name is ___________.
- POSITION: I play as a ___________.
- FROM: I'm from ___________.
- FEELING: I'm _______ to be joining _______.
- GOAL: I have come here to ___________.
- EXCITED: I can't wait to ___________.

강사 질문 카드:
- Q 01: What position do you play, and where are you from?
- Q 02: How do you feel about joining the team today?
- Q 03: What are you looking forward to most?

**Mission — 숙제**

- REWATCH: 손흥민 또는 이강인 영상을 한 번 더 봅니다. 이번엔 영어 자막을 켜고 — 오늘 배운 표현이 나올 때 일시 정지.
- PREPARE: 빈칸 4개를 자신의 이름·포지션·목표로 완성합니다. 종이에 써도 좋고, 메모앱도 OK.
- RECORD: 핸드폰으로 1분 자기소개 인터뷰 영상을 찍습니다. 카메라 보고, 천천히, 자신있게.

---

### Unit 2 · 3–4주 · 경기 후 즉석 인터뷰 (플래시 인터뷰)

**학습 목표**
1. 승리/패배 두 상황 모두 대응
2. 경기 내용을 2~3문장으로 설명
3. 팀에 공을 돌리는 표현을 자연스럽게 사용

**회차 구성 (4회차)**

| 회차 | 포커스 | 수업 내용 | 활동 |
|---|---|---|---|
| 5 | 영상 분석 | 승리/패배 인터뷰 각 1개씩 비교 시청 → 어조·표현 차이 분석 | 승리 표현 5개 vs 패배 표현 5개 구분 정리 |
| 6 | 표현 드릴 | 감정 표현 (excited/gutted/proud/frustrated) 상황별 훈련 | 강사가 시나리오 제시 (오늘 2-0 승리 / 오늘 0-3 패배) → 즉석 발화 |
| 7 | 롤플레이 ① | 강사 = 리포터, 경기 결과 카드 뽑기 → 상황에 맞게 인터뷰 | 선수 2명씩 짝 → 한 명 인터뷰, 한 명 관찰 후 피드백 |
| 8 | 롤플레이 ② | Unit 1+2 연결 복습 → 자기소개 + 경기 후 인터뷰 연속 진행 | 2분 연속 인터뷰 녹화 (Unit1 도입 → Unit2 경기 소감) |

**레퍼런스 영상** (미정 — 아래 기준으로 선정)
- 승리 후 인터뷰: 손흥민 골 후 믹스드존 인터뷰 (영어)
- 패배 후 인터뷰: 국제 경기 패배 후 주장 인터뷰 (영어)

**Quote List — 수업 분석 표현 (각 영상에서 추출)**

영상 확정 후 채울 것. 아래는 커리큘럼 기반 예시 표현.

| 태그 | 영어 원문 | 한국어 | Note |
|---|---|---|---|
| VICTORY | "We worked really hard for this." | 이것을 위해 정말 열심히 했습니다. | 팀 공을 나누는 가장 기본 표현 |
| CREDIT | "Credit to the whole team." | 팀 전체의 공입니다. | 'credit to ~' — 공을 돌리는 공식 표현 |
| DEFEAT | "I'm gutted, but we'll bounce back." | 너무 속상하지만, 우리는 반등할 것입니다. | gutted = 완전히 낙담한. bounce back = 회복하다 |

**Two Column 비교**

| 승리 상황 (WIN) | 패배 상황 (LOSE) |
|---|---|
| We deserved this. | We have to be honest with ourselves. |
| Credit to the whole team. | I'm gutted, but we'll bounce back. |
| The manager set us up perfectly. | We just didn't perform today. |
| We kept fighting till the end. | We'll work hard and come back stronger. |

공통 포인트: 항상 **"we"** 로 시작 — 개인보다 팀을 먼저 언급

**Drill 빈칸 4개**

| No. | 템플릿 | 힌트 | 예시 |
|---|---|---|---|
| 01 | We _______ really hard for this. | worked / fought / prepared | We worked really hard for this. |
| 02 | Credit to the _______. | whole team / manager / coaching staff | Credit to the whole team. |
| 03 | I'm _______, but we'll _______. | gutted / disappointed / frustrated / bounce back / come back stronger | I'm gutted, but we'll bounce back. |
| 04 | The manager _______ us up _______. | set / perfectly / brilliantly | The manager set us up perfectly. |

**Master List — 핵심 표현 5개**

| No. | 출처 | 영어 | 한국어 |
|---|---|---|---|
| 01 | BASE | We worked really hard for this. | 이것을 위해 정말 열심히 했습니다. |
| 02 | BASE | Credit to the whole team. | 팀 전체의 공입니다. |
| 03 | BASE | It was a tough game but we kept going. | 힘든 경기였지만 우리는 계속 나아갔습니다. |
| 04 | BASE | I'm gutted, but we'll bounce back. | 너무 속상하지만, 우리는 반등할 것입니다. |
| 05 | BASE | The manager set us up perfectly. | 감독이 완벽하게 준비시켜줬습니다. |

**Card Pair — 롤플레이**

프로필 카드 필드:
- RESULT: We won / We lost ___________ to ___________.
- FEELING: I'm _______ because ___________.
- HIGHLIGHT: The key moment was ___________.
- CREDIT: I have to give credit to ___________.
- NEXT: We'll ___________ for the next game.

강사 질문 카드:
- Q 01: How do you feel after today's result?
- Q 02: Can you describe a key moment in the game?
- Q 03: What do you take away from this match?

**Mission — 숙제**

- REWATCH: 배운 승리/패배 인터뷰 영상을 한 번 더 봅니다. 'we'가 나올 때마다 체크.
- PREPARE: 가상 경기 결과 (승리 또는 패배)를 정하고, 빈칸 4개를 채웁니다.
- RECORD: 경기 직후 믹스드존 상황처럼 30초~1분 인터뷰 영상을 찍습니다.

---

### Unit 3 · 5–6주 · 목표·동기·야망 인터뷰

**학습 목표**
1. 해외 진출 이유를 진정성 있게 표현
2. 단기·장기 목표를 구분해서 표현
3. 선수로서의 목표를 구체적으로 표현

**회차 구성 (4회차)**

| 회차 | 포커스 | 수업 내용 | 활동 |
|---|---|---|---|
| 9 | 영상 분석 | 목표/동기 인터뷰 영상 → 'Why'를 설명하는 구조 분석 | Why → What → How 3단계 답변 구조 추출 & 판서 |
| 10 | 표현 드릴 | 나만의 Why·What·How 문장 각 1개씩 만들기 | 파트너에게 말하기 → 교정 → 다시 말하기 (2라운드) |
| 11 | 롤플레이 ① | 강사 = 심층 인터뷰 기자 (BBC / ESPN 스타일) | '왜 한국을 떠났나?' '5년 후 어디 있고 싶나?' 등 3~4문항 즉석 답변 |
| 12 | 롤플레이 ② | Unit 3 복습 + 답변 depth 높이기 (단문 → 이유 추가) | 2분 목표 인터뷰 녹화 → 자기 모니터링 시트 작성 |

**레퍼런스 영상** (미정)
- 이적 발표 인터뷰: 선수가 새 팀 합류 이유, 목표를 설명하는 영상
- 추천: 손흥민 토트넘 입단 인터뷰 또는 이강인 PSG 관련 심층 인터뷰

**Quote List 구조 (영상 확정 후 채울 것)**

| 태그 | 영어 원문 | 한국어 | Note |
|---|---|---|---|
| WHY | (영상에서 추출) | | 해외 진출 이유 설명 |
| GOAL | (영상에서 추출) | | 단기 목표 표현 |
| AMBITION | (영상에서 추출) | | 장기 야망 표현 |

**Master List — 핵심 표현 5개**

| No. | 출처 | 영어 | 한국어 |
|---|---|---|---|
| 01 | BASE | I want to prove myself at the highest level. | 최고 수준에서 나 자신을 증명하고 싶습니다. |
| 02 | BASE | My goal is to help this team win trophies. | 제 목표는 이 팀이 트로피를 들어올리는 데 기여하는 것입니다. |
| 03 | BASE | I came here to grow as a player. | 선수로서 성장하기 위해 여기 왔습니다. |
| 04 | BASE | I believe in my ability. | 저는 제 능력을 믿습니다. |
| 05 | BASE | Step by step — that's how I approach it. | 한 걸음씩 — 그게 제 접근 방식입니다. |

**Drill 빈칸 4개**

| No. | 템플릿 | 힌트 | 예시 |
|---|---|---|---|
| 01 | I want to prove myself _______. | at the highest level / in Europe / here | I want to prove myself at the highest level. |
| 02 | My goal is to _______ this season. | score 10 goals / win a trophy / improve every day | My goal is to win a trophy this season. |
| 03 | I came here to _______ as a player. | grow / develop / improve / prove myself | I came here to grow as a player. |
| 04 | Step by step — _______. | that's how I approach it / I'll get there | Step by step — that's how I approach it. |

**Card Pair — 롤플레이**

프로필 카드 필드:
- WHY: I came here because ___________.
- SHORT GOAL: This season, I want to ___________.
- LONG GOAL: In 5 years, I want to ___________.
- BELIEF: I believe ___________.
- APPROACH: My approach is ___________.

강사 질문 카드:
- Q 01: Why did you decide to come here?
- Q 02: What are your goals for this season?
- Q 03: Where do you see yourself in five years?

**Mission — 숙제**

- REWATCH: 목표/야망 인터뷰 영상을 봅니다. 선수가 'Why'를 어떻게 설명하는지 집중.
- PREPARE: 나의 Why / 단기 목표 / 장기 목표를 각 1문장씩 준비합니다.
- RECORD: 1분 목표 인터뷰 영상을 찍습니다. "I came here because..." 로 시작.

---

### Unit 4 · 7–8주 · 돌발·어려운 질문 대처

**학습 목표**
1. 당황하지 않고 시간을 버는 표현 사용
2. 부정적 질문을 긍정적으로 전환
3. 'No comment' 상황을 자연스럽게 처리

**회차 구성 (4회차)**

| 회차 | 포커스 | 수업 내용 | 활동 |
|---|---|---|---|
| 13 | 영상 분석 | 어려운 질문 받는 인터뷰 2개 → 선수가 피하거나 전환하는 방식 분석 | '피하기 / 전환하기 / 인정하기' 3가지 전략 분류 |
| 14 | 표현 드릴 | 시간 벌기 표현 + 전환 표현 집중 드릴 | 강사가 날카로운 질문 던지기 → 선수 즉각 반응 (5초 안에) |
| 15 | 롤플레이 ① | '압박 인터뷰' 시뮬레이션 — 강사가 연속 3문항 압박 | 선수들 돌아가며 압박 질문 받기 → 나머지 선수 전략 분석 |
| 16 | 롤플레이 ② | Unit 1~4 중간 종합 복습 + 실전 인터뷰 풀 시뮬레이션 | Unit별 상황 카드 랜덤 뽑기 → 3분 연속 인터뷰 녹화 |

**레퍼런스 영상** (미정)
- 부상/부진 관련 인터뷰: 선수가 불편한 질문에 대처하는 영상
- 이적설 관련 인터뷰: "I can't comment on that" 등의 표현이 등장하는 영상

**Master List — 핵심 표현 5개**

| No. | 출처 | 영어 | 한국어 |
|---|---|---|---|
| 01 | BASE | That's a good question — I'll be honest with you. | 좋은 질문입니다 — 솔직하게 말씀드리겠습니다. |
| 02 | BASE | I just focus on what I can control. | 저는 제가 통제할 수 있는 것에만 집중합니다. |
| 03 | BASE | I take full responsibility. | 전적으로 제 책임입니다. |
| 04 | BASE | We move on and look forward. | 우리는 앞으로 나아가고 앞을 봅니다. |
| 05 | BASE | I'd rather not comment on that right now. | 지금 당장 그것에 대해 언급하지 않겠습니다. |

**Drill 빈칸 4개**

| No. | 템플릿 | 힌트 | 예시 |
|---|---|---|---|
| 01 | That's a good question — _______. | I'll be honest / let me think about that | That's a good question — I'll be honest with you. |
| 02 | I just focus on _______. | what I can control / the next game / getting better | I just focus on what I can control. |
| 03 | I'd rather not _______ on that _______. | comment / right now / at this point | I'd rather not comment on that right now. |
| 04 | We _______ and look _______. | move on / forward | We move on and look forward. |

**Card Pair — 롤플레이 (압박 인터뷰)**

시나리오 카드 (강사가 뽑는 압박 질문):
- "Why haven't you been scoring lately?"
- "Is it true you want to leave this club?"
- "Do you think the manager made the right decision?"
- "There are rumors about a conflict with a teammate. Is that true?"
- "You've been injured a lot. Are you still at your best?"

대처 전략 카드 (선수가 사용):
- 시간 벌기: "That's a good question..." / "Look..."
- 전환: "What I can say is..." / "I just focus on..."
- 거절: "I'd rather not comment..." / "I'll leave that to the club."
- 인정: "I take full responsibility." / "We have to be honest."

**Mission — 숙제**

- REWATCH: 어려운 질문 대처 영상을 봅니다. 선수가 어떤 전략을 쓰는지 분류.
- PREPARE: 가장 어렵게 느껴지는 질문 1개를 정하고, 3가지 방식으로 답변을 준비합니다.
- RECORD: 압박 질문에 답하는 30초~1분 영상. 당황하지 않는 모습을 보여주세요.

---

### Unit 5 · 9–10주 · 팀·감독·동료 이야기

**학습 목표**
1. 감독·동료를 칭찬하는 표현을 자연스럽게 사용
2. 팀 전술·스타일을 간단히 설명
3. 팀의 일원으로서 말하는 화법 체득 ('I' → 'We')

**회차 구성 (4회차)**

| 회차 | 포커스 | 수업 내용 | 활동 |
|---|---|---|---|
| 17 | 영상 분석 | 동료·감독 칭찬 인터뷰 분석 → 'I' vs 'We' 화법 차이 파악 | 영상 속 'we' 문장 찾기 → 왜 그 표현이 좋은 인상을 주는지 토론 |
| 18 | 표현 드릴 | 팀원 칭찬 + 전술 설명 표현 드릴 | 6명이 각각 실제 팀 동료 칭찬 문장 만들기 → 발표 |
| 19 | 롤플레이 ① | '감독 인터뷰 직후' 설정 — 강사가 감독·팀 관련 집중 질문 | 2명씩 짝, 한 명 인터뷰 한 명 평가 (we 화법 사용 여부 체크) |
| 20 | 롤플레이 ② | Unit 5 복습 + 더 길고 자연스러운 답변 만들기 | 팀 소개 2분 인터뷰 녹화 → Unit 2 경기 소감과 연결 연습 |

**레퍼런스 영상** (미정)
- 팀 승리 후 감독/동료 언급 인터뷰
- 추천: 손흥민의 토트넘 팀 관련 인터뷰 (케인, 로리스 언급)

**Master List — 핵심 표현 5개**

| No. | 출처 | 영어 | 한국어 |
|---|---|---|---|
| 01 | BASE | The manager has been incredible for me. | 감독은 저에게 정말 대단했습니다. |
| 02 | BASE | We all work for each other. | 우리는 모두 서로를 위해 일합니다. |
| 03 | BASE | He makes everyone around him better. | 그는 주변의 모든 사람을 더 좋게 만듭니다. |
| 04 | BASE | Our team spirit is something special. | 우리 팀 정신은 특별합니다. |
| 05 | BASE | We just trust the process and keep working. | 우리는 과정을 믿고 계속 노력합니다. |

**Drill 빈칸 4개**

| No. | 템플릿 | 힌트 | 예시 |
|---|---|---|---|
| 01 | The manager has been _______ for me. | incredible / amazing / so important | The manager has been incredible for me. |
| 02 | He makes everyone around him _______. | better / stronger / more confident | He makes everyone around him better. |
| 03 | Our team _______ is something _______. | spirit / chemistry / special / really strong | Our team spirit is something special. |
| 04 | We just _______ the process and keep _______. | trust / working / going | We just trust the process and keep working. |

**Card Pair — 롤플레이**

프로필 카드 필드:
- MANAGER: The manager is _______ because ___________.
- TEAMMATE: My teammate _______ is ___________.
- TEAM STYLE: Our team plays ___________.
- TEAM SPIRIT: What makes us special is ___________.
- WE: Together, we ___________.

강사 질문 카드:
- Q 01: How has the manager helped you since you joined?
- Q 02: Can you tell us about one teammate who has impressed you?
- Q 03: How would you describe the team's style of play?

**Mission — 숙제**

- REWATCH: 팀/감독 언급 인터뷰를 봅니다. 'we'가 나올 때마다 체크.
- PREPARE: 실제 팀 동료 1명을 칭찬하는 문장 + 감독에 대한 문장을 각 1개 준비합니다.
- RECORD: 2분 팀 소개 인터뷰 영상. 반드시 'we'를 3번 이상 사용할 것.

---

### Unit 6 · 11–12주 · 프레스 컨퍼런스 & 최종 실전

**학습 목표**
1. 프레스 컨퍼런스 형식과 예절 이해
2. Unit 1~5 전체를 통합해 자연스럽게 구사
3. 2~3분 분량의 완성된 인터뷰 가능

**회차 구성 (4회차)**

| 회차 | 포커스 | 수업 내용 | 활동 |
|---|---|---|---|
| 21 | 영상 분석 | 프레스 컨퍼런스 풀 영상 → 플래시 인터뷰와 다른 점 분석 | 공식 석상 표현 vs 믹스드존 표현 비교 정리 |
| 22 | 표현 드릴 + 통합 | Unit 1~5 핵심 표현 총정리 + 프레스 컨퍼런스 전용 표현 추가 | 30개 예상 질문 카드 → 팀별 즉석 답변 배틀 |
| 23 | 최종 리허설 | 강사 = 메인 리포터 / 선수 한 명씩 단독 프레스 컨퍼런스 풀 시뮬레이션 | 6명 순서대로 5분 단독 인터뷰 → 나머지 선수 기자 역할 |
| 24 | 수료 인터뷰 & 피드백 | 최종 녹화 인터뷰 (3분) — Unit 1~6 통합 | 개인별 성장 피드백 리포트 전달 + 수료 인터뷰 영상 공유 |

**레퍼런스 영상** (미정)
- 공식 프레스 컨퍼런스 풀 버전 (감독 + 선수 동반 출석)
- 추천: 대형 경기 전/후 공식 기자회견 영상

**Master List — 핵심 표현 5개**

| No. | 출처 | 영어 | 한국어 |
|---|---|---|---|
| 01 | BASE | Thank you for the question. | 질문 감사합니다. |
| 02 | BASE | As I said, we're fully focused on the next game. | 말씀드렸듯이, 우리는 다음 경기에 완전히 집중하고 있습니다. |
| 03 | BASE | I don't want to speak for the club on that. | 그것에 대해 클럽을 대신해서 말하고 싶지 않습니다. |
| 04 | BASE | We're taking it one game at a time. | 우리는 한 경기씩 집중하고 있습니다. |
| 05 | BASE | I'm just happy to contribute to the team. | 팀에 기여할 수 있어서 행복합니다. |

**Drill 빈칸 4개**

| No. | 템플릿 | 힌트 | 예시 |
|---|---|---|---|
| 01 | Thank you for _______. | the question / asking | Thank you for the question. |
| 02 | As I said, we're fully focused on _______. | the next game / our preparation | As I said, we're fully focused on the next game. |
| 03 | We're taking it _______ at a time. | one game / one step | We're taking it one game at a time. |
| 04 | I'm just happy to _______ to the team. | contribute / give something back | I'm just happy to contribute to the team. |

**Card Pair — 프레스 컨퍼런스 롤플레이**

선수 준비 카드:
- OPENING: Good evening / Good morning, everyone.
- REVIEW: Tonight's game / This week's training was ___________.
- TEAMMATE PRAISE: I have to give credit to ___________.
- FUTURE: Looking ahead, we ___________.
- CLOSING: Thank you. We'll give everything on the pitch.

기자 질문 카드 (나머지 선수들이 기자 역할):
- Q 01: How do you feel about your performance today?
- Q 02: What do you think of your opponent next week?
- Q 03: Are there any injury concerns in the squad?
- Q 04: What's the team's main focus for the rest of the season?
- Q 05: Do you have a message for the fans?

**Mission — 수료 숙제**

- REWATCH: Unit 1 때 찍었던 나의 첫 번째 영상을 다시 봅니다. 얼마나 달라졌는지 확인.
- PREPARE: Unit 1~6에서 가장 자신있는 표현 8개를 골라 최종 인터뷰를 준비합니다.
- RECORD: 3분 수료 인터뷰 영상. 자기소개 → 경기 소감 → 목표 → 팀 이야기까지 흐름 완성.

---

## 전체 수업 시간 배분 (매 회차 동일)

| 시간 | 내용 |
|---|---|
| 5분 | 도입 & 복습 — 직전 회차 핵심 표현 3개 퀵 리뷰 |
| 35분 | 메인 수업 — 리포터 롤플레이 또는 심화 드릴 |
| 7분 | 피드백 — 강사 교정 + 선수 간 피드백 1인 1개 |
| 3분 | 마무리 — 다음 회차 예고 + 영상 숙제 안내 |

---

## 파일 명명 규칙

```
public/
  lessons/
    unit1.html    ← 완성
    unit2.html
    unit3.html
    unit4.html
    unit5.html
    unit6.html
```

---

## 디자인 시스템

SpaceX Design System (`DESIGN-spacex.md`) 적용.  
`unit1.html` / `unit1_v2.html` 코드를 베이스로 사용.

핵심 토큰:
```css
--night:     #000000;
--night-s:   #0a0a0a;
--white:     #ffffff;
--mute:      #5a5a5f;
--line:      #2a2a2f;
--bg-l:      #f4f7fa;   /* Drill 섹션만 라이트 배경 */
```

---

## 강사 바 섹션 ID 규칙

각 HTML 파일의 섹션 ID는 아래 패턴을 따름:

```
hero          → Unit 오프닝
watch-[player] → 영상 시청 전 (예: watch-son, watch-lee, watch-1, watch-2)
[player]-analysis → 표현 분석 (예: son-analysis, lee-analysis)
compare        → 두 영상 비교
drill          → 빈칸 드릴
phrases        → 핵심 표현 총정리
roleplay       → 롤플레이 카드
homework       → 숙제 안내
```

강사 바 SECTIONS 배열도 위 ID에 맞게 업데이트할 것.
