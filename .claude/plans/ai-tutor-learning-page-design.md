# AI 튜터 학습 페이지 설계 문서

> 브레인스토밍 세션 정리 (2026-04-09)

---

## 1. 핵심 철학

### AI 튜터의 두 가지 목적

| 목적 | 정의 |
|------|------|
| **인지 교정** | 학생이 어떤 오개념을 갖고 있는지 파악하고 교정 |
| **이탈 방지** | 학생이 힘들어서 포기할 가능성이 높은 순간을 막음 |

두 목적은 독립적이지 않다. **Flow 상태 유지**라는 하나의 목표로 수렴한다.
- Flow 아래 (너무 쉬움) → 지루함
- Flow 위 (너무 어려움) → 좌절 → **이탈**
- Flow 안 → 학습 + 몰입

이탈 방지가 항상 우선이다. 학생이 앉아있지 않으면 인지 교정은 불가능하다.

---

## 2. 나선형 학습 구조

### 기본 경로

```
UNIT 1 → UNIT 2 → UNIT 3 → UNIT 4 → UNIT 5
```

### 분기 (Branch)

특정 UNIT에서 성취가 낮을 경우, 해당 개념의 더 쉬운 문제로 분기한 뒤 본류로 복귀.

```
UNIT 3 (mastery 낮음)
    ↓
UNIT 3-branch-A (쉬운 난이도)
    ↓
UNIT 4 복귀
```

### 핵심 원칙

- **100% 마스터리가 Gate가 아니다.** 학생은 UNIT 3 완전 마스터 전에 UNIT 4, 5로 진행할 수 있다.
- UNIT 4, 5를 풀면서 UNIT 3 개념이 재등장하고, 점진적으로 mastery가 100%에 수렴한다.
- Branch = "막혀서 우회"가 아니라 "이 개념의 재방문 빈도를 높이는 스케줄링 결정"

### mastery score

- 세션을 넘어 영구 저장
- 단순 정답률이 아니라 시간에 따른 정답 패턴으로 계산 (망각 곡선 반영)
- 개념 클러스터 단위로 관리

---

## 3. UX 결정사항

### 유지 (기존)
- **확신도 슬라이더**: 답 제출 후 0% / 25% / 50% / 75% / 100% 선택

### 추가 (신규)
- **가능성 마킹 (후보 공간)**: 답을 고르기 전, 답이 될 수 있다고 생각하는 보기를 복수 선택. 최종 답은 후보 공간 안에서만 선택 가능.

```
보기 A  [후보] [ ]
보기 B  [후보] [★]  ← 후보 + 최종 답
보기 C  [후보] [ ]
보기 D  [ ]   [ ]   ← 후보에서 제외
```

가능성 마킹의 이중 역할:
1. **데이터**: 학생의 추론 공간을 직접 기록
2. **교육**: 소거법(Process of Elimination)을 매 문제마다 체화

### 추가하지 않는 것

| 항목 | 이유 |
|------|------|
| 지문 이해도 입력 | 대화형 개입에서 자연스럽게 물어보는 것이 더 정확 |
| 오답 인과 분류 버튼 | 대화로 대체 |
| 감정/동기 자기보고 | 대화로 대체 |

### UX 없이 수집 (클라이언트 이벤트)

- **option_hover_sequence**: 각 선택지 hover 체류 시간 및 순서
- **time_to_submit_ms**: 문제 표시 → 제출까지 시간
- **exit_type**: 세션 종료 방식 (`completed` / `early_exit` / `timeout` / `paused`)

---

## 4. 데이터 수집 스키마

### Layer 1: 문제당 원시 데이터

```sql
problem_attempts (
  id                    uuid
  session_id            uuid
  user_id               uuid
  unit_id               uuid
  problem_id            uuid

  -- 가능성 마킹
  possible_options      text[]        -- e.g. ['A', 'B']

  -- 최종 선택
  final_answer          text          -- 후보 공간 내에서만

  -- 결과
  is_correct            boolean
  correct_answer        text

  -- 확신도 (기존)
  confidence_after      int           -- 0 / 25 / 50 / 75 / 100

  -- 풀이 시간
  started_at            timestamptz
  submitted_at          timestamptz
  time_to_submit_ms     int

  -- 행동 데이터
  option_hover_sequence jsonb         -- [{option: 'A', ms: 320}, ...]
  answer_changes        int           -- 후보 변경 횟수
)
```

### Layer 2: 문제당 파생 신호 (실시간 계산)

```
correct_in_candidate    정답이 후보 공간에 있었는가 (boolean)
confusion_type          none / pair(2개) / scattered(3개) / complete(전체)
time_z_score            학생 평균 대비 편차 (표준편차 단위)
confidence_delta        이전 문제 대비 확신도 변화
```

### Layer 3: 세션 누적 추세

```
consecutive_failures    연속 오답 횟수
confidence_trend_N      최근 N문제 확신도 기울기
time_trend_N            최근 N문제 풀이 시간 추세
accuracy_trend_N        최근 N문제 정확도 추세
```

### Layer 4: 개념 mastery (세션 간 누적)

```sql
concept_mastery (
  user_id               uuid
  concept_id            uuid
  mastery_score         float         -- 0.0 ~ 1.0
  last_seen_at          timestamptz
  total_attempts        int
  correct_attempts      int
)
```

### Layer 5: 이탈 Ground Truth 레이블

```sql
session_events (
  session_id            uuid
  user_id               uuid
  event_type            text          -- 'early_exit' | 'long_pause' | 'rapid_click'
  problem_id            uuid
  timestamp             timestamptz
  student_state_snapshot jsonb        -- 당시 Layer 2+3 스냅샷
)
```

