# SAT RW 논리 작업 분석 로그

---

## Round 1 (2026-04-18)

**분석 문제 수**: 55개 (전 Skill 5문제씩 무작위 샘플)
**커버된 Skill**: WiC(5), CXC(5), TSP(5), RS(5), Transitions(5), CID(5), COE(5), Inferences(5), Boundaries(3+), FSS(미분석)

### 과정

**시작 가설**: SLOT A/B/C/D/E (지문 구조 기반) 5개 카테고리
**도착 결과**: 7개 논리 작업 카테고리

가설이 부분적으로 틀렸다. SLOT 구조는 텍스트의 *구조*를 기술하지만, 문제가 테스트하는 것은 텍스트에 대한 *논리적 작업*이었다.

### 핵심 관찰

**관찰 1**: 동일한 "Which choice most logically completes the text?" 스템이 두 가지 다른 작업을 가림.
- WiC에서: 단어/구 선택 → NAME
- Inferences에서: 완전한 명제 선택 → INFER
→ 표면 스템으로 분류 불가. 빈칸의 *입도(granularity)*가 판단 기준.

**관찰 2**: Central Ideas Skill이 두 카테고리에 걸침.
- "According to the text..." → RETRIEVE
- "Which best states the main purpose?" → NAME
→ CB Skill이 논리 작업 단위가 아님을 확인. 예측했던 바와 일치.

**관찰 3**: NAME이 4개 Skill을 커버 (WiC, Transitions, TSP, CID-purpose).
모두 동일한 작업: "텍스트가 이미 확립한 역할/관계에 올바른 레이블을 부여한다."
이것이 가장 큰 카테고리이며 가장 많은 문항을 차지할 가능성이 높다.

**관찰 4**: INFER↔VALIDATE 역방향 관계 발견.
- INFER = 전제 → 결론 (증거를 받아 결론을 도출)
- VALIDATE = 주장 → 증거 (주장을 받아 증거를 선택)
같은 논리적 역량의 두 방향. 학생이 어느 방향으로 추론해야 하는지 혼동이 오류 원인일 수 있음.

**관찰 5**: BUILD만 외부 정보(노트) 사용.
나머지 6개 카테고리는 주어진 텍스트에서 작업.
BUILD는 "주어진 사실들 → 수사적 목표"라는 구성 작업.
RW에서 유일하게 창조적(constructive) 성격의 작업.

**관찰 6**: APPLY(Boundaries/FSS)는 의미 추론 없음.
순수 규칙 적용. 나머지 6개와 인지적으로 분리됨.

### 카테고리 안정성 예비 평가

55개 문제 분석에서 7개 카테고리 외에 새로운 카테고리가 필요한 케이스 없음.
단, FSS 문제 미분석 → Round 2에서 확인 필요.
CID 경계 케이스 (main idea = NAME vs RETRIEVE) → 추가 확인 필요.

### Round 1 결론

7개 카테고리 초안 도출. MECE 기준으로 각 질문이 하나의 카테고리에만 속함.
(단, NAME과 RETRIEVE의 경계에서 CID 문제가 갈림 → 확인 필요)

---

## Round 2 (2026-04-18)

**분석 문제 수**: 68개 (FSS 20, CID 16, Inferences Hard 8, COE Hard 8, WiC Hard 8, Transitions Hard 8)
**목적**: FSS 확인 + 경계 케이스 + 새 카테고리 여부

### 핵심 발견

**FSS 완전 확인**: 20개 FSS 문제 모두 APPLY.
서브 규칙: 소유격(possessive), 한정 동사(finite verb), 주어-동사 수 일치, 수식어 위치, 병렬 구조, 대명사 격.
규칙의 종류는 다양하지만 작업은 동일: "표준 영어 규칙에 맞는 형태를 선택한다." ✓

**COE "완성" 형식 발견**: 새로운 COE 표면 형식:
- "Which choice most effectively uses data to **complete the text**?"
- "Which choice most effectively uses data to **complete the example**?"
→ 빈칸이 있어서 NAME처럼 보이지만, 실제로는 VALIDATE.
→ 주장이 먼저 주어지고, 그것을 지지/예시하는 데이터를 선택.
→ 구분 기준: "왜 이 데이터를 선택하는가?" → 주장과의 논리적 부합 여부 → VALIDATE.

**WiC "의미 파악" 변형 확인**: 
"As used in the text, what does the word 'X' most nearly mean?" (빈칸 없음, 기존 단어의 문맥적 의미 묻기)
→ 여전히 NAME: 이 문맥에서 단어가 맡은 논리적 역할을 올바르게 명명한다.

**새 카테고리 없음**: Round 2의 68문제에서 7개 카테고리 외에 새로운 카테고리 필요한 케이스 없음.

### 표면 형식 중복 목록 (중요)

