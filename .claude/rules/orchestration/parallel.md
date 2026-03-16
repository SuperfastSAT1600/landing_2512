# Parallel Orchestration

---

## Subagents vs Agent Teams

| | Subagents (Agent tool) | Agent Teams (TeamCreate) |
|---|---|---|
| **Lifecycle** | Fire-and-forget | Persistent, claim tasks, message peers |
| **Communication** | Report to caller only | Message each other directly |
| **Best for** | Specialist tasks, review, research | Parallel implementation, multi-REQ TDD |
| **Token cost** | Lower | Higher (each teammate = separate instance) |
| **Nesting** | Teammates CAN spawn subagents | No nested teams |

**Spec required**: parallel implementation subagents and Agent Teams always need a spec first. Read-only / single specialist subagents do not. See Phase 1 of `task-protocol.md`.

---

## Parallel-First Pattern

**CRITICAL**: Launch independent subagents in ONE message (multiple Agent calls). Ask: "What can run in parallel?" + "What can I work on meanwhile?"

- Independent tasks → **PARALLEL** (single message, multiple Agent calls)
- Task B needs Task A output → **SEQUENTIAL**

**Common patterns**: Feature split (widget1 + widget2 in parallel) | Domain split (auth-specialist + backend-specialist) | Quality gate (code-reviewer + frontend-specialist) | Exploration (multiple Explore agents)

---

## Fixed 6-Role Agent Team Pipeline

When using Agent Teams (via `/parallel-tdd`), the team structure is always this exact pipeline:

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

**Task chain created by `create-tdd-team.sh`**:
- `RESEARCH` (no blockedBy)
- `ARCH` (blockedBy: RESEARCH)
- `REQ-001…N/2` per REQ (blockedBy: ARCH) → assigned to Builder 1
- `REQ-N/2+1…N` per REQ (blockedBy: ARCH) → assigned to Builder 2
- `VERIFY` (blockedBy: all REQ tasks)
- `INTEGRATE` (blockedBy: all REQ tasks)

**Monitor**: Run `bash .claude/scripts/team-dashboard.sh <team-name>` to open a 4-pane tmux dashboard.

---

## Agent Team Coordination

**Lead**: Write spec + task list, assign REQs to teammates. May spawn subagents for one-off specialist work not on the shared task list. Run `/checkpoint` as final gate.

**Teammates**: Claim tasks (lowest ID first). Message peers for interface negotiation. Verify own REQs before marking done. Only spawn subagents for isolated work within own scope — not for tasks that belong on the shared list.

**Session rules**: Messages delivered automatically — do not poll. Idle ≠ unavailable. Refer to teammates by NAME. Use plain text + TaskUpdate for status, not JSON messages. Default to messaging a peer over spawning a new subagent (token cost).
