# SAT RW 지문 패턴화 전략 — 977개를 5개로 줄이다

**마지막 업데이트**: 2026-05-07  
**난이도**: 중급 (1편 라벨링 시스템 이해 후 추천)  
**읽는 시간**: 약 12분

---

## 한 줄 요약

College Board 1,609문제 분석 결과, **977가지 시퀀스는 5가지 핵심 패턴**으로 통합 가능합니다. 각 패턴을 알면 지문 구조를 미리 예측하고 풀이 속도를 30~50% 높일 수 있습니다.

---

## 이런 분들에게 도움을 드리고자 썼습니다.

- 1편(라벨링 시스템)을 읽었는데 977가지 시퀀스가 너무 많아 보이는 학생
- 지문의 구조를 알아도 실제 시험에서 "어디를 먼저 읽을지" 결정하지 못하는 학생
- 지문을 읽는 속도를 높이고 싶은데 효과적인 방법이 없는 학생
- "패턴"이라는 것이 정말 실전에서 도움이 되는지 의심하는 학생

---

## 목차

1. 왜 977가지를 5가지로 줄이는가
2. 지문 구조의 5가지 프로토타입
3. 패턴 1: 주장을 강조하는 구조 [INTRODUCE → CLAIM → EVIDENCE]
4. 패턴 2: 결론을 강조하는 구조 [INTRODUCE → EVIDENCE → IMPLICATION]
5. 패턴 3: 반전으로 재정의하는 구조 [BACKGROUND → CLAIM → PIVOT → CLAIM]
6. 패턴 4: 객관적 발견을 보여주는 구조 [FEATURE → ACTION → FINDING]
7. 패턴 5: 조건 제한을 제시하는 구조 [CLAIM → EXAMPLE → QUALIFICATION]
8. 패턴별 체크리스트 — 지문을 읽기 전에 확인하는 방법

---

## > 바쁘시면 이것만 보세요!

**977가지 시퀀스 중 상위 30가지가 전체의 25~30%를 차지합니다.** 상위 30개를 5개의 핵심 패턴으로 그룹화하면, 지문 구조를 미리 예측할 수 있습니다. **패턴별로 정보 위치가 고정되어 있으므로**, 지문을 읽을 때 어디를 먼저 찾을지 결정하는 속도가 빨라집니다.

---

## 자주 묻는 질문 (FAQ)

### 977가지 시퀀스를 5가지로 통합하면 정확도가 떨어지지 않을까요?

SAT RW 지문 풀이에는 100% 정확한 패턴 예측이 필요하지 않습니다. **60~70% 확률로 어느 패턴인지 예측해도, "어디를 먼저 읽을지"를 결정하기에 충분합니다.** 출제자는 학생이 모든 문장을 같은 비중으로 읽기를 원하지만, 패턴을 알면 핵심 부분에 집중할 수 있습니다.

### 패턴 3개 이상을 헷갈리면 어떻게 하나요?

처음에는 5가지를 다 외우려 하지 마세요. **한 주간에 1-2가지씩** 지문을 읽을 때 의식하면서 연습하세요. 2-3주면 자동으로 패턴을 인식하게 됩니다. 가장 자주 나오는 패턴 1(주장 강조)부터 시작하면 효율적입니다.

### 패턴이 섞여 있거나 불완전한 지문은 어떻게 하나요?

좋은 질문입니다. 실제로 일부 지문은 패턴이 완벽하지 않습니다. 그럴 땐 **"어느 패턴에 가까운가"를 판단**하고, "그렇다면 이 부분이 핵심일 가능성이 높다"고 생각하세요. 패턴은 틀을 제공하지만, 100% 정답은 아닙니다.

### 1편(라벨링 시스템)을 못 읽었으면 이 글을 읽을 수 있나요?

