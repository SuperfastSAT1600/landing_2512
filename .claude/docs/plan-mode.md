# Plan Mode: Spec-First Enforcement

This document explains the spec-first workflow gate — what it is, why it exists, and how to work with it.

---

## What Is the `.plan-active` Flag?

When a new Claude Code session starts, the `SessionStart` hook runs `.claude/scripts/plan-mode-session-start.sh`. That script creates a file at `.claude/.plan-active`.

This flag signals one thing: **no spec has been written yet for this session.**

The flag is skipped if a spec was written within the last 60 minutes (detected by checking `.claude/plans/` for recently modified `.md` files). Otherwise, it is always created at session start.

---

## Why Are Coding Tools Blocked?

The `PreToolUse` hook runs `.claude/scripts/enforce-spec-before-coding.sh` before every `Edit`, `Write`, `Bash`, and `Task` call.

If `.plan-active` exists and no spec file is found in `.claude/plans/`, the script returns exit code 2 — which blocks the tool call with this message:

```
[Hook] BLOCKED — You are in plan mode but haven't written a spec yet.

[Hook] CLAUDE ACTION REQUIRED:
[Hook]   1. Create .claude/plans/[feature-name].md using .claude/templates/spec.md.template
[Hook]   2. Include REQ-XXX IDs, (TEST)/(BROWSER)/(MANUAL) tags, and a traceability matrix
[Hook]   3. After writing the spec, your coding tools will be unblocked automatically
```

This prevents agents from jumping to implementation before they have defined what they are building and how it will be verified.

### What Is Still Allowed While Blocked

Not everything is blocked. The enforcement script allows:

- `Write` to `.claude/plans/` — so you can write the spec itself
- `Edit` to `.claude/plans/` — so you can revise the spec
- Read-only `Bash` commands: `git status`, `git log`, `git diff`, `git branch`, `ls`, `cat`, `head`, `tail`, `wc`, `find`, `grep`, `echo`, `pwd`, `mkdir -p .claude/plans`

---

## How to Unblock Coding Tools

Write a spec file to `.claude/plans/[feature-name].md`.

Use the template at `.claude/templates/spec.md.template` as your starting point.

When the spec file is written, the `PostToolUse` hook on `Write` automatically runs `.claude/scripts/clear-plan-flag.sh`, which:

1. Deletes `.claude/.plan-active`
2. Runs `audit-spec.sh` against the new spec
3. If the audit finds **critical failures** (exit code 2): re-sets the flag, keeping coding tools blocked until the spec is fixed
4. If the audit **passes or has warnings only**: coding tools are unblocked

To fix a failing spec, use `Edit` on your spec file (allowed even while blocked) and correct the issues reported by the audit. See `.claude/docs/spec-audit-criteria.md` for exactly what the audit checks.

---

## Recovery: Flag Is Stuck

If the flag is incorrectly set — for example, a valid spec already exists in `.claude/plans/` but coding tools are still blocked — you can recover manually.

**Option 1**: Run the clear script directly:

```bash
bash .claude/scripts/clear-plan-flag.sh
```

Note: this script reads hook JSON from stdin, so calling it directly without hook input will silently exit without clearing. In that case, use option 2.

**Option 2**: Delete the flag file directly:

```bash
rm .claude/.plan-active
```

This is always safe. The flag file contains no state beyond its existence.

---

## Key Points

- **"Plan mode" here is not Claude's built-in plan mode.** It refers to the spec-first gate enforced by shell hooks. The two are independent systems.
- **The flag resets every session.** Unless a spec was written within the last 60 minutes, you will start each session in the blocked state.
- **Writing a spec is the only legitimate unblock path.** Do not attempt workarounds (deleting the flag without writing a spec defeats the purpose of the system).
- **If you see cryptic "tool blocked" errors**, check whether `.claude/.plan-active` exists. That file is almost always the cause.
- **Subagents are also affected.** If a subagent is spawned mid-session before a spec is written, it will also be blocked by the hook. Write the spec from the main agent first.

---

## Flow Summary

```
Session starts
    └─ SessionStart hook runs plan-mode-session-start.sh
         ├─ Recent spec exists (< 60 min)? → No flag set, coding allowed
         └─ No recent spec → .claude/.plan-active created

Agent tries to use Edit/Write/Bash/Task
    └─ PreToolUse hook runs enforce-spec-before-coding.sh
         ├─ No flag? → Allow
         ├─ Flag + spec in .claude/plans/? → Clear flag, allow
         ├─ Write/Edit to .claude/plans/? → Allow (spec writing)
         ├─ Read-only Bash? → Allow
         └─ Anything else → BLOCK (exit 2)

Agent writes spec to .claude/plans/feature.md
    └─ PostToolUse hook runs clear-plan-flag.sh
         ├─ Deletes .plan-active
         ├─ Runs audit-spec.sh
         ├─ Audit passes or warns → Coding unblocked
         └─ Audit critical failure → Re-sets flag, spec must be fixed first
```
