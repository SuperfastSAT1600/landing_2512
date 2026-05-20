---
title: SAT Wiki Index
type: index
domain: mixed
tags: [sat, rw, vocab, analysis]
updated: 2026-05-17
---
---

# SAT Wiki Index

SAT 문제 분석 및 교육 콘텐츠 제작 위키의 진입점.
Claude는 이 파일을 먼저 읽고 `[[wikilink]]`를 따라 탐색한다.

---

## Vocab — 단어 분류 체계

| 페이지 | 내용 |
|--------|------|
| [[group_framework]] | A/B/C 3계층 분류 — 번역 터널 오류 / 의미 동결 오류 / 형태 혼동 오류 |
| [[level_framework]] | SAT 단어 난이도 체계 |

**핵심 개념**:
- Group A (번역 분기): 영어 1단어 → 한국어 여러 단어. 처방: **뜻의 이미지**
- Group B (다의어): 같은 단어인데 SAT가 덜 알려진 뜻 사용. 처방: **뜻의 뿌리**
- Group C (동형이의어): 철자 같지만 완전히 다른 단어. 처방: **뜻의 분리** (별개 엔트리)

---

## Analysis — 문제·패시지 분석

| 페이지 | 내용 |
|--------|------|
| [[wic_patterns]] | WIC 241개 문항 패턴 분석 — 유형/함정/전략 |
| [[ANALYSIS_CONTEXT]] | RW 분석 전체 맥락 및 방법론 |
| [[automated_insight_report]] | 자동 생성 인사이트 리포트 |
| [[skills_insight]] | 스킬별 문제 패턴 및 난이도 분포 |
| [[assessment_framework]] | 평가 프레임워크 |
| [[vocab_extraction_methodology]] | 단어 추출 방법론 |
| [[sat_rw_reference]] | RW 문제 분류 레퍼런스 |
| [[cp_sequence_analysis_agent]] | CP 시퀀스 분석 에이전트 설계 |

---

## Schema Quick Reference

| 파일 | 내용 | 크기 |
|------|------|------|
| `schema/questions/master_sat_ontology_v3.jsonl` | 골드 질문 DB | 1,715 RW + 121 Math |
| `schema/questions/sat_questions.db` | SQLite 미러 | — |
| `schema/questions/sat_ontology_atlas.json` | 온톨로지 맵 | — |
| `schema/vocab/sat_vocab_book.jsonl` | 골드 단어장 | 2,095 entries |
| `schema/vocab/vocab_master.json` | 단어 메타데이터 | — |

**빠른 집계**:
```bash
# RW 스킬별 문제 수
python3 -c "
import json
from collections import Counter
from pathlib import Path
qs = [json.loads(l) for l in Path('schema/questions/master_sat_ontology_v3.jsonl').read_text().splitlines() if l.strip()]
rw = [q for q in qs if q.get('domain')=='Reading and Writing']
for skill, cnt in Counter(q.get('skill','') for q in rw).most_common():
    print(f'{cnt:4d}  {skill}')
"

# 단어장 완성도
python3 -c "
import json
from pathlib import Path
es = [json.loads(l) for l in Path('schema/vocab/sat_vocab_book.jsonl').read_text().splitlines() if l.strip()]
print(f'전체: {len(es)} | image: {sum(1 for e in es if e.get(\"image\"))} | root: {sum(1 for e in es if e.get(\"root\"))}')
"
```

---

## Pipeline Quick Reference

```
raw/pdf/ → [extract] → raw/extracted/ → [build] → schema/
schema/  → [generate] → schema/vocab/sat_vocab_book.jsonl (image/root 채움)
schema/  → [analyze]  → intermediate/ → wiki/analysis/
```

| 단계 | 스크립트 |
|------|---------|
| PDF 추출 | `pipeline/extract/vision_extractor.py` |
| 질문 DB 빌드 | `pipeline/build/build_v3.py` |
| 단어장 베이스 | `pipeline/generate/build_vocab_base.py` |
| image/root 생성 | `pipeline/generate/generate_image_root.py --resume` |

---

## 변경 이력

→ [[log]]
