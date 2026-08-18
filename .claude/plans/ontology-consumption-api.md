# Spec: Ontology Consumption API + Quality Gate

## Goal
antigravity가 데이터 파이프라인 작업하는 동안, 완성된 데이터를 즉시 소비할 수 있는 API 레이어와 품질 검증 시스템을 구축한다.
충돌 없는 병렬 작업: API는 JSONL 파일을 **읽기만** 함.

## Requirements

### REQ-001 (TEST): Upgrade GET /api/ontology/questions
`master_sat_ontology_v2.jsonl`을 읽어 통합 스키마 기반 응답 반환.
Query params: `skill`, `difficulty`, `limit` (default 20, max 100), `offset`, `has_analysis` (boolean)
Response: `{ data: SATQuestion[], meta: { total, limit, offset, skill_counts } }`

### REQ-002 (TEST): GET /api/ontology/questions/[id]
question ID로 단건 조회. 없으면 404.
Response: `{ data: SATQuestion }`

### REQ-003 (TEST): GET /api/ontology/skills
스킬별 통계 반환.
Response: `{ data: { skill, total, by_difficulty: { Easy, Medium, Hard }, analysis_coverage } }[]`

### REQ-004 (TEST): GET /api/ontology/error-types
wrong_answer_analysis에서 error_type 빈도 집계.
Response: `{ data: { skill, error_type, count }[] }`

### REQ-005 (MANUAL): validate_corpus.py 스크립트
- wrong_answer_analysis에 정답 선택지 포함 여부 체크
- error_type이 taxonomy 값인지 검증
- analysis 커버리지 % 리포트
- 중복 ID 검출
- 출력: 콘솔 리포트 + 오류 목록

## Out of Scope
- 데이터 쓰기/수정 API
- 인증 (내부 도구)
- Math 도메인 (현재 RW만)
