---
description: Comprehensive code review including security audit
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(npm audit:*), Read, Grep, Glob
---

# Review Command

Comprehensive code review of all changes, including security audit.

---

## Usage

```
/review                          # Review all changes on current branch
/review src/auth/                # Review specific directory
/review --security-only          # Security-focused audit only
```

---

## What This Command Does

Delegates to the `code-reviewer` agent for a unified review covering:

1. **Correctness**: Does the code do what it's supposed to?
2. **Security**: OWASP Top 10, hardcoded secrets, input validation, auth flaws
3. **Edge Cases**: Are boundary conditions handled?
4. **Error Handling**: Are errors caught and handled appropriately?
5. **Performance**: Any obvious performance issues?
6. **Style**: Consistency with project patterns, naming, complexity
7. **Testing**: Are there tests for new functionality?
8. **Documentation**: Are public APIs documented?

---

## Output Format

```markdown
## Review Summary

**Files Changed**: 8
**Lines Added**: 245
**Lines Removed**: 103

## Security Findings

### Critical
- [src/auth.ts:42] SQL injection in login query (CVSS 9.8)

### High
- [src/api.ts:12] Missing rate limiting on auth endpoint (CVSS 7.5)

## Code Quality Findings

### Important
- [src/components/Form.tsx:78] Form validation doesn't check empty string
- [tests/auth.test.ts] Missing tests for password reset flow

### Minor
- [src/utils/format.ts:23] Complex nested ternary — simplify
- [src/constants.ts:12] Magic number should be a named constant

## Recommendations
1. Fix SQL injection immediately
2. Add rate limiting to auth endpoints
3. Add form validation tests
```

---

## Severity Triage

| Severity | Action | Timeline |
|----------|--------|----------|
| Critical (security) | Fix immediately | Before merge |
| High (security) | Fix before merge | Within 24 hours |
| Important (quality) | Should fix | Before merge |
| Minor (quality) | Nice to have | Backlog |

---

## When to Use

- Before creating a PR
- After completing a feature
- Before deploying security-critical changes
- Quarterly security audits (with `--security-only`)

---

## Related Commands

- `/checkpoint` — Automated verification gate (types, lint, tests, build)
- `/commit-push-pr` — Commit after review passes
- `/full-feature` — Includes review as Phase 4

---

## Tips

- **Be specific**: Scope to changed files for faster reviews
- **Fix critical first**: Security issues block everything else
- **Re-run after fixes**: Verify issues are resolved
- **Track patterns**: Recurring issues should become rules or skill updates
