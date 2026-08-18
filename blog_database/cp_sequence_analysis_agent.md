# CP Sequence Analysis — AI Agent Tagging & Pattern Analysis Spec

> **문서 목적**: SAT RW 지문의 모든 Concept Point(CP)에 라벨을 부여하고,  
> 라벨 시퀀스를 추출해 ① 빈도 패턴 ② 문제 유형별 분포 ③ 오답 패턴 연관성을 분석한다.  
> **주 독자**: Claude Code / AI 에이전트. 사람 판단 개입 없이 규칙만으로 실행 가능하도록 작성한다.

---

## 0. 에이전트 실행 순서 (Master Workflow)

```
STEP 1: 지문 수신 → STEP 2: 지문 유형 분류 → STEP 3: CP 분절 →
STEP 4: 각 CP에 라벨 부여 → STEP 5: Sequence 문자열 생성 →
STEP 6: 마스터 레코드에 저장 → STEP 7: (배치 완료 후) 분석 실행
```

각 STEP은 독립적으로 검증 가능해야 한다.  
STEP 3~4에서 판단이 불가능한 경우에만 `AMBIGUOUS` 플래그를 달고 다음으로 진행한다.

---

## 1. 라벨 체계 전체 정의

### 1-A. Passage Type 라벨

지문 전체에 부여하는 라벨. CP 라벨보다 먼저 결정한다.

| 라벨 | 정의 | 판별 기준 |
|------|------|-----------|
| `ARG` | Argumentative | 저자 또는 인용된 주체가 특정 입장을 옹호·비판·분석함. 가치 판단이 지문의 목적 |
| `EXP` | Expository | 정보 전달이 목적. 사실·과정·정의·인과 설명. 가치 판단 없거나 극히 부수적 |
| `LIT` | Literary | 소설·시·단편 발췌. 서사·인물·감정이 중심 |

**ARG vs EXP 경계 규칙**:
- 지문 안에 `should / must / ought to / essential / critical / problematic / effective / misguided` 등 규범·평가 표현이 **저자 목소리로** 등장하면 → `ARG`
- 이 표현이 **타인의 주장을 보고**하는 형태로만 등장하면 → `ARG` 유지 (타인 주장 포함 자체가 논증 구조)
- 지문 전체가 정의·설명·인과만이고 저자 평가가 없으면 → `EXP`

**EXP_with_conclusion 서브태그**:
- `EXP` 지문이라도 마지막 CP가 사실에서 도출한 결론이면 → `EXP_CL`로 표기

---

### 1-B. CP Role 라벨

각 CP(개별 아이디어 단위)에 부여하는 라벨.

#### 기본 3분류

| 라벨 | 이름 | 정의 | value-laden? |
|------|------|------|--------------|
| `I` | Information | 사실·배경·데이터·과정·정의. 가치 판단 없음 | NO |
| `C` | Claim | 주장·입장·평가·옹호·비판. 가치 판단 있음 | YES |
| `CL` | Conclusion | 지문 전체의 최종 귀결. 앞의 I/C를 종합해 도달한 판단 또는 처방 | YES |

**value-laden 판별 체크리스트** (하나라도 YES → `C`):
- [ ] `should / must / ought to / need to` 등 규범 표현
- [ ] `effective / problematic / essential / critical / misguided / compelling / flawed` 등 평가 형용사
- [ ] 저자(또는 인용 주체)가 어떤 대상에 대해 찬성·반대·우려·권고를 표명
- [ ] 두 관점 중 하나가 더 낫다는 방향성을 제시
- [ ] 반론을 제시하거나 재반박함

`CL` 판별 기준:
- 지문의 마지막 또는 마지막에서 두 번째 CP
- 앞의 논의를 "따라서(therefore / thus / hence / this suggests / this means)" 계열로 마무리
- 새로운 정보 없이 앞 CP들을 종합
- 단, "따라서"가 없어도 지문 전체의 귀결이면 `CL` 가능 (문맥 판단)

#### 접미사 확장 (선택적)

기본 라벨에 접미사를 붙여 세부 관계를 표시한다. 분석 목적상 필요할 때만 사용.

