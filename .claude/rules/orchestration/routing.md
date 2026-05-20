# Agent Routing

---

## Decision Tree

```
Task scope?
├─ Simple (<10 lines, single domain)     → Main agent directly
├─ Read-only (review / research / audit)  → Subagent, no spec needed
├─ Parallel (2–3 workstreams)             → Spec FIRST → Subagents
└─ Large-scale (4+ workstreams)           → Spec FIRST → Agent Team (/parallel-tdd)
```

**→ Team signals**: "Build a complete X", auth+API+frontend+DB together, 5+ Must REQs
**→ Subagent signals**: "Add/Fix/Review X", 1-2 specialist areas, any audit/research

---

## Sequential Dependencies

Planning → Implementation → Testing. Schema → Migrations.