| 표면 형식 | 실제 카테고리 | 구분 기준 |
|---------|------------|---------|
| "Which choice most logically completes the text?" | NAME 또는 INFER | 빈칸이 단어/구 → NAME; 빈칸이 명제 → INFER |
| "Which choice most effectively uses data to complete...?" | VALIDATE (아님: NAME) | 데이터-주장 부합 판단 필요 → VALIDATE |
| "Which quotation supports the claim?" | VALIDATE | - |
| "Which choice conforms to Standard English?" | APPLY | Boundaries도, FSS도 동일 스템 |

→ **카테고리는 질문 스템이 아닌 논리적 작업으로 분류해야 한다. 스템이 동일해도 카테고리가 다를 수 있다.**

### Round 2 결론

7개 카테고리 유지. **Round 2에서 수렴 조건 달성** (50개 추가에서 신규 카테고리 없음).
Round 3은 무작위 샘플 100개로 최종 검증.

---

## Round 3 (2026-04-18) — 최종 검증

**분석 문제 수**: 100개 (완전 무작위, Round 1/2 미사용 문제)
**구성**: WiC(18), FSS(17), COE(16), CID(14), Transitions(13), Inferences(9), Boundaries(7), RS(5), TSP(1)

### CID 분포 확인

14개 CID 문제의 실제 분포:
- "According to the text..." 형태 → **RETRIEVE** (7개)
- "Which best states the main idea/topic..." 형태 → **NAME** (6개)
- 경계 케이스 1개 (4d3e3c52 — Hard, data table 포함 추론)

→ CID 문제의 약 50%는 RETRIEVE, 약 50%는 NAME으로 분류.
→ 질문 스템으로 명확히 구분 가능. MECE 유지. ✓

### Round 3 결론

**100개 추가 문제에서 신규 카테고리 없음.**

**수렴 선언: 7개 카테고리 확정.**

누적 분석: 223문제 (Round 1: 55, Round 2: 68, Round 3: 100)
3 라운드 걸쳐 카테고리 안정적.

---

## Round 2 계획

**목표**: 100문제 추가 분석
- FSS 문제 집중 분석 (APPLY 카테고리 확인)
- CID hard/medium 집중 (NAME vs RETRIEVE 경계 명확화)
- 어려운 문제(difficulty=Hard) 비율 높여 샘플링
- 7개 카테고리에 명시적으로 맞지 않는 케이스 있는지 확인

**수렴 기준**: 새 100문제에서 7개 카테고리 외 신규 카테고리 없으면 → 확정.

---

## Round 4 (2026-04-18) — 전체 1,511문제 적용

**작업**: `scripts/ontology/apply_categories.mjs` 실행 → 전체 1,511문제 카테고리 적용

### 최종 분포

| 카테고리 | 문제 수 | 비율 |
|---------|--------|------|
| NAME    | 585    | 38.7% |
| APPLY   | 349    | 23.1% |
| VALIDATE | 203   | 13.4% |
| BUILD   | 178    | 11.8% |
| INFER   | 108    | 7.1% |
| RECONCILE | 55   | 3.6% |
| RETRIEVE | 33    | 2.2% |
| **총합** | **1,511** | **100%** |

**UNKNOWN: 0개** ← MECE 완전 달성

### 빈 skill 36개 처리

36개 문제의 skill 필드가 비어있음 (데이터 품질 이슈).
질문 스템 패턴으로 추론 적용:
- INFER: 15개 ("most logically completes" 11개 + 결론 추론 4개)
- VALIDATE: 10개 (데이터/인용문으로 주장 지지)
- RECONCILE: 6개 ("based on the texts" 패턴)
- RETRIEVE: 3개 ("according to", "for what reason")
- NAME: 2개 ("best states the main idea")

### Skill × Category 최종 매핑

| CB Skill | 카테고리 | 문제 수 |
|---------|---------|--------|
| Words in Context | NAME | 226 |
| Text Structure and Purpose | NAME | 132 |
| Transitions | NAME | 161 |
| Central Ideas and Details (목적형) | NAME | 64 |
| Central Ideas and Details (사실형) | RETRIEVE | 30 |
| Inferences | INFER | 93 |
| Command of Evidence | VALIDATE | 193 |
| Cross-Text Connections | RECONCILE | 49 |
| Rhetorical Synthesis | BUILD | 178 |
| Boundaries | APPLY | 169 |
| Form, Structure, and Sense | APPLY | 180 |

### Round 4 결론

**전체 분류 완료. 7개 카테고리 MECE 확인.**
출력: `ontology/all_questions_categorized.jsonl`, `ontology/category_summary.json`

---

## 최종 목표

1. ✅ 카테고리 확정 (7개)
2. ✅ 전체 1,511문제 분류 완료
3. ⬜ 각 카테고리별 오류 패턴 정의
4. ⬜ 오류 패턴을 전체 문제에 적용 (wrong answer tagging)
5. ⬜ Math의 "3단계" 등가물로서 RW의 세계관 완성:
   - 1단계: 문제가 어느 카테고리인가? (분류)
   - 2단계: 해당 카테고리의 논리 작업 수행 (조작)
   - 3단계: 올바른 답 선택 (검증)
