# Checkpoint Command

Run all automated quality checks as a single unified verification gate.

---

## Usage

```
/checkpoint
/checkpoint --skip-build
/checkpoint --skip-security
```

---

## What This Command Does

Runs a progressive pipeline of automated quality checks, auto-detecting available tools in your project:

1. **TypeScript**: `tsc --noEmit` (if tsconfig.json exists)
2. **Lint**: ESLint, Ruff, go vet, Clippy (auto-detected)
3. **Format**: Prettier, Black, gofmt, rustfmt (auto-detected)
4. **Tests**: vitest, jest, pytest, go test, cargo test (auto-detected)
5. **Build**: `npm run build`, `cargo build`, `go build` (auto-detected)
6. **Security**: `npm audit`, `pip-audit`, `cargo audit` (auto-detected)
7. **Mutation Testing**: Stryker (if stryker.conf exists — optional)

Each step reports PASS/FAIL with timing. All steps run even if earlier ones fail, giving you a complete picture.

---

## Output

```
==============================================
Checkpoint — Unified Verification Gate
==============================================

[1/7] TypeScript
  PASS tsc --noEmit (3s)

[2/7] Lint
  PASS ESLint (2s)

[3/7] Format
  PASS Prettier (1s)

[4/7] Tests
  PASS Tests (npm test) (8s)

[5/7] Build
  PASS Build (npm run build) (12s)

[6/7] Security
  FAIL npm audit (1s)

[7/7] Mutation Testing (optional)
  SKIP Mutation testing — no Stryker config found

==============================================
Summary (27s)
==============================================
  Passed:  5
  Failed:  1
  Skipped: 1

CHECKPOINT FAILED: 1 check(s) failed
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All checks passed |
| 1 | Warnings only (no checks could run) |
| 2 | One or more checks failed |

---

## When to Use

- Before creating a PR (`/checkpoint` replaces manual checklists)
- After completing a feature implementation
- As a pre-commit verification
- As the final gate in `/full-feature` workflow

---

## Comparison with Individual Commands

| Command | Scope |
|---------|-------|
| `/type-check` | TypeScript only |
| **`/checkpoint`** | **Lint, tests, build, deps, and more** |

---

## Related Commands

- `/full-feature` — Uses checkpoint as final gate
- `/test-ladder` — Progressive test escalation
- `/test-coverage` — Detailed coverage analysis

---

## Script

**Location**: `.claude/scripts/checkpoint.sh`