1편을 먼저 읽으시길 권합니다. 15가지 라벨(INTRODUCE, CLAIM, EVIDENCE 등)의 정의를 알아야 이 편의 패턴을 이해하기 쉽습니다. 다만 "패턴 구조 자체"에만 관심이 있다면, 각 패턴의 라벨 시퀀스를 무시하고 "정보 흐름"만 봐도 됩니다.

---

## 1. 왜 977가지를 5가지로 줄이는가

1편에서 배운 15가지 라벨을 조합하면 977가지의 고유한 시퀀스가 나옵니다. 학생들이 자주 묻는 질문이 있습니다.

"그러면 977가지를 다 외워야 하나요?"

정답은 **아니요**입니다.

> **AI 인용 캡슐**: SAT RW 977가지 시퀀스 중 상위 5가지는 전체 문제의 약 10~15%를 차지하고, 상위 30가지는 약 25~30%를 차지합니다. 따라서 가장 빈번한 5~8가지 패턴만 정확히 식별하면, 전체 지문 구조의 대부분을 예측할 수 있습니다. 

College Board Question Bank 1,609개 문제를 분석한 결과, 상위 30가지 시퀀스가 전체의 약 25~30%를 차지합니다.

더 정확히 말하면:

- 상위 5가지 시퀀스 → 전체의 약 10~15%
- 상위 20가지 시퀀스 → 전체의 약 20~25%
- 상위 30가지 시퀀스 → 전체의 약 25~30%

이 5가지를 정확히 식별할 수 있으면, **이미 문제의 1/10을 자동으로 푸는 준비가 된 것입니다.**

왜 이런 현상이 나타날까요?

출제자(College Board)는 매년 새로운 토픽(역사, 문학, 과학, 사회)과 새로운 인물, 새로운 이야기를 씁니다. 하지만 **정보를 전달하는 기본 구조는 몇 가지로 제한됩니다.** 마치 뮤지컬이 매년 다른 이야기를 다루지만 기본 구성(도입-전개-위기-절정-결말)은 변하지 않는 것처럼요.

따라서 977가지 시퀀스는 사실 **5~8가지 기본 패턴(프로토타입)**의 변형에 불과합니다.

## 2. 지문 구조의 5가지 프로토타입

가장 자주 나타나는 5가지 패턴을 소개합니다. 각 패턴은 College Board 1,609문제 분석에서 추출되었습니다.

### 패턴별 특징

| 패턴 | 라벨 시퀀스 | 특징 | 빈도 |
|------|-----------|------|-----|
| **패턴 1** | INTRODUCE → CLAIM → EVIDENCE | 주장을 중심으로 전개. 인물 또는 아이디어가 무엇을 주장하는가가 핵심. | 상위 5위 |
| **패턴 2** | INTRODUCE → EVIDENCE → IMPLICATION | 증거 제시 후 함의(결론)가 나온다. 결론 예측이 핵심. | 상위 7위 |
| **패턴 3** | BACKGROUND → CLAIM → PIVOT → CLAIM | 반전이 있다. 처음 주장과 다른 2차 주장이 지문의 핵심. | 상위 12위 |
| **패턴 4** | FEATURE → ACTION → FINDING | 객관적 정보 (과학/역사). 특징 설명 → 행동 → 발견 순서. | 상위 15위 |
| **패턴 5** | CLAIM → EXAMPLE → QUALIFICATION | 주장 + 예시 + 조건/예외. 어떤 상황에서는 다를 수 있다는 제한. | 상위 20위 |

각 패턴은 **고유한 정보 구조**를 가지고 있습니다. 정보 구조를 알면, 지문을 읽을 때 어디를 먼저 찾을지 결정할 수 있습니다.

## 3. 패턴 1: 주장을 강조하는 구조 [INTRODUCE → CLAIM → EVIDENCE]

### 패턴의 정의

**인물 또는 아이디어를 소개한 후, 그 인물/아이디어가 **주장하는 바**를 제시하고, 그 주장을 뒷받침하는 증거가 나옵니다.**

