# 최초 세일즈 칸반에 8단계(결제 완료) 컬럼 추가

## Overview

최초 세일즈 칸반(`SalesKanban`)은 현재 0~7단계만 컬럼으로 보여준다.
결제한 리드(8단계 = 수업 중, `lead_status='enrolled'`)를 칸반 맨 끝에 **8. 수업 중** 컬럼으로 보이게 해
퍼널 전체 흐름(인입 → 결제)을 한눈에 볼 수 있게 한다.

8단계 리드는 `lead_status='enrolled'`라서 (a) 메인 조회(active만)와 (b) 칸반 필터(active만)에서 빠진다.
또한 8단계로 드래그 인/아웃하면 `funnel_stage`와 `lead_status`가 어긋나 카드가 사라지는 버그가 생긴다.
→ 8단계 컬럼은 **별도 조회 + 표시 전용(드래그 불가)**으로 만든다.

## Requirements

### REQ-001: 8단계 컬럼 표시 + 결제 리드 조회
- **Priority**: Must
- **Description**: `SALES_STAGES`에 `'8'`을 추가한다. `SalesKanban`이 `/api/crm/students?lead_status=enrolled`로 결제 리드를 조회해 `funnel_stage==='8'`인 학생을 8단계 컬럼에 렌더한다.
- **Acceptance Criteria**: 칸반 맨 끝에 "8. 수업 중" 컬럼이 뜨고 결제한 리드가 인원수와 함께 표시된다.
- **Verification**: (BROWSER) 최초 세일즈 탭에서 8단계 컬럼 + 결제 리드 확인

### REQ-002: 8단계 컬럼 표시 전용(드래그 방지)
- **Priority**: Must
- **Description**: 8단계 컬럼은 읽기 전용 — 카드는 클릭 시 패널만 열고 드래그/인라인 액션(이탈·결제 버튼)은 없다. `handleDragEnd`는 (a) 타깃이 8단계이거나 (b) 드래그된 학생이 `enrolled`이면 무시해, active 리드가 8단계로 가거나 enrolled 리드가 빠져나가 `funnel_stage`/`lead_status`가 어긋나는 것을 막는다.
- **Acceptance Criteria**: 0~7 카드를 8단계로 드롭하면 제자리로 돌아오고 데이터가 바뀌지 않는다.
- **Verification**: (MANUAL) 코드 리뷰 + 동작 확인

## Technical Design

### Architecture
- `src/app/admin/crm/components/SalesKanban.tsx` (수정)
  - `SALES_STAGES`에 `'8'` 추가
  - 결제 리드 `enrolledStudents` 로컬 state + fetch
  - `getStudentsForStage('8')` → enrolledStudents
  - `KanbanColumn`에 `readOnly` 모드(단순 클릭 카드, sortable/액션 없음)
  - `handleDragEnd` 가드
- API/타입/마이그레이션 변경 없음. 기존 `lead_status=enrolled` 엔드포인트 재사용.

### Dependencies
없음.

## Traceability Matrix

| REQ ID  | Description                | Verification | Test File | Status  |
|---------|----------------------------|--------------|-----------|---------|
| REQ-001 | 8단계 컬럼 + 결제 리드 조회 | (BROWSER)    | manual (스크린샷) | Done |
| REQ-002 | 표시 전용 + 드래그 방지     | (MANUAL)     | manual    | Done |

## Implementation Order
1. REQ-001 → 2. REQ-002 (같은 파일에서 함께 구현)

## Out of Scope
- 8단계 컬럼에서의 이탈/환불/추가결제 인라인 액션 (패널에서 처리)
- 코치 매칭(MatchingKanban)은 별개 — 이번 범위 아님
