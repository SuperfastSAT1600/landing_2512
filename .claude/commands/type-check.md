---
name: type-check
description: Run strict TypeScript type checking and fix type errors
---

# Type Check Command

Run comprehensive TypeScript type checking with strict mode and systematically fix all type errors.

---

## Purpose

Ensure complete type safety across the codebase by enabling strict TypeScript checking and eliminating type errors.

---

## When to Use

- After adding new code
- Before committing changes
- When migrating JavaScript to TypeScript
- When enabling strict mode
- Before production deployment

---

## What It Does

1. **Runs TypeScript compiler** in strict mode (`tsc --noEmit`)
2. **Analyzes all type errors** and categorizes them
3. **Fixes errors systematically** by priority
4. **Enables strict flags** if not already enabled
5. **Verifies all fixes** by re-running type check

---

## Workflow

```
User: "/type-check"

Agent:
1. Run: tsc --noEmit
2. Count and categorize errors
3. Fix errors by priority:
   - Critical: any types, unsafe casts
   - High: Missing types, null safety
   - Medium: Implicit any, unused variables
   - Low: Missing return types
4. Re-run to verify
5. Report results
```

---

## Agents Used

- `code-reviewer` - Eliminate type errors
- Direct TypeScript compiler usage

---

## Error Categories

### Category 1: `any` Types (Critical)
```typescript
// Error: Parameter 'data' implicitly has an 'any' type
function process(data) {
  return data.value;
}

// Fix: Add proper type
function process(data: { value: string }): string {
  return data.value;
}

// Or use generic
function process<T extends { value: string }>(data: T): string {
  return data.value;
}
```

### Category 2: Null Safety (High)
```typescript
// Error: Object is possibly 'undefined'
const user = users.find(u => u.id === id);
console.log(user.name); // Error!

// Fix 1: Optional chaining
console.log(user?.name);

// Fix 2: Early return
if (!user) {
  throw new Error('User not found');
}
console.log(user.name);

// Fix 3: Nullish coalescing
const name = user?.name ?? 'Unknown';
```

### Category 3: Missing Types (High)
```typescript
// Error: Variable 'result' implicitly has an 'any' type
const result = await fetchData();

// Fix: Add type annotation
const result: ApiResponse = await fetchData();

// Or infer from function
async function fetchData(): Promise<ApiResponse> {
  // ...
}
```

### Category 4: Type Assertions (Medium)
```typescript
// Error: Type 'string' is not assignable to type 'number'
const id: number = userId as number; // Unsafe!

// Fix: Proper type guard
function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

if (isNumber(userId)) {
  const id: number = userId;
}
```

### Category 5: Unused Variables (Low)
```typescript
// Error: 'unusedVar' is declared but never used
function doSomething() {
  const unusedVar = 123;
  return 456;
}

// Fix: Remove unused variable
function doSomething() {
  return 456;
}

// Or prefix with underscore if intentionally unused
function doSomething(_unusedParam: number) {
  return 456;
}
```

---

## Strict Mode Flags

The command ensures these flags are enabled:

```json
{
  "compilerOptions": {
    "strict": true,  // Enables all strict checks

    // Included in "strict"
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,

    // Additional recommended flags
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

---

## Example Session

### Scenario: Fixing Type Errors

```
User: "/type-check"

Agent: Running TypeScript compiler...

Found 47 type errors:
- Critical (any types): 12
- High (null safety): 18
- Medium (missing types): 10
- Low (unused vars): 7

Fixing Critical Errors (12):
  ✓ src/utils/helpers.ts:15 - Added type to function parameter
  ✓ src/api/client.ts:42 - Replaced 'any' with proper interface
  ✓ src/hooks/useData.ts:8 - Added generic type
  ... (9 more)

Fixing High Priority Errors (18):
  ✓ src/components/User.tsx:23 - Added null check
  ✓ src/services/auth.ts:56 - Used optional chaining
  ... (16 more)

Fixing Medium Priority Errors (10):
  ✓ src/types/index.ts:12 - Added return type annotation
  ... (9 more)

Fixing Low Priority Errors (7):
  ✓ src/App.tsx:34 - Removed unused variable
  ... (6 more)

Re-running type check...
✓ All type errors fixed!

Summary:
- 47 errors fixed
- 0 errors remaining
- Strict mode: enabled
- Type safety: 100%
```

---

## Incremental Adoption

For large codebases, use incremental approach:

### Step 1: Check Specific Files
```bash
/type-check src/components/

