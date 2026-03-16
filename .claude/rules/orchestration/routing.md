# Agent Routing

---

## Decision Tree

```
Task scope?
├─ Simple (<10 lines, single domain)          → Main agent directly
├─ Read-only: review / research / audit        → Subagents, no spec needed
├─ Parallel implementation (2–3 workstreams)   → Spec FIRST → Subagents (assign REQs)
└─ Large-scale (4+ workstreams, coordination)  → Spec FIRST → Agent Team (/parallel-tdd)
```

When specialist needed: delegate + work in parallel if possible; delegate + wait if not.
**Handle directly**: <10 lines, no domain knowledge, follows existing pattern.
**Spec always precedes parallel implementation** — see Phase 1 of `task-protocol.md`.

---

## Routing Table

| Task | Route | Notes |
|------|-------|-------|
| "Fix this bug" / "Add a settings form" | Main agent | — |
| "Review for security" / "Check accessibility" | code-reviewer / frontend-specialist | Wait |
| "Set up CI/CD" | devops-specialist | Wait |
| "Add RAG search" / "Integrate LLM" | ai-specialist | Wait |
| "Add OAuth login" | Spec → auth-specialist + backend-specialist (parallel); main codes UI | Subagents |
| "Add dashboard with N widgets" | Spec → parallel subagents per widget; main codes layout | Subagents |
| "Optimize slow dashboard" | Spec → frontend-specialist + backend-specialist (parallel) | Subagents |
| "Build complete checkout / auth / CMS" | Spec → Agent Team via `/parallel-tdd` | Team |
| Spec with 5+ Must-priority REQs across domains | Agent Team via `/parallel-tdd` | Team |
| "Refactor large cross-cutting system" | Isolated files → subagents; shared interfaces evolving → Team | Either |

**→ Team signals**: "Build a complete X", multiple services together, auth+API+frontend+DB all at once, 5+ Must REQs
**→ Subagent signals**: "Add/Fix/Review/Set up X", additive work, 1-2 specialist areas, any review/audit/research

---

## Sequential Dependencies

- Planning → Implementation: architect → wait → implement
- Implementation → Testing: code → wait → test-writer
- Schema → Migrations: backend-specialist → wait → migration
