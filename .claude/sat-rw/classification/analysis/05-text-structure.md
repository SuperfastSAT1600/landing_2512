# Text Structure and Purpose 세부 분류 분석

**기본 데이터**: 140개 문제 분석
**데이터 출처**: `blog_database/sat_questions.db`

---

## 1. Text Structure and Purpose 스킬의 특성

### 1.1 주요 오답 패턴

| 오답 유형 | 비율 | 의미 |
|---------|------|------|
| **Out Of Scope** | 55.2% | 저자의 실제 목적 대신 배경지식·상식으로 선택 (가장 치명적) |
| **Partial Match** | 12.5% | 구조의 일부만 파악하고 전체 목적을 놓침 |
| **Distortion** | 9.5% | 저자의 의도를 과장하거나 왜곡하여 해석 |
| **Contradiction** | 8.7% | 저자 목적과 반대되는 선택지 선택 |
| **Misattribution** | 8.7% | 단락 역할 또는 저자 전략을 다른 요소에 귀속 |

**핵심 인사이트**: TSP의 압도적 함정은 **Out Of Scope** — "이 지문이 하는 일"을 지문 자체에서 찾지 않고 주제에 대한 배경지식이나 일반적 기대로 판단하는 오류다. 선택지가 그럴듯해 보여도 "지문이 실제로 그것을 했는가?"를 항상 확인해야 한다.

---

### 1.2 Arc 시퀀스 분석

**TSP는 지문 구조를 직접 묻는 스킬이므로 Arc 패턴과 테스트 포인트가 밀접하게 연결된다.**

| Arc 패턴 | 빈도 | 비율 | 테스트 포인트 |
|---------|------|------|------------|
| **INFO_TO_CONCL** | 51 | 36.4% | 정보 배열 순서 + 결론 도달 방식 (TSP-3, TSP-4) |
| **CLAIM_EVIDENCE** | 41 | 29.3% | 주장의 설득 방식 + 증거 사용 전략 (TSP-5, TSP-4) |
| **PURE_INFO** | 25 | 17.9% | 정보 나열의 순서·논리 (TSP-3, TSP-1) |
| **CLASSICAL_ARG** | 14 | 10.0% | 반론 관리 + 최종 설득 구조 (TSP-7, TSP-5) |
| **DUAL_CLAIM** | 9 | 6.4% | 두 관점 비교 기능 (TSP-2, TSP-6) |

**Top 시퀀스:**

| 시퀀스 | 빈도 | 특징 |
|--------|------|------|
| `EXP_I_bg-I-CL` | 13 | 배경→정보→결론: INFO_TO_CONCL 핵심 패턴, TSP-4 집중 |
| `EXP_I_bg-I-I-CL` | 7 | 확장된 배경→정보×2→결론, 복잡한 정보 배열 |
| `EXP_I` | 6 | 단순 정보 나열, TSP-1(단락 기능) 기초 |
| `LIT_I_bg-I-CL` | 4 | 문학형: 배경→장면→결론, TSP-6(강조 패턴) |
| `LIT_I_bg-I` | 4 | 문학형: 배경→장면 (묘사 기능 파악) |

**INFO_TO_CONCL 1위(36.4%)의 의미**: TSP에서 가장 많이 테스트되는 것은 "정보들이 어떤 순서로 배열되어 결론에 이르는가"이다. 지문이 단순히 정보를 나열하는 것인지, 아니면 결론을 향해 구조적으로 쌓아 올라가는지를 파악하는 TSP-3과 TSP-4가 핵심 sub-skill이 된다.

---

### 1.3 난이도 분포

| 난이도 | 빈도 | 비율 | 주요 테스트 포인트 |
|--------|------|------|----------------|
| **Easy** | 39 | 27.9% | 단락의 명시적 기능 파악 (TSP-1), 문학형 묘사 기능 |
| **Medium** | 64 | 45.7% | 전체 구조 패턴 식별, 정보 배열 순서, 연구 목적 파악 |
| **Hard** | 37 | 26.4% | 수사적 목적, 설득 전략, 반론 관리, 특정 요소의 기능 |