| 접미사 | 의미 | 붙일 수 있는 기본 라벨 |
|--------|------|----------------------|
| `_bg` | Background / 도입 배경 | `I` |
| `_sup` | Support — 앞 CP를 직접 지지하는 evidence | `I`, `C` |
| `_ex` | Example — 앞 CP의 구체 예시 | `I` |
| `_ct` | Counter — 반론 또는 상반된 관점 | `C` |
| `_rb` | Rebuttal — counter에 대한 재반박 | `C` |
| `_au` | Author's voice (저자 본인 주장) | `C`, `CL` |
| `_ot` | Other's voice (타인 주장을 보고·인용) | `C` |

예: `C_ct_ot` = 타인의 반론 / `C_rb_au` = 저자의 재반박

---

### 1-C. Passage Structure Pattern 라벨

지문 전체의 논리 구조를 하나의 패턴 이름으로 분류한다. Sequence 추출 후 자동 매핑.

| 패턴 이름 | Sequence 특징 | 설명 |
|-----------|--------------|------|
| `PURE_INFO` | I로만 구성 | 순수 정보 나열. 주장·결론 없음 |
| `INFO_TO_CONCL` | I…CL | 정보 누적 후 결론 도출 |
| `CLAIM_EVIDENCE` | C-I… 또는 I…C | 주장 + 근거 제시 |
| `CLASSICAL_ARG` | I-C-I-CL | 배경→주장→근거→결론 |
| `COUNTER_REBUTTAL` | C_ct → C_rb 포함 | 반론 제시 후 재반박 |
| `DUAL_CLAIM` | C…C (대립하는 두 주장) | 두 입장을 병렬 제시 |
| `NARRATIVE_CONCL` | (LIT) 서사 후 주제적 귀결 | 문학 지문 |

자동 매핑 규칙:
1. `C` 없음 → `PURE_INFO`
2. `CL` 있고 `C` 없음 → `INFO_TO_CONCL`
3. `C_ct` 또는 `C_rb` 포함 → `COUNTER_REBUTTAL`
4. `C`가 2개 이상이고 대립 관계 → `DUAL_CLAIM`
5. 나머지 `C` 포함 → `CLAIM_EVIDENCE` 또는 `CLASSICAL_ARG`

---

### 1-D. Connector Type 라벨

CP 경계에서 사용된 연결어 유형. CP 분절 판단에 사용하며, 분석 시 오답 패턴과 교차 가능.

| 라벨 | 대표 연결어 | 역할 |
|------|------------|------|
| `CONN_ADD` | furthermore, moreover, also, in addition | 추가 |
| `CONN_CONT` | however, yet, but, on the other hand, nevertheless, although, despite | 대조·전환 |
| `CONN_CAUSE` | therefore, thus, as a result, consequently, hence, so | 인과 |
| `CONN_COMP` | similarly, likewise, in comparison, by contrast | 비교 |
| `CONN_EMPH` | indeed, in fact, certainly, notably | 강조 |
| `CONN_SEQ` | first, next, then, finally, subsequently | 순서 |
| `CONN_EX` | for example, for instance, such as, specifically | 예시 |
| `CONN_NONE` | (연결어 없음, 마침표·세미콜론으로만 경계) | 없음 |

---

### 1-E. Question Type 라벨

지문과 함께 기록하는 문제 유형.

| 라벨 | 문제 유형 | 대표 질문 문구 |
|------|----------|--------------|
| `QT_COE_TEXT` | Command of Evidence (Textual) | "Which quotation most effectively illustrates…" / "Which finding… would most directly support…" |
| `QT_COE_QUANT` | Command of Evidence (Quantitative) | "Which choice most effectively uses data from the table/graph…" |
| `QT_DETAIL` | Central Ideas & Details | "According to the text…" / "Which choice best states the main purpose…" |
| `QT_INFER` | Inference | "Which choice most logically completes the text?" |
| `QT_WIC` | Words in Context | "Which choice completes the text with the most logical and precise word…" / "As used in the text, what does the word X most nearly mean?" |
| `QT_STRUCT` | Text Structure & Purpose | "Which choice best describes the function of the underlined sentence…" / "Which choice best describes the overall structure…" |
| `QT_CROSS` | Cross-Text Connections | "Based on the texts, how would the author of Text 2 most likely respond to…" |
| `QT_TRANS` | Transitions | "Which choice completes the text with the most logical transition?" |
| `QT_RHSYN` | Rhetorical Synthesis | "Which choice most effectively uses relevant information from the notes…" |
| `QT_BOUND` | Boundaries (Punctuation/Grammar) | "Which choice completes the text so that it conforms to the conventions of Standard English?" (경계 유형) |
| `QT_FSS` | Form, Structure, Sense (Grammar) | "Which choice completes the text so that it conforms to the conventions of Standard English?" (형태·구조 유형) |

