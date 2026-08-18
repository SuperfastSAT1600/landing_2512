# SAT RW 논리 작업 카테고리 초안

**상태**: Round 1 분석 완료 (55문제, 전 Skill 커버)
**날짜**: 2026-04-18

---

## 발견된 7개 카테고리

| # | 카테고리 | 조작 정의 | 해당 CB Skill |
|---|---------|----------|-------------|
| 1 | **NAME** | 주변 텍스트의 논리 구조가 이미 정의한 역할·관계·목적·구조에 올바른 이름표를 붙인다 | WiC, Transitions, TSP, CID(목적형) |
| 2 | **RETRIEVE** | 텍스트에 명시적으로 서술된 정보를 찾아 정확히 재진술한다 | CID(사실형) |
| 3 | **INFER** | 주어진 전제들로부터 가장 논리적으로 도출되는 결론을 완성한다 | Inferences |
| 4 | **VALIDATE** | 특정 주장/가설에 대해 그것을 가장 직접적으로 지지 또는 약화하는 증거를 선택한다 | COE |
| 5 | **RECONCILE** | 두 개의 독립된 텍스트가 동일한 주제에 대해 어떤 논리적 관계를 갖는지 식별한다 | CXC |
| 6 | **BUILD** | 주어진 노트들에서 명시된 수사적 목표를 가장 효과적으로 달성하는 문장을 선택한다 | RS |
| 7 | **APPLY** | 표준 영어의 문법·구두점 규칙을 적용하여 올바른 형태를 선택한다 | Boundaries, FSS |

---

## 각 카테고리의 질문 스템 패턴

### NAME
- "Which choice completes the text with the most logical and precise **word or phrase**?" (WiC)
- "Which choice completes the text with the most logical **transition**?" (Transitions)
- "Which best **describes** the overall **structure** of the text?" (TSP)
- "Which best **states the main purpose** of the text?" (TSP/CID)

### RETRIEVE
- "**According to the text**, what is true about X?"
- "What is **one reason** [someone] is [doing something]?"

### INFER
- "Which choice **most logically completes** the text?" ← 텍스트 마지막의 주장/결론을 완성
- "This suggests/indicates that ______"

> **⚠️ 주의**: "Which choice most logically completes the text?"는 WiC(NAME)와 Inferences(INFER) 모두에서 사용됨.
> 구분 기준: **빈칸이 단어/구(word/phrase)인가** → NAME / **빈칸이 완전한 명제(proposition)인가** → INFER

### VALIDATE
- "Which **finding**, if true, would **most directly support/undermine**...?"
- "Which **quotation** would **most directly support** the claim?"
- "Which choice **best describes data from the graph** that **support**...?"

### RECONCILE
- "How would the author of Text 2 **most likely respond** to...?"
- "Which best **describes a difference in how** the two authors **view**...?"
- "Based on the texts, how would [researcher] **respond** to [claim]?"

### BUILD
- "Which choice **most effectively uses relevant information from the notes** to accomplish this goal?"

### APPLY
- "Which choice completes the text so that it **conforms to the conventions of Standard English**?"

---

## MECE 검증

**상호 배타성(ME) 체크**:
- NAME ≠ RETRIEVE: NAME은 분석/명명, RETRIEVE는 위치 파악. 질문 스템으로 구분 가능.
- NAME ≠ INFER: NAME은 빈칸을 단어로 채움, INFER는 빈칸을 명제로 채움.
- INFER ≠ VALIDATE: INFER는 전제→결론 방향, VALIDATE는 주장→증거 방향.
- RECONCILE ≠ VALIDATE: RECONCILE은 두 텍스트 간 관계, VALIDATE는 한 텍스트 내 주장-증거 관계.
- BUILD ≠ NAME: BUILD는 외부 노트에서 선택, NAME은 텍스트 내 역할 명명.
- APPLY ≠ 나머지 모두: 의미 추론 없이 규칙 적용.

**잠재적 경계 문제**:
- CID(중심 사상)의 "Which best states the MAIN IDEA?" → NAME과 RETRIEVE의 경계. 전체 텍스트 합산이 필요하면 NAME, 직접 찾으면 RETRIEVE.
- Inferences의 "complete the text" 형식 → 스템이 WiC와 동일. 빈칸이 단어면 NAME, 명제면 INFER로 판단.

**집합적 완전성(CE) 체크**:
| CB Skill | 카테고리 | 커버 여부 |
|----------|---------|--------|
| Words in Context | NAME | ✓ |
| Cross-Text Connections | RECONCILE | ✓ |
| Text Structure and Purpose | NAME | ✓ |
| Rhetorical Synthesis | BUILD | ✓ |
| Transitions | NAME | ✓ |
| Central Ideas and Details | NAME / RETRIEVE | ✓ (스템으로 분류) |
| Command of Evidence | VALIDATE | ✓ |
| Inferences | INFER | ✓ |
| Boundaries | APPLY | ✓ |
| Form, Structure, and Sense | APPLY | ✓ |

**모든 CB Skill이 7개 카테고리 내 커버됨.** ✓

---

## 주목할 발견

### 1. College Board Skill ≠ 논리적 작업 카테고리
- CID(Central Ideas) 하나의 Skill이 NAME + RETRIEVE 두 카테고리에 걸침
- Inferences가 표면적으로 WiC(NAME)와 같은 스템 사용
→ CB taxonomy가 학습 작업 단위가 아님을 확인

### 2. NAME이 가장 큰 카테고리 (4개 Skill)
WiC + Transitions + TSP + CID(목적형)가 모두 동일한 논리 작업:
"텍스트가 이미 정의한 역할/관계에 올바른 이름을 붙인다"
→ 학생이 이 카테고리에서 실패하면 공통 원인이 있을 것

### 3. INFER와 VALIDATE는 역방향 작업
- INFER: 증거 → 결론 (주어진 전제에서 무엇이 따르는가?)
- VALIDATE: 주장 → 증거 (주어진 주장을 무엇이 지지하는가?)
- 논리적으로 역함수 관계. 학생이 방향을 혼동할 수 있음.

### 4. BUILD는 유일하게 외부 정보 사용
나머지 6개 카테고리는 모두 주어진 텍스트에서 작업.
BUILD만 "노트(raw notes)"에서 문장을 구성/선택함.
→ BUILD는 독립적 인지 유형

---

## Math 3단계와의 대응

| Math | RW 대응 | 조작 |
|------|---------|------|
| Coherence (개념 인식) | 지문의 논리 구조 파악 + 문제가 어느 카테고리인지 식별 | 분류 |
| Construction (개념으로 재구성) | 해당 카테고리의 조작 수행 | 실행 |
| Calculation (계산) | 정답 선택 | 검증 |

→ **RW의 3단계**: **분류(Classify) → 조작(Operate) → 검증(Verify)**
→ 7개 카테고리는 "조작(Operate)" 단계의 내용을 구성함.

---

## 다음 라운드 계획

**Round 2 목표**: 100문제 추가 분석, 경계 케이스 집중
- CID 질문이 NAME vs RETRIEVE로 얼마나 갈라지는가?
- FSS 문제 샘플 분석 (아직 미확인)
- 7개 카테고리가 새 샘플에서도 안정적인가?

**수렴 판단 기준**: 50문제 추가 시 7개 카테고리 외 신규 카테고리 없으면 수렴 선언.
