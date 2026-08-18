---
name: spec-writing
description: Comprehensive guide to writing well-structured specs in the claude-code-setup spec-driven TDD workflow. Covers REQ granularity, verification tag selection, audit failure recovery, and common mistakes.
---

# Spec Writing

Everything needed to write a spec that passes `audit-spec.sh` on the first try and gives the TDD phase a clear, unambiguous target.

**Template**: `.claude/templates/spec.md.template`
**Save to**: `.claude/plans/[feature-name].md`
**Validated by**: `.claude/scripts/audit-spec.sh` (runs automatically after you write the file)

---

## 1. REQ Granularity Rules

A REQ describes **one observable behavior** — what the system does from the user's or caller's perspective, not how it is implemented.

### The Core Test

Ask: "Can I write a single focused test for this REQ?" If the answer requires multiple unrelated assertions, split the REQ.

### Granularity Targets

| Feature Type | Target REQ Count |
|---|---|
| Bug fix | 1–3 |
| Small feature | 3–8 |
| Typical feature | 8–15 |
| Major feature | 15+ (but split into sub-specs if possible) |

### Split a REQ When

- The description contains "and" connecting two distinct behaviors
- It would require testing two separate system states
- Different parts have different verification tags (TEST vs BROWSER)
- Two different user roles are involved

### Combine REQs When

- Behaviors are logically inseparable ("displays error when input is invalid" — the display and the trigger are one observable fact)
- Separating them would produce a REQ with no standalone meaning

### Observable Behavior vs Implementation

| Bad (impl-focused) | Good (behavior-focused) |
|---|---|
| "Implement email validation" | "User sees an inline error when email format is invalid" |
| "Handle all form validation" | "Form submit button is disabled until all required fields are filled" |
| "Add password hashing" | "Stored passwords cannot be recovered in plaintext" |
| "Call the payment API" | "User receives an order confirmation after successful payment" |

---

## 2. Verification Tag Selection Guide

Every REQ must have exactly one verification tag on its `**Verification**` line.

| Situation | Tag | Reason |
|---|---|---|
| Pure logic, no UI | (TEST) | Unit or integration test asserts behavior |
| API returns correct response | (TEST) | Integration test against the endpoint |
| Database schema change | (TEST) | Migration test verifies schema state |
| Business rule / calculation | (TEST) | Unit test is sufficient and fast |
| UI renders correctly | (BROWSER) | Playwright/Cypress checks DOM |
| Visual design / layout check | (BROWSER) | Screenshot or element presence test |
| Accessibility audit | (BROWSER) | axe-core via Playwright |
| User interaction flow (click, type, navigate) | (BROWSER) | E2E test drives the flow |
| Requires human judgment | (MANUAL) | Last resort only |
| Security review of logic | (MANUAL) | Human review is required |

### Tag Decision Rule

1. Default to **(TEST)**.
2. Upgrade to **(BROWSER)** only if the DOM or visual rendering is part of the behavior.
3. Use **(MANUAL)** only when automation is genuinely impossible (e.g., "looks correct to a designer").

The audit script warns when zero `(TEST)` tags are present. Having only `(BROWSER)` and `(MANUAL)` tags is a red flag.

### Playwright Tools for (BROWSER) Verification

When a REQ has `(BROWSER)` tag, the test should use Playwright. Two approaches:

**E2E test file (preferred for repeatable checks):**
```typescript
// tests/e2e/registration.spec.ts
import { test, expect } from '@playwright/test';

test('REQ-002: Invalid email shows inline error', async ({ page }) => {
  await page.goto('/register');
  await page.fill('[name="email"]', 'not-an-email');
  await page.click('button[type="submit"]');
  await expect(page.locator('.error')).toContainText('valid email');
});
```

**Playwright MCP (preferred for ad-hoc diagnosis):**
Claude can use MCP tools directly during development:
- `navigate` → go to the page
- `screenshot` → capture current visual state
- `click` / `fill` → interact with elements
- Use this for quick visual checks, not as a substitute for test files

---

## 3. Good vs Bad Spec Examples

