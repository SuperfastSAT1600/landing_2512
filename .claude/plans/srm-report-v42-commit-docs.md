# SRM 리포트 v4.2 커밋 및 문서 업데이트

## Overview

어제 저녁 작업한 build-srm-report.ts 변경사항(quadrant 행동 패턴, skill_prompts 지식 블록, 프롬프트 구조 개편)을 커밋하고, 관련 핸드오프 문서와 프롬프트 백업을 최신 상태로 업데이트한다.

## Requirements

### REQ-001: 미커밋 변경사항 커밋
- **Priority**: Must
- **Description**: build-srm-report.ts 및 관련 신규 파일(코칭 철학, spec 문서 등) 커밋
- **Acceptance Criteria**: git log에 커밋 반영
- **Verification**: (MANUAL)

### REQ-002: 핸드오프 문서 업데이트
- **Priority**: Must
- **Description**: TEST-CENTER-REPORT-HANDOFF.md, STUDY-HALL-REPORT-HANDOFF.md를 v4.2 변경사항 반영
- **Acceptance Criteria**: 핸드오프 문서가 현재 코드 상태와 일치
- **Verification**: (MANUAL)

### REQ-003: 프롬프트 백업 v4.2로 업데이트
- **Priority**: Must
- **Description**: narrative-prompt-backup-v4.md에 quadrant/skill_prompts 블록 추가 반영
- **Acceptance Criteria**: 백업 문서가 현재 프롬프트와 일치
- **Verification**: (MANUAL)

## Technical Design

### 커밋 대상 파일
- `src/lib/build-srm-report.ts`
- `srm/superfastsat-coaching-philosophy.md`
- `.claude/plans/narrative-prompt-backup-v4.md`
- `srm/study-hall-narrative-spec-v3.md`
- `srm/test-center-narrative-spec-v3.md`
- `srm/STUDY-HALL-REPORT-HANDOFF.md`
- `srm/TEST-CENTER-REPORT-HANDOFF.md`

### 문서 업데이트 대상
- `TEST-CENTER-REPORT-HANDOFF.md` (root)
- `STUDY-HALL-REPORT-HANDOFF.md` (root)
- `.claude/plans/narrative-prompt-backup-v4.md`

## Traceability Matrix

| REQ ID  | Description | Verification | Status  |
|---------|-------------|--------------|---------|
| REQ-001 | 미커밋 변경사항 커밋 | (MANUAL) | Pending |
| REQ-002 | 핸드오프 문서 업데이트 | (MANUAL) | Pending |
| REQ-003 | 프롬프트 백업 v4.2 | (MANUAL) | Pending |
