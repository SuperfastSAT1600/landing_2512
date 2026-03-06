# Session Report Command

Summarize agent activity, checkpoint results, and errors from the current session.

---

## Usage

```
/session-report
/session-report --last 10
```

---

## What This Command Does

Reads `.claude/user/session-log.jsonl` and summarizes session activity:

1. **Agent Activity**: Which agents ran, how many times, success/fail rates
2. **Checkpoint Results**: Pass/fail breakdown from checkpoint runs
3. **Error Categories**: Errors grouped by category from errors.md
4. **Skills/MCPs Used**: Which skills and MCP servers were invoked

---

## Output Example

```
==============================================
Session Report
==============================================
Period: Last 24 hours (15 events)

Agent Activity
  code-reviewer:      3 runs (3 success, 0 fail)
  test-writer:        2 runs (2 success, 0 fail)
  architect:          1 run  (1 success, 0 fail)
  auth-specialist:    1 run  (0 success, 1 fail)

Checkpoint Results
  Last run: 2026-02-26 14:30:00 — PASSED (5/5 checks)
  Previous: 2026-02-26 12:15:00 — FAILED (4/5 checks, lint failed)

Error Summary (from errors.md)
  [context]: 2 errors
  [tool]:    1 error
  [code]:    0 errors

Recent Events
  14:30 checkpoint_run     result=pass  steps=tsc,eslint,test,build,audit
  14:25 agent_completed    agent=code-reviewer  result=success
  14:20 agent_completed    agent=test-writer    result=success
  13:45 agent_completed    agent=auth-specialist result=fail
  12:15 checkpoint_run     result=fail  steps=tsc,eslint(fail),test,build
```

---

## Data Source

Events are logged to `.claude/user/session-log.jsonl` by:
- `log-session-event.sh` script (called by hooks)
- SubagentStop hooks (agent completion events)
- Checkpoint script (verification results)

---

## When to Use

- End of a work session to review what happened
- After encountering issues to see patterns
- To audit which agents were used and their success rates
- To track checkpoint pass rates over time

---

## Related Commands

- `/checkpoint` — Generates checkpoint events
- `/health-check` — System configuration health (different from session activity)

---

## Related Files

- Session log: `.claude/user/session-log.jsonl`
- Event logger: `.claude/scripts/log-session-event.sh`
- Error log: `.claude/user/errors.md`
