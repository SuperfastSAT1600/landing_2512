# Self-Improvement System

---

## Error Logging

Log immediately on any error, wrong assumption, retry, or user correction.

**Format**: `[category] Error: [what] | Correct: [how]`
**Where**: Main → `.claude/user/errors.md` | Subagents → `.claude/user/agent-errors/{name}.md`

---

## Observations (note during work, report after)

Categories: HEAL (broken refs/paths) | EVOLVE (missing coverage, recurring errors) | ADAPT (deprecated tech) | REFACTOR (overlaps, bloat)

**Budget**: max 5 total per session. HEAL auto-apply; others propose + wait. Over 5 → tell user to run `/health-check`.

---

## Pattern Detection

2+ occurrences → propose fix. Auto-apply only: INDEX regeneration, broken refs, typos. Never auto-modify: `settings.json`, `essential-rules.md`, `setup.cjs`.

---

## Guardrails

- Primary task first — never delay user's work
- Max 5 system changes/session | If fix doesn't stick → escalate to user
- Never weaken security or bypass hooks
