# Quick Fix Command

Fast bug fix workflow for simple issues.

---

## Usage

```
/quick-fix <issue-description>
```

**Examples:**
```
/quick-fix button click handler not working on mobile
/quick-fix login redirect goes to wrong page
/quick-fix timezone display shows UTC instead of local
```

---

## What This Command Does

Rapid bug fix cycle:

1. **Locate**: Find the bug in the codebase
2. **Analyze**: Understand root cause
3. **Fix**: Implement minimal fix
4. **Test**: Verify the fix works
5. **Commit**: Create fix commit

---

## Workflow Steps

### Step 1: Locate the Bug
```
- Search codebase for related code
- Identify affected files
- Find the specific location
```

### Step 2: Root Cause Analysis
```
- Understand why the bug occurs
- Check for related issues
- Determine scope of fix
```

### Step 3: Implement Fix
```
- Make minimal necessary changes
- Don't refactor surrounding code
- Focus only on the bug
```

### Step 4: Verify Fix
```
- Run existing tests
- Add regression test if missing
- Manual verification steps
```

### Step 5: Commit
```
- Create fix commit
- Reference issue if applicable
- Clear commit message
```

---

## Example Session

**User**: `/quick-fix date picker shows wrong month on first open`

**Claude**:

### Step 1: Locating Bug

Searching for date picker component...

Found: `src/components/DatePicker/DatePicker.tsx`

### Step 2: Analysis

**Root Cause Identified:**
```typescript
// Line 34: currentMonth initialized with wrong value
const [currentMonth, setCurrentMonth] = useState(0); // Always January!

// Should be:
const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
```

The month state is initialized to 0 (January) instead of the current month.

### Step 3: Fix

```typescript
// Before
const [currentMonth, setCurrentMonth] = useState(0);

// After
const [currentMonth, setCurrentMonth] = useState(
  initialDate?.getMonth() ?? new Date().getMonth()
);
```

### Step 4: Verification

Running existing tests...
✓ 12 tests passing

Adding regression test:
```typescript
it('should initialize to current month when no date provided', () => {
  render(<DatePicker />);
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  expect(screen.getByText(currentMonth)).toBeInTheDocument();
});
```

✓ 13 tests passing

### Step 5: Commit

```
fix(datepicker): initialize month to current date instead of January

The DatePicker component was always opening to January because
the month state was initialized to 0 instead of the current month.

Fixes #456
```

---

**Fix complete!** The date picker now opens to the correct month.

---

## Command Behavior

### Speed Optimizations
- Skips full planning phase
- Minimal analysis
- No documentation updates (unless critical)
- Quick commit format

### Quality Checks
- Always runs tests
- Adds regression test
- Verifies no regressions

### Time Target
- Most fixes: <15 minutes
- If >30 minutes: Consider `/full-feature`

---

## Checklist

- [ ] Bug located
- [ ] Root cause understood
- [ ] Minimal fix implemented
- [ ] Existing tests pass
- [ ] Regression test added
- [ ] Commit created

---

## Best Practices

1. **Minimal Changes**: Fix only the bug, nothing else
2. **Don't Refactor**: Save refactoring for separate PR
3. **Add Tests**: Always add regression test
4. **Clear Commits**: Explain what and why

---

## When to Use

- Simple, isolated bugs
- Clear reproduction steps
- Obvious root cause
- Quick turnaround needed

---

## When NOT to Use

- Complex bugs requiring investigation (use `/plan` first)
- Bugs requiring architectural changes
- Performance issues (use performance-optimizer agent)
- Security vulnerabilities (use `/security-review`)

---

## Related Commands

- `/full-feature` - For complex fixes needing planning
- `/test-and-build` - Just run tests and build
- `/commit-push-pr` - Just create PR

---

## External Resources

**For complex bugs or escalation, reference:**

| Resource | Location | When to Use |
|----------|----------|-------------|
| Bug Fix Workflow | `.claude/workflows/bug-fix.md` | Complex bugs needing full process |
| Hotfix Checklist | `.claude/checklists/hotfix-checklist.md` | P0/P1 urgent production issues |
| PR Review | `.claude/checklists/pr-review.md` | Before creating fix PR |
| Testing Rules | `.claude/rules/testing.md` | Regression test patterns |
