# Test Ladder Command

Progressive test escalation — each level gates the next.

---

## Usage

```
/test-ladder
/test-ladder --spec path/to/spec.md
```

---

## What This Command Does

Orchestrates a progressive testing ladder where each level must pass before the next runs. Ties into spec-driven development: requirements tagged `(TEST)` map to Phases 1-2, `(BROWSER)` to Phase 3, and `(MANUAL)` to Phase 4.

---

## Phases

### Phase 1: Unit Tests
```
- Run existing unit tests (vitest, jest, pytest, go test, cargo test)
- Report coverage if available
- If coverage < 80%, flag for attention
- Gate: all unit tests must pass before Phase 2
```

### Phase 2: Integration Tests
```
- Run integration tests (if they exist in test/integration/, __tests__/integration/, etc.)
- Verify component interactions and API contracts
- Gate: all must pass before Phase 3
```

### Phase 3: E2E Tests
```
- Run Playwright or Cypress tests (if configured)
- Maps to (BROWSER) tagged requirements from spec
- Gate: all must pass before Phase 4
```

### Phase 4: Manual Validation Checklist
```
- Extract (MANUAL) tagged requirements from spec (if --spec provided)
- Present as a checklist for human review
- If no spec provided, present general manual checklist
```

---

## Spec Integration

When used with a spec file:

```
/test-ladder --spec .claude/plans/user-auth.md
```

The command extracts requirements by verification tag:
- `(TEST)` requirements → Verified in Phases 1-2
- `(BROWSER)` requirements → Verified in Phase 3
- `(MANUAL)` requirements → Presented as checklist in Phase 4

---

## Output Example

```
==============================================
Test Ladder — Progressive Escalation
==============================================

Phase 1: Unit Tests
  Running: npx vitest run
  PASS: 42 tests passed (3s)
  Coverage: 87% (above 80% threshold)
  Gate: PASSED ✓

Phase 2: Integration Tests
  Running: npx vitest run test/integration/
  PASS: 8 tests passed (5s)
  Gate: PASSED ✓

Phase 3: E2E Tests
  Running: npx playwright test
  PASS: 12 tests passed (18s)
  Gate: PASSED ✓

Phase 4: Manual Validation
  From spec: 2 requirements need manual verification
  - [ ] REQ-005: Admin can override user settings (MANUAL)
  - [ ] REQ-008: Email notifications render correctly across clients (MANUAL)

==============================================
Summary
==============================================
  Phases passed: 3/3 automated
  Manual items: 2 (require human review)
```

---

## When Gate Fails

If a phase fails, the ladder stops:

```
Phase 1: Unit Tests
  Running: npx vitest run
  FAIL: 3 tests failed (2s)
  Gate: FAILED ✗

Ladder stopped at Phase 1.
Fix unit test failures before proceeding.
Failed tests:
  - src/__tests__/auth.test.ts: REQ-001: user can register
  - src/__tests__/auth.test.ts: REQ-002: user receives confirmation
  - src/__tests__/cart.test.ts: REQ-007: cart calculates total
```

---

## When to Use

- After implementing a feature with a spec
- When you want more confidence than just running `npm test`
- Before creating a PR for critical features
- As an alternative to `/checkpoint` when you want progressive escalation

---

## Related Commands

- `/checkpoint` — All-at-once verification (types, lint, format, tests, build, security)
- `/tdd` — Write tests using TDD methodology
- `/e2e` — Generate and run E2E tests specifically
- `/full-feature` — References test-ladder for features with specs

---

## Related Files

- Spec template: `.claude/templates/spec.md.template`
- Spec audit: `.claude/scripts/audit-spec.sh`
