# SAT 온톨로지 파이프라인 — antigravity 핸드오프 문서

## 프로젝트 목적

SuperfastSAT의 SAT 문항 온톨로지 시스템 구축.
수십년 강사 노하우를 구조화된 데이터로 추출하여 5가지 use case에 활용:
1. 블로그 통계
2. 개념 추출
3. 설명 생성
4. 유사 문제 생성
5. 고급 문제 생성

---

## 현재 상태 (2026-04-03 기준)

### 완료된 작업

| 항목 | 내용 |
|------|------|
| 통합 스키마 | `src/app/api/ontology/schema.ts` |
| 기존 마이그레이션 | `ontology/transitions.jsonl` (161), `ontology/wic.jsonl` (226) |
| 마스터 마이그레이션 | `ontology/master_unified.jsonl` (1,174) |
| PDF 추출 (1차) | Boundaries(129), FSS(129), Rhetorical Synthesis(115), TSP(102) |
| KG 보강 | 전체 파일 knowledge_graph 3개 이상 필드 |
| 최종 병합 | `master_sat_ontology_v2.jsonl` (1,444문항) |

### 현재 갭

**`master_sat_ontology_v2.jsonl` 기준:**
- 전체: 1,444문항
- analysis 있음: 830문항 (57%)
- **analysis 없음: 614문항 (43%)** ← 이게 남은 작업

스킬별 analysis 누락 현황:
```
193  Information and Ideas Command of Evidence       ← PDF 새로 추가됨
 94  Information and Ideas Central Ideas and Details ← PDF 새로 추가됨
 93  Information and Ideas Inferences                ← PDF 새로 추가됨
 57  Standard English Conventions Boundaries         ← 1차 추출 누락분
 51  Expression of Ideas Rhetorical Synthesis        ← 1차 추출 누락분
 49  Craft and Structure Cross-Text Connections      ← PDF 새로 추가됨
 46  Standard English Conventions Form, Structure, and Sense ← 1차 추출 누락분
 26  Craft and Structure Text Structure and Purpose  ← 1차 추출 누락분
  5  Craft and Structure Words in Context            ← 1차 추출 누락분
```

### 새로 추가된 PDF (미처리)

`blog_database/`에 새로 추가됨 — 아직 추출 안 됨:

| 파일 | 예상 문항 |
|------|---------|
| `central ideas and details_easy_33.pdf` | 33 |
| `central ideas and details_medium_45.pdf` | 45 |
| `central ideas and details_hard_38.pdf` | 38 |
| `command of evidence_easy_70.pdf` | 70 |
| `command of evidence_medium_77.pdf` | 77 |
| `command of evidence_hard_98.pdf` | 98 |
| `cross-text connections_easy_16.pdf` | 16 |
| `cross-text connections_medium_19.pdf` | 19 |
| `cross-text connections_hard_19.pdf` | 19 |
| `inference_easy_20.pdf` | 20 |
| `inference_medium_40.pdf` | 40 |
| `inference_hard_57.pdf` | 57 |
| **합계** | **~532문항** |

---

## 남은 작업 (우선순위 순)

### TASK 1: 신규 4스킬 PDF 추출

`scripts/ontology/extract_pdfs.mjs`에 신규 스킬 추가 후 실행.

**추가할 스킬 설정:**

