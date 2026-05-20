# RW 문제 파일 단일화

## Overview

RW 문제가 4곳에 분산/불일치 상태. `master_sat_ontology_v3.jsonl`을 유일한 소스로 확정하고, DB를 동기화하고, 구버전 파일을 archived/로 이동한다.

현황:
- v1 JSONL: 1177개 (구버전)
- v2 JSONL: 1511개 (구버전)
- v3 JSONL: 1715개 (최신, 정규화 완료)
- DB: 1609개 (106개 누락)

## Requirements

### REQ-001: v3 JSONL → DB 동기화 (106개 추가)
- **Priority**: Must
- **Description**: v3에 있지만 DB에 없는 106개 RW 문제를 `sat_questions.db`에 INSERT
- **Acceptance Criteria**: DB RW 문제 수 = 1715개, v3 JSONL과 ID 완전 일치
- **Verification**: (MANUAL) `SELECT COUNT(*) FROM questions` = 1715

### REQ-002: 구버전 파일 archived/ 이동
- **Priority**: Must
- **Description**: v1, v2 JSONL을 `/workspace/archived/` 폴더로 이동
- **Acceptance Criteria**: `/workspace/`에 `master_sat_ontology_v3.jsonl`만 남음 (v1, v2 없음)
- **Verification**: (MANUAL) ls /workspace/master_sat_ontology*.jsonl 결과 v3만 출력

### REQ-003: 최종 일치 검증
- **Priority**: Must
- **Description**: v3 JSONL과 DB의 RW 문제 수 및 ID 완전 일치 확인
- **Acceptance Criteria**: 두 파일 모두 1715개, ID 차집합 = 0
- **Verification**: (MANUAL) 검증 스크립트 실행

## Technical Design

### DB 스키마 확인 필요
- `questions` 테이블 컬럼 확인 후 INSERT 매핑

### 파일
- 소스: `/workspace/master_sat_ontology_v3.jsonl`
- DB: `/workspace/blog_database/sat_questions.db`
- archived: `/workspace/archived/master_sat_ontology.jsonl`, `master_sat_ontology_v2.jsonl`

## Traceability Matrix

| REQ ID  | Description          | Verification | Status  |
|---------|----------------------|--------------|---------|
| REQ-001 | DB 106개 동기화       | (MANUAL)     | Pending |
| REQ-002 | v1/v2 archived 이동  | (MANUAL)     | Pending |
| REQ-003 | 최종 일치 검증        | (MANUAL)     | Pending |

## Out of Scope

- blog_database/ 내 분석 파생 파일들 (cp_analysis, passage_structure 등) — 별도 분석용 파일로 유지
- Math 문제 관련 변경