# Only type-checks components directory
```

### Step 2: Exclude Legacy Code
```json
// tsconfig.json
{
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["src/legacy/**/*"]
}
```

### Step 3: Gradually Expand
```bash
# Week 1: New code only
/type-check src/features/new-feature/

# Week 2: Add another module
/type-check src/features/

# Week 3: Entire src
/type-check
```

---

## Common Fixes

### Fix 1: Third-Party Library Types
```typescript
// Error: Could not find declaration file for module 'untyped-lib'

// Solution 1: Install @types package
npm install -D @types/untyped-lib

// Solution 2: Create declaration file
// types/untyped-lib.d.ts
declare module 'untyped-lib' {
  export function doSomething(): void;
}

// Solution 3: Use 'any' as last resort
declare module 'untyped-lib';
```

### Fix 2: Event Handlers
```typescript
// Error: Parameter 'e' implicitly has an 'any' type

// ❌ Wrong
const handleClick = (e) => {
  console.log(e.target.value);
};

// ✅ Correct
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  console.log(e.currentTarget.value);
};

// Common types
React.ChangeEvent<HTMLInputElement>
React.FormEvent<HTMLFormElement>
React.KeyboardEvent<HTMLInputElement>
React.FocusEvent<HTMLInputElement>
```

### Fix 3: useState with Complex Types
```typescript
// Error: Argument of type 'null' is not assignable to parameter of type 'User'

// ❌ Wrong
const [user, setUser] = useState(null);

// ✅ Correct
const [user, setUser] = useState<User | null>(null);

// Usage
if (user) {
  console.log(user.name); // Type-safe!
}
```

### Fix 4: Async Functions
```typescript
// Error: Function lacks return type annotation

// ❌ Wrong
async function fetchUser(id: string) {
  return await api.get(`/users/${id}`);
}

// ✅ Correct
async function fetchUser(id: string): Promise<User> {
  return await api.get<User>(`/users/${id}`);
}
```

---

## Pre-commit Hook Integration

Add type checking to pre-commit:

```bash
# .claude/scripts/pre-commit-checks.sh
#!/bin/bash

echo "Running type check..."
npx tsc --noEmit

if [ $? -ne 0 ]; then
  echo "❌ Type check failed. Fix errors before committing."
  exit 1
fi

echo "✓ Type check passed"
```

---

## CI/CD Integration

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npx tsc --noEmit
```

---

## Type Safety Metrics

After running `/type-check`, metrics are displayed:

```
Type Safety Report:
──────────────────────────────────────
Total Files:           248
Type-safe Files:       248 (100%)
Files with 'any':      0 (0%)
Strict Mode:           Enabled ✓
──────────────────────────────────────

Strict Flags:
  ✓ strictNullChecks
  ✓ strictFunctionTypes
  ✓ noImplicitAny
  ✓ noUncheckedIndexedAccess
  ✓ noUnusedLocals
  ✓ noUnusedParameters

Type Coverage:         100%
```

---

## Best Practices

### DO
- ✅ Run `/type-check` before committing
- ✅ Fix errors by priority (critical first)
- ✅ Enable strict mode early in new projects
- ✅ Add types incrementally in legacy projects
- ✅ Use type guards for runtime validation
- ✅ Prefer `unknown` over `any`

### DON'T
- ❌ Use `@ts-ignore` to suppress errors
- ❌ Use `as any` to bypass type checking
- ❌ Leave `any` types in production code
- ❌ Skip type checking before deployment
- ❌ Disable strict mode to "fix" errors

---

## Output Files

After successful type check:

```
Generated:
  .claude/reports/type-check-YYYY-MM-DD.md
    - Error count by category
    - Fixes applied
    - Before/after comparison
```

---

## Related Commands

```bash
# Run type check, then lint
/type-check && /checkpoint

# Type check before commit
/type-check && git commit

# Full quality check
/type-check && /checkpoint
```

---

## Troubleshooting

### Issue: Too Many Errors
**Solution**: Start with critical errors, enable strict mode incrementally

### Issue: Slow Type Checking
**Solution**: Use project references, exclude unnecessary files

### Issue: False Positives
**Solution**: Review tsconfig.json, update @types packages

### Issue: Third-Party Library Errors
**Solution**: Install @types, create .d.ts files, or use module augmentation
