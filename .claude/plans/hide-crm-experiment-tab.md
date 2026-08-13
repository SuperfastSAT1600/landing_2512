# Hide CRM Experiment Menu

## Overview
Hide the 실험 submenu from CRM 세일즈 전략 while preserving the existing sales logic statistics, strategy library, and strategy agent functionality.

## Requirements

### REQ-001: Hide experiment submenu
- **Priority**: Must
- **Description**: The CRM 세일즈 전략 submenu must not render the 실험 button.
- **Acceptance Criteria**: Users see only the remaining strategy menus; the experiment board is not reachable through the visible submenu.
- **Verification**: (TEST) Component test asserts the 실험 tab label is absent.

### REQ-002: Preserve existing strategy navigation
- **Priority**: Must
- **Description**: Existing sales logic statistics and strategy library navigation remain unchanged.
- **Acceptance Criteria**: The remaining submenu labels and their content continue to render.
- **Verification**: (TEST) Existing StrategiesTab tests pass.

### REQ-003: Confirm CRM UI
- **Priority**: Should
- **Description**: Verify the visible CRM strategy navigation in the browser.
- **Acceptance Criteria**: 실험 is not visible in 세일즈 전략.
- **Verification**: (BROWSER) Open CRM > 세일즈 전략 and inspect the submenu.

## Technical Design

### Architecture
Remove the experiment entry from the `StrategiesTab` submenu and avoid defaulting the selected subtab to the hidden experiment view. Keep the experiment component and backend intact for now.

### Dependencies
None.

## Traceability Matrix

| REQ ID | Description | Verification | Test File | Status |
|---|---|---|---|---|
| REQ-001 | Hide experiment menu | (TEST) | `src/app/admin/crm/components/__tests__/StrategiesTab.test.tsx` | Pending |
| REQ-002 | Preserve navigation | (TEST) | Existing CRM tests | Pending |
| REQ-003 | Browser confirmation | (BROWSER) | Manual browser check | Pending |

## Implementation Order

1. REQ-001 — add regression coverage and remove the visible menu entry.
2. REQ-002 — run existing tests and typecheck.
3. REQ-003 — verify the CRM browser view.

## Out of Scope

- Removing experiment APIs, database tables, or implementation files.
- Changing sales logic statistics or strategy library behavior.