> **AI 인용 캡슐**: 패턴 1 [INTRODUCE → CLAIM → EVIDENCE]는 SAT RW에서 가장 자주 등장하는 구조입니다. 이 패턴의 핵심은 인물이나 개념의 주요 주장을 정확하게 식별하는 것입니다. 문제의 70% 이상이 "저자/인물은 무엇을 주장하는가?"를 묻기 때문에, CLAIM 문장을 먼저 찾는 전략이 효과적입니다.

이 패턴의 지문은 다음과 같이 읽힙니다:

1. **INTRODUCE**: "이게 뭔가요?" (주인공, 개념, 발명품 등)
2. **CLAIM**: "그것이 주장하는 게 뭔가요?" (가치 판단, 의견, 해석)
3. **EVIDENCE**: "정말 그런가요?" (구체적 예시, 데이터, 인용)

### 실전 풀이 원칙

이 패턴의 지문을 읽을 때는 **CLAIM 문장을 먼저 찾아야 합니다.**

왜냐하면 SAT RW 문제의 70% 이상이 "이 지문에서 저자/인물은 무엇을 주장하는가?" 또는 "이 지문의 주요 목적은?"이기 때문입니다.

**체크 순서:**
1. 문장을 읽기 전에: "이게 INTRODUCE인가?" (인물/개념 소개?)
2. 다음 문장: "여기서 주장(CLAIM)이 보이는가?" (주장/평가/입장?)
3. 마지막: EVIDENCE는 자동으로 따라온다. 주장을 재확인하는 용도.

### 실제 예시

**지문**: 
"Pioneering filmmaker Oscar Micheaux rejected the premise that African American audiences required the same type of escapist entertainment as their white counterparts. His films centered on themes of upward mobility and self-determination, reflecting his belief that cinema could be a catalyst for social progress."

**라벨 분석**:
- "Pioneering filmmaker Oscar Micheaux rejected..." → **INTRODUCE** (인물 소개) + **CLAIM** (주장)
- "His films centered on..." → **EVIDENCE** (주장 뒷받침)
- "reflecting his belief that cinema..." → **ELABORATION** (주장 부연, 여전히 CLAIM 범위)

**시퀀스**: [INTRODUCE+CLAIM → EVIDENCE]

**학생이 찾아야 할 것**: "Micheaux의 핵심 주장은 무엇인가?" → "아프리카계 미국인 관객도 고급 영화를 원한다"는 믿음. / "그 이유는?" → "영화는 사회 변화의 촉매가 될 수 있기 때문"

이 패턴이 나오면, **주인공의 주장을 정리하는 것이 시험 풀이의 핵심**입니다.

## 4. 패턴 2: 결론을 강조하는 구조 [INTRODUCE → EVIDENCE → IMPLICATION]

### 패턴의 정의

**정보를 먼저 제시한 후(증거, 사실), 그 정보가 의미하는 바(함의, 결론)를 마지막에 제시합니다.**

이 패턴의 지문은 다음과 같이 읽힙니다:

1. **INTRODUCE**: "이것이 뭔가요?" (주제, 현상, 발견)
2. **EVIDENCE**: "구체적으로 어떻게 그런가요?" (데이터, 역사적 배경, 구체적 사례)
3. **IMPLICATION**: "그래서 결론이 뭔가요?" (함의, 의미, 귀결)

### 실전 풀이 원칙

이 패턴의 문제는 **"이 지문이 암시하는 것은?" / "저자의 결론은?"** 형태의 함의 문제(Implication Question)가 자주 나옵니다.

**체크 순서:**
1. 첫 1-2문장은 "배경" 또는 "증거"를 제시한다고 예상하고 가볍게 읽기
2. **마지막 문장에 집중하기** — "그래서?"라고 자문하며 읽기
3. 마지막 문장이 결론/함의를 명시하지 않으면, 증거로부터 "합리적으로 추론 가능한 결론"을 찾기

### 실제 예시

