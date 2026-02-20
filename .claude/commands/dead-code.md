---
name: dead-code
description: Find and remove unused code, exports, and dependencies
---

# Dead Code Detection Command

Find and safely remove unused code, exports, imports, functions, and dependencies to reduce bundle size and improve maintainability.

---

## Purpose

Identify dead code that's accumulating in the codebase and safely remove it without breaking functionality.

---

## When to Use

- Before major releases
- During codebase cleanup sprints
- After removing features
- When bundle size is growing
- During refactoring efforts

---

## What It Does

1. **Scans codebase** for unused code
2. **Categorizes findings** by type and safety
3. **Analyzes dependencies** to determine what's safe to remove
4. **Removes dead code** with confirmation
5. **Verifies** removal didn't break anything

---

## What Gets Detected

### 1. Unused Exports
```typescript
// File: utils.ts
export function usedFunction() { } // Used elsewhere
export function unusedFunction() { } // Never imported ❌

// Detection: unusedFunction is exported but never imported
```

### 2. Unused Imports
```typescript
import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';

function Component() {
  const [count, setCount] = useState(0); // useState, setCount used
  // useEffect, useMemo, format never used ❌
  return <div>{count}</div>;
}
```

### 3. Unused Functions/Variables
```typescript
function Component() {
  const unusedVar = 123; // Never referenced ❌

  function unusedHelper() { } // Never called ❌

  function usedHelper() {
    return 'value';
  }

  return <div>{usedHelper()}</div>;
}
```

### 4. Unused Dependencies
```bash
# package.json
{
  "dependencies": {
    "lodash": "^4.17.21",  # Used ✓
    "moment": "^2.29.4"     # Not imported anywhere ❌
  }
}
```

### 5. Unreachable Code
```typescript
function example() {
  return 'early return';

  console.log('This never runs'); // Unreachable ❌
  const x = 123; // Unreachable ❌
}
```

### 6. Unused Files
```
src/
├── components/
│   ├── Button.tsx          # Used ✓
│   └── OldButton.tsx       # Not imported anywhere ❌
```

---

## Workflow

```
User: "/dead-code"

Agent:
1. Scan codebase with static analysis
2. Identify unused code by category
3. Check for dynamic imports / indirect usage
4. Present findings with safety levels
5. Remove code with user confirmation
6. Run tests to verify nothing broke
```

---

## Tools Used

### TypeScript Analysis
```bash
# Find unused exports
npx ts-prune

# Find unused files
npx unimported
```

### ESLint Rules
```json
{
  "rules": {
    "no-unused-vars": "error",
    "@typescript-eslint/no-unused-vars": "error"
  }
}
```

### Bundle Analysis
```bash
# Analyze bundle to find unused code
npm run build -- --analyze
```

---

## Example Session

```
User: "/dead-code"

Agent: Scanning for dead code...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Found 45 instances of dead code:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

UNUSED EXPORTS (12):
  src/utils/helpers.ts
    - formatDate (never imported)
    - calculateAge (never imported)

  src/hooks/useOldApi.ts
    - useOldApi (replaced by useNewApi)

UNUSED IMPORTS (18):
  src/components/Dashboard.tsx
    - useMemo, useCallback (from 'react')
    - debounce (from 'lodash')

  src/pages/Profile.tsx
    - format (from 'date-fns')

UNUSED FUNCTIONS (8):
  src/services/auth.ts
    - legacyLogin (never called)
    - oldValidation (never called)

UNUSED FILES (3):
  src/components/OldButton.tsx
  src/utils/deprecated.ts
  src/hooks/useLegacyState.ts

UNUSED DEPENDENCIES (4):
  moment (replaced by date-fns)
  jquery (legacy code removed)
  underscore (replaced by lodash)
  request (replaced by axios)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Potential Savings:
  Bundle size: ~120KB
  Dependencies: 4 packages
  Files: 3 files
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Removing dead code...

✓ Removed 12 unused exports
✓ Removed 18 unused imports
✓ Removed 8 unused functions
✓ Removed 3 unused files
✓ Removed 4 unused dependencies

Running tests to verify...
✓ All tests pass

Final Results:
  Removed: 45 instances
  Bundle size reduced: 118KB (12%)
  Dependencies removed: 4
  No breaking changes detected ✓
```

---

## Safety Levels

### Safe (Auto-remove)
- Unused imports
- Unreachable code after returns
- Variables declared but never read
- Private functions never called

### Medium (Confirm)
- Exported but unused functions
- Files not imported anywhere
- Dependencies not imported

