# Task Execution Protocol (Mandatory)

---

## Phase 0: INIT

1. Read `.claude/user/errors.md` (subagents: `.claude/user/agent-errors/{name}.md`)
2. Check `.claude/skills/INDEX.md` for relevant skills
3. Read `docs/PRD.md` for scope

---

## Phase 1: SPEC (hook enforced)

Write spec to `.claude/plans/[feature].md` using template. Each REQ gets ID + `(TEST)`/`(BROWSER)`/`(MANUAL)` tag. Hooks block coding until spec passes audit.

**Skip only**: single-line typo, config tweak, doc-only change.

---

## Phase 2: ORCHESTRATION

See `orchestration/routing.md`.

---

## Phase 3: IMPLEMENT (TDD — hook enforced)

`enforce-tdd-order.sh` blocks implementation until test written. Red → Green → Refactor.

Coverage: 80% overall | 90%+ business logic.

---

## Phase 4: VERIFY (hook blocks commit)

| Work Type | Minimum |
|-----------|---------|
| UI | Tests + Playwright MCP screenshot |
| API | Tests + curl real endpoint |
| DB/migrations | Run migration + query to confirm |
| Auth | Tests + full login/logout flow |
| Bug fix | Reproduce first, then verify fix |

**Fix loop**: Don't report failures. Find root cause, fix, re-verify. Repeat until green.

---

## Phase 5: GATE → `/checkpoint`

## Phase 6: SHIP → `/commit-push-pr`

---

## Subagent Protocol

Verify own workstream before returning. Return: `## Result` / `## Errors` / `## Fixes`

---

## Error Logging

Error → LOG to errors file → continue. `[category] Error: [what] | Correct: [how]`

Post-task: report HEAL/EVOLVE/ADAPT/REFACTOR observations. See `self-improvement.md`.
