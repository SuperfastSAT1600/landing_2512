---
description: Run spec-driven parallel TDD using Agent Teams with shared task list, inter-agent messaging, and quality gate hooks
allowed-tools: Bash(./.claude/scripts/create-tdd-team.sh *), Bash(git worktree *), Bash(git merge *), Bash(git checkout *), TaskCreate, TaskUpdate, TaskList, TaskGet, TeamCreate, TeamDelete, SendMessage
---

# Parallel TDD

Run spec-driven TDD across a fixed 6-role cognitive pipeline using Agent Teams. Each builder works in its own git worktree. Tasks are coordinated through a shared task list with dependency management.

This command covers **Phases 2–4** of the unified workflow (see `task-protocol.md`) for large features (4+ workstreams).

---

## Usage

```
/parallel-tdd [spec-file]
```

**Examples:**
```
/parallel-tdd .claude/plans/auth.md
/parallel-tdd                              # uses most recent plan in .claude/plans/
```

---

## Prerequisites

- A valid spec file in `.claude/plans/` (create one with `/plan`)
- `claude` CLI available in PATH
- `tmux` available (optional — for dashboard monitoring)

---

## Fixed 6-Role Pipeline

The team structure is always identical regardless of feature size:

```
Lead (orchestrator)
├── Research Agent  — libs, APIs, patterns, best practices; no code → research.md
│       ↓
├── Architect       — technical plan, interfaces, file tree, contracts; no code → arch.md
│       ↓ (both builders receive arch.md + REQ split)
├── Builder 1       — implements first half of REQs; strict TDD; worktree
├── Builder 2       — implements second half of REQs; strict TDD; worktree
│       ↓ (both complete)
├── Verifier/QA     — edge cases, security, acceptance; reports bugs via SendMessage
└── Integrator      — deps, build, migration, CI; ensures system runs in reality
```

---

## What This Command Does

1. **Parses the spec** — extracts all `REQ-XXX` IDs
2. **Creates 2 git worktrees** — one for each builder (`builder-1`, `builder-2`)
3. **Creates an agent team** — with shared task list
4. **Creates tasks in pipeline order** — RESEARCH → ARCH → REQ tasks (split in half) → VERIFY + INTEGRATE
5. **Spawns all 6 teammates** — each with a role-specific prompt
6. **Enforces quality gates** — `TaskCompleted` hook requires passing tests, `TeammateIdle` hook checks clean state

---

## Step-by-Step

### Step 1: Run create-tdd-team.sh

```bash
bash ./.claude/scripts/create-tdd-team.sh .claude/plans/[spec].md
```

This creates the 2 worktrees and outputs structured task + spawn data for the lead.

### Step 2: Create the agent team

Use `TeamCreate` to create a team named after the feature (e.g., `tdd-auth`).

### Step 3: Create tasks from the pipeline

Create tasks in this order using `TaskCreate`:

1. `RESEARCH: Research phase` (no blockedBy)
2. `ARCH: Architecture plan` (blockedBy: RESEARCH task ID)
3. `REQ-001: title` … `REQ-N/2: title` (blockedBy: ARCH task ID) → assigned to Builder 1
4. `REQ-N/2+1: title` … `REQ-N: title` (blockedBy: ARCH task ID) → assigned to Builder 2
5. `VERIFY: QA and acceptance` (blockedBy: all REQ task IDs)
6. `INTEGRATE: Build and integration` (blockedBy: all REQ task IDs)

Task subjects MUST follow `REQ-XXX: title` format — the `TaskCompleted` hook parses this.

### Step 4: Spawn teammates

Spawn 6 teammates with role-specific prompts (see `create-tdd-team.sh` output for exact prompts).

### Step 5: Monitor with dashboard (optional)

```bash
bash .claude/scripts/team-dashboard.sh tdd-auth
```

Opens a 4-pane tmux dashboard: task progress | agent status | messages | file changes.

### Step 6: Merge and verify

```bash
git checkout main
git merge --no-ff feat/feature-builder-1
git merge --no-ff feat/feature-builder-2
bash ./.claude/scripts/verify-merge.sh
```

Then run `/checkpoint` as the final gate before `/commit-push-pr`.

---

## Architecture

```
spec.md (REQ-001 to REQ-009)
    │
    ├── .worktrees/feature-builder-1  → Builder 1 (REQ-001 to REQ-005)
    └── .worktrees/feature-builder-2  → Builder 2 (REQ-006 to REQ-009)

Shared task list: ~/.claude/tasks/tdd-auth/
    ├── Task: RESEARCH          (no deps)          → Research Agent
    ├── Task: ARCH              (blocked by RESEARCH) → Architect
    ├── Task: REQ-001…005       (blocked by ARCH)   → Builder 1
    ├── Task: REQ-006…009       (blocked by ARCH)   → Builder 2
    ├── Task: VERIFY            (blocked by all REQs) → Verifier/QA
    └── Task: INTEGRATE         (blocked by all REQs) → Integrator
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
- `/tdd` — single-agent TDD (Phases 3–4, no parallelism)
- `/checkpoint` — unified verification gate after merge
- `/review` — review implementation after merging