Medium이 45.7%로 가장 많은 것은 TSP가 구조를 인식하되 깊은 추론까지는 요구하지 않는 "중간 난이도 스킬"이기 때문이다. Hard는 지문 내 특정 문장·질문의 기능을 묻는 형태로 출제된다.

---

## 2. TSP 세부 Sub-skill 분석

### 2.1 Dimension 1: 구조 인식 (Structure Recognition)

**TSP-1: Paragraph Function (단락 기능)**
- 각 단락 또는 특정 문장이 전체 텍스트 구조에서 하는 역할 파악
- 도입부 / 배경 제공 / 증거 제시 / 반론 소개 / 결론 도출 등
- Arc 연결: 모든 Arc에서 출현하나 `EXP_I` 계열에서 기초적으로 테스트
- 난이도: **Medium**
- 주요 오답: Out of Scope (지문에 없는 기능을 배경지식으로 추가)

**TSP-2: Text Pattern Type (구조 패턴 유형)**
- 지문이 따르는 거시적 구조 패턴 식별
- PURE_INFO(나열형), INFO_TO_CONCL(귀납형), CLAIM_EVIDENCE(연역형), CLASSICAL_ARG(논쟁형), DUAL_CLAIM(비교형)
- Arc 연결: `DUAL_CLAIM` → 비교형, `CLASSICAL_ARG` → 논쟁형
- 난이도: **Medium-Hard**
- 주요 오답: Partial Match (패턴의 일부만 식별), Distortion (패턴 왜곡)

**TSP-3: Information Sequence (정보 배열 순서)**
- 정보가 어떤 논리적 순서로 제시되는가
- 시간순 / 원인→결과 / 일반→특수 / 문제→해결 등
- Arc 연결: `INFO_TO_CONCL` (배경→정보→결론), `EXP_I_bg-I-CL`
- 난이도: **Medium**
- 주요 오답: Partial Match (전체 순서 대신 일부 구간만 파악)

---

### 2.2 Dimension 2: 저자 의도 (Author Intent)

**TSP-4: Rhetorical Purpose (수사적 목적)**
- 저자가 이 구조를 선택한 의도: 독자를 어떻게 설득하거나 정보를 제공하려는가
- "이 지문의 주요 목적은 무엇인가?" 유형 질문
- Arc 연결: `INFO_TO_CONCL` (결론을 향한 설득), `CLAIM_EVIDENCE` (주장 뒷받침)
- 난이도: **Hard**
- 주요 오답: Out of Scope (목적을 지문 밖에서 찾음), Distortion (목적 과장)

**TSP-5: Persuasion Strategy (설득 전략)**
- 저자가 구체적으로 어떤 전략으로 주장을 설득하는가
- 단계적 증거 제시 / 권위 인용 / 사례 대조 / 반론 선제 제시 후 반박 등
- Arc 연결: `CLAIM_EVIDENCE`, `CLASSICAL_ARG`
- 난이도: **Hard**
- 주요 오답: Out of Scope (전략이 지문에 없는 것을 상정)

**TSP-6: Emphasis Pattern (강조 패턴)**
- 지문이 특정 정보를 어떻게 부각하는가
- 문두 배치, 반복, 대조를 통한 강조, 문학적 장치 활용
- Arc 연결: `LIT_I_bg-I-CL`, `DUAL_CLAIM`
- 난이도: **Medium-Hard**
- 주요 오답: Partial Match (강조된 요소를 일부만 인식)

---

### 2.3 Dimension 3: 설득 전략 심화 (Advanced Persuasion)

