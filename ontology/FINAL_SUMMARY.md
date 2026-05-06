# SAT RW 논리 작업 온톨로지 — 최종 요약

**완료일**: 2026-04-18  
**분석 문제 수**: 223개 귀납 분석 → 1,511개 전체 적용  
**상태**: 카테고리 확정 + 전체 분류 완료 + 오류 패턴 초안 완성

---

## 핵심 발견: 7개 논리 작업 카테고리

SAT RW의 모든 문제는 독자에게 정확히 하나의 논리적 조작을 요구한다.

| # | 카테고리 | 조작 | 문제 수 | 비율 | 해당 CB Skill |
|---|---------|------|--------|------|-------------|
| 1 | **NAME** | 텍스트가 확립한 역할/관계/목적에 올바른 레이블 부여 | 585 | 38.7% | WiC, Transitions, TSP, CID(목적형) |
| 2 | **APPLY** | 문법/구두점 규칙 적용 | 349 | 23.1% | Boundaries, FSS |
| 3 | **VALIDATE** | 주장을 직접 지지/약화하는 증거 선택 | 203 | 13.4% | COE |
| 4 | **BUILD** | 노트에서 수사적 목표를 달성하는 문장 선택 | 178 | 11.8% | RS |
| 5 | **INFER** | 전제에서 가장 논리적으로 도출되는 결론 완성 | 108 | 7.1% | Inferences |
| 6 | **RECONCILE** | 두 텍스트 간 논리적 관계 식별 | 55 | 3.6% | CXC |
| 7 | **RETRIEVE** | 텍스트에 명시된 사실 위치 파악 | 33 | 2.2% | CID(사실형) |

**총계**: 1,511문제, UNKNOWN 0개 (MECE 달성)

---

## RW 3단계 세계관

Math의 3단계(Coherence → Construction → Calculation)에 대응하는 RW 프레임워크:

```
1단계 분류 (Classify)
  "이 문제는 어떤 논리적 조작을 요구하는가?"
  → 7개 카테고리 중 하나 식별

2단계 조작 (Operate)
  해당 카테고리의 논리 작업 수행
  - NAME: 텍스트 내 역할/관계를 먼저 확인, 레이블 찾기
  - APPLY: 주어/경계 먼저 파악, 규칙 기계적 적용
  - VALIDATE: 주장 먼저 분리, 증거의 직접성 판단
  - BUILD: 수사적 목표 분해, 목표 충족 여부 체크
  - INFER: 전제 목록 확인, 전제가 지지하는 범위만 결론
  - RECONCILE: 각 텍스트 입장 별도 파악, 관계 레이블 부여
  - RETRIEVE: 텍스트에서 직접 서술 구절 위치 확인

3단계 검증 (Verify)
  오류 패턴 체크리스트로 선택지 재검토
  - NAME: 이 레이블이 이 맥락의 역할인가? (EP-N1)
  - VALIDATE: "관련됨"이 아닌 "직접 지지"인가? (EP-V1)
  - INFER: 전제 범위를 넘어서지 않는가? (EP-I1)
  (→ 전체 오류 패턴: ontology/error_patterns.md)
```

---

## 핵심 통찰

### 1. College Board Skill ≠ 논리적 작업 카테고리
CB의 10개 스킬은 테스트 설계 편의를 위한 분류. 논리 작업 단위가 아님.
- CID 하나의 스킬이 NAME + RETRIEVE 두 카테고리로 분리됨
- Inferences가 WiC와 같은 표면 스템 공유 ("most logically completes")

### 2. 표면 스템이 같아도 카테고리가 다름
같은 질문 문장이 다른 논리 작업을 요구할 수 있음:
- "Which choice most logically completes the text?" → NAME(단어/구 채우기) 또는 INFER(명제 완성)
- "Which choice most effectively uses data to complete...?" → VALIDATE (주장-증거 관계)

구분 기준: 빈칸에 들어갈 내용의 입도(granularity)

### 3. INFER ↔ VALIDATE는 역방향 관계
- INFER: 증거 → 결론 (무엇이 도출되는가?)
- VALIDATE: 주장 → 증거 (무엇이 지지하는가?)
같은 논리 역량의 두 방향. 방향 혼동이 주요 오류 원인.

### 4. NAME이 가장 큰 카테고리 (38.7%)
4개 CB 스킬(WiC + Transitions + TSP + CID-purpose)이 동일한 논리 작업으로 수렴.
공통 약점이 있다면 전체 점수에 가장 큰 영향을 미침.

### 5. BUILD만 외부 정보 사용
나머지 6개 카테고리는 주어진 텍스트 내에서 작업.
BUILD만 "노트"라는 외부 입력을 처리. 유일하게 구성적(constructive) 성격.

---

## 산출 파일

| 파일 | 내용 |
|------|------|
| `ontology/category_draft.md` | 7개 카테고리 상세 정의, MECE 검증 |
| `ontology/analysis_log.md` | Round 1-4 분석 과정 로그 |
| `ontology/error_patterns.md` | 카테고리별 오류 패턴 (EP-N1 ~ EP-A5) |
| `ontology/all_questions_categorized.jsonl` | 1,511문제 전체 카테고리 태깅 결과 |
| `ontology/category_summary.json` | 분포 통계 + Skill×Category 매트릭스 |
| `scripts/ontology/apply_categories.mjs` | 분류 스크립트 (재실행 가능) |

---

## 다음 단계 제안

1. **오류 패턴 데이터 검증**: 실제 학생 오답 데이터로 EP 코드 적용 테스트
2. **진단 테스트 스키마 확장**: `diagnostic_test_results`에 category/error_pattern 필드 추가
3. **AI 해설 시스템**: 오류 패턴 기반 개인화 피드백 프롬프트 구축
4. **Wrong Answer 태깅**: `derive_wrong_answer_schema.py`에 EP 코드 연동
