# Spec: Submit Confirmation Screen

**Author**: Claude
**Date**: 2026-03-08
**Status**: Draft

---

## Overview

When a student clicks "Submit" on the diagnosis test, show a confirmation
screen with session stats before the actual API call fires. This prevents
accidental submission and lets students review their progress.

---

## Requirements

### REQ-001: Submit button opens confirmation screen instead of submitting immediately
- **Priority**: Must
- **Description**: Clicking "Submit" transitions to a confirmation screen without calling the API.
- **Acceptance Criteria**: Confirmation screen is visible; no POST to `/api/diagnosis/submit` yet.
- **Verification**: (BROWSER)

### REQ-002: Confirmation screen shows total elapsed time
- **Priority**: Must
- **Description**: Displays total time spent formatted as MM:SS (e.g. "12:34").
- **Acceptance Criteria**: Time matches `Date.now() - startTime` at the moment Submit was clicked.
- **Verification**: (BROWSER)

### REQ-003: Confirmation screen shows answered and unanswered question counts
- **Priority**: Must
- **Description**: Shows answered count and unanswered count out of 25 (e.g. "23 answered, 2 unanswered").
- **Acceptance Criteria**: Answered = `Object.keys(answers).length`; unanswered = `questions.length - answered`.
- **Verification**: (BROWSER)

### REQ-004: Confirmation screen shows average confidence level
- **Priority**: Must
- **Description**: Shows mean confidence across answered questions, one decimal (e.g. "3.4 / 5"). Shows "—" if none set.
- **Acceptance Criteria**: Only questions with a confidence entry are included in the average.
- **Verification**: (BROWSER)

### REQ-005: Confirmation screen shows saved vocabulary word count
- **Priority**: Must
- **Description**: Shows total words saved to vocab list (e.g. "7 words saved").
- **Acceptance Criteria**: Count equals `savedWords.length`.
- **Verification**: (BROWSER)

### REQ-006: Go back button returns student to the test
- **Priority**: Must
- **Description**: "Go back" button dismisses confirmation screen; student returns to the same question.
- **Acceptance Criteria**: Test UI is visible; current question index unchanged.
- **Verification**: (BROWSER)

### REQ-007: Confirm button triggers actual submission
- **Priority**: Must
- **Description**: Primary "Submit" button on confirmation screen calls the API and shows `TestSubmittedScreen`.
- **Acceptance Criteria**: One POST to `/api/diagnosis/submit` fires; `TestSubmittedScreen` appears on success.
- **Verification**: (BROWSER)

### REQ-008: calcAverageConfidence returns correct mean or null
- **Priority**: Must
- **Description**: Pure utility: returns mean of confidence values (1 decimal); returns null for empty input.
- **Acceptance Criteria**: `calcAverageConfidence({q1:3,q2:5})` → `4.0`; `calcAverageConfidence({})` → `null`.
- **Verification**: (TEST)

---

## Technical Design

### Architecture

- New component: `src/app/diagnosis/components/SubmitConfirmationScreen.tsx`
- New utility: `src/app/diagnosis/utils/calcAverageConfidence.ts`
- `DiagnosticTestView` gains `showConfirmation: boolean` state
- Submit button sets `showConfirmation = true` instead of calling `handleSubmit`
- Confirmation screen receives computed summary props; confirm calls `handleSubmit`; go-back sets `showConfirmation = false`

### Dependencies

No new external dependencies.

---

## Traceability Matrix

| REQ ID  | Description | Verification | Test/Check Location | Status |
|---------|-------------|--------------|---------------------|--------|
| REQ-001 | Submit opens confirmation, no API call | (BROWSER) | `tests/e2e/submit-confirmation.spec.ts` | Pending |
| REQ-002 | Shows total elapsed time | (BROWSER) | `tests/e2e/submit-confirmation.spec.ts` | Pending |
| REQ-003 | Shows answered / unanswered counts | (BROWSER) | `tests/e2e/submit-confirmation.spec.ts` | Pending |
| REQ-004 | Shows average confidence level | (BROWSER) | `tests/e2e/submit-confirmation.spec.ts` | Pending |
| REQ-005 | Shows saved word count | (BROWSER) | `tests/e2e/submit-confirmation.spec.ts` | Pending |
| REQ-006 | Go back returns to test | (BROWSER) | `tests/e2e/submit-confirmation.spec.ts` | Pending |
| REQ-007 | Confirm triggers submission | (BROWSER) | `tests/e2e/submit-confirmation.spec.ts` | Pending |
| REQ-008 | calcAverageConfidence unit test | (TEST) | `src/app/diagnosis/utils/__tests__/calcAverageConfidence.test.ts` | Pending |

---

## Implementation Order

1. REQ-008 — utility function (pure, no UI)
2. REQ-001 — add `showConfirmation` state
3. REQ-002–REQ-005 — build confirmation screen with all stats
4. REQ-006 — go-back button
5. REQ-007 — confirm button calls `handleSubmit`

---

## Out of Scope

- Persisting confirmation stats separately
- Animated transitions
- Per-section breakdown of answered/unanswered
