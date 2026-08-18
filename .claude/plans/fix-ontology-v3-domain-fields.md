# Fix master_sat_ontology_v3.jsonl Domain Fields

## Overview

`master_sat_ontology_v3.jsonl`에 있는 1715개 RW 문제 중 204개(98 QB98 + 106 unknown_rw)가 `domain` 필드 없이 중첩 스키마로 저장되어 있음. 이를 전부 표준 스키마로 정규화하고 `domain = "Reading and Writing"` 을 확실하게 설정한다.

## Requirements

### REQ-001: QB98 98개 — domain 설정 + 스키마 정규화
- **Priority**: Must
- **Description**: `metadata`/`content` 중첩 구조로 저장된 98개(source: 260414 QB RW_98.pdf)를 표준 flat 스키마로 변환하고 `domain = "Reading and Writing"` 추가
- **Acceptance Criteria**: 변환 후 표준 스키마 필드(`id`, `test`, `domain`, `skill`, `difficulty`, `passage`, `question`, `choices`, `correct_answer`, `rationale`, `source`, `topic_category`, `date_added`) 모두 존재
- **Verification**: (MANUAL) 변환된 파일에서 `domain` 누락 문제 0개 확인

### REQ-002: unknown_rw 106개 — domain 설정 + 스키마 정규화
- **Priority**: Must
- **Description**: 2026-04-29에 추가된 106개 문제(`content` 중첩)를 표준 flat 스키마로 변환하고 `domain = "Reading and Writing"` 추가
- **Acceptance Criteria**: 변환 후 표준 스키마 필드 모두 존재, `date_added = "2026-04-29"` 유지
- **Verification**: (MANUAL) 변환된 파일에서 domain 없는 RW 문제 0개

### REQ-003: skill 필드 정규화
- **Priority**: Must
- **Description**: QB98/unknown_rw의 short skill명("Central Ideas and Details")을 standard long형("Information and Ideas Central Ideas and Details")으로 통일
- **Acceptance Criteria**: 전체 파일에서 skill 값이 표준 형식으로 통일
- **Verification**: (MANUAL) skill 값 중 비표준 형식 0개

### REQ-004: 최종 무결성 검증
- **Priority**: Must
- **Description**: 수정 후 파일에서 domain 필드 분포, RW 총 개수, 중복 ID 확인
- **Acceptance Criteria**: RW 문제 1715개 전부 `domain = "Reading and Writing"`, 중복 ID 없음(math 제외)
- **Verification**: (MANUAL) 검증 스크립트 실행

## Technical Design

### 변환 매핑

**QB98 (metadata/content → flat)**
```
metadata.question_id → id
metadata.skill       → skill (short → long 변환)
metadata.difficulty  → difficulty
metadata.source_file → source
content.passage      → passage
content.question_text → question
content.choices      → choices
content.correct_answer → correct_answer
content.explanation  → rationale
"SAT"               → test
"Reading and Writing" → domain
"2026-04-14"        → date_added (QB RW_98 date)
```

**unknown_rw (mixed → flat)**
```
id           → id (그대로)
skill        → skill (short → long 변환)
difficulty   → difficulty (그대로)
topic_category → topic_category (그대로)
date_added   → date_added (그대로)
content.passage → passage
content.question_text → question
content.choices → choices
content.correct_answer → correct_answer
content.explanation → rationale
"SAT"        → test
"Reading and Writing" → domain
```

### Skill 매핑 테이블 (short → long)
```
Central Ideas and Details       → Information and Ideas Central Ideas and Details
Command of Evidence             → Information and Ideas Command of Evidence
Inferences                      → Information and Ideas Inferences
Cross-Text Connections          → Craft and Structure Cross-Text Connections
Text Structure and Purpose      → Craft and Structure Text Structure and Purpose
Words in Context                → Craft and Structure Words in Context
Rhetorical Synthesis            → Expression of Ideas Rhetorical Synthesis
Transitions                     → Expression of Ideas Transitions
Boundaries                      → Standard English Conventions Boundaries
Form, Structure, and Sense      → Standard English Conventions Form, Structure, and Sense
```

### 파일
- **Input**: `/workspace/master_sat_ontology_v3.jsonl`
- **Backup**: `/workspace/master_sat_ontology_v3.jsonl.bak2` (기존 bak 있음)
- **Output**: `/workspace/master_sat_ontology_v3.jsonl` (in-place)
- **Script**: `/workspace/blog_database/fix_ontology_domain.py` (일회성 스크립트)

## Traceability Matrix

| REQ ID  | Description               | Verification | Status  |
|---------|---------------------------|--------------|---------|
| REQ-001 | QB98 domain+schema 정규화 | (MANUAL)     | Pending |
| REQ-002 | unknown_rw domain+schema  | (MANUAL)     | Pending |
| REQ-003 | skill 필드 정규화          | (MANUAL)     | Pending |
| REQ-004 | 최종 무결성 검증            | (MANUAL)     | Pending |

## Implementation Order

1. REQ-001 → REQ-002 (같은 변환 로직)
2. REQ-003 (변환 시 동시 처리)
3. REQ-004 (검증)

## Out of Scope

- Math 문제 중복 제거 (별도 작업)
- DB 동기화 (JSONL만 수정)