### Feature: User Registration

---

#### Bad Spec (will fail audit)

```markdown
# Spec: Registration

## Requirements

### REQ-001: Implement user registration
- **Description**: {{Add registration logic}}
- **Verification**: (TEST) | (BROWSER) | (MANUAL)
- **Priority**: Must | Should | Could

### REQ-002: Handle all form validation
- **Description**: Make sure the form validates inputs
- **Verification**: (TEST)
- **Priority**: Should

### REQ-001: Send email
- **Description**: Send a welcome email
- **Verification**: (TEST)
- **Priority**: Must
```

Problems:
- REQ-001 is defined twice (duplicate — audit FAILS)
- Unfilled `{{...}}` placeholder in description (audit WARNS)
- REQ-002 is too broad ("all form validation" = multiple behaviors)
- REQ-001 title says "Implement" — impl-focused, not behavior-focused
- No traceability matrix (audit WARNS)
- No `**Depends on**` or `**Priority**` values filled in properly

---

#### Good Spec (passes audit)

```markdown
# Spec: User Registration

**Author**: Jason
**Date**: 2026-03-01
**Status**: Draft

---

## Overview

Allow new users to create an account using email and password. Registration
validates inputs, hashes the password, persists the account, and sends a
welcome email.

---

## Requirements

### REQ-001: Valid registration creates a user account
- **Description**: When a user submits the registration form with a valid email
  and a password meeting strength requirements, a new account is created and
  the user is redirected to the dashboard.
- **Verification**: (TEST)
- **Priority**: Must
- **Depends on**: —

### REQ-002: Invalid email format shows an inline error
- **Description**: When the submitted email does not match standard email format,
  the form displays an inline error message next to the email field without
  submitting.
- **Verification**: (BROWSER)
- **Priority**: Must
- **Depends on**: —

### REQ-003: Weak password shows a strength error
- **Description**: When the submitted password is fewer than 8 characters or
  contains no special characters, the form displays a password strength error
  and prevents submission.
- **Verification**: (BROWSER)
- **Priority**: Must
- **Depends on**: —

### REQ-004: Duplicate email returns a friendly error
- **Description**: When a user attempts to register with an email address already
  in the system, the form displays "An account with this email already exists"
  without exposing whether the email is in use to unauthenticated third parties.
- **Verification**: (TEST)
- **Priority**: Must
- **Depends on**: REQ-001

### REQ-005: Welcome email is sent after successful registration
- **Description**: After a new account is created, the system sends a welcome
  email to the registered address within 30 seconds.
- **Verification**: (TEST)
- **Priority**: Should
- **Depends on**: REQ-001

---

## Traceability Matrix

| REQ ID | Description | Verification | Test/Check Location |
|--------|-------------|--------------|---------------------|
| REQ-001 | Valid registration creates account | (TEST) | `src/__tests__/registration.test.ts` |
| REQ-002 | Invalid email shows inline error | (BROWSER) | `e2e/registration.spec.ts` |
| REQ-003 | Weak password shows strength error | (BROWSER) | `e2e/registration.spec.ts` |
| REQ-004 | Duplicate email returns friendly error | (TEST) | `src/__tests__/registration.test.ts` |
| REQ-005 | Welcome email sent after registration | (TEST) | `src/__tests__/mailer.test.ts` |
```

---

## 4. Audit Failure Recovery

The audit script (`audit-spec.sh`) reports one of three outcomes:
- `PASSED` (exit 0) — proceed to `/tdd`
- `WARNINGS` (exit 1) — fix before implementation, not strictly blocking
- `FAILED` (exit 2) — coding tools are blocked until resolved

### Failure: "No requirement IDs (REQ-XXX) found"

The script looks for the pattern `REQ-[0-9]{3}`. Your headings must use exactly this format.

Fix: Change `### User can log in` to `### REQ-001: User can log in`

### Failure: "X requirements missing verification tags"

The script checks the 3 lines after each REQ ID for `**Verification**: (TEST|BROWSER|MANUAL)`.

Fix: Add the line `- **Verification**: (TEST)` inside each REQ block.

