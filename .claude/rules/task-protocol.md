# Task Execution Protocol (Mandatory)

---

## Phase 0: INIT

1. **Read errors file FIRST** — `.claude/user/errors.md` (main) or `.claude/user/agent-errors/{name}.md` (subagent)
2. **Load skills** — check `.claude/skills/INDEX.md` "Skill Selection by Task Type"
3. **PRD** — `docs/PRD.md` for scope and architecture

---

## Phase 1: PRE-TASK

**Spec?** Write one if the task warrants it — see `workflow/spec-rules.md`. Quick rule: new feature, 2+ files, or parallel implementation → write spec. Typos/config tweaks → skip.

**Routing?** See `orchestration/routing.md` for specialist delegation and parallel vs sequential logic.

**Task list?** Create for multi-step (3+) or non-trivial tasks. Mark `in_progress` when starting, `completed` when done. Skip for single straightforward tasks.

---

## Phase 2: DURING

**Error logging (immediate, non-blocking)**: Error → LOG to errors file → continue. Format: `[category] Error: [what] | Correct: [how]`. Never skip logging. Only stop entirely when error blocks all meaningful progress.

**Observations**: Note HEAL / EVOLVE / ADAPT / REFACTOR issues mentally. Report in Phase 3. See `self-improvement.md`.

---

## Phase 3: POST-TASK (VERIFY-FIX LOOP — MANDATORY)

1. **Verify** — run tests, check UI (Playwright), call API endpoints. See `workflow/verification.md`.
   - If ANYTHING fails → **FIX THE ROOT CAUSE YOURSELF**. Never report failure to user.
   - No surface-level patches or workarounds. Trace to the fundamental source and fix that.
   - Re-verify after fix. Loop until everything passes. Never give up.
2. **Report** — `OBSERVATIONS: [items or "none"]`
3. **Auto-heal** — apply safe fixes (broken refs, typos); propose anything larger
4. **Docs** — feature → README/API/changelog | API change → docs/examples | small (1-2 files) = direct, large (3+) = doc-updater subagent

**CRITICAL**: Writing code and saying "done" without verification is NEVER acceptable. The `git commit` command is blocked until verification runs. See `workflow/verification.md`.

---

## Subagent Protocol

Verify your own workstream before returning — run your tests, confirm your endpoint responds. Fix any `.claude/` issues encountered and report them.

Return format:
```
## Result: [work done]
## Errors: [category] Error: [what] | Correct: [how]
## Fixes: [file] - [what was fixed]
```

---

## Quick Reference

```
INIT:  errors.md → skills/INDEX.md → PRD
PRE:   spec? (spec-rules.md) | skills? | route? (routing.md) | task list?
MID:   error → LOG → continue
POST:  verify (verification.md) → observations → heal → docs
```
