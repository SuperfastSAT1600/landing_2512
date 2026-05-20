# LLM Wiki 폴더 구조 재편성

## Overview

blog_database/ 모노리스를 Karpathy LLM Wiki 3-계층(raw/wiki/schema)으로 재편성한다.
원본 파일은 유지하고 복사(copy)만 수행한다.

## Requirements

### REQ-001: 디렉토리 구조 생성
- **Priority**: Must
- **Description**: raw/wiki/schema/pipeline/intermediate 계층 생성
- **Acceptance Criteria**: 모든 대상 폴더 존재 확인
- **Verification**: (MANUAL) ls -d 확인

### REQ-002: raw/ 복사
- **Priority**: Must
- **Description**: PDF → raw/pdf/{official,skill_sets}/, 추출 JSONL → raw/extracted/
- **Acceptance Criteria**: PDF 32개, extracted JSONL 14개 복사 완료
- **Verification**: (MANUAL) 파일 수 확인

### REQ-003: wiki/ 복사
- **Priority**: Must
- **Description**: MD 지식 문서 → wiki/vocab/ or wiki/analysis/
- **Acceptance Criteria**: framework MD 2개, analysis MD 5개 복사
- **Verification**: (MANUAL)

### REQ-004: schema/ 복사
- **Priority**: Must
- **Description**: 골드 데이터 → schema/questions/ or schema/vocab/
- **Acceptance Criteria**: master_sat_ontology_v3.jsonl, sat_vocab_book.jsonl, DB, vocab_master 복사
- **Verification**: (MANUAL)

### REQ-005: pipeline/ 복사
- **Priority**: Must
- **Description**: Python 스크립트 역할별로 extract/build/analyze/generate 분류
- **Acceptance Criteria**: 48개 스크립트 모두 복사 완료
- **Verification**: (MANUAL)

### REQ-006: intermediate/ 복사
- **Priority**: Must
- **Description**: 중간 산출물 JSONL/JSON → intermediate/
- **Acceptance Criteria**: baseline/checkpoint/analysis 파일들 복사
- **Verification**: (MANUAL)