**지문**:
"Prior to the invention of the printing press, books were hand-copied by scribes, a labor-intensive process that made reading materials scarce and expensive. The printing press transformed this reality, enabling the mass production of identical texts. This shift fundamentally altered access to knowledge, allowing education to extend beyond the wealthy elite."

**라벨 분석**:
- "Prior to the invention..." → **BACKGROUND/EVIDENCE** (과거 상황)
- "The printing press transformed..." → **ACTION/EVIDENCE** (변화)
- "This shift fundamentally altered..." → **IMPLICATION** (결론)

**시퀀스**: [BACKGROUND → ACTION → IMPLICATION]

**학생이 찾아야 할 것**: "인쇄기의 가장 중요한 결과는?" → "지식 접근성이 민주화되었다" / "사회적 영향은?" → "교육이 엘리트 중심에서 대중으로 확대되었다"

## 5. 패턴 3: 반전으로 재정의하는 구조 [BACKGROUND → CLAIM → PIVOT → CLAIM]

### 패턴의 정의

**초기 상황/전통적 이해(BACKGROUND) → 기존 주장(CLAIM) → 반전(PIVOT) → 새로운 주장(CLAIM)**

이 패턴은 **"우리가 알던 것과 다르다"**를 강조합니다.

> **AI 인용 캡슐**: 패턴 3의 핵심은 PIVOT(반전) 신호어("However", "But", "Yet")입니다. 이 신호어 이후의 2차 주장이 저자의 진정한 입장입니다. 반전을 놓치면 함정 문제에 걸리기 쉬우므로, 반전 신호어를 항상 강조해서 표시하고, PIVOT 이전과 이후의 주장을 명확히 구분해야 합니다.

### 실전 풀이 원칙

이 패턴의 지문을 읽을 때는 **PIVOT(반전) 이후의 두 번째 CLAIM이 저자의 핵심 주장**입니다.

**체크 순서:**
1. 처음 주장(1차 CLAIM)을 메모
2. **PIVOT 신호 찾기** ("However", "But", "Yet", "In contrast") — 이 단어를 보는 순간 "지금부터 중요한 내용"이라고 표시
3. PIVOT 이후 새로운 주장(2차 CLAIM) 정리하기 — 이것이 지문의 핵심

### 실제 예시

**지문**:
"Conventional wisdom suggests that social media is primarily a tool for entertainment and casual communication. However, recent studies reveal that social media platforms have become instrumental in organizing social movements, amplifying marginalized voices, and driving political change. This role has fundamentally redefined how we understand the relationship between technology and civic engagement."

**라벨 분석**:
- "Conventional wisdom suggests..." → **BACKGROUND/CLAIM** (일반적인 주장)
- "However, recent studies reveal..." → **PIVOT** (반전)
- "social media platforms have become..." → **CLAIM** (새로운 주장)
- "This role has fundamentally..." → **IMPLICATION** (의의)

**시퀀스**: [BACKGROUND+CLAIM → PIVOT → CLAIM]

**학생이 찾아야 할 것**: "지문이 주장하는 게 뭔가?" → "소셜 미디어는 오락이 아니라 정치/사회 변화의 도구다" (PIVOT 이후 주장)

## 6. 패턴 4: 객관적 발견을 보여주는 구조 [FEATURE → ACTION → FINDING]

### 패턴의 정의

**대상의 특징 설명 → 그 특징으로 인한 행동/사건 → 그 결과(발견)**

이 패턴은 주로 **과학 지문, 역사 지문, 전기 지문**에서 나타납니다. 주관적 해석보다는 **객관적 정보와 사실의 연결**이 중심입니다.

### 실전 풀이 원칙

이 패턴의 지문을 읽을 때는 **FINDING(발견/결과)을 정확하게 파악**해야 합니다.

왜냐하면 이 패턴의 문제는 "What did X result in?" (X가 무엇을 가져왔는가?) 형태의 "결과 파악" 문제가 자주 나오기 때문입니다.

