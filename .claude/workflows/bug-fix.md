# Bug Fix Workflow

Systematic approach to fixing bugs with proper testing and verification.

---

## Prerequisites

- [ ] Bug report or issue documented
- [ ] Reproduction steps available
- [ ] Expected vs actual behavior clear
- [ ] Branch created from main

---

## Workflow Steps

### Step 1: Reproduce & Analyze
**Agent**: Main context
**Duration**: 10-30 minutes

**Actions**:
1. Reproduce the bug locally
2. Identify the root cause
3. Determine scope of impact
4. Check for related issues

**Output**:
- Root cause identified
- Affected code located
- Impact assessment

**Analysis Questions**:
- What triggers the bug?
- What is the expected behavior?
- When did this start happening?
- Are other areas affected?

---

### Step 2: Write Regression Test
**Agent**: `unit-test-writer`
**Duration**: 10-20 minutes

**Actions**:
1. Write test that reproduces the bug
2. Verify test fails with current code
3. Add edge case tests

**Output**:
- Failing test that demonstrates bug
- Related edge case tests

**Test Template**:
```typescript
describe('BugFix: [Brief Description]', () => {
  it('should [expected behavior] when [condition]', () => {
    // Arrange: Set up bug conditions
    // Act: Trigger the bug
    // Assert: Verify expected behavior
  });
});
```

**Checkpoint**: ✅ Test fails (red phase)

---

### Step 3: Implement Fix
**Agent**: Main context
**Duration**: Variable

**Actions**:
1. Implement minimal fix
2. Run regression test
3. Run related tests
4. Verify fix doesn't break other functionality

**Guidelines**:
- Fix only the bug (don't refactor)
- Make minimal changes
- Don't add new features
- Keep the fix focused

**Checkpoint**: ✅ Test passes (green phase)

---

### Step 4: Verify & Review
**Agent**: `code-reviewer`
**Duration**: 10-15 minutes

**Actions**:
1. Review fix for correctness
2. Check for side effects
3. Verify test coverage
4. Ensure no regressions

**Verification Checklist**:
- [ ] Bug is fixed
- [ ] Regression test passes
- [ ] All existing tests pass
- [ ] No new issues introduced
- [ ] Fix is minimal and focused

---

### Step 5: Commit & PR
**Agent**: Main context
**Duration**: 5 minutes

**Auto-Gate**: 🔄 **PR Review Checklist Auto-Triggered**
> Before creating the PR, automatically run through `.claude/checklists/pr-review.md`

**Commit Format**:
```
fix(scope): brief description of fix

Root cause: [What caused the bug]
Solution: [How it was fixed]

Fixes #123
```

**PR Description**:
```markdown
## Bug Description
[What was wrong]

## Root Cause
[Why it happened]

## Solution
[How it was fixed]

## Testing
- [x] Added regression test
- [x] All tests passing
- [x] Manually verified fix
```

---

## Quick Fix Checklist

- [ ] Bug reproduced locally
- [ ] Root cause identified
- [ ] Regression test written
- [ ] Fix implemented
- [ ] All tests passing
- [ ] Code reviewed
- [ ] PR created

---

## Severity-Based Process

### Critical (Production Down)
1. Hotfix branch from production
2. Minimal fix only
3. Fast-track review
4. Deploy immediately
5. Follow up with proper fix

### High (Major Functionality Broken)
1. Feature branch from main
2. Full workflow with expedited review
3. Deploy in next release

### Medium/Low (Minor Issues)
1. Standard branch from main
2. Full workflow
3. Normal release cycle

---

## Tips

1. **Minimal changes**: Fix only the bug
2. **Test first**: Write regression test before fixing
3. **Root cause**: Understand why, not just what
4. **Verify thoroughly**: Check for side effects
5. **Document**: Future reference for similar bugs

---

## External Resources

**Reference these resources during bug fix workflow:**

| Resource | Location | When to Use |
|----------|----------|-------------|
| Hotfix Checklist | `.claude/checklists/hotfix-checklist.md` | P0/P1 urgent production issues |
| PR Review | `.claude/checklists/pr-review.md` | Before creating fix PR |
| Security Audit | `.claude/checklists/security-audit.md` | Security-related bugs |
| Testing Rules | `.claude/rules/testing.md` | Regression test patterns |
