# editor-bubble-menu-unify

## Overview

TableBubbleMenu와 TextBubbleMenu가 표 셀 안 텍스트 선택 시 동시에 표시되는 충돌 해결.
컨텍스트에 따라 메뉴가 전환되도록 shouldShow 로직 분리 + Shift+클릭 CellSelection 추가.

## Requirements

### REQ-001: 메뉴 충돌 제거
- **Priority**: Must
- **Description**: 셀 안 텍스트 선택 시 TableBubbleMenu 숨김, TextBubbleMenu만 표시
- **Acceptance Criteria**: 셀 안에서 텍스트를 선택하면 TableBubbleMenu가 사라지고 TextBubbleMenu만 나타남
- **Verification**: (BROWSER) 셀 안 텍스트 선택 → 두 메뉴 동시에 뜨지 않는지 확인

### REQ-002: 표 안 텍스트 선택 시 compact 표 컨트롤
- **Priority**: Should
- **Description**: 셀 안 텍스트 선택 중에도 행/열 추가 버튼에 접근 가능하도록 TextBubbleMenu에 compact 표 컨트롤 추가
- **Acceptance Criteria**: 셀 텍스트 선택 상태에서 행 추가/열 추가 버튼이 TextBubbleMenu 안에 표시됨
- **Verification**: (BROWSER) 셀 텍스트 선택 → compact 표 버튼 클릭 → 행/열 추가 동작 확인

### REQ-003: Shift+클릭 CellSelection
- **Priority**: Must
- **Description**: 셀 클릭 후 다른 셀을 Shift+클릭하면 CellSelection 생성, 병합 버튼 활성화
- **Acceptance Criteria**: A1 클릭 → B2 Shift+클릭 → 두 셀 사이 범위 선택됨 + 병합 버튼 활성화
- **Verification**: (BROWSER) Shift+클릭 → TableBubbleMenu 병합 버튼 활성 확인

### REQ-004: 드래그 CellSelection 유지
- **Priority**: Must
- **Description**: 기존 드래그 방식 CellSelection은 그대로 동작
- **Acceptance Criteria**: 셀 경계 가로질러 드래그 → 병합 버튼 활성화
- **Verification**: (BROWSER) 드래그 후 병합 버튼 활성화 확인

## Technical Design

### Architecture
- `TableBubbleMenu.shouldShow`: `selection.empty || CellSelection` 조건으로 제한
- `TextBubbleMenu`: `isActive('tableCell')` 시 compact 행/열 버튼 추가 렌더링
- `page.tsx`: `anchorCellRef` + `handleClick`에서 Shift+클릭 → CellSelection dispatch

### Dependencies
- `@tiptap/pm/tables`: `CellSelection`, `cellAround`

## Traceability Matrix

| REQ ID  | Description | Verification | Status  |
|---------|-------------|--------------|---------|
| REQ-001 | 메뉴 충돌 제거 | (BROWSER) | Pending |
| REQ-002 | compact 표 컨트롤 | (BROWSER) | Pending |
| REQ-003 | Shift+클릭 CellSelection | (BROWSER) | Pending |
| REQ-004 | 드래그 CellSelection 유지 | (BROWSER) | Pending |

## Implementation Order

1. REQ-001 — shouldShow 조건 수정 (가장 간단, 즉시 충돌 해결)
2. REQ-002 — TextBubbleMenu에 compact 컨트롤 추가
3. REQ-003 — Shift+클릭 CellSelection (page.tsx handleClick)
4. REQ-004 — 드래그는 기존 동작 유지 확인

## Out of Scope

- 다중 셀 선택 상태에서 Bold/Italic 일괄 적용
- 셀 배경색 변경
- 열 너비 조절 (resizable)