### Failure: "Duplicate REQ definitions"

Two `### REQ-XXX:` headings share the same ID number.

Fix: Renumber the second occurrence so every REQ-XXX number appears only once. Check the traceability matrix too.

### Warning: "No traceability matrix found"

The script looks for a section containing "Traceability Matrix" or the header row `REQ ID | Description | Verification`.

Fix: Add the matrix table from the template below the Requirements section. Every REQ-XXX that appears in the requirements must also appear in the matrix.

### Warning: "X placeholder descriptions ({{...}}) found"

Unfilled `{{...}}` tokens from the template remain in the file.

Fix: Replace every `{{...}}` token with real content. Search for `{{` in your spec file before saving.

### Warning: "No 'Must' priority requirements found"

Fix: Set `**Priority**: Must` on at least one REQ.

### Warning: "REQs missing from traceability matrix"

A REQ is defined in the Requirements section but absent from the matrix table.

Fix: Add the missing row to the matrix. Every REQ-XXX defined in Requirements must appear in the matrix.

### Warning: "Gaps in REQ numbering"

REQ-001, REQ-003 exist but REQ-002 is missing.

Fix: Either add the missing REQ or renumber sequentially. Gaps are a warning, not a hard failure, but sequential numbering is expected convention.

---

## 5. Common Mistakes

**Writing implementation steps as requirements**
Write what the system does, not how it does it. "REQ-001: Hash password with bcrypt" → "REQ-001: Stored passwords cannot be recovered in plaintext"

**Reusing the same REQ-XXX number**
Each number must appear as a heading exactly once. The audit catches duplicate definitions and fails hard.

**Forgetting to update the traceability matrix**
Every time you add or remove a REQ, update the matrix. Adding a REQ without a matrix row causes a warning and creates traceability gaps.

**Using (MANUAL) for things that can be automated**
"User sees the correct total" is testable via Playwright. Reserve (MANUAL) for cases where automation is genuinely impossible (visual design aesthetics, legal review).

**Mega-REQs that need 5+ assertions**
If writing the test for a single REQ requires 5+ distinct `expect()` calls covering different behaviors, split the REQ. A REQ is a behavior, not a feature.

**Skipping the traceability matrix**
The matrix is required for completeness and is checked by the audit. It also serves as the map that connects REQs to test files — skipping it creates traceability debt.

**Leaving template placeholders**
Search your draft for `{{` before saving. Every `{{...}}` token is a placeholder the audit will flag.

**Priority field left as "Must | Should | Could"**
The template shows all three options separated by `|`. Pick one and delete the others.

**Verification field left as "(TEST) | (BROWSER) | (MANUAL)"**
Same issue — pick exactly one tag.

---

## 6. Quick Start Checklist

Run through this before saving a spec to `.claude/plans/`.

- [ ] Title is descriptive — no generic "Implement X" wording
- [ ] Overview section is filled in (no `{{...}}` tokens)
- [ ] Every requirement uses `### REQ-XXX: Title` heading format
- [ ] Every REQ-XXX number is unique (no duplicates)
- [ ] REQ numbers are sequential with no gaps (001, 002, 003...)
- [ ] Every REQ has `- **Description**: ...` with observable behavior (not impl steps)
- [ ] Every REQ has `- **Verification**: (TEST)` or `(BROWSER)` or `(MANUAL)` — one only
- [ ] Every REQ has `- **Priority**: Must` or `Should` or `Could` — one only
- [ ] At least one REQ is `**Priority**: Must`
- [ ] At least one REQ uses `(TEST)` verification
- [ ] Traceability matrix section is present
- [ ] Every REQ-XXX defined in Requirements also appears in the matrix
- [ ] Matrix rows have real test file paths (not `{{...}}` placeholders)
- [ ] No remaining `{{...}}` placeholder tokens anywhere in the file
- [ ] Technical Approach and Implementation Steps sections are filled in

After saving, `audit-spec.sh` runs automatically. A `PASSED` or `WARNINGS` result unblocks coding tools. A `FAILED` result means fix the listed issues before proceeding.
