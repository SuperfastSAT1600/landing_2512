---
description: Guide through Test-Driven Development workflow
allowed-tools: Bash(npm test:*), Bash(pytest:*), Bash(cargo test:*), Bash(go test:*), Read, Edit, Write
---

# TDD Command

Guide through Test-Driven Development workflow.

---

## Usage

```
/tdd [feature-description]
```

**Examples:**
```
/tdd user authentication
/tdd payment processing
/tdd search functionality
```

---

## What This Command Does

1. **Analyzes Feature**: Breaks down feature into testable units
2. **Guides Red Phase**: Helps write failing tests first
3. **Guides Green Phase**: Implements minimum code to pass tests
4. **Guides Refactor Phase**: Improves code while keeping tests green
5. **Verifies Coverage**: Ensures adequate test coverage

---

## TDD Workflow

### Red Phase
1. Write a failing test
2. Run tests to confirm failure
3. Verify test failure is for the right reason

### Green Phase
1. Write minimal code to pass the test
2. Run tests to confirm they pass
3. Don't worry about code quality yet

### Refactor Phase
1. Improve code structure
2. Remove duplication
3. Run tests after each change
4. Keep all tests passing

---

## Example Session

```
User: /tdd user registration

TDD Guide: I'll guide you through implementing user registration using TDD.

### Feature Breakdown
- Validate email format
- Check email uniqueness
- Hash password
- Create user record
- Send confirmation email

### Starting with Red Phase
Let's write the first test for email validation:

```typescript
describe('User Registration', () => {
  it('should reject invalid email formats', () => {
    const result = validateEmail('invalid-email');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid email format');
  });
});
```

Run tests: ❌ FAIL (validateEmail is not defined)

This is expected! Now let's implement the minimum code to make it pass...

### Green Phase
```typescript
export function validateEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  return { valid: true };
}
```

Run tests: ✅ PASS

### Refactor Phase
The code is already clean for this simple case. Let's move to the next test...

[Continues through each feature...]
```

---

## Command Behavior

**Delegates to**: `tdd-guide` agent

**Provides**:
- Feature breakdown
- Test templates
- Implementation guidance
- Refactoring suggestions
- Coverage verification

**Ensures**:
- Tests are written first
- Minimum viable implementation
- All tests pass before moving forward
- Code is refactored with test safety net

---

## Best Practices

### Do:
- ✅ Write smallest possible test
- ✅ Watch test fail before implementing
- ✅ Write minimum code to pass
- ✅ Refactor with confidence (tests protect you)
- ✅ Commit after each green phase

### Don't:
- ❌ Write multiple tests at once
- ❌ Implement before test fails
- ❌ Skip the refactor phase
- ❌ Write tests after implementation
- ❌ Make tests depend on each other

---

## TDD Benefits

**Fast Feedback**: Know immediately when something breaks

**Better Design**: Writing tests first leads to better interfaces

**Confidence**: Refactor fearlessly with test safety net

**Documentation**: Tests document intended behavior

**Fewer Bugs**: Catch issues during development, not production

---

## When to Use

- ✅ Implementing new features
- ✅ Fixing bugs (write failing test first)
- ✅ Refactoring (tests protect against regression)
- ✅ Learning new codebase (tests help understand behavior)

---

## Related Commands

- `/test-coverage` - Analyze test coverage
- `/refactor-clean` - Clean code with test protection
- `/review-changes` - Review implementation

---

## Tips

**Start Small**: Begin with the simplest test case

**One Thing at a Time**: Focus on one test passing at a time

**Refactor Regularly**: Don't accumulate technical debt

**Keep Tests Fast**: Slow tests discourage running them

**Trust the Process**: Red-Green-Refactor cycle really works

---

## Resources

- Test Template: `.claude/templates/test.spec.ts.template`
- TDD Workflow Skill: `.claude/skills/tdd-workflow/SKILL.md`
- TDD Guide Agent: `.claude/agents/tdd-guide.md`

---

Remember: "Red, Green, Refactor" - it's a rhythm, not a rule to break!