```javascript
'Information and Ideas Central Ideas and Details': {
  outFile: 'central_ideas.jsonl',
  pdfs: [
    { file: 'central ideas and details_easy_33.pdf', difficulty: 'Easy', expectedCount: 33 },
    { file: 'central ideas and details_medium_45.pdf', difficulty: 'Medium', expectedCount: 45 },
    { file: 'central ideas and details_hard_38.pdf', difficulty: 'Hard', expectedCount: 38 },
  ],
  analysisFields: `
    - main_idea_location (e.g., "Opening sentence", "Concluding sentence", "Implicit")
    - detail_function (e.g., "Supporting evidence", "Counterexample", "Elaboration")
    - passage_topic (e.g., "Science", "History", "Literature", "Social Science")`,
  analysisSchema: `{"main_idea_location": "", "detail_function": "", "passage_topic": ""}`,
},

'Information and Ideas Command of Evidence': {
  outFile: 'command_of_evidence.jsonl',
  pdfs: [
    { file: 'command of evidence_easy_70.pdf', difficulty: 'Easy', expectedCount: 70 },
    { file: 'command of evidence_medium_77.pdf', difficulty: 'Medium', expectedCount: 77 },
    { file: 'command of evidence_hard_98.pdf', difficulty: 'Hard', expectedCount: 98 },
  ],
  analysisFields: `
    - evidence_type (e.g., "Textual", "Quantitative/Data")
    - reasoning_pattern (e.g., "Strengthen claim", "Weaken claim", "Illustrate finding", "Identify data point")
    - passage_topic (e.g., "Science", "History", "Literature", "Social Science")`,
  analysisSchema: `{"evidence_type": "", "reasoning_pattern": "", "passage_topic": ""}`,
},

'Craft and Structure Cross-Text Connections': {
  outFile: 'cross_text.jsonl',
  pdfs: [
    { file: 'cross-text connections_easy_16.pdf', difficulty: 'Easy', expectedCount: 16 },
    { file: 'cross-text connections_medium_19.pdf', difficulty: 'Medium', expectedCount: 19 },
    { file: 'cross-text connections_hard_19.pdf', difficulty: 'Hard', expectedCount: 19 },
  ],
  analysisFields: `
    - relationship_type (e.g., "Agree", "Disagree", "Extend", "Qualify")
    - text_focus (e.g., "Text 1 claims X, Text 2 responds with Y")
    - passage_topic (e.g., "Science", "History", "Literature", "Social Science")`,
  analysisSchema: `{"relationship_type": "", "text_focus": "", "passage_topic": ""}`,
},

'Information and Ideas Inferences': {
  outFile: 'inferences.jsonl',
  pdfs: [
    { file: 'inference_easy_20.pdf', difficulty: 'Easy', expectedCount: 20 },
    { file: 'inference_medium_40.pdf', difficulty: 'Medium', expectedCount: 40 },
    { file: 'inference_hard_57.pdf', difficulty: 'Hard', expectedCount: 57 },
  ],
  analysisFields: `
    - inference_basis (e.g., "Explicit statement", "Implicit contrast", "Author tone", "Logical consequence")
    - reasoning_type (e.g., "Deductive", "Inductive", "Analogical")
    - passage_topic (e.g., "Science", "History", "Literature", "Social Science")`,
  analysisSchema: `{"inference_basis": "", "reasoning_type": "", "passage_topic": ""}`,
},
```

실행:
```bash
OPENAI_API_KEY=$(grep OPENAI_API_KEY .env.local | cut -d= -f2) \
node scripts/ontology/extract_pdfs.mjs
```

---

### TASK 2: 기존 4스킬 2차 추출 (누락분 보완)

1차에서 누락된 문항들 재시도. progress 파일 삭제 후 재실행:

```bash
rm ontology/boundaries_progress.json
rm ontology/form_structure_sense_progress.json
rm ontology/rhetorical_synthesis_progress.json
rm ontology/text_structure_purpose_progress.json

OPENAI_API_KEY=$(grep OPENAI_API_KEY .env.local | cut -d= -f2) \
node scripts/ontology/extract_pdfs.mjs "Boundaries" "Form" "Rhetorical" "Text Structure"
```

---

### TASK 3: PDF 없는 기존 마스터 항목 analysis 생성

`master_sat_ontology_v2.jsonl`에서 `analysis == null`인 항목들을 GPT-4o로 생성.

**전략:**
- 각 문항의 passage + question + choices + rationale를 주고
- 스킬별 analysis 스키마에 맞게 생성 요청
- 배치 처리 (20문항씩)

**스크립트 위치:** `scripts/ontology/generate_missing_analysis.mjs` (아직 미작성, antigravity가 작성)

입력 필터:
```python
entries_needing_analysis = [e for e in entries if not e.get('analysis')]
# 총 614개 → 신규 PDF 처리 후에는 줄어들 것
```

---

### TASK 4: 정규화 + KG 보강 + 최종 병합

새 파일들 처리 후:

```bash
# 1. 새 파일 정규화
python3 scripts/ontology/normalize_pdf_extractions.py

# 2. KG 보강
python3 scripts/ontology/enrich_knowledge_graph.py

# 3. 최종 병합 (master_sat_ontology_v2.jsonl 업데이트)
python3 scripts/ontology/merge_corpus.py

# 4. 품질 검증 (Claude Code가 작성해둔 스크립트)
python3 scripts/ontology/validate_corpus.py
```

**TASK 4 완료 기준:** validate_corpus.py 결과가 FAIL 0개여야 함.

### ⚠️ 중요: error_type 값 규칙

