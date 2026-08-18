# 결제 완료 → 수업 중 자동 전환 + 퍼널 이동 히스토리

## Overview

결제가 확인되면 수동으로 퍼널 스테이지를 바꾸는 과정 없이 자동으로 '수업 중'(stage '8')으로 전환.
모든 퍼널 이동 날짜를 `stage_history` 배열에 누적 기록해 상담 내용과 함께 히스토리를 관리.

## Requirements

### REQ-001: DB 마이그레이션 — stage_history 컬럼
- **Priority**: Must
- **Description**: `students` 테이블에 `stage_history JSONB DEFAULT '[]'` 추가
- **Schema**: 각 엔트리 `{stage: string, label: string, entered_at: string}`
- **Acceptance Criteria**: 마이그레이션 SQL 적용 후 컬럼 존재
- **Verification**: (MANUAL) Supabase Studio 확인

### REQ-002: FunnelStage 타입에 '8' 추가
- **Priority**: Must
- **Description**: `FunnelStage`에 `'8'` 추가, FUNNEL_STAGE_LABELS에 `'수업 중'` 매핑
- **Acceptance Criteria**: tsc --noEmit 통과
- **Verification**: (TEST)

### REQ-003: Student 타입에 stage_history 추가
- **Priority**: Must
- **Description**: `Student` 인터페이스에 `stage_history: Array<{stage: string; label: string; entered_at: string}>` 추가
- **Verification**: (TEST)

### REQ-004: PATCH API — funnel_stage 변경 시 stage_history 자동 기록
- **Priority**: Must
- **Description**: `/api/crm/students/[id]` PATCH에서 body에 `funnel_stage`가 있으면:
  1. 현재 student 조회 (stage_history 가져오기)
  2. 새 엔트리 `{stage, label, entered_at: now}` append
  3. `stage_history` 포함해서 update
- **Acceptance Criteria**: 드래그 이동 / 패널 수동 변경 시 stage_history에 항목 추가됨
- **Verification**: (MANUAL) Supabase Studio에서 stage_history 확인

### REQ-005: Payment API — 결제 완료 시 stage '8' + stage_history 기록
- **Priority**: Must
- **Description**: `/api/crm/students/[id]/payment` POST에서:
  1. 기존 `lead_status: 'enrolled'` 유지
  2. `funnel_stage: '8'`, `funnel_stage_updated_at: now` 추가
  3. `stage_history`에 `{stage: '8', label: '수업 중', entered_at: now}` append
- **Acceptance Criteria**: 결제 처리 후 학생이 funnel_stage='8'이 되고 stage_history에 기록됨
- **Verification**: (MANUAL) 결제 후 Supabase 확인

## Technical Design

- stage '8'은 SalesKanban의 SALES_STAGES에 포함하지 않음 (enrolled 학생은 MatchingKanban으로 이동)
- PATCH API에서 stage_history 기록 → 드래그/패널 수동변경 모두 자동 처리
- Payment API에서 별도 처리 (PATCH를 거치지 않고 직접 업데이트하므로)

## Traceability Matrix

| REQ ID  | Description                        | Verification | Status  |
|---------|------------------------------------|--------------|---------|
| REQ-001 | stage_history DB 컬럼              | (MANUAL)     | Pending |
| REQ-002 | FunnelStage '8' 타입               | (TEST)       | Pending |
| REQ-003 | Student stage_history 타입         | (TEST)       | Pending |
| REQ-004 | PATCH API stage_history 자동 기록  | (MANUAL)     | Pending |
| REQ-005 | Payment API → stage '8' + 기록     | (MANUAL)     | Pending |

## Implementation Order

1. REQ-001 (DB)
2. REQ-002 + REQ-003 (타입)
3. REQ-004 (PATCH API)
4. REQ-005 (Payment API)
