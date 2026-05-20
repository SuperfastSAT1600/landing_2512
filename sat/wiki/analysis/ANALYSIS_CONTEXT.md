# SAT RW 지문 분석 작업 컨텍스트

> 작성일: 2026-04-29  
> 작업 디렉토리: `C:/vibecoding/landing_2512/blog_database/`

---

## 프로젝트 목표

College Board Question Bank의 SAT RW 문제 **1,609개**(기존 1,511 + 신규 98)의 지문을 분석해서:

1. **지문 구조 패턴** — 출제자가 어떤 논리 흐름으로 지문을 구성하는지 파악
2. **오답 유형 패턴** — 각 구조에서 어떤 함정이 반복되는지 파악
3. 두 가지를 연결해 **"이 구조의 지문에는 이런 오답이 나온다"** 는 예측 모델 구축

---

## 데이터 출처 표기 규칙

- 문제 출처: **College Board Question Bank** (SuperfastSAT이 분석)
- 절대 "SuperfastSAT 문제 데이터베이스"라고 표기하지 말 것
- 표기 형식: `College Board Question Bank — RW 전체, SuperfastSAT 분석 (2026)`

---

## 완료된 작업

### 1. 신규 98개 파싱 (`qb_rw_98_parsed.jsonl`)
- 파일: `260414 QB RW_98.pdf` (116페이지, 1문제/페이지)
- 스크립트: `vision_extractor_rw98.py`
- GPT-4o Vision으로 페이지별 파싱, question_id 기준 중복 제거
- 결과: 98개 문제 (Rhetorical Synthesis 10개 포함)

### 2. 토픽 8개 카테고리 재분류

기존 1,511개 + 신규 98개 모두 적용:

| 카테고리 | 설명 |
|----------|------|
| Literature | 소설, 시, 단편, 문학비평 |
| History | 역사적 사건, 인물, 사회운동 |
| Social Science | 경제, 심리, 사회학, 인류학 |
| Life Science | 생물학, 생태학, 의학, 신경과학 |
| Physical Science | 물리학, 화학, 천문학 |
| Earth & Environment | 지질학, 기후, 환경과학 |
| Technology & Engineering | 공학, 컴퓨터, 발명 |
| Art & Music | 미술, 음악, 건축, 공연예술 |

### 3. master_sat_ontology_v3.jsonl 생성
- 위치: `../master_sat_ontology_v3.jsonl`
- 구성: Math 113 + RW 기존 1,511 + RW 신규 98 = **1,722개**
- 추가 필드: `topic_category`, `date_added`
  - 기존 문제: `date_added: "2026-03-01"`
  - 신규 98개: `date_added: "2026-04-14"`

### 4. 지문 구조 분석 — CP 라벨링 v1 (14-label, 폐기됨)

> ⚠️ 이 결과는 폐기됨. PIVOT 오분류, BACKGROUND 혼재 등 품질 문제로 v2로 대체.

기존 14-label 시스템은 `_legacy` 보관용으로만 유지:
- `baseline_passage_structure_v3.jsonl` — 참고용 보관
- `function_label_mapping_v2.json` — 참고용 보관

---

### 5. 지문 구조 분석 — CP 라벨링 v2 (I/C/CL 시스템, 현행, 2026-04-29 완료)

**신규 라벨 체계** (`cp_sequence_analysis_agent.md` 기반):

| 라벨 | 의미 |
|------|------|
| `ARG` | Passage Type: 저자/인용 주체가 특정 입장 옹호·비판·분석 |
| `EXP` | Passage Type: 사실·과정·정의·인과 설명, 가치 판단 없음 |
| `LIT` | Passage Type: 소설·시·단편 발췌, 서사·인물·감정 중심 |
| `I` | CP Role: Information — 사실·배경·데이터·정의 (접미사: _bg/_sup/_ex) |
| `C` | CP Role: Claim — 주장·평가·옹호·비판 (접미사: _au/_ot/_ct/_rb) |
| `CL` | CP Role: Conclusion — 지문 최종 귀결, 앞 내용 종합 |

**Connector Types**: `CONN_ADD` / `CONN_CONT` / `CONN_CAUSE` / `CONN_COMP` / `CONN_EMPH` / `CONN_SEQ` / `CONN_EX` / `CONN_NONE`

**Passage Structure Patterns** (sequence_simple에서 자동 도출):
`PURE_INFO` / `INFO_TO_CONCL` / `CLAIM_EVIDENCE` / `CLASSICAL_ARG` / `COUNTER_REBUTTAL` / `DUAL_CLAIM` / `NARRATIVE_CONCL`

**분석 제외**: Rhetorical Synthesis (bullet-point 형식, 선형 구조 없음)

**파이프라인:**
```
cp_analyzer.py baseline --headless  →  baseline_cp_analysis.jsonl (1,319개)
cp_analyzer.py new --headless       →  qb_rw_98_cp_analysis.jsonl (88개)
cp_reviewer.py all                  →  품질 검증 (전체 통과)
```