Claude Code가 validate_corpus.py를 실행해서 발견한 사실:
기존 FSS(Form, Structure, and Sense) 127개 항목이 **human-readable** error_type 사용 중 (예: `"Agreement error"`, `"Tense error"`).

antigravity가 새로 생성하는 analysis는 반드시 **snake_case taxonomy** 값만 사용해야 함:
- ❌ `"Agreement error"` → ✅ `"number_agreement"`
- ❌ `"Tense error"` → ✅ `"tense_inconsistency"`
- ❌ `"Modifier placement error"` → ✅ `"dangling_modifier"`
- ❌ `"Possessive error"` → ✅ `"possessive_error"`
- ❌ `"Verb form error"` → ✅ `"wrong_verb_form"`

각 스킬의 허용 값은 아래 "스킬별 analysis 스키마" 섹션의 `error_type` 목록 참고.

### 알려진 데이터 결함

- `id=b0620764`: choices C, D 누락 (원본 PDF 추출 오류). TASK 3 처리 시 skip 권장.

---

## 파일 구조

```
/mnt/c/vibecoding/landing_2512/
├── blog_database/                    ← 원본 PDF 30개 (18 기존 + 12 신규)
│   ├── *.pdf
│   ├── transitions_master.jsonl     ← 기존 추출 데이터
│   └── words_in_context_master.jsonl
├── ontology/                         ← 처리된 JSONL 파일들
│   ├── master_unified.jsonl         (1,174)
│   ├── transitions.jsonl            (161)
│   ├── wic.jsonl                    (226)
│   ├── boundaries.jsonl             (129)
│   ├── form_structure_sense.jsonl   (129)
│   ├── rhetorical_synthesis.jsonl   (115)
│   └── text_structure_purpose.jsonl (102)
├── master_sat_ontology_v2.jsonl     ← 현재 최종본 (1,444문항)
├── master_sat_ontology.jsonl        ← 원본 (건드리지 말 것)
├── scripts/ontology/
│   ├── extract_pdfs.mjs             ← PDF→JSONL (OpenAI API 사용)
│   ├── migrate_blog_db.py           ← blog_database 마이그레이션
│   ├── migrate_master.py            ← master 마이그레이션
│   ├── normalize_pdf_extractions.py ← raw→unified 형식 변환
│   ├── enrich_knowledge_graph.py    ← KG 필드 보강
│   └── merge_corpus.py              ← 전체 병합 + 중복제거
└── src/app/api/ontology/
    └── schema.ts                    ← TypeScript 통합 스키마
```

---

## 통합 스키마 (unified format)

```json
{
  "id": "8자리 hex",
  "test": "SAT",
  "domain": "Reading and Writing",
  "skill": "CB 공식 스킬명",
  "difficulty": "Easy | Medium | Hard",
  "passage": "지문 전체",
  "question": "질문 텍스트",
  "choices": { "A": "", "B": "", "C": "", "D": "" },
  "correct_answer": "A | B | C | D",
  "rationale": "정답 해설",
  "knowledge_graph": {
    "parent_concept": "상위 개념",
    "prerequisite": "선행 개념",
    "concept_tags": ["태그1", "태그2"],
    "passage_topic": "Science | History | Literature | Social Science | ..."
  },
  "analysis": { /* 스킬별 상이 — 아래 참조 */ },
  "source": "원본 파일명"
}
```

---

## 스킬별 analysis 스키마 (최종 확정)

> **설계 원칙**: CB 공식 rationale 텍스트에서 역산하여 도출.
> 모든 스킬에 `wrong_answer_analysis` + `student_trap` 추가.
> `wrong_answer_analysis`는 **오답 선택지만** 포함 (정답 제외).

### 공통 구조
```json
{
  "...스킬별 고유 필드들...",
  "passage_topic": "Science | History | Literature | Social Science | Technology | Arts",
  "wrong_answer_analysis": {
    "A": { "error_type": "...", "trap": "학생이 이걸 고르는 이유" },
    "C": { "error_type": "...", "trap": "..." }
  },
  "student_trap": "이 문항 유형에서 가장 흔한 실수 패턴 한 문장"
}
```

---

