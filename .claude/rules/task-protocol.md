# Task Execution Protocol (Mandatory)

Every agent MUST follow this protocol. See `self-improvement.md` for error categories, patterns, triggers.

---

## Phase 0: INIT

**FIRST ACTION (MANDATORY)**: Use the Read tool to read `.claude/user/errors.md` (main agent) or `.claude/user/agent-errors/{name}.md` (subagent). This MUST be your first task upon loading.

**PRD** (core features): `docs/PRD.md` for scope, architecture, metrics

---

## Phase 1: PRE-TASK

### Delegation Check

Specialist required? Check `orchestration.md`:
Database → database-architect, migration-specialist | API → api-designer, graphql-specialist | Auth → auth-specialist | Security → security-reviewer | Testing → unit-test-writer, integration-test-writer, e2e-runner | Infrastructure → docker-specialist, ci-cd-specialist | Code review → code-reviewer | Performance → performance-optimizer

**If specialist exists: DELEGATE. Exception**: <10 lines, no domain knowledge, follows patterns, no architecture.

### Parallelization

Independent files/features/domains? → PARALLEL (one message, multiple Tasks)
Research + implementation? → PARALLEL | Review? → PARALLEL | Single atomic? → SEQUENTIAL

### Task List (MANDATORY)

**Create task list for**:
- Multi-step tasks (3+ steps)
- Non-trivial complex tasks
- User provides multiple tasks
- Plan mode work

**Skip for**: Single straightforward tasks, trivial tasks (<3 steps), conversational requests

**Mark tasks**: `in_progress` when starting, `completed` when done

---

## Phase 2: DURING

**Error Logging (BLOCKING)**: Error → STOP → LOG → VERIFY → THEN continue
Log: `.claude/user/errors.md`: `[category] Error: [what] | Correct: [how]`
Self-check: "Did I log it?" If no → LOG NOW

**Observations** (note mentally): HEAL (broken refs), EVOLVE (missing coverage), ADAPT (deprecated tech), REFACTOR (bloat)

---

## Phase 3: POST-TASK

1. **Report**: `OBSERVATIONS: [items or "none"]`
2. **Auto-heal**: Auto (INDEX, refs, typos) or Propose (content, components)
3. **Verify errors logged** (from immediate logging)
4. **Changelog** (self-initiated only)
5. **Docs** (MANDATORY for code): Feature → README/API/changelog | API change → docs/examples/changelog | Bug → changelog/examples | Refactor → affected docs | Small (1-2 files) = direct, Large (3+) = doc-updater

---

## Subagent Protocol

Report (main logs):
```
## Task Result
[work]
## Errors Encountered
[category] Error: [what] | Correct: [how]
## System Fixes Applied
Fixed: [file] - [what]
```

---

## Quick Reference

```
INIT:    Read errors.md FIRST → PRD
PRE:     Delegate? Parallel? Task list?
DURING:  Error → STOP → LOG → VERIFY → THEN
POST:    Observations → Heal → Errors → Changelog → DOCS
```
