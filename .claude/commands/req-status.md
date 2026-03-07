---
description: Show REQ lifecycle status dashboard (spec → test → passing)
allowed-tools: Bash(bash ./.claude/scripts/req-status.sh:*), Read, Glob, Grep
---

# REQ Status Dashboard

Show per-requirement lifecycle status: spec written, test exists, test passing.

---

## Usage

```
/req-status [spec-file]
```

If no spec file is provided, uses the most recently modified spec in `.claude/plans/`.

---

## Example Output

```
  REQ       TAG      SPEC    TEST     DESCRIPTION
  --------  -------  ------  -------  -----------
  REQ-001   (TEST)   done    yes(2)   User can register with email
  REQ-002   (TEST)   done    no       Reject invalid email format
  REQ-003   (BROWSER) done   yes(1)   Registration page renders
  REQ-004   (MANUAL) done    n/a      UX feels responsive

  Progress: 3/4 REQs complete (75%)
```

---

## Related Commands

- `/req-coverage` - Simpler coverage matrix (covered/missing)
- `/checkpoint` - Full verification gate including REQ coverage
- `/tdd` - TDD workflow to fill in missing tests