### Transitions
```json
{
  "target_transition_category": "Contrast | Cause and effect | Addition | Exemplification | Sequence | Elaboration",
  "sentence_1_summary": "blank 앞 내용 요약",
  "sentence_2_summary": "blank 뒤 내용 요약",
  "passage_topic": "...",
  "wrong_answer_analysis": {
    "오답 선택지": {
      "error_type": "addition_trap | contrast_trap | causal_trap | sequence_trap | example_trap | paraphrase_trap",
      "trap": "예: 'Moreover'는 단순 추가처럼 보이지만 실제 관계는 결과임"
    }
  },
  "student_trap": "예: 두 문장이 인과처럼 보이지만 실제로는 대조 관계"
}
```
**오답 유형**: `addition_trap` · `contrast_trap` · `causal_trap` · `sequence_trap` · `example_trap` · `paraphrase_trap`

---

### Words in Context
```json
{
  "target_word_pos": "Noun | Verb | Adjective | Adverb | Phrase",
  "passage_logical_flow": "Contrast | Cause and effect | Exemplification | Elaboration",
  "passage_topic": "...",
  "synonyms_for_correct_answer": ["동의어1", "동의어2"],
  "wrong_answer_analysis": {
    "오답 선택지": {
      "error_type": "wrong_denotation | near_synonym_trap | wrong_connotation | out_of_scope",
      "trap": "예: 'endure'는 일반적 의미는 비슷하지만 이 문맥에서는 대상이 맞지 않음"
    }
  },
  "student_trap": "예: 정답과 비슷한 뜻의 단어를 문맥 확인 없이 선택"
}
```
**오답 유형**: `wrong_denotation` · `near_synonym_trap` · `wrong_connotation` · `out_of_scope`

---

### Cross-Text Connections
```json
{
  "relationship_type": "Agree | Disagree | Extend | Qualify",
  "text_focus": "Text 1 주장 vs Text 2 반응 한 줄 요약",
  "passage_topic": "...",
  "wrong_answer_analysis": {
    "오답 선택지": {
      "error_type": "unsupported_inference | not_in_text | wrong_text_source | too_extreme | recycles_language",
      "trap": "예: Text 2에 언급이 없는 내용인데 Text 1 단어를 재활용해 그럴듯해 보임"
    }
  },
  "student_trap": "예: 한 텍스트에만 있는 정보를 두 텍스트 공통 입장으로 오해"
}
```
**오답 유형**: `unsupported_inference` · `not_in_text` · `wrong_text_source` · `too_extreme` · `recycles_language`

---

### Text Structure and Purpose
```json
{
  "structure_pattern": "Problem-solution | Compare-contrast | Cause-effect | Chronological | Descriptive | Argumentative",
  "author_purpose": "Describe | Argue | Analyze | Narrate | Illustrate",
  "passage_topic": "...",
  "wrong_answer_analysis": {
    "오답 선택지": {
      "error_type": "introduces_absent_element | too_narrow | too_broad | misidentifies_structure | wrong_author_purpose",
      "trap": "예: 텍스트에 없는 '실험'을 구조에 포함시켜 그럴듯해 보임"
    }
  },
  "student_trap": "예: 세부 사항(detail)을 전체 구조(main structure)로 오해"
}
```
**오답 유형**: `introduces_absent_element` · `too_narrow` · `too_broad` · `misidentifies_structure` · `wrong_author_purpose`

---

### Rhetorical Synthesis
```json
{
  "synthesis_task": "Support a claim | Introduce a quotation | Describe data | Compare findings | Emphasize sequence | Highlight contrast",
  "rhetorical_purpose": "Argue | Inform | Analyze",
  "passage_topic": "...",
  "wrong_answer_analysis": {
    "오답 선택지": {
      "error_type": "wrong_emphasis | incomplete_task | wrong_task | missing_required_info | factually_wrong_order",
      "trap": "예: 소재는 맞지만 '순서 강조' 대신 '사실 나열'로 과제를 수행"
    }
  },
  "student_trap": "예: 내용은 맞는데 문제가 요구한 수사적 목적(rhetorical goal)을 놓침"
}
```
**오답 유형**: `wrong_emphasis` · `incomplete_task` · `wrong_task` · `missing_required_info` · `factually_wrong_order`

---

### Central Ideas and Details
```json
{
  "main_idea_location": "Opening sentence | Concluding sentence | Distributed | Implicit",
  "detail_function": "Supporting evidence | Counterexample | Elaboration | Background",
  "passage_topic": "...",
  "wrong_answer_analysis": {
    "오답 선택지": {
      "error_type": "contradicts_text | out_of_scope | too_narrow | misattributes_claim | wrong_focus",
      "trap": "예: 텍스트의 일부 사실을 전체 중심 내용으로 일반화"
    }
  },
  "student_trap": "예: 지문에서 인상적인 세부 사항을 중심 내용으로 오해"
}
```
**오답 유형**: `contradicts_text` · `out_of_scope` · `too_narrow` · `misattributes_claim` · `wrong_focus`