**TSP-7: Counterargument Management (반론 처리 방식)**
- 저자가 반론(counterargument)을 지문에 포함시키는 방식
- 단순 제시 후 무시 / 인정 후 한계 지적 / 적극 반박 / 반론을 역이용하여 자기 주장 강화
- Arc 연결: `CLASSICAL_ARG`, `COUNTER_REBUTTAL`
- 난이도: **Hard**
- 주요 오답: Out of Scope (반론 처리 방식을 과도하게 해석), Contradiction (반론과 본 주장 혼동)

---

## 3. Arc 패턴 × Sub-skill 연결

| Arc 패턴 | 주요 Sub-skill | 대표 시퀀스 | 오답 패턴 |
|---------|-------------|-----------|---------|
| INFO_TO_CONCL | TSP-3, TSP-4 | `EXP_I_bg-I-CL` | Out of Scope (결론 도달 방식 추측) |
| CLAIM_EVIDENCE | TSP-4, TSP-5 | `ARG_C_au-I-CL_au` | Out of Scope (설득 전략 과장) |
| PURE_INFO | TSP-1, TSP-3 | `EXP_I`, `EXP_I_bg` | Partial Match (나열 순서 일부만) |
| CLASSICAL_ARG | TSP-5, TSP-7 | `ARG_C_au-I-C_au-CL_au` | Misattribution (반론과 본 주장 혼동) |
| DUAL_CLAIM | TSP-2, TSP-6 | `ARG_C_au-C_au` | Distortion (두 주장 관계 왜곡) |
| LIT (문학형) | TSP-1, TSP-6 | `LIT_I_bg-I-CL` | Out of Scope (등장인물 감정 배경지식 적용) |

---

## 4. Sub-skill × 오답 유형 연결표

| Sub-skill | 핵심 개념 | Out of Scope | Partial Match | Distortion | Contradiction | Misattribution |
|-----------|---------|:-----------:|:-----------:|:---------:|:-----------:|:-------------:|
| TSP-1: 단락 기능 | 텍스트 내 역할 | O(주) | O | | | |
| TSP-2: 구조 패턴 | 거시 구조 유형 | | O(주) | O | | |
| TSP-3: 정보 순서 | 정보 배열 논리 | | O(주) | | | |
| TSP-4: 수사적 목적 | 저자 설득 의도 | O(주) | | O | | |
| TSP-5: 설득 전략 | 구체적 전략 | O(주) | | O | | |
| TSP-6: 강조 패턴 | 부각 방식 | | O(주) | O | | |
| TSP-7: 반론 처리 | 반론 관리 방식 | O(주) | | | O | O |

**(주): 해당 sub-skill의 주요 오답 유형**

**Out of Scope 집중 지점**: TSP-1, TSP-4, TSP-5, TSP-7 — "왜 이 구조인가"를 묻는 목적·의도·전략 관련 sub-skill에서 배경지식 의존 오류가 집중된다.

---

## 5. 실전 예시

### Easy 예시 — TSP-1: Paragraph Function (문학형)

**ID**: `c966ad55` | **난이도**: Easy | **Arc**: CLAIM_EVIDENCE / LIT_I-C-I-CL

**지문:**
> The following text is from Srimati Svarna Kumari Devi's 1894 novel The Fatal Garland (translated by A. Christina Albers in 1910). Shakti is walking near a riverbank that she visited frequently during her childhood.
>
> She crossed the woods she knew so well. **The trees seemed to extend their branches like welcoming arms. They greeted her as an old friend.** Soon she reached the river-side.

*(밑줄 부분: "The trees seemed to extend their branches like welcoming arms. They greeted her as an old friend.")*

**질문:** Which choice best describes the function of the underlined portion in the text as a whole?

**선택지:**
- A) It suggests that Shakti feels uncomfortable near the river.
- B) It indicates that Shakti has lost her sense of direction in the woods.
- C) It emphasizes Shakti's sense of belonging in the landscape.
- D) It conveys Shakti's appreciation for her long-term friendships.

**정답**: C

