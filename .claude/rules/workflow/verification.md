# Verification Rules (ENFORCED BY HOOKS)

**NEVER declare done without verification. NEVER leave broken code for the user to find.**

Writing code is only half the job. The other half is proving it works. If you write code and stop, you have not completed the task.

```
implement → verify → pass? → done
                   → fail? → fix → verify again (loop until green)
```

---

## Hook Enforcement

After writing any source code file, the `set-needs-verification.sh` hook sets a `.needs-verification` flag. This flag **blocks `git commit`** until you run verification (tests, build, Playwright, curl, etc.). The flag is cleared by `clear-verification.sh` when you run a verification command.

**You cannot skip verification.** The commit will be blocked.

---

## What Counts as Verification

| Work Type | MINIMUM Verification Required |
|-----------|-------------------------------|
| UI / frontend | Run tests AND Playwright MCP spot-check (navigate, screenshot, check console) |
| Backend / API | Run tests AND call the endpoint (curl/fetch), inspect real response |
| Database / migrations | Run migration AND query the table to confirm schema |
| DevOps / CI / config | Run the pipeline/script AND read actual output |
| Auth | Run tests AND exercise full login/logout flow |
| Any code change | At minimum: run the relevant test suite |
| Bug fix | Reproduce the bug first, then verify the fix eliminates it |

**"Run tests" is never enough by itself for UI or API work.** You must also do a real check (Playwright for UI, curl/fetch for API).

---

## The Fix Loop (MANDATORY)

When verification reveals a problem:

1. **Do NOT report the failure to the user and stop.** Fix it yourself.
2. **Find the root cause.** Do not apply surface-level patches or workarounds. Trace the error to its fundamental source and fix that.
3. Run verification again
4. Repeat until everything passes
5. Only then report completion

**Never ask the user for help fixing code.** You are the engineer. Diagnose the root cause, fix it, verify it works. If a fix doesn't work, that means you fixed the wrong thing — dig deeper, don't try random variations. The goal is always the simplest, most efficient code that solves the actual problem.

---

## Per-Route Responsibility

**Main agent**: Verify in same context. Fix and re-run if anything fails before calling done.

**Subagents**: Each verifies own workstream before returning. Main agent runs integration pass after all subagents complete.

**Agent Teams**: Each teammate verifies own REQs before marking task done. Lead runs `/checkpoint` as final gate.

---

## When a Spec Is Active

REQ verification tags are authoritative — see `workflow/testing-rules.md` for tag definitions (`TEST` / `BROWSER` / `MANUAL`).