---

### Command of Evidence
```json
{
  "evidence_type": "Textual | Quantitative",
  "reasoning_pattern": "Strengthen claim | Weaken claim | Illustrate finding | Identify data point",
  "passage_topic": "...",
  "wrong_answer_analysis": {
    "오답 선택지": {
      "error_type": "misreads_data | wrong_direction | irrelevant_evidence | partial_support | wrong_variable",
      "trap": "예: 그래프 수치를 잘못 읽어 반대 결론을 지지하는 선택지 선택"
    }
  },
  "student_trap": "예: 연구 질문과 '관련된' 증거를 '직접 지지하는' 증거로 혼동"
}
```
**오답 유형**: `misreads_data` · `wrong_direction` · `irrelevant_evidence` · `partial_support` · `wrong_variable`

---

### Inferences
```json
{
  "inference_basis": "Explicit statement | Implicit contrast | Author tone | Logical consequence",
  "reasoning_type": "Deductive | Inductive | Analogical",
  "passage_topic": "...",
  "wrong_answer_analysis": {
    "오답 선택지": {
      "error_type": "overreach | not_in_text | confuses_elements | reversal | too_specific",
      "trap": "예: 텍스트가 언급한 A와 유사하지만 다른 B를 혼동"
    }
  },
  "student_trap": "예: 텍스트가 지지하는 것보다 한 단계 더 나간 결론 선택"
}
```
**오답 유형**: `overreach` · `not_in_text` · `confuses_elements` · `reversal` · `too_specific`

---

### Boundaries
```json
{
  "boundary_rule": "No punctuation between subject and verb | Semicolon joins independent clauses | Colon after independent clause | ...",
  "clause_type": "Independent clause | Dependent clause | Noun phrase | Supplementary phrase",
  "passage_topic": "...",
  "wrong_answer_analysis": {
    "오답 선택지": {
      "error_type": "comma_splice | run_on | fragment | unnecessary_punctuation | wrong_junction_type",
      "trap": "예: 세미콜론을 독립절-보충구 사이에 사용 (독립절-독립절에만 가능)"
    }
  },
  "student_trap": "예: 절 유형을 구분하지 않고 구두점 규칙 적용"
}
```
**오답 유형**: `comma_splice` · `run_on` · `fragment` · `unnecessary_punctuation` · `wrong_junction_type`

---

### Form, Structure, and Sense
```json
{
  "grammar_concept": "Subject-verb agreement | Verb tense | Dangling modifier | Pronoun agreement | Parallelism | Possessive",
  "error_type": "dangling_modifier | tense_inconsistency | number_agreement | wrong_verb_form | possessive_error | pronoun_case_error",
  "passage_topic": "...",
  "wrong_answer_analysis": {
    "오답 선택지": {
      "error_type": "dangling_modifier | tense_inconsistency | number_agreement | wrong_verb_form | possessive_error | pronoun_case_error",
      "trap": "예: 분사구문 뒤 주어가 수식 대상이 아닌 엉뚱한 명사여서 dangling modifier 발생"
    }
  },
  "student_trap": "예: 문장 전체 시제 흐름을 보지 않고 개별 동사 형태만 판단"
}
```
**오답 유형**: `dangling_modifier` · `tense_inconsistency` · `number_agreement` · `wrong_verb_form` · `possessive_error` · `pronoun_case_error`

---

## 환경 설정

```bash
# OpenAI API 키
OPENAI_API_KEY=.env.local 파일에 있음

# Python 버전
python3 --version  # 3.12.3

# Node 버전
node --version  # v24.14.0

# 의존성
node_modules/openai  ← 이미 설치됨
node_modules/canvas  ← 이미 설치됨 (PDF 렌더링용, 현재 미사용)
```

---

## 주의사항

- `master_sat_ontology.jsonl` — 원본, **수정 금지**
- `master_sat_ontology_v2.jsonl` — 현재 최종본, 작업 완료 후 업데이트
- PDF 추출 시 OpenAI Files API 사용 (upload → batch 처리 → delete)
- progress 파일 (`*_progress.json`) — 중단/재시작 추적용, 재시도 시 삭제
- 중복 ID는 merge_corpus.py가 자동 처리 (master_unified 우선순위)
