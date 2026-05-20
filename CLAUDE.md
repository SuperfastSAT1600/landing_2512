# SuperfastSAT LLM Wiki — CLAUDE.md

이 저장소는 SAT 문제 분석과 교육 콘텐츠 제작을 위한 **LLM-native 지식 베이스**다.
Claude는 `wiki/index.md`를 진입점으로 삼아 `[[wikilink]]`를 따라 탐색하고, `schema/`의 구조화 데이터를 조회하여 답변한다.

---

## 1. 3계층 구조

```
raw/         ← 불변 소스 (PDF, 직접 추출물) — 절대 수정 금지
wiki/        ← LLM·사람이 읽는 지식 문서 — 파이프라인 또는 Claude가 갱신
schema/      ← 기계가 읽는 골드 데이터 — 반드시 pipeline/을 통해서만 변경
pipeline/    ← 변환 스크립트 (raw→schema, schema→wiki)
intermediate/← 중간 산출물 (재생성 가능, git 제외 가능)
archived/    ← 구버전 파일
```

### raw/ — 불변 소스

| 경로 | 내용 |
|------|------|
| `raw/pdf/official/` | College Board 공식 시험지 (QB RW 98, QB Math 75) |
| `raw/pdf/skill_sets/` | 스킬별 연습 PDF 30개 (skill_difficulty_count_yyyymm.pdf) |
| `raw/extracted/` | Vision 추출 결과 JSONL — dirty, pre-normalization |

**규칙**: 절대 수정 금지. 재추출 시 새 파일명으로 추가 (예: `qb_rw_98_parsed_v2.jsonl`).

### wiki/ — 지식 문서

| 경로 | 내용 |
|------|------|
| `wiki/index.md` | 전체 색인 — 항상 최신 유지 |
| `wiki/log.md` | 변경 이력 |
| `wiki/vocab/` | 단어 분류 체계, 난이도 프레임워크 |
| `wiki/analysis/` | 패시지 패턴, 스킬 분석, 오답 패턴 |

**규칙**: Obsidian 위키링크 `[[page-name]]` 사용. YAML frontmatter 필수.

### schema/ — 골드 데이터

| 파일 | 내용 |
|------|------|
| `schema/questions/master_sat_ontology_v3.jsonl` | THE 질문 DB — 1,715 RW + 121 Math |
| `schema/questions/sat_questions.db` | SQLite 미러 |
| `schema/questions/sat_ontology_atlas.json` | 온톨로지 맵 |
| `schema/vocab/sat_vocab_book.jsonl` | THE 단어장 — 2,095 entries |
| `schema/vocab/vocab_master.json` | 단어 메타데이터 |

**규칙**: 스크립트 없이 직접 편집 금지. 반드시 `pipeline/build/` 또는 `pipeline/generate/`를 통해서만 업데이트.

---

## 2. Ingest 워크플로우 (새 자료 추가)

새 PDF나 문제 세트가 생길 때:

```
Step 1. raw/ 에 저장
  → PDF: raw/pdf/skill_sets/ 또는 raw/pdf/official/
  → 이름 규칙: {skill}_{difficulty}_{count}_{yyyymm}.pdf

Step 2. Vision 추출 (pipeline/extract/)
  → python3 pipeline/extract/vision_extractor.py --input raw/pdf/...
  → 출력: raw/extracted/{source}_parsed.jsonl

Step 3. schema/ 로 병합 (pipeline/build/)
  → python3 pipeline/build/build_v3.py
  → 필요 시: python3 pipeline/build/fix_ontology_domain.py
  → 출력: schema/questions/master_sat_ontology_v3.jsonl 업데이트

Step 4. 단어장 재생성 (필요 시, pipeline/generate/)
  → python3 pipeline/generate/build_vocab_base.py
  → python3 pipeline/generate/generate_image_root.py --resume

Step 5. wiki/ 갱신
  → 관련 wiki/analysis/ 또는 wiki/vocab/ 페이지 업데이트
  → wiki/log.md 에 변경 기록 추가
  → wiki/index.md 링크 확인 및 업데이트
```

---

## 3. Query 워크플로우 (질문 → 답변)

Claude가 이 위키에서 답을 찾는 순서:

```
1. wiki/index.md 읽기
   → 관련 섹션과 [[wikilink]] 파악

2. 해당 wiki/ 페이지 읽기
   → [[wikilink]]로 연결된 상세 페이지 탐색

3. 필요 시 schema/ 직접 조회
   → grep / jq / python3 -c "import json; ..."

4. 답변 생성
   → 출처 명시: "wiki/vocab/group_framework.md" 또는 "schema/vocab/sat_vocab_book.jsonl"
```

**쿼리 예시**:

| 질문 | 탐색 경로 |
|------|----------|
| "Words in Context Hard 패턴은?" | index.md → wiki/analysis/ANALYSIS_CONTEXT.md → schema grep |
| "address는 어느 그룹?" | index.md → wiki/vocab/group_framework.md |
| "가장 많이 나온 스킬은?" | schema/questions/ jq 집계 |
| "단어장에 image 없는 항목 수?" | schema/vocab/sat_vocab_book.jsonl grep |

---

## 4. Lint 워크플로우 (위키 건강도 점검)

