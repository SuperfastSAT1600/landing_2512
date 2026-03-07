---
description: Generate test stub files from a spec's traceability matrix
allowed-tools: Bash(bash ./.claude/scripts/generate-test-stubs.sh:*), Read, Glob, Grep
---

# Generate Test Stubs

Generate test stub files from a spec's traceability matrix.

---

## Usage

```
/generate-stubs [spec-file]
```

If no spec file is provided, uses the most recently modified spec in `.claude/plans/`.

---

## What This Command Does

1. Reads the spec file
2. Parses the Traceability Matrix for (TEST) and (BROWSER) REQs
3. Extracts test file paths from the matrix
4. Creates test files with `describe` / `it.todo()` blocks per REQ
5. Skips files that already exist (never overwrites)

---

## Example Output

Given a spec with:
```
| REQ-001 | User can register | (TEST) | `src/__tests__/auth.test.ts` |
| REQ-002 | Reject bad email   | (TEST) | `src/__tests__/auth.test.ts` |
```

Generates `src/__tests__/auth.test.ts`:
```typescript
describe('auth', () => {
  describe('REQ-001: User can register', () => {
    it.todo('REQ-001: should User can register');
  });

  describe('REQ-002: Reject bad email', () => {
    it.todo('REQ-002: should Reject bad email');
  });
});
```

---

## Workflow

Best used after writing a spec and before starting TDD:

1. `/plan` → Write spec
2. **`/generate-stubs`** → Scaffold test files
3. `/tdd` or `/parallel-tdd` → Fill in implementations

---

## Related Commands

- `/plan` - Create spec with requirements
- `/tdd` - Single-agent TDD workflow
- `/parallel-tdd` - Multi-agent parallel TDD
- `/req-coverage` - Check which REQs have tests
