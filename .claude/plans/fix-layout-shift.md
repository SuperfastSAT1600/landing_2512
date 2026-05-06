# Fix Diagnostic Test Layout Shift (Desktop)

## Overview

The vertical resizer line between passage and question panels shifts when navigating questions on desktop. Three causes: Windows scrollbar appearance/disappearance, y-axis animation on question transitions, and inconsistent maxWidth values.

## Requirements

### REQ-001: Stabilize scrollbar gutter
- **Priority**: Must
- **Description**: Add `scrollbar-gutter: stable` to desktop passage panel to reserve scrollbar space
- **Acceptance Criteria**: Passage content does not shift horizontally when scrollbar appears/disappears
- **Verification**: (BROWSER) Navigate between questions with different passage lengths on desktop

### REQ-002: Remove y-axis animation from question transitions
- **Priority**: Must
- **Description**: Replace y-axis slide animation with opacity-only crossfade, remove `mode="wait"`
- **Acceptance Criteria**: Question transitions use opacity-only fade with no vertical movement
- **Verification**: (BROWSER) Navigate between questions and verify no vertical jumping

### REQ-003: Consistent maxWidth for question content
- **Priority**: Must
- **Description**: Use single maxWidth (640px) regardless of passage presence
- **Acceptance Criteria**: Question content width is consistent across passage/no-passage transitions
- **Verification**: (BROWSER) Navigate across passage/no-passage boundaries (Q13-Q14, Q17-Q18)

## Technical Design

### Architecture
CSS fix in globals.css, animation + layout fix in DiagnosticTestView.tsx.

### Dependencies
None.

## Traceability Matrix

| REQ ID  | Description                    | Verification | Test File | Status  |
|---------|--------------------------------|--------------|-----------|---------|
| REQ-001 | Scrollbar gutter stability     | (BROWSER)    | N/A       | Pending |
| REQ-002 | Opacity-only question fade     | (BROWSER)    | N/A       | Pending |
| REQ-003 | Consistent maxWidth            | (BROWSER)    | N/A       | Pending |

## Implementation Order

1. REQ-001 — CSS-only change, independent
2. REQ-002 — Animation change in TSX
3. REQ-003 — maxWidth change in same TSX file

## Out of Scope

- SelectableText two-phase render optimization (separate task)
- Mobile layout changes
- Passage/no-passage structural transition (intentional section boundary)
