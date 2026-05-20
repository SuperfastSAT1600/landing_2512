---
title: Wiki Change Log
type: log
domain: mixed
updated: 2026-05-17
---

# Change Log

역시간순. 최신 항목이 위.
태그: `[INGEST]` `[SCHEMA]` `[WIKI]` `[PIPELINE]` `[FIX]`

---

## 2026-05-17 (2)

- [WIKI] `wiki/analysis/wic_patterns.md` 생성
  - WIC 241개 문항 전수 분석 (master_sat_ontology_v3.jsonl 기반)
  - 유형 분류: blank_fill 83.4% / as_used_in 15.8%
  - Hard 오답 함정 4패턴: 방향반전 / 관련어휘 / 강도불일치 / 의미동결
  - 정답 품사 분포: 동사 40.3% / 형용사 28.4% / 명사 21.4%
- [WIKI] `wiki/index.md` — wic_patterns 링크 추가

## 2026-05-17

- [WIKI] `wiki/index.md` 생성 — 전체 위키 색인 진입점
- [WIKI] `wiki/log.md` 생성 — 변경 이력 관리 시작
- [WIKI] `wiki/vocab/group_framework.md` 생성 — A/B/C 3계층 분류 체계
- [WIKI] `wiki/vocab/level_framework.md` 생성 — 단어 난이도 체계
- [PIPELINE] `pipeline/generate/build_vocab_base.py` 경로 업데이트
  - `ONTOLOGY` → `schema/questions/master_sat_ontology_v3.jsonl`
  - `VOCAB_MASTER` → `schema/vocab/vocab_master.json`
  - `OUTPUT` → `schema/vocab/sat_vocab_book.jsonl`
- [PIPELINE] `pipeline/generate/generate_image_root.py` 경로 업데이트
  - `INPUT/OUTPUT` → `schema/vocab/sat_vocab_book.jsonl`
- [SCHEMA] 폴더 구조 재편성 (Karpathy LLM Wiki 3계층 적용)
  - `raw/pdf/official/` — QB 공식 PDF 2개
  - `raw/pdf/skill_sets/` — 스킬별 연습 PDF 30개
  - `raw/extracted/` — vision 추출 JSONL 14개
  - `schema/questions/` — 골드 질문 DB (master_sat_ontology_v3.jsonl, sat_questions.db)
  - `schema/vocab/` — 골드 단어장 (sat_vocab_book.jsonl, vocab_master.json)
  - `pipeline/extract/` — 추출 스크립트 21개
  - `pipeline/build/` — 빌드 스크립트 8개
  - `pipeline/analyze/` — 분석 스크립트 17개
  - `pipeline/generate/` — 생성 스크립트 2개
  - `intermediate/` — 중간 산출물 31개

## 2026-05-15

- [SCHEMA] `master_sat_ontology_v3.jsonl` 확정 — 1,715 RW + 121 Math (총 1,836개)
  - domain 필드 전체 정규화 완료
  - QB98 98개 nested→flat 변환
  - unknown_rw 106개 nested→flat 변환
  - 빈 skill 필드 32개 추론으로 채움
- [SCHEMA] `sat_questions.db` 1,609 → 1,715개 동기화
- [SCHEMA] `sat_vocab_book.jsonl` 생성 — 2,095 entries (Group AB: 1,511 / Group B: 584)
- [WIKI] `sat_vocab_group_framework.md` 생성 — A/B/C 분류 프레임워크 문서화
- [FIX] `master_sat_ontology_v1.jsonl`, `v2.jsonl` → `archived/` 이동

## 2026-04 이전

- SAT RW 문제 수집 및 파싱 (vision_extractor 시리즈)
- vocab_master.json 생성 (단어 메타데이터)
- cp_analysis, passage_structure 분석 시리즈 실행
- Words in Context 단어 추출 v1~v4 실험
