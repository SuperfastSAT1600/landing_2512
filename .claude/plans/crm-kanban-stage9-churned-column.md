# 최초 세일즈 칸반에 9단계(이번 달 이탈) 컬럼 추가

## Overview

최초 세일즈 칸반(`SalesKanban`)은 현재 0~7단계(드래그) + 8단계 "수업 중"(표시 전용)까지 보여준다.
8단계 오른쪽에 **9. 이탈** 컬럼을 붙여, 해당 월(현재 달력 월)에 이탈한 리드를 한눈에 보이게 한다.
인입 → 결제 → 이탈까지 퍼널 전체 흐름을 끝에서 마무리한다.

이탈 리드는 `funnel_stage='churned'`, `lead_status='inactive'`이고, 이탈 시점은
`stage_history`의 마지막 `stage==='churned'` 엔트리 `entered_at`이다(없으면 `funnel_stage_updated_at` 폴백).
8단계 컬럼과 동일하게 **별도 조회 + 표시 전용(드래그 불가)**으로 만든다.

## Requirements

### REQ-001: 9단계 "이탈" 컬럼 표시 + 이번 달 이탈 리드 조회
- **Priority**: Must
- **Description**: `ALL_COLUMNS` 끝에 `'churned'`를 추가한다. `SalesKanban`이 `/api/crm/students?lead_status=inactive&stage=churned`로 이탈 리드를 조회해, 이탈 시점이 현재 달력 월에 속하는 학생만 9단계 컬럼에 렌더한다. 헤더는 "9. 이탈 (이번 달)"로 표기한다.
- **Acceptance Criteria**: 칸반 맨 끝에 "9. 이탈 (이번 달)" 컬럼이 뜨고, 이번 달에 이탈한 리드가 인원수와 함께 표시된다. 지난 달 이탈 리드는 보이지 않는다.
- **Verification**: (BROWSER) 최초 세일즈 탭에서 9단계 컬럼 + 이번 달 이탈 리드 확인

### REQ-002: 9단계 컬럼 표시 전용(드래그 방지)
- **Priority**: Must
- **Description**: 9단계 컬럼은 읽기 전용 — 카드는 클릭 시 패널만 열고 드래그/인라인 액션은 없다. `handleDragEnd`/`useDroppable`는 churned 컬럼을 드롭 타깃으로 받지 않아 데이터가 어긋나지 않는다.
- **Acceptance Criteria**: 0~7 카드를 9단계로 드롭하면 제자리로 돌아오고 데이터가 바뀌지 않는다.
- **Verification**: (MANUAL) 코드 리뷰 + 동작 확인

## Technical Design

### Architecture
- `src/app/admin/crm/components/SalesKanban.tsx` (수정)
  - `CHURNED_STAGE: FunnelStage = 'churned'`, `ALL_COLUMNS = [...SALES_STAGES, ENROLLED_STAGE, CHURNED_STAGE]`
  - `churnedStudents` state + fetch (`lead_status=inactive&stage=churned`) → 현재 월 필터
  - `churnedAt(student)` 헬퍼: stage_history 마지막 churned 엔트리 entered_at (폴백 funnel_stage_updated_at)
  - `getStudentsForStage('churned')` → churnedStudents (이탈일 최신순)
  - `KanbanColumn`: readOnly에 톤(enrolled=emerald / churned=rose) + 커스텀 헤더 라벨 지원, churned 카드는 이탈일 표시
  - `readOnly`/`isSearchMatch` 가드에 churned 포함
- API/타입/마이그레이션 변경 없음. 기존 엔드포인트 재사용.

### Dependencies
없음.

## Traceability Matrix

| REQ ID  | Description                  | Verification | Test File | Status |
|---------|------------------------------|--------------|-----------|--------|
| REQ-001 | 9단계 컬럼 + 이번 달 이탈 조회 | (BROWSER)    | manual (스크린샷) | Pending |
| REQ-002 | 표시 전용 + 드래그 방지       | (MANUAL)     | manual    | Pending |

## Implementation Order
1. REQ-001 → 2. REQ-002 (같은 파일에서 함께 구현)

## Out of Scope
- 9단계 컬럼에서의 재활성화/복구 인라인 액션 (리드풀/패널에서 처리)
- "지난 달" 등 기간 선택 — 통계 탭에서 처리