---

### 1-F. Distractor Trap Type 라벨

오답 선택지에 적용하는 trap 분류. 정답 외 선택지마다 하나씩 부여.

| 라벨 | Trap 유형 | 설명 |
|------|----------|------|
| `TRAP_SCOPE` | Scope Shift | "some"→"all", "might"→"must" 등 범위 확대 |
| `TRAP_CAUSE` | Correlation→Causation | 상관관계를 인과로 둔갑 |
| `TRAP_EXTRA` | Out-of-Scope Inference | 지문에 없는 정보 추가 |
| `TRAP_PARTIAL` | Partial Context | 지문의 일부만 인용, 핵심 qualifier 생략 |
| `TRAP_TONE` | Tone/Attitude Overstatement | 저자 어조를 과장 (cautious→dismissive 등) |
| `TRAP_MODAL` | Modal Shift | "could"→"will", "suggests"→"proves" 등 확신도 변조 |
| `TRAP_PERSP` | Perspective Confusion | 저자 관점과 타인 관점 혼동 |
| `TRAP_SWAP` | Word Swap | 유사 단어로 의미 미세 변조 |
| `TRAP_HASTY` | Hasty Generalization | 소규모 샘플→전체 일반화 |
| `TRAP_INCRM` | Incremental Logic Bait | 첫 절은 맞고 마지막 절에서 논리 비약 |
| `TRAP_HALF` | Half-True Answer | 전반부 맞고 후반부 틀림 |
| `TRAP_CONTRADICT` | Direct Contradiction | 지문과 정반대 주장 |
| `TRAP_MINOR` | Minor Detail Misuse | 비중이 낮은 세부 사항을 주요 답으로 제시 |

---

## 2. CP 분절 규칙 (Segmentation Rules)

### 2-1. 경계 판별 우선순위 (1이 가장 확실)

| 우선순위 | 마커 | 판정 |
|---------|------|------|
| 1 | 마침표 `.` | 항상 CP 경계 |
| 1 | 세미콜론 `;` | 항상 CP 경계 |
| 2 | 대조·전환 연결어 앞 쉼표 (however, yet, but, although, despite, while) | CP 경계 |
| 3 | 인과 연결어 앞 쉼표 (therefore, thus, as a result, consequently) | CP 경계 |
| 4 | 기타 연결어 앞 쉼표 (moreover, furthermore, similarly, for example) | CP 경계 |
| 5 | 쉼표·대시 — 8단어 이상 절 | 경계 가능성 검토 |
| 5 | 쉼표·대시 — 8단어 미만 절 | 같은 CP 내부 처리 |

### 2-2. 경계가 아닌 패턴 (같은 CP 내부)

다음 패턴은 CP 경계로 분절하지 않는다:

- **Non-restrictive clause**: `, which/who/where …` → 추가 정보, 같은 CP
- **Interrupting modifier**: `, confirmed by X,` / `—a pioneer in Y—` → 삽입어구, 같은 CP
- **Introductory modifier**: `Despite X, …` / `In 2020, …` → 도입 수식어, 같은 CP
- **Contrasting add-on**: `, despite initial skepticism` → 같은 CP 내 대조
- **Embedded list**: `: A, B, and C` → 콜론 이후 목록, 같은 CP
- **Colon elaboration**: `: [설명/예시]` → 항상 같은 CP. 콜론은 절대 CP 경계 아님

### 2-3. 한 문장에 CP가 2개인 경우

문장 내 `|` 기호로 분절 표시. 각각에 독립 라벨 부여.

