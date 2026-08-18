---
title: Raw Data Source Directory
type: reference
domain: pipeline
updated: 2026-05-17
---

# Raw Data Sources

불변 소스 파일 저장소. Vision 추출 전 원본 데이터 보관.

**상태**: ✅ 2026-05-17 landing_2512/raw에서 sat/raw로 통합 완료 (62개 파일)

---

## Schema 병합 완료 (2026-05-17)

**master_sat_ontology_v3.jsonl** enrichment 완료:
- 원본: 4.3M (1,836개, basic fields)
- 업데이트: 5.8M (1,836개, + concept_structure + structural_pattern + standard_sequence)
- Backup: master_sat_ontology_v3.backup

### 추가된 필드
- `concept_structure` (1,511개 항목) — 각 문장의 함수/개념
- `structural_pattern` (1,511개 항목) — 전체 passage 구조 설명
- `standard_sequence` (1,511개 항목) — 시퀀스 (INTRODUCE, ELABORATION, EVIDENCE 등)

## 구조

```
raw/
├── pdf/
│   ├── official/       ← College Board 공식 시험지 PDF
│   └── skill_sets/     ← 스킬별 연습 PDF (30개)
├── extracted/          ← Vision 추출 또는 구조화된 JSONL
└── README.md           ← 이 파일
```

## Ingest 기록

### 2026-05-17

**master_sat_ontology_v3.jsonl**
- 소스: `/c/vibecoding/landing_2512/master_sat_ontology_v3.jsonl`
- 항목: 1,836개 (RW 1,715 + Math 121)
- 상태: ✅ raw/extracted/ 으로 이관 완료
- 위치: `raw/extracted/master_sat_ontology_v3.jsonl`
- 다음단계: schema/questions/master_sat_ontology_v3.jsonl 에 symlink/copy

**메타데이터:**
```json
{
  "total_questions": 1836,
  "rw_questions": 1715,
  "math_questions": 121,
  "source_format": "JSONL",
  "schema_version": "v3",
  "keys": ["id", "test", "domain", "skill", "difficulty", "passage", 
           "question", "choices", "correct_answer", "rationale", 
           "knowledge_graph", "analysis", "source", "topic_category", "date_added"],
  "ingested_date": "2026-05-17"
}
```

### 2026-05-17 (5차)

**PDF 파일 이관**
- 소스: `/c/vibecoding/landing_2512/blog_database/*.pdf`
- 총 32개 PDF (공식 2 + 스킬별 30)
- 상태: ✅ raw/pdf/ 로 분류 완료

**공식 시험지 (raw/pdf/official/)**
- 260414 QB RW_98.pdf (RW 98문제)
- 260414 QB Math_75.pdf (Math 75문제)

**스킬별 연습 PDF (raw/pdf/skill_sets/)**
- boundaries_easy_55.pdf
- boundaries_hard_77.pdf
- boundaries_medium_48.pdf
- central ideas and details_easy_33.pdf
- central ideas and details_hard_38.pdf
- central ideas and details_medium_45.pdf
- command of evidence_easy_70.pdf
- command of evidence_hard_98.pdf
- command of evidence_medium_77.pdf
- cross-text connections_easy_16.pdf
- cross-text connections_hard_19.pdf
- cross-text connections_medium_19.pdf
- Form, Structure, and Sense_easy_77.pdf
- Form, Structure, and Sense_hard_47.pdf
- Form, Structure, and Sense_medium_43.pdf
- inference_easy_20.pdf
- inference_hard_57.pdf
- inference_medium_40.pdf
- rhetorical synthesis_easy_41.pdf
- rhetorical synthesis_hard_42.pdf
- rhetorical synthesis_medium_99.pdf
- Text Structure and Purpose_easy_41.pdf
- Text Structure and Purpose_medium_37.pdf
- Text Structure and Purpose_medium_52.pdf
- transitions_easy_71.pdf
- transitions_hard_38.pdf
- transitions_medium_57.pdf
- Words in Context_easy_123_260322.pdf
- Words in Context_hard_50_260322.pdf
- Words in Context_medium_53_260322.pdf

### 2026-05-17 (4차)

**baseline_passage_structure_v3.jsonl (RW 시퀀싱)**
- 소스: `/c/vibecoding/landing_2512/blog_database/baseline_passage_structure_v3.jsonl`
- 항목: 1,511개 passage (RW)
- 상태: ✅ raw/baseline_passage_structure_v3.jsonl 으로 이관 완료
- 내용: 각 passage의 concept_structure, structural_pattern, **standard_sequence**
- 시퀀스 예: INTRODUCE, ELABORATION, EVIDENCE, CLAIM, ACTION, PIVOT 등

### 2026-05-17 (3차)

**function_label_mapping_v2.json (RW 라벨링)**
- 소스: `/c/vibecoding/landing_2512/blog_database/function_label_mapping_v2.json`
- 항목: 4,957개 라벨 매핑
- 대상: RW 1,715개 문제
- 라벨 타입: ACTION, BACKGROUND, BLANK, CLAIM, ELABORATION, EVIDENCE, EXAMPLE, FEATURE, FINDING, IMPLICATION 등
- 상태: ✅ raw/function_label_mapping_v2.json 으로 이관 완료
- 설명: 지문의 각 문장/구절에 대한 함수 라벨링 (예: "acknowledges a limitation..." → QUALIFY)

### 2026-05-17 (2차)

**Wiki 문서 이관**
- 소스: `/c/vibecoding/landing_2512/wiki/`
- 구조:
  ```
  raw/wiki/
  ├── index.md
  ├── log.md
  ├── analysis/ (7개 파일)
  │   ├── ANALYSIS_CONTEXT.md
  │   ├── assessment_framework.md
  │   ├── automated_insight_report.md
  │   ├── cp_sequence_analysis_agent.md
  │   ├── sat_rw_reference.md
  │   ├── skills_insight.md
  │   ├── vocab_extraction_methodology.md
  │   └── wic_patterns.md
  └── vocab/ (2개 파일)
      ├── group_framework.md
      └── level_framework.md
  ```
- 상태: ✅ raw/wiki/ 으로 이관 완료
- 내용: SAT RW 분석, 어휘 프레임워크, CP 분석 등

---

## 규칙

- **절대 수정 금지**: raw/ 파일은 읽기 전용
- **버전 관리**: 재추출/변경 시 새 파일명으로 추가
  - 예: `master_sat_ontology_v4.jsonl` (새 버전)
  - 절대 기존 파일 덮어쓰기 금지
- **추적성**: 이 파일에 모든 ingest 기록 추가

## 다음 단계

[ ] `function_label_mapping_v2.json` (RW 라벨링) 이관  
[ ] `baseline_passage_structure_v3.jsonl` (RW 시퀀싱) 이관  
[ ] pipeline/build/ 스크립트 실행  
[ ] wiki/ 갱신