**구조 분석:**
- 지문 Arc: LIT(문학형) — 배경(어린 시절 자주 방문) → 장면 묘사(나무가 팔을 뻗어 환영) → 결론(강가 도착)
- 밑줄 문장의 기능: 나무를 의인화하여 Shakti의 친밀감·소속감을 강조하는 **강조 장치**

**오답 분석:**
- A) "uncomfortable" → 지문이 묘사하는 것은 편안함과 환영; Contradiction
- B) "lost her sense of direction" → 그녀는 숲을 "so well" 알고 있음; Contradiction
- D) "long-term friendships" → "an old friend"는 비유적 표현으로 사람 친구를 가리키지 않음; Out of Scope (비유를 문자적으로 읽는 함정)

**학습 포인트**: 문학형 Easy 문제에서 밑줄 기능을 물을 때, 감각적 묘사가 어떤 **감정/분위기**를 강조하는지를 파악하라. 단어를 문자적으로 해석(D)하거나 지문과 반대되는 감정(A, B)을 고르는 함정을 피한다.

---

### Medium 예시 — TSP-4: Rhetorical Purpose (연구 설명형)

**ID**: `2af2016f` | **난이도**: Medium | **Arc**: INFO_TO_CONCL / EXP_I_bg-I-I-I-I-CL

**지문:**
> A study by Dr. Paul Hanel and colleagues concluded that people are more likely to behave politely when listening to ideas they disagree with if they think about values before they engage in a discussion. Study participants were assigned to one of two groups. The experimental group spent a few minutes writing about one of their personal values before they had a group discussion on a controversial topic. And the control group spent a few minutes writing about a drink (tea, milk, etc.) before their group discussion on that topic. Hanel and colleagues found that the experimental group's discussion was more civil than the control group's discussion was.

**질문:** Which choice best describes the main purpose of the text?

**선택지:**
- A) To describe a widely held belief and how a study's results support that belief
- B) To argue that researchers were surprised by the results of a certain study
- C) To suggest ways to improve a certain study's experimental design
- D) To explain a study's conclusion and how a research team arrived at that conclusion

**정답**: D

**구조 분석:**
- Arc: INFO_TO_CONCL — 결론(첫 문장) → 실험 설계 설명 → 실험 결과로 마무리
- 수사적 목적: 연구 결론을 제시하고 어떻게 그 결론에 이르렀는지 설계를 통해 보여줌

**오답 분석:**
- A) "widely held belief" → 지문은 이 결론이 널리 알려진 믿음이라고 하지 않음; Out of Scope
- B) "researchers were surprised" → 지문에 연구자의 놀람은 언급되지 않음; Out of Scope
- C) "improve experimental design" → 설계 개선 제안은 없음; Out of Scope

**학습 포인트**: 연구 설명형 지문에서 가장 흔한 함정은 "지문이 했으면 좋겠다"는 것을 답으로 고르는 Out of Scope다. "지문이 실제로 한 것"만을 기준으로 삼아야 한다. 이 지문은 결론을 설명하고 실험 설계를 통해 그 결론 도달 과정을 보여줄 뿐이다.

---

### Hard 예시 — TSP-1 + TSP-4: Specific Element Function (수사적 질문의 기능)

**ID**: `ca50de52` | **난이도**: Hard | **Arc**: CLASSICAL_ARG / ARG_C_au-I-C_au-CL_au

**지문:**
> **"How lifelike are they?"** Many computer animators prioritize this question as they strive to create ever more realistic environments and lighting. Generally, while characters in computer-animated films appear highly exaggerated, environments and lighting are carefully engineered to mimic reality. But some animators, such as Pixar's Sanjay Patel, are focused on a different question. Rather than asking first whether the environments and lighting they're creating are convincingly lifelike, Patel and others are asking whether these elements reflect their films' unique stories.

*(밑줄: "How lifelike are they?")*

**질문:** Which choice best describes the function of the underlined question in the text as a whole?