### Risky (Manual review)
- Public API exports (might be used externally)
- Functions with side effects
- Dynamic imports (`import()`)
- Code that might be used at runtime

---

## Detection Methods

### Method 1: Static Analysis (TypeScript)
```typescript
// Uses TypeScript compiler API
import ts from 'typescript';

function findUnusedExports(program: ts.Program) {
  const checker = program.getTypeChecker();
  const sourceFiles = program.getSourceFiles();

  for (const sourceFile of sourceFiles) {
    ts.forEachChild(sourceFile, visit);

    function visit(node: ts.Node) {
      if (ts.isExportDeclaration(node)) {
        // Check if export is used
      }
      ts.forEachChild(node, visit);
    }
  }
}
```

### Method 2: Import Analysis
```bash
# Find files never imported
find src -name "*.ts" -o -name "*.tsx" | while read file; do
  filename=$(basename "$file")
  if ! grep -r "from.*$filename" src/ >/dev/null; then
    echo "Unused: $file"
  fi
done
```

### Method 3: ESLint
```bash
# Run ESLint with unused vars rule
npx eslint . --rule 'no-unused-vars: error'
```

---

## Removing Unused Dependencies

### Step 1: Detect
```bash
npx depcheck

# Output:
# Unused dependencies
# * moment
# * jquery
# * underscore
```

### Step 2: Verify
```bash
# Search codebase for usage
rg "from ['\"]moment['\"]" src/
rg "import.*moment" src/
rg "require\(['\"]moment['\"]\)" src/

# If no results, safe to remove
```

### Step 3: Remove
```bash
npm uninstall moment jquery underscore

# Verify app still works
npm test
npm run build
```

---

## Edge Cases to Handle

### Dynamic Imports
```typescript
// ⚠️ False positive: Looks unused but is used dynamically
export function lazyComponent() {
  return import('./Component');
}

// Detection should check for string literals in import()
```

### Reflection/Runtime Usage
```typescript
// ⚠️ False positive: Used via string reference
const functionMap = {
  'doSomething': doSomething,  // Looks unused
};

function callByName(name: string) {
  return functionMap[name]();
}
```

### Public API
```typescript
// ⚠️ Don't remove: Part of public API
// Even if not used internally, might be used by consumers
export function publicAPIMethod() {
  // Used by library consumers
}
```

---

## Configuration

### Exclusions
```json
// .claude/dead-code.json
{
  "exclude": [
    "**/node_modules/**",
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/public/**"
  ],
  "ignoreExports": [
    "src/index.ts",  // Main entry point
    "src/api/**"     // Public API
  ],
  "ignoreDependencies": [
    "@types/*",      // Type definitions
    "typescript"     // Build tool
  ]
}
```

---

## CI/CD Integration

### Prevent Dead Code from Being Added
```yaml
# .github/workflows/dead-code.yml
name: Dead Code Check

on: [pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - name: Install dependencies
        run: npm ci

      - name: Check for dead code
        run: npx ts-prune --error

      - name: Check for unused dependencies
        run: npx depcheck --ignores="@types/*"
```

---

## Best Practices

### DO
- ✅ Run before major releases
- ✅ Remove unused code regularly
- ✅ Check for dynamic usage before removing
- ✅ Run tests after removal
- ✅ Keep public API exports even if unused internally

### DON'T
- ❌ Remove code that might be used dynamically
- ❌ Remove public API exports without deprecation
- ❌ Skip testing after removal
- ❌ Remove code without understanding its purpose

---

## Metrics

After successful run:

```
Dead Code Report:
──────────────────────────────────────
Unused Exports:        12 removed
Unused Imports:        18 removed
Unused Functions:      8 removed
Unused Files:          3 removed
Unused Dependencies:   4 removed
──────────────────────────────────────
Bundle Size Before:    1.2MB
Bundle Size After:     1.08MB
Reduction:             120KB (10%)
──────────────────────────────────────
```

---

## Related Commands

```bash
# Dead code check + type check
/dead-code && /type-check

# Dead code + build
/dead-code && npm run build

# Full cleanup
/dead-code && /lint-fix && /audit-deps
```

---

## Output

Creates report in `.claude/reports/dead-code-YYYY-MM-DD.md`:

```markdown
# Dead Code Report - 2026-01-21

## Summary
- 45 instances of dead code found and removed
- Bundle size reduced by 120KB
- 4 dependencies removed

## Details

### Unused Exports (12)
- `src/utils/helpers.ts` - `formatDate`
- ...

### Unused Dependencies (4)
- moment → Replaced by date-fns
- ...

## Verification
✓ All tests pass
✓ Build successful
✓ No breaking changes
```
