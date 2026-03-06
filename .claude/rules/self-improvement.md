# Self-Improvement System

---

## Error Logging (Aggressive)

**Threshold**: If it didn't work as expected, LOG IT immediately. Over-logging > missing patterns.

**Format** by category:
- Tool/API: `[tool] Error: [what] | Expected: [expected]`
- Code: `[code] Error: [what] | Correct: [how]`
- Command: `[cmd] Error: [failed] | Correct: [working]`
- Context: `[context] Error: [assumption] | Reality: [actual]`
- Agent: `[agent] Error: [what] | Better: [approach]`
- Config: `[config] Error: [broken] | Fix: [how]`

**Where**: Main → `.claude/user/errors.md` | Subagents → `.claude/user/agent-errors/{name}.md`

**When to log**: any tool/code/command error, wrong assumption, skipped skill check, retry needed, user correction, outdated info.

---

## Observations (Note While Working, Report at End)

- **HEAL**: Broken refs, contradictions, invalid paths, INDEX mismatches, hook errors
- **EVOLVE**: Missing coverage, new patterns (2+), recurring errors, requests outside agent/skill scope
- **ADAPT**: Deprecated tech, stack mismatches, divergent user conventions
- **REFACTOR**: Overlaps, bloat (>300 lines), unused components, duplicate rules

**Budget per session** — cap to prevent post-task dumps:

| Type | Max | Action |
|------|-----|--------|
| HEAL | 3 | Auto-apply immediately |
| EVOLVE | 2 | Propose + wait |
| ADAPT | 2 | Propose + wait |
| REFACTOR | 1 | Propose + wait |
| **Total >5** | — | Stop inline, say "run `/health-check`" |

---

## Pattern Detection & Resolution

**Trigger**: 2+ occurrences (semantic similarity). Sources: error log, agent errors, changelog.

**Auto-fix a single-error root cause** only if ALL true: root cause clear, localized (1-3 files), low-risk, prevents recurrence.

**Auto-apply + notify**: INDEX.md regeneration, broken refs, typos, sync refs
**Propose + wait**: skill/agent/rule content, templates, checklists, new components
**Never auto-modify**: `.claude/settings.json`, `settings.local.json`, `essential-rules.md`, `setup.cjs`

**Proactive triggers**: same pattern 2+ → template | same error 2+ → update rule | same knowledge 2+ → skill | outside coverage → propose skill/agent

---

## Roles

**Main agent**: Log to `errors.md`. 3+ recurring errors → propose rule/skill update.
**Subagents**: Fix `.claude/` issues inline. Report fixes for main agent to log to `changelog.md`.

---

## Changelog (Self-Initiated Only)

Format: `## [YYYY-MM-DD] type(scope): description` with Type (heal|enhance), Auto (yes|no), Changed files, Reason. Only Claude's own ideas — never user requests.

---

## Guardrails

- Primary task first — never delay user's work for self-improvement
- Max 5 system changes/session, max 5 files/change | Every change = own commit
- If same issue recurs after fix → escalate to user (no loops)
- Never weaken security or bypass hooks | Significant changes need human approval
