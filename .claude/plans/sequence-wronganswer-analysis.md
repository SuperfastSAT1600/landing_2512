# sequence_full × 오답 패턴 상관관계 분석

## Overview

sequence_full(지문 논리 구조)과 오답 category의 상관관계를 분석해 교육 인사이트를 도출한다.
wrong_answer_patterns.jsonl(3,528개) × CP분석 파일들을 question_id로 조인.

## Requirements

### REQ-001: 데이터 조인
- **Priority**: Must
- **Acceptance Criteria**: question_id 기준으로 sequence_full과 wrong category 연결
- **Verification**: (MANUAL) 조인 성공 건수 출력

### REQ-002: 다차원 분석
- **Priority**: Must
- **Acceptance Criteria**: passage_type별 / structure_pattern별 / skill별 오답 분포 집계
- **Verification**: (MANUAL) 결과 파일 생성 및 콘솔 출력

### REQ-003: 결과 저장
- **Priority**: Must
- **Acceptance Criteria**: blog_database/analysis_sequence_wronganswer.json 저장
- **Verification**: (MANUAL) 파일 존재 확인
