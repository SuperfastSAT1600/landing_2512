# SuperFastSAT 수업 개발 지식 베이스

> College Board Question Bank SAT RW 1,527문제 + Math 분석 기반  
> 수업 콘텐츠 개발 및 AI 모델 컨텍스트용 지식 베이스  
> 최종 업데이트: 2026-05-01

---

## 이 폴더의 목적

SAT 수업을 만들 때 AI(Claude 등)가 "SuperFastSAT가 어떤 근거로 수업을 설계하는가"를 이해하고 콘텐츠를 생성할 수 있도록 **분석 결과 + 방법론 + 핵심 데이터셋**을 구조화한 지식 베이스.

---

## 폴더 구조

```
sat_contents/
├── README.md                          ← 이 파일 (전체 인덱스)
├── rw_analysis/
│   ├── sat_rw_reference.md            ← RW 지문 분석 전체 레퍼런스 (자동생성)
│   ├── wrong_answer_taxonomy.md       ← 오답 8유형 상세 분석
│   └── passage_structures.md         ← 6가지 지문 구조 패턴 + 수업 전략
├── vocabulary/
│   ├── methodology.md                 ← 단어 선정 근거 체계 (4중 검증)
│   ├── vocab_by_category.md           ← 유형별 단어 분류 (빈칸형/구조형/LLM)
│   └── vocab_master_top300.json       ← 핵심 300단어 데이터셋
├── question_patterns/
│   ├── skill_overview.md              ← 스킬별 문제 유형 + 오답 패턴
│   └── difficulty_distribution.md    ← 난이도별 분포 + Hard 집중 전략
└── datasets/                          ← AI 참조용 핵심 데이터셋 (심볼릭 링크)
    ├── vocab_master.json              → blog_database/vocab_master.json
    ├── sat_rw_reference.json          → blog_database/sat_rw_reference.json
    ├── wrong_answer_patterns.jsonl    → blog_database/wrong_answer_patterns.jsonl
    └── baseline_cp_analysis.jsonl    → blog_database/baseline_cp_analysis.jsonl
```

---

## 핵심 숫자 (2026-05-01 기준)

| 항목 | 수치 |
|------|------|
| 분석 RW 문제 수 | 1,527개 |
| CP(Content Point) 총 문장 수 | 4,311개 |
| 오답 케이스 분류 | 3,528개 |
| 지문 구조 패턴 | 6종 |
| 고유 sequence_full | 380종 |
| 추출 단어 전체 | 5,704개 |
| 고신뢰도 단어 (3+ 버전) | 2,059개 |
| 빈칸형 보기 직접 출현 단어 | 1,029개 |
| 핵심 Top 300 단어 | 300개 |

---

## 빠른 참조

### 오답 유형이 궁금할 때
→ `rw_analysis/wrong_answer_taxonomy.md`

### 지문 구조별 수업 전략이 궁금할 때
→ `rw_analysis/passage_structures.md`

### 왜 이 단어를 외워야 하는지 근거가 필요할 때
→ `vocabulary/methodology.md`

### 스킬별 출제 패턴이 궁금할 때
→ `question_patterns/skill_overview.md`

### 단어 데이터를 직접 활용할 때
→ `vocabulary/vocab_master_top300.json` 또는 `datasets/vocab_master.json`

---

## 데이터 출처

- **출처**: College Board Question Bank (SuperFastSAT 분석, 2026)
- **분석 파이프라인**: `blog_database/` 폴더의 Python 스크립트들
- **원본 데이터**: `blog_database/*.jsonl` (수정 금지)
