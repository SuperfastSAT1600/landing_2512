---
description: Check REQ-XXX test coverage matrix
allowed-tools: Bash(bash ./.claude/scripts/req-coverage.sh:*), Read, Glob, Grep
---

# REQ Coverage Matrix

Check which spec requirements (REQ-XXX) have corresponding test coverage.

---

## Usage

```
/req-coverage [spec-file]
```

If no spec file is provided, uses the most recent plan in `.claude/plans/`.

---

## What This Command Does

1. Reads the spec file for all REQ-XXX requirement IDs
2. Scans test files (`*.test.*`, `*.spec.*`) for REQ-XXX references
3. Reports a coverage matrix showing which REQs are covered and which are missing
4. Exits with status 0 (all covered) or 1 (missing coverage)

---

## Output Example

```
  COVERED  REQ-001  (3 test files)
  COVERED  REQ-002  (1 test file)
  MISSING  REQ-003
  Coverage: 2/3 REQs (66%)
```

---

## Steps

### Step 1: Run Coverage Check

Run the REQ coverage script:

```bash
bash ./.claude/scripts/req-coverage.sh
```

### Step 2: Address Gaps

For any MISSING requirements:
1. Check the spec's verification method — (TEST), (BROWSER), or (MANUAL)
2. For (TEST) requirements: write unit/integration tests with `test('REQ-XXX: ...', ...)`
3. For (BROWSER) requirements: write E2E tests referencing the REQ ID
4. For (MANUAL) requirements: coverage check is optional

---

## Success Criteria

- All (TEST) and (BROWSER) requirements have corresponding test files
- Test names include REQ-XXX IDs for traceability

---

## Related

- `/checkpoint` — unified verification gate
- `/tdd` — TDD workflow
- `/parallel-tdd` — multi-agent parallel TDD