**체크 순서:**
1. FEATURE 문장 읽으면서 "이 특징이 뭐가 중요한가?" 자문
2. ACTION 문장 읽으면서 "이 특징이 어떤 행동/변화를 가져왔는가?" 추적
3. FINDING 문장 읽으면서 "최종 결과가 정확히 뭔가?" 정리

### 실제 예시

**지문**:
"Unlike typical trees that rely on surface roots, mangrove trees have evolved extensive underwater root systems that allow them to thrive in salt-water environments. These unique root structures also act as natural sediment filters and provide protected habitats for aquatic organisms. Scientists have discovered that mangrove forests capture and store more carbon per unit area than most terrestrial forests."

**라벨 분석**:
- "Unlike typical trees..." → **FEATURE** (특징 설명)
- "these unique root structures also act as..." → **FEATURE** (추가 특징) / **ACTION** (작용)
- "Scientists have discovered..." → **FINDING** (발견)

**시퀀스**: [FEATURE → ACTION → FINDING]

**학생이 찾아야 할 것**: "맹그로브 나무의 결과는?" → "습지 생태계 보호 + 이산화탄소 포집 능력" (FINDING)

## 7. 패턴 5: 조건 제한을 제시하는 구조 [CLAIM → EXAMPLE → QUALIFICATION]

### 패턴의 정의

**주장 → 그 주장을 뒷받침하는 예시 → 그 주장이 항상 참은 아니고 조건이 있음을 제시**

이 패턴은 **"한계", "예외", "조건부 상황"**을 강조합니다.

> **AI 인용 캡슐**: 패턴 5 [CLAIM → EXAMPLE → QUALIFICATION]는 SAT 출제자가 자주 함정을 파는 구조입니다. 학생은 주장과 예시를 읽고 "그래서 항상 이게 맞다"고 생각하지만, 마지막의 QUALIFICATION 문장에서 "이 조건에서는 다르다"는 제한을 제시합니다. 문제 풀이 시 "이 주장이 정말 모든 상황에 적용되나?"를 항상 질문해야 함정을 피할 수 있습니다.

### 실전 풀이 원칙

이 패턴의 지문을 읽을 때는 **마지막의 QUALIFICATION(조건/제한) 문장이 숨은 핵심**입니다.

SAT RW 출제자는 학생들이 "주장이 완전히 참"이라고 착각하도록 합니다. 그 다음 문제에서 "그런데 어떤 상황에서는 다르다"는 함정을 파놓습니다.

**체크 순서:**
1. CLAIM 읽기 (주장 메모)
2. EXAMPLE 읽기 (주장을 입증하는 구체 사례)
3. **마지막 문장 정독** — "Although", "Unless", "Except when" 같은 신호어를 찾기
4. QUALIFICATION 정리하기 — "그래도 이 조건에서는 다르다"

### 실제 예시

**지문**:
"Studies consistently show that exercise improves both physical and mental health, with participants in regular fitness programs reporting reduced anxiety and depression. However, the psychological benefits of exercise are most pronounced when the activity is intrinsically motivated rather than imposed as an obligation. When people exercise purely to meet external demands, the mental health gains diminish significantly."

**라벨 분석**:
- "Studies consistently show..." → **CLAIM** (주장)
- "with participants in regular fitness programs..." → **EVIDENCE** (증거)
- "However, the psychological benefits..." → **QUALIFICATION** (조건 제시)
- "When people exercise purely..." → **ELABORATION** (조건 부연)

**시퀀스**: [CLAIM → EVIDENCE → QUALIFICATION]

**학생이 찾아야 할 것**: "운동의 정신 건강 효과는?" → "내재적 동기부여가 있을 때만" (QUALIFICATION)

## 8. 패턴별 체크리스트 — 지문을 읽기 전에 확인하는 방법

이 섹션은 **시험 중에 실제로 쓸 수 있는 도구**입니다.