**완료 파일:**
- `baseline_cp_analysis.jsonl` — **1,319개** (기존 1,511 - RS 178 - 에러 14)
- `qb_rw_98_cp_analysis.jsonl` — **88개** (신규 98 - RS 10)
- 총 **1,407개** CP 라벨링 완료

**품질 검증 결과 (cp_reviewer.py all):**

| 검증 항목 | 기준 | 결과 |
|-----------|------|------|
| Top 15 시퀀스 커버리지 | >= 50% | **69.9%** PASS |
| ARG + EXP 모두 존재 | O | PASS |
| 검증 실패 비율 | < 5% | **0.2%** PASS |
| Ambiguous 비율 | < 10% | **0.0%** PASS |

**시퀀스 다양성 개선:**
- 구 시스템: 고유 시퀀스 976개, Top 20 커버리지 ~21%
- 신 시스템: 고유 시퀀스 **176개**, Top 15 커버리지 **69.9%** (대폭 개선)

**레코드 스키마:**
```json
{
  "id": "22a41819",
  "skill": "...",
  "difficulty": "Hard",
  "passage": "...",
  "passage_type": "ARG",
  "cp_count": 4,
  "cps": [
    {"text": "...", "label": "C", "label_full": "C_au", "connector_to_next": "CONN_CONT"}
  ],
  "sequence_full": "ARG_C_au-I-I_sup-CL",
  "sequence_simple": "ARG_C-I-I-CL",
  "passage_structure_pattern": "CLAIM_EVIDENCE"
}
```

### 6. 오답 유형 분류 (`wrong_answer_patterns.jsonl`)

스크립트: `analyze_wrong_answers.py`  
입력: `rationale` 필드에서 "Choice X is incorrect..." 텍스트 파싱  
결과: **3,528개** 오답 케이스 분류 완료

**8개 오답 유형 분포:**

| 유형 | 비율 | 의미 |
|------|------|------|
| Partial match | 27.4% | 조건 일부만 충족 |
| Out of scope | 21.7% | 지문에 없는 내용 |
| Contradiction | 17.0% | 지문과 반대 |
| Distortion | 12.0% | 단어는 맞는데 의미 왜곡 |
| Misattribution | 10.8% | 주체/대상이 틀림 |
| Pre-pivot reading | 5.4% | but/however 앞 내용을 정답으로 오독 |
| Overgeneralization | 3.3% | 지문보다 넓게 주장 |
| Degree error | 2.4% | 강도/범위가 너무 강하거나 약함 |

**Skill별 핵심 오답 패턴:**
- Transitions → **Pre-pivot reading 39%** (PIVOT 구조와 직결)
- Words in Context → **Distortion 42%**
- Text Structure & Purpose → **Out of scope 55%**
- Form, Structure & Sense (문법) → **Misattribution 56%**
- Command of Evidence → **Partial match 35%**

---

## 핵심 발견 (Top Patterns) — v2 I/C/CL 시스템 기준

> v1(14-label) 패턴은 폐기됨. 아래는 v2 신규 시스템 결과.

### 전체 1,407개 Top 시퀀스 (v2)
- 고유 시퀀스: **176개** (v1 대비 82% 감소)
- Top 15 커버리지: **69.9%** (v1 Top 20 = 21% 대비 대폭 개선)

### Passage Type 분포
- ARG (논증): 다수
- EXP (설명): 다수
- LIT (문학): 소수

### Passage Structure Pattern 분포
`PURE_INFO` / `INFO_TO_CONCL` / `CLAIM_EVIDENCE` / `CLASSICAL_ARG` / `COUNTER_REBUTTAL` / `DUAL_CLAIM` / `NARRATIVE_CONCL`

### 난이도-시퀀스 상관관계 (재분석 필요)
- v2 기준 재분석 미완료 — 다음 단계에서 진행 예정

---

## SQLite 데이터베이스 (2026-05-02 신규 생성)

### 파일: `sat_questions.db` (10.7 MB)

위의 JSONL 파일들을 **단일 SQLite DB로 통합**한 파일. 조건 기반 쿼리, 진단테스트 생성, 오답 패턴 분석의 핵심 인프라.

빌드 스크립트: `build_sat_db.py` (`--rebuild` 플래그로 재빌드)

#### 테이블 구조

| 테이블 | 행 수 | 역할 |
|--------|-------|------|
| `questions` | 1,609 | 문제 원본 (baseline 1,511 + qb98 98) |
| `cp_analysis` | 1,421 | CP 라벨링 v2 결과 (RS 188개 제외) |
| `passage_structure_v1` | 1,599 | 지문 구조 분석 v1 (참고용) |
| `wrong_answers` | 3,528 | 오답 유형 분류 (1,196 unique questions) |
| `_meta` | — | 빌드 메타데이터 |

#### 주요 인덱스 (쿼리 최적화)
`skill`, `difficulty`, `topic_category`, `passage_topic`, `source_batch`, `(skill, difficulty)` — questions 테이블  
`passage_type`, `cp_count`, `passage_structure_pattern`, `sequence_simple` — cp_analysis 테이블  
`question_id`, `category`, `(skill, category)` — wrong_answers 테이블