**선택지:**
- A) It reflects a primary goal that many computer animators have for certain components of the animations they produce.
- B) It conveys the uncertainty among many computer animators about how to create realistic animations using current technology.
- C) It illustrates a reaction that audiences typically have to the appearance of characters created by computer animators.
- D) (선택지 오류 — A와 동일한 내용으로 중복 처리)

**정답**: A

**구조 분석:**
- Arc: CLASSICAL_ARG — 지배적 관행("how lifelike?") → 예외 소개(Patel 등) → 대안 주장
- 수사적 질문의 기능: 많은 애니메이터들이 환경·조명에 대해 추구하는 **주요 목표**를 압축적으로 제시
- 지문 전체가 이 질문을 출발점으로 삼아 "다른 질문을 하는 애니메이터들"을 소개하는 대조 구조

**오답 분석:**
- B) "uncertainty... about how to create realistic animations" → 지문은 기술적 불확실성이 아니라 목표의 차이를 논함; Out of Scope
- C) "audiences' reaction" → 이 질문은 애니메이터의 관점이지 관객의 반응이 아님; Misattribution

**학습 포인트**: Hard에서 특정 요소(수사적 질문, 밑줄 문장)의 기능을 물을 때는 **그 요소가 지문 전체 구조에서 어디에 위치하는가**를 파악해야 한다. 이 질문은 지문의 첫 줄에 위치하여 "주류 목표"를 제시하고, 이후 "다른 질문"과의 대조를 만들어 내는 전환점 역할을 한다. B처럼 지문에 없는 "기술적 어려움" 프레임을 씌우는 것이 Hard 수준의 Out of Scope 함정이다.

---

## 6. Out of Scope 심층 분석 (55.2%)

TSP에서 Out of Scope가 절반 이상을 차지하는 이유는 선택지가 "그럴듯하게 참인 것"과 "지문이 실제로 한 것" 사이의 간극을 이용하기 때문이다.

**Out of Scope 발생 3대 패턴:**

| 패턴 | 설명 | 예시 |
|------|------|------|
| **배경지식 투영** | 주제에 대한 일반 상식을 지문의 목적으로 혼동 | 연구 지문에서 "widely held belief"라는 선택지 |
| **감정/태도 추가** | 지문에 명시되지 않은 연구자/저자의 감정을 선택 | "researchers were surprised" |
| **지문 기능 오해** | 지문이 하지 않은 일(개선 제안, 비교 등)을 했다고 선택 | "suggest ways to improve" |

**해결 전략:**
1. 선택지를 읽을 때 "지문이 실제로 이것을 했는가?"를 확인
2. "~이어야 한다", "~했으면 좋겠다"의 생각이 든다면 Out of Scope 함정
3. 매력적인 선택지일수록 지문 근거를 더 엄격하게 확인

---

## 7. 스킬 간 연결성

| 스킬 | 연결점 |
|------|--------|
| **Inferences** | TSP-4(수사적 목적)와 INF-3(저자 의도 추론)은 동일한 "저자 의도 파악" 능력을 다른 각도에서 테스트 |
| **Central Ideas** | TSP-3(정보 배열)를 파악하면 Central Ideas의 "주제 추출"이 용이해짐 |
| **Rhetorical Synthesis** | TSP-5(설득 전략)와 Rhetorical Synthesis의 "전략적 글쓰기" 연결 |
| **Cross-Text Connections** | TSP-2(구조 패턴)를 두 지문에 동시에 적용하면 Cross-Text 비교 구조 분석 가능 |

---

## 8. 버전 관리

| 버전 | 날짜 | 변경사항 |
|------|------|---------|
| 1.0 | 2026-05-11 | 초기 정의 (7개 sub-skill) |
| 2.0 | 2026-05-12 | Arc 분석, Out of Scope 심층 분석, Arc×Sub-skill 연결표, 실전 예시 3개, 난이도 분포 확장 |
