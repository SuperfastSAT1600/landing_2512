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

**Spec required**: parallel implementation subagents and Agent Teams always need a spec first. Read-only / single specialist subagents do not. See `workflow/spec-rules.md`.

---

## Parallel-First Pattern

**CRITICAL**: Launch independent subagents in ONE message (multiple Agent calls). Ask: "What can run in parallel?" + "What can I work on meanwhile?"

- Independent tasks → **PARALLEL** (single message, multiple Agent calls)
- Task B needs Task A output → **SEQUENTIAL**

**Common patterns**: Feature split (widget1 + widget2 in parallel) | Domain split (auth-specialist + backend-specialist) | Quality gate (code-reviewer + frontend-specialist) | Exploration (multiple Explore agents)

---

## Agent Team Coordination

**Lead**: Write spec + task list, assign REQs to teammates. May spawn subagents for one-off specialist work not on the shared task list. Run `/checkpoint` as final gate.

**Teammates**: Claim tasks (lowest ID first). Message peers for interface negotiation. Verify own REQs before marking done. Only spawn subagents for isolated work within own scope — not for tasks that belong on the shared list.

**Session rules**: Messages delivered automatically — do not poll. Idle ≠ unavailable. Refer to teammates by NAME. Use plain text + TaskUpdate for status, not JSON messages. Default to messaging a peer over spawning a new subagent (token cost).
