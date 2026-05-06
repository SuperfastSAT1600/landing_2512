# Spec: QB RW_98 Vision 파싱 + 5차원 분석

## Context
College Board가 2026-04-14에 새로 추가한 RW 98문제(260414 QB RW_98.pdf)를 파싱하고,
기존 1,511문제 corpus와 비교해 5개 차원의 차이점을 분석한다.

기존 extractor(vision_extractor.py)는 1문제/page 기준. 새 파일은 8페이지에 98문제 → 약 12문제/page이므로 배치 추출 필요.

## Requirements

| ID | 요구사항 | 방법 |
|----|---------|------|
| REQ-001 | PDF → 페이지별 이미지 변환 후 GPT-4o Vision으로 배치 추출 | (MANUAL) |
| REQ-002 | 문제당 추출 필드: question_id, difficulty, skill, passage, question, choices, correct_answer, explanation, passage_topic, correct_answer_concept, incorrect_answer_analysis | (MANUAL) |
| REQ-003 | 추출 결과를 `blog_database/qb_rw_98_parsed.jsonl`로 저장 | (MANUAL) |
| REQ-004 | 파싱 완료 후 5차원 비교 분석 리포트 생성 | (MANUAL) |

## 5차원 분석 스키마

각 문제 레코드에 포함할 분석 필드:

```json
{
  "metadata": {
    "question_id": "string",
    "difficulty": "Easy|Medium|Hard",
    "skill": "Words in Context|Command of Evidence|...",
    "source_file": "260414 QB RW_98.pdf"
  },
  "content": {
    "passage": "string",
    "question_text": "string",
    "choices": {"A": "", "B": "", "C": "", "D": ""},
    "correct_answer": "A|B|C|D",
    "explanation": "string"
  },
  "analysis": {
    "passage_topic": "Science|Literature|History|...",
    "correct_answer_concept": "정답의 핵심 개념 (예: 문맥상 의미 파악, 증거 평가, 논리적 연결)",
    "incorrect_answer_analysis": {
      "A": "오답 이유",
      "B": "오답 이유",
      "C": "오답 이유",
      "D": "오답 이유"
    }
  }
}
```

## 파싱 스크립트 구현

### 파일: `blog_database/vision_extractor_rw98.py`

기존 extractor 대비 변경점:
1. **배치 추출**: 1페이지에서 여러 문제 추출 (`list of questions` 반환)
2. **skill 필드 추가**: QB에 명시된 skill 그대로 추출
3. **correct_answer_concept**: 정답이 맞는 핵심 이유 개념화
4. **incorrect_answer_analysis**: 각 오답 선지별 왜 틀렸는지
5. **모델**: gpt-4o (기존은 gpt-4o-mini — 배치+분석 정확도 위해 업그레이드)

## 분석 리포트 구현

### 파일: `blog_database/analyze_rw98.py`

기존 corpus(master_sat_ontology_v2.jsonl) vs 신규(qb_rw_98_parsed.jsonl) 비교:

1. **Skill 분포** — 기존 비율 vs 새 98개 비율 (Cross-Text Connections 특히 주목)
2. **Difficulty 분포** — Easy/Medium/Hard 비율 변화
3. **Passage Topic** — 새로 등장한 주제, 기존 주제 비중 변화
4. **Correct Answer Concepts** — 가장 많이 등장하는 개념 Top 10
5. **Incorrect Answer Patterns** — 오답 유형 클러스터링

## Critical Files
- `blog_database/vision_extractor_rw98.py` — 신규 생성
- `blog_database/analyze_rw98.py` — 신규 생성
- `blog_database/260414 QB RW_98.pdf` — 입력
- `blog_database/qb_rw_98_parsed.jsonl` — 출력
- `blog_database/.env` — OPENAI_API_KEY
- `blog_database/master_sat_ontology_v2.jsonl` — 비교 baseline

## Verification
1. `python vision_extractor_rw98.py` 실행 → qb_rw_98_parsed.jsonl 생성 확인
2. 레코드 수 ~98개 확인
3. `python analyze_rw98.py` 실행 → 분석 리포트 출력