`early_exit` 직전 N문제의 신호 패턴 → 이탈 예측 모델의 훈련 데이터

---

## 5. 개입 케이스 매트릭스

### 인지 교정 우세

| 케이스 | 신호 조합 | AI 오프닝 |
|--------|---------|---------|
| **오개념 고착** | 고확신(75%+) + 오답 + `correct_in_candidate: false` | "A는 왜 아닌 것 같았어?" |
| **경쟁 선택지 혼동** | 고확신(75%+) + 오답 + `correct_in_candidate: true` | "B 대신 D를 고른 이유가 뭐야?" |
| **소거 능력 부재** | `confusion_type: complete` + 오답 | "어떤 보기가 제일 이상해 보여?" |
| **함정 패턴** | hover 없이 즉시 선택 + 고확신 + 오답 | "이 유형 전에도 비슷하게 틀린 적 있어?" |

### 이탈 방지 우세

| 케이스 | 신호 조합 | AI 오프닝 |
|--------|---------|---------|
| **포기 직전** | `confidence_trend` 3문제 연속 하락 | "잠깐, 요즘 어때?" |
| **좌절 누적** | `consecutive_failures` 3+ + 확신도 저하 | "좀 어렵지? 잠깐 얘기하자" |
| **랜덤 클릭** | `time_z_score < -0.5` + 저확신 | "잠깐, 지문 다시 읽어볼까?" |
| **프리즈** | `time_z_score > 2.0` + 답 변경 없음 | "어디서 막혔어?" |

### 대화로 판별 (모호)

| 케이스 | 신호 조합 | AI 오프닝 |
|--------|---------|---------|
| **인지 vs 동기 불명** | 저확신 + 오답 + 시간 정상 | "어때? 잠깐 얘기할까?" |
| **운인가 실력인가** | 저확신 + 정답 | "어떻게 골랐어?" |
| **단순 실수 의심** | 고확신 + 오답 + `time_z_score < -0.3` | 개입 보류 → 다음 문제 관찰 |

### 개입 불필요 (EXIT)

| 케이스 | 조건 |
|--------|------|
| **자체 해결** | 대화 1-2턴 후 "괜찮아" + 다음 문제 정상 풀이 |
| **단발 이상치** | 한 문제만 시간 이상 또는 저확신, 추세 없음 |

---

## 6. 대화형 개입 아키텍처

### 역할 분리

```
데이터 신호 (자동, 상시)
    → WHEN: 임계값 초과 시 대화 시작

대화 (AI ↔ 학생)
    → WHAT: 인지 교정 / 이탈 방지 / EXIT 판별
```

### 대화 경로

```
AI: "어, 잠깐. 괜찮아?"
        ↓
학생 반응 분류
        ├── "응, 잠깐 생각 중"
        │       → AI: "그렇구나! 계속 해봐" → EXIT
        │
        ├── "이 문제 너무 어렵다..."
        │       → 이탈 방지 경로
        │       → 난이도 조정 + 공감
        │
        └── "이 단어가 무슨 뜻인지 모르겠어"
                → 인지 교정 경로
                → 개념 설명 또는 Socratic 힌트
```

### 대화 로그 저장

자유 대화처럼 보이지만 내부적으로 분류 트리를 따름.
어느 경로로 분기했는지가 레이블 데이터 → 나중에 SLM 파인튜닝 데이터.

```sql
intervention_logs (
  session_id            uuid
  problem_id            uuid
  trigger_case          text          -- 케이스 ID
  conversation_turns    jsonb         -- 대화 내용
  exit_path             text          -- 'cognitive' | 'dropout' | 'no_intervention'
  post_intervention_accuracy float    -- 개입 후 다음 3문제 정확도
)
```

`post_intervention_accuracy` = 개입 효과의 실제 측정값

---

## 7. 모델 전략

### 단계별 로드맵

| 단계 | 모델 | 목적 |
|------|------|------|
| Phase 1 (현재) | LLM (Claude) | 효과적 힌트/피드백 패턴 발견 + 데이터 수집 |
| Phase 2 (3-6개월) | SLM 파인튜닝 | 수집 데이터로 SAT 특화 SLM 훈련, 비용 절감 |
| Phase 3 (6-12개월) | SLM + LLM 하이브리드 | SLM 상시 관찰, LLM 고가치 개입에만 호출 |

### 계층적 라우팅 (Phase 3)

```
학생 상태 감지 (SLM, <50ms)
    ↓
[인지 부하 낮음 + 개념 탐구]  → LLM (깊은 Socratic 대화)
[인지 부하 높음 + 막힘]       → SLM 즉시 응답 (최소 힌트)
[자동화 드릴]                → SLM 로컬 처리
[메타인지 점검]               → LLM (자기 설명 유도)
```

---

## 8. 핵심 설계 원칙 요약

1. **데이터는 언제, 대화는 무엇을** — 데이터는 개입 트리거만 결정, 개입 종류는 대화가 결정
2. **EXIT 경로가 first-class** — 개입 안 하는 것이 가장 좋은 개입일 수 있다
3. **이탈 방지 우선** — 두 목적이 충돌하면 이탈 방지 먼저
4. **UX는 교육이다** — 가능성 마킹은 데이터 수집이 아니라 소거법 훈련
5. **레이블을 처음부터** — `exit_type`, `intervention_logs`는 미래 모델 훈련의 기반
6. **나선형으로** — 100%는 gate가 아니라 누적되는 상태값
