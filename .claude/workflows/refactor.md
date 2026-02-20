# Refactor Workflow

Systematic approach to refactoring code while maintaining functionality.

---

## Prerequisites

- [ ] Area to refactor identified
- [ ] Existing tests pass
- [ ] Refactoring goals defined
- [ ] Branch created from main

---

## Workflow Steps

### Step 1: Analyze Technical Debt
**Agent**: `tech-debt-analyzer`
**Duration**: 20-30 minutes

**Actions**:
1. Analyze target code for issues
2. Identify code smells
3. Assess complexity
4. Document current state

**Output**: Technical debt report with:
- Identified issues
- Severity ratings
- Suggested improvements
- Risk assessment

**Analysis Targets**:
- Cyclomatic complexity
- Code duplication
- Large files/functions
- Coupling issues
- Pattern violations

---

### Step 2: Plan Refactoring
**Agent**: Main context
**Duration**: 15-20 minutes

**Actions**:
1. Prioritize improvements
2. Break into incremental steps
3. Identify test requirements
4. Plan rollback strategy

**Output**: Refactoring plan with:
- Ordered list of changes
- Each change is independently verifiable
- Test strategy for each change

**Principles**:
- Small, incremental changes
- Each step leaves code working
- Tests pass after every change
- No behavior changes

---

### Step 3: Ensure Test Coverage
**Agent**: `unit-test-writer`
**Duration**: Variable

**Actions**:
1. Review existing test coverage
2. Add tests for uncovered code paths
3. Add characterization tests if needed
4. Verify all tests pass

**Output**:
- Complete test coverage of refactoring area
- All tests passing

**Gate**: ⏸️ **Tests must pass before refactoring**

---

### Step 4: Incremental Refactoring
**Agent**: Main context
**Duration**: Variable

**For each refactoring step**:

1. **Make single change**
2. **Run tests** - must pass
3. **Commit** - small, focused commit
4. **Repeat**

**Common Refactorings**:
```
- Extract function
- Extract class
- Move function/class
- Rename for clarity
- Remove duplication
- Simplify conditionals
- Introduce design pattern
- Remove dead code
```

**After each change**:
- [ ] Tests pass
- [ ] Code compiles
- [ ] Behavior unchanged
- [ ] Commit made

---

### Step 5: Code Review
**Agent**: `code-reviewer`
**Duration**: 15-30 minutes

**Actions**:
1. Review refactored code
2. Verify improvements achieved
3. Check for new issues
4. Validate patterns

**Review Focus**:
- Readability improved?
- Complexity reduced?
- Patterns followed?
- No functionality changes?

---

### Step 6: Final Verification
**Agent**: Main context
**Duration**: 10-15 minutes

**Actions**:
1. Run full test suite
2. Run linting
3. Verify build
4. Manual smoke test if needed

**Checklist**:
- [ ] All tests passing
- [ ] No lint errors
- [ ] Build successful
- [ ] Functionality unchanged
- [ ] Code quality improved

---

### Step 7: Commit & PR
**Agent**: Main context
**Duration**: 5-10 minutes

**Commit Format**:
```
refactor(scope): brief description

- [Improvement 1]
- [Improvement 2]
- [Improvement 3]

No functional changes.
```

**PR Description**:
```markdown
## Summary
Refactoring of [area] to improve [quality aspect].

## Changes
- [Change 1]
- [Change 2]

## Improvements
- Reduced complexity from X to Y
- Eliminated N lines of duplicate code
- Improved readability of [area]

## Testing
- [x] All existing tests pass
- [x] No functional changes
- [x] Manual verification completed
```

---

## Refactoring Principles

### Do
- Small, incremental changes
- Run tests after each change
- Commit frequently
- Keep behavior identical

### Don't
- Mix refactoring with features
- Make multiple changes at once
- Skip test verification
- Change functionality

---

## Common Refactoring Patterns

### Extract Function
```typescript
// Before
function processOrder(order) {
  // validation logic (10 lines)
  // discount calculation (15 lines)
  // tax calculation (10 lines)
  // total calculation (5 lines)
}

// After
function processOrder(order) {
  validateOrder(order);
  const discount = calculateDiscount(order);
  const tax = calculateTax(order);
  return calculateTotal(order, discount, tax);
}
```

### Replace Conditional with Polymorphism
```typescript
// Before
function getPrice(type) {
  switch(type) {
    case 'A': return priceA();
    case 'B': return priceB();
    case 'C': return priceC();
  }
}

// After
interface PriceStrategy {
  getPrice(): number;
}
class TypeA implements PriceStrategy { ... }
class TypeB implements PriceStrategy { ... }
```

---

## Tips

1. **Test first**: Ensure coverage before changing
2. **Small steps**: One refactoring at a time
3. **Commit often**: Each step is a commit
4. **No features**: Pure refactoring only
5. **Verify constantly**: Tests after every change
