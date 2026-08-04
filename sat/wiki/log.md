---
title: Wiki Change Log
type: log
domain: mixed
updated: 2026-05-19
---

# Change Log

역시간순. 최신 항목이 위.
태그: `[INGEST]` `[SCHEMA]` `[WIKI]` `[PIPELINE]` `[FIX]` `[SKILL]`

---

## 2026-08-03

- [INGEST] 260730 QB RW 150 텍스트 추출 완료
  - 추출 스크립트: `pipeline/extract/extract_260730_rw_text.py` (PyMuPDF 직접 텍스트 파싱)
  - 스킬 패치 스크립트: `pipeline/extract/fix_260730_skills.py` (멀티라인 스킬 재파싱)
  - 결과: 150개 전량 추출 (`sat/raw/extracted/260730_rw_150_parsed.jsonl`)
  - 배경: Claude Vision API 크레딧 부족으로 49개 이후 중단 → PyMuPDF 텍스트 추출로 전환
- [WIKI] `wiki/analysis/qb_rw_260414_vs_260730.md` 생성
  - 260414 99문제 vs 260730 150문제 정량 비교
  - 핵심 발견: Hard 비중 31.3% → 56.7% 급증, Boundaries Hard 11.1% → 66.7%, WIC Hard 26.7% → 55.6%
  - Command of Evidence 스킬이 Textual/Quantitative로 세분화
- [INGEST] 260414 QB RW 98 + Math 75 Vision 추출 완료 (동일 세션)
  - 추출 스크립트: `pipeline/extract/extract_260414_rw.py`, `extract_260414_math.py` (Claude Sonnet Vision)
  - 결과: RW 98개, Math 67개 추출 — 대부분 기존 온톨로지와 중복 (과거 세션 병합분)
  - 신규 발견: 1개 (`72cbdbc6`, Easy, Inferences)
- [SCHEMA] `master_sat_ontology_v3.jsonl` 1,837개로 갱신 (RW 1,716 / Math 121)
  - 병합 스크립트: `pipeline/build/merge_260414.py`
- [PIPELINE] Python 패키지 설치 (`pymupdf`, `anthropic`) — `--break-system-packages`로 진행

---

## 2026-05-19

- [SKILL] **Markdown 기반 블로그 워크플로우** 완성
  - `.claude/skills/naver-blog/SKILL.md` 생성
    - Blueprint→Naver 변환 규칙 (:::reader-profile:::/:::quick-summary::: 마커)
    - 줄바꿈 리듬 (네이버 트레이드마크)
    - learnings.md / patterns.jsonl 작성 지침
    - 해시태그/CTA 규칙
  
  - `.claude/skills/ghost-blog/SKILL.md` 생성
    - SEO 메타 (title/description/slug/canonical/OG)
    - TL;DR 박스 (40~60자)
    - FAQ 섹션 (Google PAA + AI 인용)
    - Quote capsules (80%+ 섹션, 60~100자)
    - 내부 링크 + GEO 검증 체크리스트
  
  - `.claude/skills/landing-blog/SKILL.md` 생성
    - JSON-LD BlogPosting 스키마 (search engine authority)
    - Supabase posts 테이블 필드 매핑 (database integration)
    - CTA 섹션 (로드맵 + 행동 유도)
    - 진단형 도입부 (D-43 스타일)
    - 8,000자+ 심화 콘텐츠

  - `.claude/skills/INDEX.md` 업데이트
    - [Content & Publishing] 섹션 추가 (3개 스킬 등재)
    - [Skill Selection by Task Type] 테이블에 블로그 포스팅 항목 추가

- [WIKI] wiki/blog 폴더 구조 (이전 세션)
  - `wiki/blog/schema/blueprint.schema.json` — 포스팅 메타 구조
  - `wiki/blog/2026-05-18-inference/blueprint.md` — 플랫폼 중립 핵심 콘텐츠
  - `wiki/blog/2026-05-18-inference/learnings.md` — 포스팅별 배운 규칙
  - `wiki/blog/patterns.jsonl` — 누적 수정 패턴 로그
  - `content/posts/{date-slug}-[naver|ghost|landing].md` — 플랫폼별 최종 파일

---

## 2026-05-18

- [INGEST] landing_2512/wiki → sat/wiki 통합 완료
  - 충돌 파일 백업: index.md.old, log.md.old, wic_patterns.md.old (sat 최신 버전 우선)
  - 추가 파일 병합 (8개):
    - ANALYSIS_CONTEXT.md (11.5K) — RW 분석 전체 맥락
    - assessment_framework.md (642K) — 대용량 평가 프레임워크
    - automated_insight_report.md (2.9K)
    - cp_sequence_analysis_agent.md (20K) — CP 시퀀스 분석
    - sat_rw_reference.md (9.1K) — RW 문제 분류 레퍼런스
    - skills_insight.md (77.9K) — 스킬별 문제 패턴
    - vocab_extraction_methodology.md (5.3K) — 단어 추출 방법론
    - group_framework.md, level_framework.md (vocab/)
  - 최종 구조: 16개 .md + 3개 .old 백업 = 19개 파일
  - landing_2512/wiki 폴더 삭제 완료

- [WIKI] `wiki/analysis/rw_skills_analysis.md` 생성 — 8개 스킬 종합 분석
- [WIKI] `wiki/analysis/rw_sequencing_analysis.md` 생성 — 시퀀싱 패턴 분석
- [WIKI] `wiki/analysis/rw_concept_tags.md` 생성 — 개념 태그 분석

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