```bash
# 1. 깨진 wikilink 탐지 (닫히지 않은 [[)
grep -rn '\[\[[^]]*$' /workspace/wiki/

# 2. frontmatter 누락 페이지
for f in /workspace/wiki/**/*.md; do
  head -1 "$f" | grep -q '^---' || echo "NO FRONTMATTER: $f"
done

# 3. schema 정합성 확인
python3 -c "
import json
from pathlib import Path
lines = [l for l in Path('schema/questions/master_sat_ontology_v3.jsonl').read_text().splitlines() if l.strip()]
rw = sum(1 for l in lines if json.loads(l).get('domain')=='Reading and Writing')
print(f'총 질문: {len(lines)} | RW: {rw} | Math: {len(lines)-rw}')
"

# 4. 단어장 완성도 확인
python3 -c "
import json
from pathlib import Path
entries = [json.loads(l) for l in Path('schema/vocab/sat_vocab_book.jsonl').read_text().splitlines() if l.strip()]
has_image = sum(1 for e in entries if e.get('image'))
has_root  = sum(1 for e in entries if e.get('root'))
print(f'총: {len(entries)} | image 완료: {has_image} | root 완료: {has_root}')
"

# 5. index.md 링크 vs 실제 파일 불일치
python3 -c "
import re, os
idx = open('wiki/index.md').read()
links = re.findall(r'\[\[([^\]]+)\]\]', idx)
for lnk in links:
    page = lnk.split('#')[0].strip()
    found = any(os.path.exists(f'wiki/{d}/{page}.md') for d in ['vocab','analysis']) \
            or os.path.exists(f'wiki/{page}.md')
    if not found: print(f'BROKEN: [[{lnk}]]')
"
```

---

## 5. 위키 페이지 작성 규칙

### Frontmatter (YAML properties)

```yaml
---
title: 페이지 제목
type: framework | analysis | reference | log | index
domain: vocab | questions | pipeline | mixed
tags: [group-abc, sat-rw, words-in-context]
updated: 2026-05-17
---
```

### 본문 규칙

- **내부 링크**: `[[page-name]]` (파일명, 확장자 생략)
- **섹션 링크**: `[[group_framework#Group A]]`
- **외부 링크**: 표준 마크다운 `[텍스트](url)`
- **데이터 참조**: `` `schema:vocab:sat_vocab_book` `` 형식으로 출처 표기
- **실행 가능 코드**: 반드시 ` ```bash ` 또는 ` ```python ` 언어 태그 붙이기
- **표**: 비교/목록은 마크다운 테이블 사용
- **이모지**: 사용 금지

### 파일 이름 규칙

```
소문자 + 언더스코어: group_framework.md
버전 suffix:        passage_patterns_v2.md
날짜 포함 (로그):   log.md  (단일 파일, 날짜는 내부 헤더로)
```

---

## 6. index.md와 log.md 관리 규칙

### wiki/index.md — 전체 색인

- 위키의 유일한 진입점. Claude는 이 파일을 항상 먼저 읽는다.
- 새 wiki 페이지 추가 시 반드시 여기에 링크 추가.
- 섹션 구성: Vocab / Analysis / Schema Quick Reference / Pipeline Quick Reference

```markdown
---
title: SAT Wiki Index
type: index
domain: mixed
updated: {date}
---
```

### wiki/log.md — 변경 이력

- 모든 schema/ 변경, wiki/ 신규 페이지, raw/ 추가 시 기록.
- 역시간순 (최신이 위).
- 태그: `[INGEST]` `[SCHEMA]` `[WIKI]` `[PIPELINE]` `[FIX]`

```markdown
## 2026-05-17
- [INGEST] raw/pdf/official/ QB RW 98 추가
- [SCHEMA] master_sat_ontology_v3.jsonl 1,715 RW 확정
- [WIKI] wiki/vocab/group_framework.md 생성 (A/B/C 3계층)
- [PIPELINE] pipeline/generate/ 경로 schema/vocab/ 으로 업데이트
```

**log.md는 Claude가 직접 append한다.** 위키 관련 작업 후 자동으로 기록할 것.

---

## Pipeline 빠른 참조

| 작업 | 명령어 |
|------|-------|
| 단어장 베이스 재생성 | `python3 pipeline/generate/build_vocab_base.py` |
| image/root 이어서 생성 | `python3 pipeline/generate/generate_image_root.py --resume` |
| 10개 테스트 생성 | `python3 pipeline/generate/generate_image_root.py --limit 10` |
| 생성 결과 미리보기 | `python3 pipeline/generate/generate_image_root.py --preview` |
| API 키 설정 | `export ANTHROPIC_API_KEY=$(grep ANTHROPIC_API_KEY .env.local \| cut -d= -f2 \| tr -d '\r\n')` |

---

## 데이터 현황 (2026-05-17)

| 항목 | 수치 |
|------|------|
| SAT RW 질문 | 1,715개 |
| SAT Math 질문 | 121개 |
| 단어장 전체 | 2,095개 (Group AB: 1,511 / Group B: 584) |
| image/root 생성 완료 | 5개 (나머지 미완) |
| 소스 PDF | 32개 (official 2 + skill_sets 30) |

---

## Claude Code 시스템 참조

이 저장소는 Claude Code 에이전트 시스템과 함께 동작한다.
- **에러 로그**: `.claude/user/errors.md`
- **실행 프로토콜**: `.claude/rules/task-protocol.md`
- **에이전트 목록**: `.claude/agents/INDEX.md`