```
예시:
"The results were promising, but the methodology raised significant concerns."
→ CP_a: I ("The results were promising")  [connector: CONN_CONT]
→ CP_b: C ("the methodology raised significant concerns") [저자 평가]
```

### 2-4. 극단적 복잡 문장 처리

세 개 이상의 절이 중첩된 문장:
1. 가장 외측 주절을 CP_a로 분리
2. 삽입된 긴 절(8단어 이상)이 독립적 의미를 가지면 CP_b로 분리
3. 나머지 수식어구는 가장 가까운 CP에 흡수

---

## 3. 라벨 부여 Decision Tree

```
[START] CP 텍스트 읽기
        │
        ▼
[Q1] 이 CP는 지문의 마지막(또는 마지막-1) CP인가?
        │
      YES ┤
        │  [Q1a] "therefore/thus/hence/this suggests/this means/
        │         this indicates/hence/consequently" 계열 있거나,
        │         앞 논의를 종합해 귀결을 내리는가?
        │         YES → 라벨: [CL]
        │         NO  → [Q2]로 이동
        │
       NO → [Q2]
        │
        ▼
[Q2] value-laden한가? (아래 중 하나라도 YES)
        - should/must/ought to/need to 등 규범 표현
        - effective/problematic/essential/critical/
          misguided/compelling/flawed 등 평가 형용사
        - 찬성·반대·우려·권고 표명
        - 두 관점 중 하나가 낫다는 방향성
        - 반론 제시 또는 재반박
        │
      YES → [Q3]
       NO → 라벨: [I] (+ 해당하는 접미사 선택)
        │
        ▼
[Q3] 이 주장은 저자 본인의 목소리인가, 타인(연구자/비평가 등)을 보고하는가?
        │
  본인 → _au 접미사
  타인 → _ot 접미사
        │
        ▼
[Q4] 이 주장은 앞 CP의 반론인가?
  YES → _ct 추가
   NO → [Q5]
        │
        ▼
[Q5] 이 주장은 앞의 반론에 대한 재반박인가?
  YES → _rb 추가
   NO → 접미사 없이 [C]
        │
        ▼
[I 분기] 정보 CP의 세부 역할 결정
        - 지문 도입 배경: _bg
        - 앞 C/CL을 직접 지지하는 데이터·연구: _sup
        - 앞 CP의 구체 예시: _ex
        - 위 해당 없음: 접미사 없이 [I]
```

---

## 4. Sequence 생성 규칙

### 4-1. 형식

```
{PASSAGE_TYPE}_{CP1_LABEL}-{CP2_LABEL}-…-{CPn_LABEL}
```

예시:
```
ARG_I_bg-C_au-I_sup-C_ct_ot-C_rb_au-CL
EXP_I-I-I-CL
EXP_I-I-I-I
LIT_I-I-C_au-CL
```

### 4-2. 단순화 버전 (빈도 분석용)

접미사를 제거한 3분류 기본형으로 집계:
```
ARG_I-C-I-C-C-CL  →  ARG_I-C-I-C-C-CL  (그대로)
ARG_I_bg-C_au-I_sup-C_ct_ot-C_rb_au-CL  →  ARG_I-C-I-C-C-CL  (단순화)
```

분석 시 두 버전 모두 저장: `sequence_full` / `sequence_simple`

### 4-3. Cross-Text 지문 처리

두 지문이 있을 경우:
```
TEXT1: ARG_I-C-I-CL
TEXT2: ARG_I-C_ct-CL
COMBINED: CROSS_{TEXT1_SEQ}_x_{TEXT2_SEQ}
```

---

## 5. 데이터 레코드 스키마

각 지문 태깅 완료 시 아래 스키마로 저장 (JSON 권장).

