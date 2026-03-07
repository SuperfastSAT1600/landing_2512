# Diagnostic Test #1 — Student Info & Results Management

**Author**: Team
**Date**: 2026-03-06
**Status**: Draft

---

## Overview

Extend the existing diagnostic test feature (6-digit OTP → Bluebook UI) with a complete student information flow and result persistence system. Students will enter an access token to identify themselves, confirm their information, take the test (with properly displayed header), and have their results saved to Supabase. Admins will be able to generate access tokens and review all test results with detailed breakdowns.

This feature enables end-to-end test administration: token generation → student identification → test taking → result persistence → admin review.

---

## Requirements

### REQ-001: Test header displays correctly below menu bar
- **Description**: User sees the Bluebook header (test title + 30-minute timer) properly positioned below the fixed menu bar without overlap or clipping.
- **Verification**: (BROWSER)
- **Priority**: Must
- **Depends on**: —

### REQ-002: Student can enter and validate an access token
- **Description**: On the diagnosis page, a student enters a UUID-format access token. If valid and not expired, the system fetches the student name and email from the token record. If invalid or expired, an error message is displayed.
- **Verification**: (TEST)
- **Priority**: Must
- **Depends on**: —

### REQ-003: Validated token displays student information
- **Description**: After token validation, the student sees their name and email displayed. A "Start Test" button transitions to the test-taking phase. Student information cannot be modified.
- **Verification**: (BROWSER)
- **Priority**: Must
- **Depends on**: REQ-002

### REQ-004: Test results are persisted to Supabase
- **Description**: When a student submits a test (manually or via 30-minute auto-submit), the answers, confidence levels, flagged questions, per-question timings, and total time are saved to `diagnostic_test_results` table linked to the access token.
- **Verification**: (TEST)
- **Priority**: Must
- **Depends on**: REQ-003

### REQ-005: Admin can generate access tokens with 24-hour auto-expiration
- **Description**: Admin navigates to `/admin/diagnosis`, enters a student's email and name, and clicks "Generate Token". A unique UUID token is created with `expires_at = now() + 24 hours`. Token and test link are displayed for copying.
- **Verification**: (BROWSER)
- **Priority**: Must
- **Depends on**: —

### REQ-006: Admin can view list of test results with filtering
- **Description**: Admin views `/admin/diagnosis` results tab showing all completed tests (student name, email, submission date, total time). Filters by date range and search by name/email are functional.
- **Verification**: (BROWSER)
- **Priority**: Must
- **Depends on**: REQ-004

### REQ-007: Admin can view detailed student test results
- **Description**: Admin clicks a student result to view `/admin/diagnosis/[id]`, showing per-question answers, confidence levels, time spent per question, flagged-question list, and total session time.
- **Verification**: (BROWSER)
- **Priority**: Must
- **Depends on**: REQ-004, REQ-006

### REQ-008: Test auto-submits when 30-minute timer expires
- **Description**: If a student does not manually submit before the timer reaches 00:00, the system automatically submits the test with all current answers and flags the submission as auto-submitted (optional flag in results).
- **Verification**: (TEST)
- **Priority**: Must
- **Depends on**: REQ-003

---

## Technical Design

### Architecture

**New Components:**
- `src/app/diagnosis/components/TokenInputForm.tsx` — Token entry and validation UI
- `src/app/diagnosis/components/StudentConfirmForm.tsx` — Student info display and confirmation
- `src/types/diagnosis.ts` — TypeScript types for AccessToken and TestResult

**Modified Components:**
- `src/app/diagnosis/page.tsx` — Extend phase state machine: `'token-entry'` → `'student-confirm'` → `'test-active'` → `'completed'`
- `src/app/diagnosis/components/DiagnosticTestView.tsx` — Add props for token and student info; call API on submit

**New API Routes:**
- `POST /api/diagnosis/validate-token` — Validate token, check expiration, return student info
- `POST /api/diagnosis/submit` — Persist test results to Supabase
- `POST /api/admin/diagnosis/tokens` — Generate new token (admin-only)
- `GET /api/admin/diagnosis/results` — List test results with optional filters
- `GET /api/admin/diagnosis/results/[id]` — Get detailed results for a student

**New Admin Pages:**
- `src/app/admin/diagnosis/page.tsx` — Dual-tab interface: "Generate Token" + "View Results"
- `src/app/admin/diagnosis/[id]/page.tsx` — Detailed result page

**Database Tables:**
- `diagnostic_access_tokens` — Token records with student info, expiration, and usage tracking
- `diagnostic_test_results` — Test submissions with answers, timings, and confidence levels

### Dependencies

**Supabase**: PostgreSQL tables for tokens and results
**Existing**: Bluebook UI component, test data, timer logic
**Crypto**: Built-in `crypto.randomUUID()` for token generation

---

## Traceability Matrix

| REQ ID | Description | Verification | Test File | Status |
|--------|-------------|--------------|-----------|--------|
| REQ-001 | Test header displays below menu bar | (BROWSER) | `e2e/diagnosis-header.spec.ts` | Pending |
| REQ-002 | Student enters and validates token | (TEST) | `src/__tests__/api/validate-token.test.ts` | Pending |
| REQ-003 | Validated token shows student info | (BROWSER) | `e2e/diagnosis-flow.spec.ts` | Pending |
| REQ-004 | Test results persisted to Supabase | (TEST) | `src/__tests__/api/submit.test.ts` | Pending |
| REQ-005 | Admin generates token with 24h expiry | (BROWSER) | `e2e/admin-diagnosis-tokens.spec.ts` | Pending |
| REQ-006 | Admin views results list with filters | (BROWSER) | `e2e/admin-diagnosis-results.spec.ts` | Pending |
| REQ-007 | Admin views detailed student results | (BROWSER) | `e2e/admin-diagnosis-detail.spec.ts` | Pending |
| REQ-008 | Test auto-submits at 30-minute timer | (TEST) | `src/__tests__/components/auto-submit.test.ts` | Pending |

---

## Implementation Order

1. **REQ-002 & REQ-004 & REQ-005** — Database schema and API layer first (tokens, results, validation endpoints). Build the contract that the UI depends on.

2. **REQ-001** — Fix header layout (CSS adjustments in `page.tsx` and `DiagnosticTestView.tsx`). Quick, independent task.

3. **REQ-003 & REQ-008** — Extend phase state machine in `page.tsx` and add token/student flows. REQ-008 relies on existing timer logic.

4. **REQ-006 & REQ-007** — Admin pages consume the APIs built in step 1, no new backend work.

**Parallelization**: Steps 1 and 2 can run in parallel (independent). Steps 3–4 depend on step 1.

---

## Out of Scope

- User authentication for student access (tokens are the auth mechanism)
- Email notifications to students after test submission
- Advanced analytics or test statistics beyond raw result storage
- Token revocation or deactivation mid-use
- Multi-test scenarios (only Diagnostic Test #1 supported)
