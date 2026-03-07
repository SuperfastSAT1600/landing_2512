# Testing Rules

---

## TDD Cycle (ENFORCED BY HOOKS)

1. **RED** — Write a failing test describing the desired behavior
2. **GREEN** — Write minimal code to pass it
3. **REFACTOR** — Improve while keeping green

**Hook enforcement**: After a spec is written, the `enforce-tdd-order.sh` hook BLOCKS writes to implementation files until a test file (*.test.*, *.spec.*, __tests__/*, etc.) has been written first. This is not optional.

**Workflow**: Spec written → hook sets TDD RED phase → you MUST write a test file first → then implementation is unblocked.

**AAA pattern**: every test has Arrange (setup) → Act (invoke) → Assert (verify). Tests must be independent — no shared mutable state.

---

## Coverage

- Overall minimum: **80%** | Business logic: **90%+**
- Test happy path, error paths, and edge cases
- Mock external dependencies (APIs, DB, filesystem)

---

## E2E with Playwright (MANDATORY when relevant)

**Run after any task touching**: UI components/pages | API endpoints | Auth flows | Backend logic visible to the frontend. **Skipping when relevant = task not done.**

**How**: Use Playwright MCP to open the affected page/flow → interact with the changed feature → check console errors (`browser_console_messages`). If a test file exists: `npx playwright test`.

**Parallel execution (MANDATORY)**: Never run the entire E2E suite in one batch. Instead:
- Run individual test files in parallel: `npx playwright test file1.spec.ts file2.spec.ts --workers=4`
- Use `--shard` for large suites: `npx playwright test --shard=1/3` across parallel agents
- When using subagents or slash commands, split E2E files across parallel invocations
- Group tests by feature area and run groups concurrently

---

## REQ Verification Tags (when spec is active)

| Tag | Gate |
|-----|------|
| `(TEST)` | Unit/integration test passes — TDD Green phase is the gate |
| `(BROWSER)` | Playwright E2E test passes — write test file; use MCP for spot-checks |
| `(MANUAL)` | Flag for user, do not block completion |

See `workflow/verification.md` for the full post-implementation loop.