```json
{
  "passage_id": "P001",
  "source": "PT1_RW_S1_Q5",
  "passage_type": "ARG",
  "passage_structure_pattern": "CLASSICAL_ARG",
  "question_type": "QT_COE_TEXT",
  "question_domain": "Information and Ideas",
  "cp_count": 5,
  "cps": [
    {
      "cp_num": 1,
      "text_excerpt": "Marine biologists have long suspected…",
      "label": "I",
      "label_full": "I_bg",
      "connector_to_next": "CONN_CONT",
      "word_count": 14
    },
    {
      "cp_num": 2,
      "text_excerpt": "However, this hypothesis had not been…",
      "label": "I",
      "label_full": "I",
      "connector_to_next": "CONN_NONE",
      "word_count": 10
    },
    {
      "cp_num": 3,
      "text_excerpt": "Dr. Cruz conducted an extensive analysis…",
      "label": "I",
      "label_full": "I_sup",
      "connector_to_next": "CONN_NONE",
      "word_count": 18
    },
    {
      "cp_num": 4,
      "text_excerpt": "She observed that fish dwelling in deeper…",
      "label": "I",
      "label_full": "I_sup",
      "connector_to_next": "CONN_CAUSE",
      "word_count": 21
    },
    {
      "cp_num": 5,
      "text_excerpt": "These adaptations help deep-water fish…",
      "label": "CL",
      "label_full": "CL",
      "connector_to_next": null,
      "word_count": 16
    }
  ],
  "sequence_full": "EXP_I_bg-I-I_sup-I_sup-CL",
  "sequence_simple": "EXP_I-I-I-I-CL",
  "answer_cp_refs": [4, 5],
  "correct_answer": "B",
  "distractor_traps": {
    "A": "TRAP_SCOPE",
    "C": "TRAP_PARTIAL",
    "D": "TRAP_EXTRA"
  },
  "ambiguous_flags": [],
  "notes": ""
}
```

---

## 6. 분석 파이프라인

### Phase 1 — 시퀀스 빈도 분석

**입력**: 태깅된 레코드 JSONL  
**출력**: 시퀀스 빈도표

```python
# 수도코드
sequences_simple = [r["sequence_simple"] for r in records]
freq_table = Counter(sequences_simple).most_common()

# Passage Type별 분리
for ptype in ["ARG", "EXP", "LIT"]:
    subset = [r["sequence_simple"] for r in records if r["passage_type"] == ptype]
    print(ptype, Counter(subset).most_common(10))
```

**분석 질문**:
1. 전체에서 가장 빈번한 Top 10 시퀀스는?
2. Passage Type별 최빈 시퀀스는?
3. CP 개수(cp_count) 분포는?
4. `CL`로 끝나는 비율 vs 끝나지 않는 비율?

---

### Phase 2 — 문제 유형 × 시퀀스 교차분석

**입력**: Phase 1 결과  
**출력**: 문제유형 × 시퀀스 분포 행렬

```python
# 수도코드
for qt in question_types:
    subset = [r["sequence_simple"] for r in records if r["question_type"] == qt]
    print(qt, Counter(subset).most_common(5))
```

**분석 질문**:
1. `QT_COE_TEXT`는 어떤 시퀀스에서 집중 출제되는가?
2. `QT_DETAIL`은 `EXP` 지문에만 나오는가, `ARG`에도 나오는가?
3. `QT_CROSS`는 두 지문 모두 `C`를 포함하는 경우가 대부분인가?
4. `QT_INFER`의 정답 CP는 항상 마지막 또는 마지막-1인가?

---

### Phase 3 — 오답 패턴 × 시퀀스 연관 분석

**입력**: Phase 1, 2 결과 + `distractor_traps` 필드  
**출력**: Trap Type × Sequence 분포 행렬

```python
# 수도코드
trap_seq_pairs = []
for r in records:
    for choice, trap in r["distractor_traps"].items():
        trap_seq_pairs.append((trap, r["sequence_simple"]))

for trap in trap_types:
    subset = [seq for t, seq in trap_seq_pairs if t == trap]
    print(trap, Counter(subset).most_common(5))
```

**분석 질문**:
1. `TRAP_PERSP`는 `ARG` 지문에서만 나오는가?
2. `TRAP_SCOPE`는 어떤 시퀀스에서 집중 출제되는가?
3. `TRAP_INCRM`은 `CL`이 있는 시퀀스에서 더 자주 나오는가?
4. `TRAP_PARTIAL`은 긴 시퀀스(CP 5개 이상)에서 집중되는가?

---

## 7. 검증 기준 (Validation Rules)

에이전트는 레코드 저장 전 아래를 자동 검증한다.