#### 대표 쿼리 패턴

```sql
-- 진단테스트 문제 세트 추출 (skill × difficulty)
SELECT id, passage, question, choices, correct_answer
FROM questions q
LEFT JOIN cp_analysis cp ON q.id = cp.question_id
WHERE q.skill = 'Craft and Structure Words in Context'
  AND q.difficulty = 'Medium'
ORDER BY RANDOM() LIMIT 10;

-- 학생 수준별 적응형 정렬 (Easy → Hard)
SELECT id, skill, difficulty FROM questions
WHERE skill = 'Information and Ideas Inferences'
ORDER BY CASE difficulty WHEN 'Easy' THEN 1 WHEN 'Medium' THEN 2 WHEN 'Hard' THEN 3 END;

-- 문제 변형 소재 발굴 (CP-rich ARG 지문)
SELECT q.id, q.skill, cp.cp_count, cp.passage_structure_pattern
FROM questions q JOIN cp_analysis cp ON q.id = cp.question_id
WHERE cp.cp_count >= 4 AND cp.passage_type = 'ARG';

-- 오답 패턴 분석 (Distortion 유형)
SELECT q.id, q.skill, wa.letter, wa.one_line_reason
FROM questions q JOIN wrong_answers wa ON q.id = wa.question_id
WHERE wa.category = 'Distortion';
```

#### JSONL과의 관계
- `sat_questions.db`는 JSONL들의 **읽기 전용 통합 뷰**
- 새 분석 결과는 여전히 JSONL로 먼저 생성 → `build_sat_db.py --rebuild`로 DB 갱신
- 기존 JSONL 파일들은 원본 보존용으로 유지

---

## 파일 목록

| 파일 | 설명 | 레코드 수 |
|------|------|-----------|
| **`sat_questions.db`** | **[PRIMARY] SQLite 통합 DB — 모든 쿼리는 여기서** | **1,609문제** |
| `baseline_rw_reclassified.jsonl` | 기존 RW 문제 + topic_category | 1,511 |
| `qb_rw_98_reclassified.jsonl` | 신규 98개 + topic_category | 98 |
| `baseline_cp_analysis.jsonl` | **[현행]** 기존 CP 라벨링 v2 (I/C/CL) | 1,319 |
| `qb_rw_98_cp_analysis.jsonl` | **[현행]** 신규 CP 라벨링 v2 (I/C/CL) | 88 |
| `cp_checkpoint.json` | cp_analyzer.py 체크포인트 | — |
| `cp_error_log.jsonl` | CP 분석 에러 로그 | ~14 |
| `baseline_passage_structure_v3.jsonl` | [v1 폐기] 기존 + standard_sequence | 1,511 |
| `function_label_mapping_v2.json` | [v1 폐기] function → 14-label 매핑 | 4,957 entries |
| `wrong_answer_patterns.jsonl` | 오답 유형 분류 결과 | 3,528 |
| `../master_sat_ontology_v3.jsonl` | 전체 통합 온톨로지 (Math+RW) | 1,722 |

---

## 다음 단계 (미완료)

### 우선순위 높음
1. **CP sequence × 오답 유형 연결 분석**
   - `baseline_cp_analysis.jsonl`의 `sequence_simple` / `passage_structure_pattern`과
   - `wrong_answer_patterns.jsonl`의 `category`를 `question_id` 기준으로 join
   - 예: "COUNTER_REBUTTAL 패턴 지문에서 Pre-pivot reading 비율이 높은가?" 검증
   - 예: "CLAIM_EVIDENCE 패턴 지문에서 Out of scope 비율이 높은가?" 검증

2. **시퀀스 클러스터링 (선택적)**
   - 현재 Top 15가 69.9% 커버 → 목표 달성, 추가 클러스터링 여부는 사용 목적에 따라 결정
   - 필요시: sequence_simple에서 핵심 패턴 추출 (ARG_C-I vs ARG_I-C 등)

### 우선순위 낮음
3. PostHog 프로덕션 배포 (env var 설정 완료, git push + Vercel redeploy만 남음)

---

## 스크립트 실행 순서 (참고)

```bash
# 1. 신규 파싱
python vision_extractor_rw98.py

# 2. 토픽 재분류
python reclassify_topics.py

# 3. v3 온톨로지 빌드
python build_v3.py

# 4. [v1 폐기] 구조 분석 — 참고용
# python analyze_passage_structure.py
# python cluster_by_function.py
# python apply_mapping_new.py

# 5. CP 라벨링 v2 (I/C/CL 시스템) — 완료 2026-04-29
# python cp_analyzer.py baseline --headless --concurrency 10
# python cp_analyzer.py new --headless --concurrency 10
# python cp_reviewer.py all   <- 품질 검증

# 6. 오답 분류
python analyze_wrong_answers.py

# 7. [다음] CP sequence x 오답 유형 연결 분석 (스크립트 미작성)
```
