# SAT RW 필수 단어 추출 방법론

## 핵심 원칙

일반 빈도 기반 단어장과 다른 점:
- **소스**: 실제 SAT 1,527문제의 CP(Content Point) 라벨링 데이터
- **기준**: 단어가 지문에서 얼마나 자주 나오느냐(빈도)가 아니라, **논증 구조의 어떤 위치에 나오느냐(구조적 위치)**
- **목적**: "이 단어를 모르면 어떤 오답을 고르게 되는가"까지 연결되는 근거 체계

### 포함 대상 단어

| 품사 | 예시 | 이유 |
|---|---|---|
| 동사 | contend, posit, corroborate, refute | 저자가 주장·반박하는 순간을 표현 |
| 명사 | efficacy, supposition, nuisance, confounding | 주장의 핵심 개념 |
| 형용사 | negligible, robust, viable, significant | 주장의 강도·판단 표현 |

### 제외 대상

- 신호어(however, despite, therefore): 뜻을 모르는 것이 아니라 구조적 역할 인식이 문제 → 훈련 재료이지 암기 대상 아님
- 일반 배경 지식 단어(photosynthesis, mitochondria): I_bg 위치에 나오는 도메인 지식 → 논증 구조와 무관
- 불용어(the, a, of, that, is, was...)

---

## CP 라벨 체계 (참고)

```
I_bg   배경 정보 — 주제 도입
I      사실/관찰 정보
C_au   저자 주장 ★ 핵심 위치
C_ot   타인 주장
C_ct   반대 주장 ★ 핵심 위치
C_rb   재반박
CL_au  저자 결론 ★ 핵심 위치
CL_ot  타인 결론
```

★ 표시된 3개 라벨이 단어 추출의 1차 대상

---

## 추출 버전 이력

### v1 — 구조적 위치 기반 (2026-05-01)

**목적**: 논증 핵심 위치(C_au / C_ct / CL_au)에 나오는 단어 전수 추출

**필터 조건**:
1. CP label_full이 `C_au`, `C_ct`, `CL_au`, `C_rb`, `CL_ot` 중 하나
2. 불용어 제거
3. 단어 길이 4자 이상

**가중치 없음** — 위치에 있으면 동등하게 포함

**출력**: `vocab_v1_structural.json`
- 단어별: 출현 횟수, 출현한 CP 라벨 분포, Easy/Medium/Hard 문제 분포

**한계**: Easy 문제의 단순한 주장 문장에 나오는 단어도 포함됨

---

### v2 — Hard 가중치 기반 (예정)

**목적**: v1에서 Hard 문제 비중이 높은 단어 우선 정렬

**추가 필터**:
- Hard 문제에서의 출현 빈도를 Easy 대비 비율로 계산
- Hard_ratio = Hard 출현 / 전체 출현 ≥ 0.4 인 단어 우선

**출력**: `vocab_v2_hard_weighted.json`

---

### v3 — 오답 패턴 역산 연결 (예정)

**목적**: "이 단어가 있는 문장에서 자주 발생하는 오답 유형" 연결

**로직**:
- CP text에 단어 X 포함 → 해당 question_id의 wrong_answer category 조인
- 단어별 top 오답 카테고리 계산

**출력**: `vocab_v3_wrong_anchored.json`
- 단어별: 연관 오답 카테고리 + 비율
- 예: `corroborate` → Pre-Pivot Reading 43%, Misattribution 28%

---

### v4 — LLM 내용 핵심어 보완 (예정)

**목적**: 규칙 기반으로 놓치는 복합 명사구, 도메인 핵심어 추가

**방식**:
- Hard C_au 문장을 GPT에 전달 → "이 문장에서 모르면 이해 불가한 단어 3개"
- v1~v3 결과와 병합, 중복 제거

**예상 비용**: Hard 문제 약 450개 × C_au 평균 1.5개 = ~675 API 호출

---

## 최종 통합 단어 리스트 스펙 (목표)

각 단어 항목:
```json
{
  "word": "corroborate",
  "pos": "verb",
  "definition_ko": "확증하다, 뒷받침하다",
  "cp_labels": {"C_au": 8, "CL_au": 3, "C_ct": 1},
  "difficulty_dist": {"Easy": 2, "Medium": 4, "Hard": 6},
  "hard_ratio": 0.5,
  "top_wrong_categories": [
    {"category": "Misattribution", "pct": 38.0},
    {"category": "Pre-Pivot Reading", "pct": 25.0}
  ],
  "example_sentence": "Logan showed, however, that a close look at the available data corroborates...",
  "source_version": ["v1", "v3"]
}
```

---

## 데이터 소스

| 파일 | 역할 |
|---|---|
| `baseline_cp_analysis.jsonl` | 메인 CP 데이터 (1,439개) |
| `qb_rw_98_cp_analysis.jsonl` | QB RW 98 신규 (88개) |
| `cross_text_new_5_cp_analysis.jsonl` | Cross-Text 5개 |
| `missing_cp_analysis.jsonl` | 누락분 (117개) |
| `retry_14_cp_analysis.jsonl` | retry (14개) |
| `wrong_answer_patterns.jsonl` | 오답 패턴 (3,528개) |

총 CP 수: 4,311개 / 총 문장 평균 길이: 21.5단어

---

## 실행 결과 (2026-05-01 초기 실행)

| 버전 | 추출 단어 수 | 비고 |
|---|---|---|
| v1 | 3,924개 | 구조 위치 기반, 일반 단어 필터 적용 |
| v2 | 2,094개 | 학문적 단어만 + Hard/스킬 복합 점수 |
| v3 | 2,066개 | 오답 패턴 역산 연결 |
| v4 | 694개 | GPT-4o-mini 직접 선정 (Hard/Medium 420문제) |
| 통합 | 4,036개 전체 / **Top 300** 핵심 목록 |

v4 실행 환경: Windows Python (`/mnt/c/Users/nacor/.../python.exe`) — WSL Python에 openai 없음

## 실행 스크립트

| 버전 | 스크립트 |
|---|---|
| v1 | `extract_vocab_v1.py` |
| v2 | `extract_vocab_v2.py` |
| v3 | `extract_vocab_v3.py` |
| v4 | `extract_vocab_v4_llm.py` (Windows Python으로 실행) |
| 통합 | `merge_vocab.py` |

재실행 순서:
```bash
python3 extract_vocab_v1.py
python3 extract_vocab_v2.py
python3 extract_vocab_v3.py
/mnt/c/Users/nacor/AppData/Local/Programs/Python/Python312/python.exe extract_vocab_v4_llm.py
python3 merge_vocab.py
```
