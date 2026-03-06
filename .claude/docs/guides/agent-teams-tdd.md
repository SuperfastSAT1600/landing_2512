# Agent Teams TDD Guide

Parallel spec-driven TDD using Claude Code's Agent Teams feature.

## Overview

Agent Teams provides native team coordination for parallel TDD:

- **Shared task list** with dependency management and auto-unblocking
- **Inter-agent messaging** so teammates can share findings
- **Quality gate hooks** that enforce TDD and clean state
- **Native display** (in-process cycling or tmux split panes)

## Prerequisites

1. Have a spec in `.claude/plans/` with REQ-XXX IDs

## Workflow

### 1. Write a Spec

Use `/plan` to discuss and write a spec to `.claude/plans/feature.md`. The spec must contain REQ-XXX IDs with verification tags:

```markdown
### REQ-001: User can register with email
- **Verification**: (TEST)
- **Priority**: Must

### REQ-002: Registration rejects invalid email
- **Verification**: (TEST)
- **Priority**: Must
- **Depends on**: REQ-001
```

### 2. Auto-Launch (Hook-Triggered)

When you write a spec with 2+ REQs, the PostToolUse hook automatically:
1. Runs `create-tdd-team.sh` to parse REQs and create worktrees
2. Outputs structured task data for the lead
3. The lead creates tasks and spawns teammates

### 3. Manual Launch

Alternatively, use the command directly:
```
/parallel-tdd .claude/plans/auth.md
```

### 4. During Implementation

Each teammate:
1. Claims an unblocked task from the shared task list
2. Reads the spec for context
3. Writes a failing test: `test('REQ-001: user can register with email', ...)`
4. Implements minimal code to pass
5. Refactors
6. Marks task complete

**Quality gates fire automatically:**
- `TaskCompleted` hook verifies a test references the REQ ID and tests pass
- `TeammateIdle` hook verifies clean state (no uncommitted changes, tests pass, lint clean)

### 5. Inter-Agent Communication

Teammates can message each other directly:

```
Teammate 2 → Teammate 1: "I need UserService.findByEmail() to return
the full user object, not just the ID. Can you update your implementation?"
```

### 6. Merge and Verify

After all tasks complete, merge worktree branches:
```bash
git checkout main
git merge --no-ff feat/auth-agent-1
git merge --no-ff feat/auth-agent-2
git merge --no-ff feat/auth-agent-3
bash ./.claude/scripts/verify-merge.sh
```

## Key Files

| File | Purpose |
|------|---------|
| `.claude/scripts/create-tdd-team.sh` | Parse spec, create worktrees, output task data |
| `.claude/scripts/hooks/task-completed-tdd.sh` | Enforce TDD on task completion |
| `.claude/scripts/hooks/teammate-idle-tdd.sh` | Quality gate on teammate idle |
| `.claude/scripts/launch-parallel-tdd.sh` | PostToolUse hook dispatcher |
| `.claude/commands/parallel-tdd.md` | Command definition |
| `.claude/settings.json` | Hook configuration |

## Troubleshooting

**Too many permission prompts**: Pre-approve common operations in `settings.local.json` permissions before spawning teammates.

**TaskCompleted hook blocking**: Ensure your test files reference the REQ ID (e.g., `test('REQ-001: ...')`). The hook greps for this pattern.