| 규칙 | 조건 | 오류 처리 |
|------|------|----------|
| V1 | `cp_count` == `len(cps)` | 오류 → 재태깅 |
| V2 | `sequence_simple`의 라벨 수 == `cp_count` | 오류 → 재태깅 |
| V3 | `passage_type`이 `ARG`이면 `sequence_simple`에 `C` 또는 `CL` 하나 이상 포함 | 경고 → `ambiguous_flags`에 기록 |
| V4 | `sequence_simple`의 마지막 라벨이 `CL`이면 `passage_structure_pattern`에 `INFO_TO_CONCL` 또는 `CLASSICAL_ARG` 포함 | 경고 |
| V5 | `answer_cp_refs`의 모든 번호가 `cps` 범위 내 | 오류 → 재확인 |
| V6 | `distractor_traps`의 키가 정답 외 선택지(`A`~`D` 중 정답 제외) 포함 | 경고 |

---

## 8. 파일럿 태깅 기준 (샘플 검증)

본격 분석 전 아래 조건을 만족하는 파일럿 세트로 라벨 체계를 검증한다.

- 최소 샘플: **30개 지문**
- 소스: College Board 공식 PT 1~5에서 균등 추출
- Passage Type 비율: `ARG` 40% / `EXP` 50% / `LIT` 10%
- 검증 방법: 동일 지문 두 번 태깅 후 `sequence_simple` 일치율 95% 이상 목표
- 불일치 발생 시: 해당 판별 규칙을 이 문서에 추가

---

## 9. 가설 추적표

| ID | 가설 | 검증 Phase | 상태 |
|----|------|-----------|------|
| H01 | EXP 지문의 80% 이상이 `I-I-…` 또는 `I-I-…-CL` 시퀀스 | Phase 1 | 미검증 |
| H02 | ARG 지문에서 `I-C-I-CL` 또는 `I-C-CL` 패턴이 Top 3 안에 | Phase 1 | 미검증 |
| H03 | `QT_DETAIL`의 정답 CP는 중간부(2번째~(n-1)번째)에 위치 | Phase 2 | 미검증 |
| H04 | `QT_INFER`의 정답 CP는 항상 마지막 CP | Phase 2 | 미검증 |
| H05 | `QT_CROSS`는 두 지문 모두 `C`를 최소 1개 이상 포함 | Phase 2 | 미검증 |
| H06 | `QT_COE_TEXT`에서 `TRAP_EXTRA`와 `TRAP_PARTIAL`이 오답의 60% 이상 차지 | Phase 3 | 미검증 |
| H07 | `TRAP_PERSP`는 `ARG` 지문(`C_ot` 포함)에서만 나타남 | Phase 3 | 미검증 |
| H08 | `TRAP_SCOPE`는 `EXP_CL` 지문에서 집중 출제 | Phase 3 | 미검증 |
| H09 | `COUNTER_REBUTTAL` 구조 지문에서 `TRAP_PERSP` + `TRAP_TONE` 조합이 집중 | Phase 3 | 미검증 |
| H10 | CP가 6개 이상인 지문에서 `TRAP_MINOR`와 `TRAP_PARTIAL`이 많음 | Phase 3 | 미검증 |

---

## 10. 에이전트 실행 체크리스트

태깅 작업 시작 전 확인:

- [ ] 지문 원문 전체 수신 확인
- [ ] 문제 지문·선택지·정답 수신 확인
- [ ] STEP 2: Passage Type 결정 후 기록
- [ ] STEP 3: CP 분절 완료 (cp_count 확인)
- [ ] STEP 4: 각 CP Decision Tree 통과 → 라벨 부여
- [ ] STEP 5: sequence_full / sequence_simple 생성
- [ ] STEP 5: passage_structure_pattern 자동 매핑
- [ ] STEP 6: V1~V6 검증 통과
- [ ] STEP 6: ambiguous_flags 없으면 저장 / 있으면 플래그 후 저장
- [ ] (배치) 30개 완료 → Phase 1 실행 가능 여부 확인

---

*Schema version: 1.0*  
*Last updated: 2026-04-29*  
*Owner: Argonaut AI / SuperfastSAT*
