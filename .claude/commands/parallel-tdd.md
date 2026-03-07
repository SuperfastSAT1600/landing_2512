---
description: Run spec-driven parallel TDD using Agent Teams with shared task list, inter-agent messaging, and quality gate hooks
allowed-tools: Bash(./.claude/scripts/create-tdd-team.sh *), Bash(git worktree *), Bash(git merge *), Bash(git checkout *), TaskCreate, TaskUpdate, TaskList, TaskGet, TeamCreate, TeamDelete, SendMessage
---

# Parallel TDD

Run spec-driven TDD across multiple teammates using Agent Teams. Each teammate works in its own git worktree with its own context window. Tasks are coordinated through a shared task list with dependency management.

---

## Usage

```
/parallel-tdd [spec-file] [num-agents]
```

**Examples:**
```
/parallel-tdd .claude/plans/auth.md
/parallel-tdd .claude/plans/checkout.md 4
/parallel-tdd                              # uses most recent plan in .claude/plans/
```

---

## Prerequisites

- A valid spec file in `.claude/plans/` (create one with `/plan`)
- `claude` CLI available in PATH

---

## What This Command Does

1. **Parses the spec** — extracts all `REQ-XXX` IDs and their dependencies
2. **Creates git worktrees** — one isolated branch + directory per teammate
3. **Creates an agent team** — with shared task list
4. **Creates tasks** — one per REQ, with `blockedBy` for dependency chains
5. **Spawns teammates** — each assigned to a worktree, each following strict TDD
6. **Enforces quality gates** — `TaskCompleted` hook requires passing tests, `TeammateIdle` hook checks clean state

---

## How It Works

### Step 1: Run create-tdd-team.sh

```bash
bash ./.claude/scripts/create-tdd-team.sh [spec-file]
```

This outputs structured data describing REQs, dependencies, worktree paths, and spawn prompts.

### Step 2: Create the agent team

Use `TeamCreate` to create a team named after the feature (e.g., `tdd-auth`).

### Step 3: Create tasks from REQs

For each REQ in the spec, create a task using `TaskCreate`:
- **Subject**: `REQ-XXX: requirement title` (MUST follow this format — the TaskCompleted hook parses it)
- **Description**: Full requirement + TDD instructions
- **blockedBy**: Dependencies from the spec's `Depends on:` declarations

### Step 4: Spawn teammates

Spawn N teammates (one per worktree). Each teammate's spawn prompt should include:
- The worktree path they must work in
- The spec file path for full context
- Instruction to claim tasks from the shared task list
- TDD instructions: failing test first, then minimal code, then refactor

### Step 5: Monitor and coordinate

- Check task progress with `TaskList`
- Message teammates directly if needed
- When all tasks complete, coordinate the merge

### Step 6: Merge and verify

```bash
git checkout main
git merge --no-ff feat/feature-agent-1
git merge --no-ff feat/feature-agent-2
git merge --no-ff feat/feature-agent-3
bash ./.claude/scripts/verify-merge.sh
```

---

## Architecture

```
spec.md (REQ-001 to REQ-009, 3 teammates)
    │
    ├── .worktrees/auth-agent-1  → Teammate 1 (claims tasks from shared list)
    ├── .worktrees/auth-agent-2  → Teammate 2 (claims tasks from shared list)
    └── .worktrees/auth-agent-3  → Teammate 3 (claims tasks from shared list)

Shared task list: ~/.claude/tasks/tdd-auth/
    ├── Task: REQ-001 (no deps)         → claimed by Teammate 1
    ├── Task: REQ-002 (no deps)         → claimed by Teammate 2
    ├── Task: REQ-003 (no deps)         → claimed by Teammate 3
    ├── Task: REQ-004 (blocked by 001)  → auto-unblocks when 001 completes
    ├── Task: REQ-005 (blocked by 001)  → auto-unblocks when 001 completes
    └── Task: REQ-006 (blocked by 004)  → auto-unblocks when 004 completes
```

---

## Quality Gate Hooks

### TaskCompleted
When a task is marked complete:
1. Extracts REQ-XXX from task subject
2. Verifies a test file references that REQ ID
3. Runs the test suite
4. Blocks completion if no test found or tests fail

### TeammateIdle
When a teammate is about to go idle:
1. Checks for uncommitted changes
2. Runs the test suite
3. Runs lint (if configured)
4. Blocks idle if any checks fail

---

## Related Commands

- `/plan` — create the spec this command consumes
- `/tdd` — single-agent TDD (no parallelism)
- `/checkpoint` — unified verification gate after merge
- `/review` — review implementation after merging
