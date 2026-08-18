# Spec-Driven TDD: End-to-End Walkthrough

This guide walks through the complete spec-driven TDD flow from planning to verification.

---

## Overview

```
Plan → Spec → Audit → TDD → Checkpoint → Verify → Commit
```

The system enforces quality at every step through hooks and scripts.

---

## Step 1: Enter Plan Mode

Start by entering plan mode to think through the feature:

```
/plan add user registration
```

Claude enters plan mode and discusses the approach with you.

---

## Step 2: Write the Spec

Before exiting plan mode, write a spec to `.claude/plans/user-registration.md` using the template at `.claude/templates/spec.md.template`.

### Required Elements

Every spec needs:

1. **REQ-XXX IDs** on every requirement (sequential: REQ-001, REQ-002, ...)
2. **Verification tags**: `(TEST)`, `(BROWSER)`, or `(MANUAL)` on each
3. **Priority levels**: `Must`, `Should`, or `Could`
4. **Traceability matrix** mapping REQs to test locations

### Example Spec

```markdown
## Requirements

### REQ-001: User can register with email and password
- **Description**: Given a valid email and password (8+ chars), create user account
- **Verification**: (TEST)
- **Priority**: Must

### REQ-002: Registration rejects invalid email
- **Description**: Display error for malformed email addresses
- **Verification**: (TEST)
- **Priority**: Must

### REQ-003: Registration page renders correctly
- **Description**: Form displays email, password, and submit button
- **Verification**: (BROWSER)
- **Priority**: Must
- **Depends on**: —

## Traceability Matrix

| REQ ID  | Description              | Verification | Test Location |
|---------|--------------------------|-------------|---------------|
| REQ-001 | Register with email      | (TEST)      | `src/__tests__/auth.test.ts` |
| REQ-002 | Reject invalid email     | (TEST)      | `src/__tests__/auth.test.ts` |
| REQ-003 | Page renders correctly   | (BROWSER)   | `e2e/registration.spec.ts` |
```

---

## Step 3: Write the Spec (Enforced by Hooks)

The system enforces spec-first development through a hook chain:

1. **SessionStart hook** sets a `.plan-active` flag
2. **PreToolUse hook** on Edit/Write/Task/Bash checks: if flag exists and no spec in `.claude/plans/` → **BLOCKS** the tool with instructions to write the spec
3. When the spec is written to `.claude/plans/`, a **PostToolUse hook** runs `audit-spec.sh` to validate:
   - REQ-XXX IDs exist
   - No duplicate REQ definitions
   - No gaps in REQ numbering
   - All REQs have verification tags
   - At least one (TEST) tag exists
   - Traceability matrix present and consistent
   - No placeholder `{{...}}` descriptions
   - Must-priority requirements present
4. If audit passes, the flag is cleared and coding tools are **unblocked**
5. If audit fails with critical issues, the flag stays set — fix the spec first

**Note**: `ExitPlanMode` and `EnterPlanMode` are not hookable tools in Claude Code. The enforcement works by gating coding tools instead.

---

## Step 4: TDD Implementation

### Single Agent (`/tdd`)

For smaller features:
```
/tdd user-registration
```

Claude follows Red-Green-Refactor for each REQ:
1. Write failing test: `test('REQ-001: user can register with email', ...)`
2. Write minimal code to pass
3. Refactor while keeping green

### Multi-Agent (`/parallel-tdd`)

For larger features, the spec is automatically split across an Agent Team:
```
/parallel-tdd
```

This creates isolated git worktrees and spawns teammates via Agent Teams:
- Each teammate works in its own worktree/branch
- Tasks are coordinated through a shared task list with `blockedBy` dependencies
- Teammates can message each other when APIs or interfaces need coordination
- Quality gate hooks enforce TDD on task completion and teammate idle

The `Depends on:` field in the spec creates task dependencies that auto-unblock.

---

## Step 5: Checkpoint

Run the unified verification gate:
```
/checkpoint
```

This checks:
1. TypeScript types
2. Linting
3. Formatting
4. Tests pass
5. Build succeeds
6. Security audit
7. Mutation testing (if Stryker configured)
8. Test pyramid shape (warns if inverted)

---

## Step 6: Post-Merge Verification (Parallel TDD)

If using parallel TDD, after merging all agent branches:

```bash
bash ./.claude/scripts/verify-merge.sh
```

This:
1. Runs the full test suite on the merged result
2. Cross-references test files against REQ-XXX patterns from the spec
3. Reports a coverage matrix showing which REQs have tests

---

## Step 7: REQ Coverage Check

At any point, check which requirements have test coverage:
```
/req-coverage
```

Output:
```
  COVERED  REQ-001  (2 test files)
  COVERED  REQ-002  (1 test file)
  MISSING  REQ-003
  Coverage: 2/3 REQs (66%)
```

---

## Step 8: Commit and PR

```
/commit-push-pr
```

---

## Key Scripts

| Script | Purpose |
|--------|---------|
| `audit-spec.sh` | Validates spec structure and quality |
| `create-tdd-team.sh` | Parses spec, creates worktrees, outputs Agent Teams task data |
| `launch-parallel-tdd.sh` | PostToolUse hook wrapper for parallel TDD |
| `checkpoint.sh` | Unified verification gate |
| `verify-merge.sh` | Post-merge test + REQ coverage check |
| `req-coverage.sh` | Standalone REQ coverage matrix |
| `hooks/task-completed-tdd.sh` | Enforces TDD on task completion (requires test for REQ) |
| `hooks/teammate-idle-tdd.sh` | Quality gate on teammate idle (clean state, tests pass) |

---

## Troubleshooting

### "ExitPlanMode blocked — no spec found"
This is the intended "fail, write, retry" flow: the `clear-plan-flag.sh` and `enforce-spec-before-coding.sh` hooks block coding tools until a valid spec exists. Claude should write the spec to `.claude/plans/[feature].md` using the template. The `.claude/plans/` directory is created by `setup.cjs` or can be created manually.

### "Spec has unverified requirements"
Add `**Verification**: (TEST)` or `(BROWSER)` or `(MANUAL)` to each REQ.

### "Gaps in REQ numbering"
Ensure REQs are sequential: REQ-001, REQ-002, REQ-003 (no skips).

### "Test pyramid inverted"
Add more unit tests. The pyramid should be: many unit > some integration > few E2E.
