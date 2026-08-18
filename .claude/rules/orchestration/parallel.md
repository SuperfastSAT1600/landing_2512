# Parallel Orchestration

---

## Subagents vs Agent Teams

| | Subagents | Agent Teams (TeamCreate) |
|---|---|---|
| **Lifecycle** | Fire-and-forget | Persistent, claim tasks, message peers |
| **Best for** | Specialist tasks, review, research | Parallel multi-REQ implementation |
| **Token cost** | Lower | Higher |

Spec required for parallel implementation. Not required for read-only/specialist subagents.

---

## Parallel-First Rule

Launch independent subagents in ONE message. Independent → parallel. Dependent → sequential.

---

## 6-Role Agent Team Pipeline (`/parallel-tdd`)

```
Lead → Research → Architect → Builder×2 (parallel) → Verifier → Integrator
```

Task chain: `RESEARCH` → `ARCH` → `REQ-*` (split across builders) → `VERIFY` + `INTEGRATE`

**Monitor**: `bash .claude/scripts/team-dashboard.sh <team-name>`

**Coordination**: Teammates claim lowest-ID task first. Message peers directly — don't spawn subagents for shared work.
