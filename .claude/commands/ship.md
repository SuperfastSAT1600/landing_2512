---
description: Autonomous end-to-end implementation of a written spec/plan — parallel build, exhaustive verify loops, root-cause fixes, then push to develop
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, Agent, TaskCreate, TaskUpdate, TaskList, TaskGet
---

# /ship — Autonomous Spec Delivery

Use this **after a spec or plan has been written** (e.g. via `/parallel-tdd`,
`/full-feature`, or a hand-written `.claude/plans/[feature].md`). You are
being delegated full authority to deliver every REQ in the spec end-to-end,
unsupervised. The user will not be available to answer questions until ship
is complete.

This command is the most aggressive in the system. Do not invoke for trivial
work — use `/quick-fix` or `/push-to-develop` instead.

## Operating principles

1. **Comprehensive and careful, in equal measure.** Speed comes from parallelism,
   not from skipping steps.
2. **Parallel orchestration by default.** Independent REQs → subagents in parallel.
   Use `/parallel-tdd`'s Agent Team pattern when 4+ workstreams exist; otherwise
   spawn subagents in a single message.
3. **No phantom completion.** A REQ is not done until `/verify` proves it.
4. **Root-cause every failure.** Never patch symptoms — use `/fixroot` for each
   error. Defensive band-aids are forbidden.
5. **Loop until 100% green.** Verify → fix → verify again. There is no acceptable
   level of red.
6. **No user check-ins.** You have full delegation. If you hit a genuinely
   ambiguous decision, pick the option most consistent with the spec's intent
   and the existing codebase, document the choice in the commit, and move on.

## Procedure

### Phase 1 — Load context
1. Read `.claude/user/errors.md` for known pitfalls.
2. Read `docs/PRD.md` for architectural scope.
3. Enumerate every REQ-ID from the spec already in context. Create a
   TaskCreate task for each REQ plus one each for "Cross-REQ verify", "E2E",
   and "Push".

### Phase 2 — Parallel implementation
1. Group REQs by dependency. Independent groups go in parallel.
2. For each group:
   - **4+ workstreams** → use `/parallel-tdd` Agent Team
   - **2–3 workstreams** → spawn subagents in a single message
   - **1 workstream** → implement directly (still TDD: Red → Green → Refactor)
3. Each builder MUST follow TDD enforcement (test first, then code).
4. As each REQ lands, mark its task in_progress → completed only after the
   REQ's own tests pass locally.

### Phase 3 — Per-REQ verification (`/verify` ×N)
For **every single REQ**, run `/verify` against just that REQ's surface:
- UI REQs → tests + Playwright screenshot
- API REQs → tests + curl real endpoint
- DB/migration REQs → run migration + query
- Auth REQs → tests + full login/logout flow
- Bug-fix REQs → reproduce first, then verify fix

If `/verify` finds errors:
1. For each error, run `/fixroot` to trace to structural origin and eliminate
   the cause (not patch the symptom).
2. If the error involves runtime/server behavior, run `/serverlog` to pull
   the latest 100 logs from the relevant Render service.
3. Re-run `/verify` after every fix. Repeat until green.

### Phase 4 — Cross-REQ integration verify
Run `/verify` again at the **integration level** — checking that the REQs
work together, not just in isolation:
- Do data flows from REQ-A reach REQ-B correctly?
- Are there race conditions between parallel features?
- Do shared types/contracts match between layers?
- Does the auth flow protect the new endpoints?

Apply the same fix loop: every error → `/fixroot` (+ `/serverlog` if needed)
→ re-verify. Loop until clean.

### Phase 5 — End-to-end (`/e2e`)
Run `/e2e` to exercise the complete user workflow described by the spec.
- Every error → `/fixroot` → `/serverlog` (if runtime) → re-run `/e2e`
- Do NOT stop at "tests probably pass" — require a clean E2E run

### Phase 6 — Final verification pass
Re-run `/verify` against every REQ one final time after all fixes. The
purpose: catch regressions introduced by later fixes. If anything reds again,
return to Phase 3.

### Phase 7 — Ship
Only when **every** REQ verifies AND `/e2e` is fully green:
1. Run `/push-to-develop`
2. The Slack notification (in Korean) is mandatory — `/push-to-develop`
   handles it; do not skip.

## The fix loop (canonical form)

```
loop:
  run /verify (or /e2e in Phase 5)
  if all green: exit loop
  for each error:
    if runtime/server issue: /serverlog to gather evidence
    /fixroot to find structural cause
    implement root-cause fix (no symptom patches)
    add regression test if missing
  goto loop
```

There is no max-iteration cap — keep going until the loop exits naturally
on a fully green run. If a single error has been "fixed" 3+ times and keeps
recurring, that means the root cause is deeper than the current understanding
— widen the `/fixroot` analysis (cross-file, architectural) before the next
attempt.

## Failure modes to refuse

- **Lowering coverage thresholds** to make tests pass — never.
- **`--no-verify` on commits** — never (hooks exist for a reason).
- **Marking a task complete while a related test is red** — never.
- **Skipping `/e2e` because unit tests pass** — never.
- **Patching a flaky test by adding retries instead of fixing the cause** — never.
- **Pushing with any verify or e2e error outstanding** — never.

## Self-discipline notes

- Maintain the TaskCreate/TaskUpdate list throughout. Future-you (or the user
  reviewing the commit) will use it to understand what shipped.
- Log every non-trivial error and its root-cause fix to
  `.claude/user/errors.md` under the `[ship]` category so the same trap can
  be avoided next run.
- Commit messages should reference REQ IDs covered.
- If — after exhausting fix loops — a REQ is genuinely impossible to verify
  in this environment (e.g. requires a third-party API key the agent lacks),
  document the gap clearly in the commit body and the Slack notification.
  Do NOT silently skip.

## Pre-flight check (run before starting)

- [ ] Each REQ has an ID and a `(TEST)` / `(BROWSER)` / `(MANUAL)` tag
- [ ] You can run the test suite locally
- [ ] You can reach any required services (database, dev server, Render logs)

If any check fails, fix the gap before entering Phase 1 — don't proceed with
a broken setup, because the entire loop will be unreliable.
