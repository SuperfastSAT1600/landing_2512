---
description: Remove dead code and modernize legacy patterns
allowed-tools: Bash(npm test:*), Bash(npm run build:*), Bash(npx eslint:*), Read, Edit, Write, Grep, Glob
---

# Refactor Clean Command

Remove dead code and modernize legacy patterns.

---

## Usage

```
/refactor-clean [scope]
```

**Scope options:**
- File path: `/refactor-clean src/services/UserService.ts`
- Directory: `/refactor-clean src/services/`
- Entire project: `/refactor-clean` (no argument)

---

## What This Command Does

1. **Analyzes Code**: Identifies dead code, outdated patterns, complexity
2. **Prioritizes Changes**: Groups refactoring by impact and safety
3. **Applies Modernization**: Updates to current best practices
4. **Removes Dead Code**: Deletes unused functions, imports, variables
5. **Simplifies Complexity**: Reduces nesting, extracts functions
6. **Verifies Safety**: Ensures tests still pass after changes

---

## Refactoring Categories

### Dead Code Removal
- Unused functions
- Unused variables
- Unused imports
- Unreachable code
- Commented-out code

### Modernization
- var → const/let
- callbacks → async/await
- Promises → async/await
- Class components → Functional components (React)
- any types → proper types (TypeScript)

### Complexity Reduction
- Deep nesting → early returns
- Long functions → extracted helpers
- Magic numbers → named constants
- Duplicate code → shared utilities

### Pattern Improvements
- Inconsistent error handling → standard patterns
- Mixed styles → consistent style
- Anti-patterns → best practices

---

## Example Session

```
User: /refactor-clean src/services/UserService.ts

Refactor Cleaner: Analyzing UserService.ts...

=== Analysis Complete ===

Found issues:
- 3 unused functions
- 5 unused imports
- 2 functions using callbacks (could be async/await)
- 1 function with high complexity (nested 5 levels)
- 7 var declarations (should be const/let)

---

### Phase 1: Safe Removals (Zero Risk)

**Removing unused imports:**
```diff
- import { oldHelper } from './deprecated';
- import { unusedUtil } from './utils';
```

**Removing unused functions:**
```diff
- function getLegacyUserId(user) {
-   return user.oldId || user.id;
- }
-
- function formatUserName(user) {
-   // No longer used, replaced by User.fullName getter
-   return `${user.firstName} ${user.lastName}`;
- }
```

Tests still passing: ✅

---

### Phase 2: Modernization (Low Risk)

**Converting var to const/let:**
```diff
- var userId = user.id;
+ const userId = user.id;

- var users = [];
+ let users = [];
```

**Converting callbacks to async/await:**
```diff
- function getUser(id, callback) {
-   db.users.findOne(id, (err, user) => {
-     if (err) return callback(err);
-     callback(null, user);
-   });
- }

+ async function getUser(id) {
+   return await db.users.findOne(id);
+ }
```

Tests still passing: ✅

---

### Phase 3: Complexity Reduction (Medium Risk)

**Reducing nested complexity:**

Before (complexity score: 8):
```typescript
function validateUser(user) {
  if (user) {
    if (user.email) {
      if (validateEmail(user.email)) {
        if (user.age) {
          if (user.age >= 18) {
            return { valid: true };
          } else {
            return { valid: false, error: 'Must be 18+' };
          }
        } else {
          return { valid: false, error: 'Age required' };
        }
      } else {
        return { valid: false, error: 'Invalid email' };
      }
    } else {
      return { valid: false, error: 'Email required' };
    }
  } else {
    return { valid: false, error: 'User required' };
  }
}
```

After (complexity score: 2):
```typescript
function validateUser(user) {
  if (!user) {
    return { valid: false, error: 'User required' };
  }

  if (!user.email) {
    return { valid: false, error: 'Email required' };
  }

  if (!validateEmail(user.email)) {
    return { valid: false, error: 'Invalid email' };
  }

  if (!user.age) {
    return { valid: false, error: 'Age required' };
  }

  if (user.age < 18) {
    return { valid: false, error: 'Must be 18+' };
  }

  return { valid: true };
}
```

Tests still passing: ✅

---

### Phase 4: Pattern Improvements (Higher Risk)

**Extracting duplicate code:**

Found duplicate email validation logic in 3 places.

Created shared utility:
```typescript
// utils/validation.ts
export function validateEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

