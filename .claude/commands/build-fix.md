---
description: Automatically fix build errors systematically
allowed-tools: Bash(npm run build:*), Bash(yarn build:*), Bash(tsc:*), Bash(cargo build:*), Bash(go build:*), Bash(mvn compile:*), Read, Edit, Write
---

# Build Fix Command

Automatically fix build errors systematically.

---

## Usage

```
/build-fix
```

No arguments needed - analyzes current build errors and fixes them.

---

## What This Command Does

1. **Runs Build**: Executes project build command
2. **Triages Errors**: Categorizes and prioritizes errors
3. **Fixes Iteratively**: Resolves errors one category at a time
4. **Verifies Fix**: Rebuilds after each fix to confirm resolution
5. **Reports Progress**: Shows errors fixed and remaining

---

## How It Works

### Error Triage

**Priority 1 (Critical):**
- Syntax errors
- Missing imports
- Type errors in core files

**Priority 2 (High):**
- Type mismatches
- Unused variables/imports
- Interface violations

**Priority 3 (Medium):**
- Linting errors
- Deprecation warnings
- Style violations

**Priority 4 (Low):**
- Non-critical warnings
- Documentation issues

### Fix Strategy

1. **Group Similar Errors**: Fix all imports together, all type errors together, etc.
2. **Fix Root Causes First**: Resolve core issues before dependent errors
3. **Incremental Verification**: Rebuild after each batch to catch regressions
4. **Smart Fixes**: Apply pattern-based fixes across multiple files

---

## Example Session

```
User: /build-fix

Build Error Resolver: Running build to identify errors...

=== Build Analysis ===
Found 47 errors across 12 files

Error Categories:
- Type errors: 23 (Priority 1)
- Missing imports: 15 (Priority 1)
- Unused variables: 7 (Priority 2)
- Linting issues: 2 (Priority 3)

Starting with Priority 1 errors...

---

### Round 1: Fixing Missing Imports

Files affected: 5 files
- UserService.ts: Missing import for 'User' type
- AuthController.ts: Missing import for 'validateEmail'
- PostService.ts: Missing import for 'Post' type
- ...

Applied fixes to 5 files.

Rebuilding... ✅ 15 errors resolved!

Remaining: 32 errors

---

### Round 2: Fixing Type Errors

Files affected: 8 files
- UserService.ts:42 - Property 'id' missing in type 'UserInput'
- PostController.ts:67 - Argument type mismatch
- ...

Analyzing type errors...

Issue 1: UserInput interface incomplete
Fix: Added 'id' field to UserInput interface

Issue 2: Function signature mismatch
Fix: Updated createPost call to match new signature

Applied fixes to 8 files.

Rebuilding... ✅ 20 errors resolved!

Remaining: 12 errors

---

### Round 3: Fixing Unused Variables

Files affected: 4 files
- UserService.ts:15 - Unused variable 'result'
- PostService.ts:23 - Unused import 'moment'
- ...

Applied fixes to 4 files.

Rebuilding... ✅ 7 errors resolved!

Remaining: 5 errors

---

### Round 4: Fixing Linting Issues

Files affected: 2 files
- Minor formatting issues
- Prefer const over let

Applied fixes to 2 files.

Rebuilding... ✅ 2 errors resolved!

Remaining: 3 errors

---

### Manual Intervention Needed

The following errors require human decision:

1. **AuthController.ts:156**
   Error: Cannot determine which overload to use
   Context: Multiple JWT signing methods available
   Suggestion: Specify explicit types or use specific overload

2. **UserService.ts:89**
   Error: Possible null reference
   Context: User lookup might return null
   Suggestion: Add null check or use optional chaining

3. **database.ts:34**
   Error: Module not found '@supabase/supabase-js'
   Context: Missing dependency
   Suggestion: Run 'npm install @supabase/supabase-js'

---

=== Summary ===
✅ Fixed: 44 errors (94%)
⚠️  Manual: 3 errors (6%)

Next steps:
1. Review manual intervention items above
2. Install missing dependencies if needed
3. Add null checks where indicated
4. Rerun build to verify

Great progress! Most errors are resolved.
```

---

## Command Behavior

**Delegates to**: `build-error-resolver` agent

**Build Commands Detected**:
- `npm run build`
- `yarn build`
- `tsc`
- `cargo build`
- `go build`
- `mvn compile`

**Automatic Detection**: Finds build command from package.json or project structure

---

## Error Categories

### Syntax Errors
- Missing brackets, semicolons
- Invalid syntax
- **Auto-fix**: Yes

### Type Errors
- Type mismatches
- Missing properties
- Interface violations
- **Auto-fix**: Yes (most cases)

### Import Errors
- Missing imports
- Incorrect import paths
- Circular dependencies
- **Auto-fix**: Yes (missing imports), No (circular deps)

### Linting Errors
- Style violations
- Unused code
- Complexity warnings
- **Auto-fix**: Yes

### Dependency Errors
- Missing packages
- Version conflicts
- **Auto-fix**: No (requires manual install)

---

## Best Practices

### Do:
- ✅ Run on clean git state (easy to revert)
- ✅ Review fixes before committing
- ✅ Let it fix multiple files at once
- ✅ Re-run until all auto-fixable errors resolved
- ✅ Read manual intervention suggestions

### Don't:
- ❌ Run with uncommitted changes
- ❌ Skip manual review of fixes
- ❌ Ignore manual intervention items
- ❌ Fix errors manually while command runs
- ❌ Interrupt mid-fix

---

## When to Use

- ✅ After major refactoring
- ✅ After dependency updates
- ✅ When build errors are overwhelming
- ✅ Before merging branches
- ✅ After code generation

---

## Safety Features

**Incremental Fixes**: Fixes are applied gradually with verification

**Rollback Ready**: Works best on clean git state for easy revert

**Verification**: Rebuilds after each batch to catch regressions

**Manual Escalation**: Flags errors that need human decision

---

## Related Commands

- `/test-and-build` - Run tests and build together
- `/refactor-clean` - Clean up after build fixes
- `/review-changes` - Review all applied fixes

---

## Tips

**Start Fresh**: Commit or stash changes before running

**Trust the Process**: Let it work through errors systematically

**Review Carefully**: Auto-fixes are usually correct but verify

**Handle Manual Items**: Don't ignore manual intervention suggestions

**Run Tests After**: Build success ≠ correct behavior, test it

---

From 47 errors to 3 manual reviews in minutes - that's the power of systematic fixing!
