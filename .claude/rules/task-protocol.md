# Task Execution Protocol (Mandatory)

One unified workflow — always followed. The only variable is **Phase 2: Orchestration** (who codes).

---

## Phase 0: INIT

1. **Read errors file FIRST** — `.claude/user/errors.md` (main) or `.claude/user/agent-errors/{name}.md` (subagent)
2. **Load skills** — check `.claude/skills/INDEX.md` "Skill Selection by Task Type"
3. **PRD** — `docs/PRD.md` for scope and architecture

---

## Phase 1: SPEC (enforced by hooks)

**DEFAULT: Always write a spec.** The SessionStart hook sets a `.plan-active` flag that blocks all coding tools until a spec is written.

**Only exceptions** (may ask user "Skip spec?"):
- Single-line typo fix
- Config file tweak (tsconfig, package.json, .env)
- Doc-only change (README, comments)

**How**:
1. Write to `.claude/plans/[feature].md` using `.claude/templates/spec.md.template`
2. Each requirement: `REQ-XXX` ID + `(TEST)` / `(BROWSER)` / `(MANUAL)` tag + one-line acceptance criterion
3. Audit runs automatically on save — coding tools unlock when it passes

---

## Phase 2: ORCHESTRATION (context-dependent — the only variable)

Choose based on task scope. See `orchestration/routing.md` for the full decision tree.

| Scope | Route |
|-------|-------|
| Simple (<10 lines, 1 domain) | Main agent codes directly |
| Specialist domain (auth, AI, mobile…) | Delegate to specialist subagent |
| 2–3 parallel workstreams | Parallel subagents (one message, multiple Agent calls) |
| Large feature (4+ workstreams) | Agent Team: fixed 6-role pipeline via `/parallel-tdd` |

**Parallel-first rule**: Launch independent subagents in ONE message. Ask: "What can run in parallel?" + "What can I work on meanwhile?"

---

## Phase 3: IMPLEMENT (TDD — always the same, regardless of who codes)

For every REQ, follow Red-Green-Refactor:

1. **RED** — Write failing test: `test('REQ-XXX: behavior', () => { ... })`
   - Run to confirm failure for the right reason
2. **GREEN** — Write minimal code to pass
   - Run to confirm pass
3. **REFACTOR** — Improve while green

**Hook enforcement**: After a spec is written, `enforce-tdd-order.sh` BLOCKS writes to implementation files until a test file has been written first.

**Coverage minimums**: 80% overall | 90%+ business logic
**AAA pattern**: every test: Arrange → Act → Assert. No shared mutable state between tests.
**Mock** all external dependencies (APIs, DB, filesystem).

---

## Phase 4: VERIFY (mandatory after any code)

The `set-needs-verification.sh` hook flags `.needs-verification` after any code write. This **blocks `git commit`** until you run verification. You cannot skip this.

**Minimum by work type**:

| Work Type | Minimum Verification |
|-----------|---------------------|
| UI / frontend | Tests AND Playwright MCP (navigate → screenshot → check console) |
| Backend / API | Tests AND curl/fetch the endpoint, inspect real response |
| Database / migrations | Run migration AND query table to confirm schema |
| Auth | Tests AND full login/logout flow |
| Bug fix | Reproduce bug first, then verify fix eliminates it |
| Any code change | At minimum: run the relevant test suite |

**"Run tests" is never enough by itself for UI or API work.**

**E2E Playwright**:
- Mandatory after any UI, API, auth, or backend-visible change
- MCP for spot-checks during dev; `npx playwright test` for repeatable suites
- Run in parallel: `npx playwright test file1 file2 --workers=4`
- `(BROWSER)` REQs: write a Playwright test file for `req-coverage.sh`

**Fix loop (mandatory when verification fails)**:
1. **Do NOT report failure to user.** Fix it yourself.
2. **Find the root cause** — no surface patches or workarounds.
3. Re-verify. Repeat until everything passes.
4. Only then report completion.

**REQ verification tags**:
- `(TEST)` — unit/integration test passes (TDD Green phase is the gate)
- `(BROWSER)` — Playwright E2E test passes
- `(MANUAL)` — flag for user, do not block completion

---

## Phase 5: GATE

Run `/checkpoint`: types → lint → tests → build → security. All must pass.

---

## Phase 6: SHIP

Run `/commit-push-pr`: conventional commit → push → PR.

**Agent Team path**: each teammate verifies own REQs → lead merges all branches → `/checkpoint` → ship.

---

## Error Logging (immediate, non-blocking)

Error → LOG to errors file → continue. Format: `[category] Error: [what] | Correct: [how]`. Never skip.
Categories: `tool` | `code` | `cmd` | `context` | `agent` | `config`

---

## Observations (note during work, report after)

Note HEAL / EVOLVE / ADAPT / REFACTOR issues. Report with `OBSERVATIONS: [items or "none"]`. See `self-improvement.md`.

---

## Subagent Protocol

Verify your own workstream before returning. Fix any `.claude/` issues encountered.

Return format:
```
## Result: [work done]
## Errors: [category] Error: [what] | Correct: [how]
## Fixes: [file] - [what was fixed]
```

---

## Quick Reference

```
Phase 0:  errors.md → skills/INDEX.md → PRD
Phase 1:  spec → audit → hooks unlock coding
Phase 2:  orchestration (routing.md) — the only variable
Phase 3:  TDD Red→Green→Refactor per REQ — hook enforced
Phase 4:  verify → fix loop — hook blocks commit
Phase 5:  /checkpoint gate
Phase 6:  /commit-push-pr
```