Updated all 3 call sites to use shared utility.

Tests still passing: ✅

---

=== Summary ===

Changes applied:
- ✅ Removed 3 unused functions
- ✅ Removed 5 unused imports
- ✅ Converted 2 callbacks to async/await
- ✅ Modernized 7 var declarations
- ✅ Reduced complexity in 1 function (8 → 2)
- ✅ Extracted 1 duplicate pattern

**Lines removed**: 87
**Lines added**: 45
**Net reduction**: 42 lines (15% smaller)

**Complexity reduction**: 23% lower average complexity
**Test coverage**: Maintained at 85%
**All tests**: Still passing ✅

UserService.ts is now cleaner, more maintainable, and easier to understand!
```

---

## Command Behavior

**Delegates to**: `refactor-cleaner` agent

**Safety Checks**:
- Runs tests after each phase
- Rolls back if tests fail
- Skips high-risk changes by default
- Provides diff for review

**Analysis Tools**:
- Static analysis for dead code
- Complexity metrics
- Pattern detection
- Duplication analysis

---

## Refactoring Phases

### Phase 1: Safe Removals (Always Safe)
- Unused imports
- Unused variables
- Dead code (provably unreachable)
- Auto-applied if tests exist

### Phase 2: Modernization (Low Risk)
- var → const/let
- Callbacks → async/await
- Old syntax → modern syntax
- Auto-applied if tests exist

### Phase 3: Complexity (Medium Risk)
- Reducing nesting
- Extracting functions
- Simplifying logic
- Requires review

### Phase 4: Patterns (Higher Risk)
- Architectural changes
- Shared utilities
- Interface changes
- Requires careful review

---

## Best Practices

### Do:
- ✅ Have tests before refactoring
- ✅ Commit before running
- ✅ Review changes carefully
- ✅ Run on small scopes first
- ✅ Verify tests pass

### Don't:
- ❌ Refactor without tests
- ❌ Skip change review
- ❌ Refactor entire codebase at once
- ❌ Ignore test failures
- ❌ Mix refactoring with feature changes

---

## When to Use

- ✅ Before adding new features (clean foundation)
- ✅ After removing features (cleanup dead code)
- ✅ During code review (address feedback)
- ✅ Regular maintenance (quarterly cleanup)
- ✅ After dependency updates (use new patterns)

---

## Risk Levels

**Green (Safe)**: Unused code removal
- Zero risk, purely subtractive
- Auto-approved

**Yellow (Low Risk)**: Syntax modernization
- Well-tested patterns
- Auto-approved with tests

**Orange (Medium Risk)**: Logic simplification
- Changes control flow
- Requires review

**Red (High Risk)**: Pattern changes
- Affects multiple files
- Requires careful review

---

## Metrics Tracked

**Before/After**:
- Lines of code
- Cyclomatic complexity
- Function length
- Nesting depth
- Duplication percentage

---

## Related Commands

- `/build-fix` - Fix errors before refactoring
- `/test-coverage` - Ensure adequate tests
- `/review-changes` - Review refactoring changes
- `/security-review` - Security check after changes

---

## External Resources

**For comprehensive refactoring, reference:**

| Resource | Location | When to Use |
|----------|----------|-------------|
| Refactor Workflow | `.claude/workflows/refactor.md` | Multi-step refactoring process |
| Code Style Rules | `.claude/rules/coding-style.md` | Target code patterns |
| AI Code Detection | `.claude/checklists/ai-code-review.md` | Detect inconsistencies |
| Tech Debt Skills | `.claude/skills/coding-standards/SKILL.md` | Best practices reference |

---

## Tips

**Have Tests**: Refactoring without tests is dangerous

**Small Steps**: Refactor incrementally, not all at once

**Commit Often**: Commit after each successful phase

**Review Diffs**: Don't blindly accept all changes

**Keep Tests Green**: If tests fail, investigate immediately

---

"Any fool can write code that a computer can understand. Good programmers write code that humans can understand." - Martin Fowler

Let's make your code more human-friendly!