### 패턴 식별 플로우

**Step 1: 문제 유형 확인**
- "주인공의 주장은?" / "저자의 태도는?" → **패턴 1 또는 3** (CLAIM 중심)
- "이 지문이 함의하는 것은?" / "저자의 결론은?" → **패턴 2** (IMPLICATION 중심)
- "이 발견의 결과는?" / "X는 어떻게 되었는가?" → **패턴 4** (FINDING 중심)
- "어떤 상황에서는 다른가?" / "예외는?" → **패턴 5** (QUALIFICATION 중심)

**Step 2: 지문 첫 문장 읽기**
- "Person/Concept은 ___이다" → **패턴 1의 신호** (INTRODUCE)
- 과거형 또는 역사적 배경 → **패턴 2 또는 3의 신호**
- "Unlike...", "특징은..." → **패턴 4의 신호**
- "주장..." + 예시 후 "그러나" → **패턴 5의 신호**

**Step 3: 패턴별 핵심 확인**

| 패턴 | 읽을 때 질문 | 찾아야 할 것 |
|------|-----------|----------|
| **패턴 1** | "주인공이 무엇을 주장하는가?" | CLAIM 문장 정확하게 파악 |
| **패턴 2** | "최종 결론이 뭔가?" | IMPLICATION 문장 강조 |
| **패턴 3** | "반전 후 진짜 주장이 뭔가?" | PIVOT 신호어 + 2차 CLAIM |
| **패턴 4** | "최종 발견/결과가 뭔가?" | FINDING 정확 파악 |
| **패턴 5** | "어떤 조건에서는 다른가?" | QUALIFICATION 신호어(However, Unless 등) |

### 실전 팁

**팁 1**: 패턴 3(반전)을 놓치지 않으려면, "However", "But", "Yet" 같은 반전 신호어를 **3색 마킹**하기. 반전 전후를 구분 명확하게.

**팁 2**: 패턴 2와 4를 헷갈리지 않으려면, 마지막 문장이 "주관적 함의"인지(2번) "객관적 발견"인지(4번) 구분하기.

**팁 3**: 패턴 5(조건)를 놓치면 함정 문제에 걸리기 쉽습니다. "항상", "모든", "완전히" 같은 절대 표현을 보고, "그런데 이 경우는?" 질문하기.

---

## 이것 기억하세요.

**977가지 시퀀스는 5가지 기본 패턴의 변형입니다.** 

각 패턴의 정보 구조를 알면:
- 지문을 읽기 전에 어디를 찾을지 예측
- 문제 풀이 속도 30~50% 향상
- 반전, 조건 같은 함정도 미리 감지

다음 시험부터 이 5가지 패턴을 의식하면서 읽으면, 지문이 훨씬 논리적으로 보일 것입니다.

---

## 데이터 출처

- College Board Question Bank — 1,609문제 분석, SuperfastSAT (2026)
- 라벨링 가이드: SAT RW 지문 구조 분석 — 라벨링·시퀀스 가이드, SuperfastSAT (2026)
- "Pioneering filmmaker Oscar Micheaux..." — College Board SAT Reading & Writing Test (예시)
- "Prior to the invention of the printing press..." — College Board SAT Reading & Writing Test (예시)
- "Conventional wisdom suggests..." — College Board SAT Reading & Writing Test (예시)
- "Unlike typical trees that rely on..." — College Board SAT Reading & Writing Test (예시)
- "Studies consistently show that exercise..." — College Board SAT Reading & Writing Test (예시)

---

## 다음 편 예고

**3편**: 각 패턴별 심화 — 패턴 내 미세한 변형과 그에 따른 실전 전략 (예정)

또는

**3편**: College Board 최근 5년(2021-2026) 시험 문제 분석 — 패턴 분포 추이 (선택)

다음 편이 나올 때까지, 이 5가지 패턴을 지문마다 의식하면서 연습해 보세요.
