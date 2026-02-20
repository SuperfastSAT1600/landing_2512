# Lint Fix Command

Run all linters and auto-fix issues.

---

## Usage

```
/lint-fix [path]
```

**Examples:**
```
/lint-fix                    # Fix entire project
/lint-fix src/components    # Fix specific directory
/lint-fix src/utils/api.ts  # Fix specific file
```

---

## What This Command Does

Runs all code quality tools with auto-fix:

1. **ESLint**: JavaScript/TypeScript linting
2. **Prettier**: Code formatting
3. **TypeScript**: Type checking
4. **Stylelint**: CSS/SCSS linting (if configured)
5. **Summary**: Report remaining issues

---

## Execution Order

```
1. Prettier (formatting)
   └── Auto-fixes: whitespace, quotes, semicolons, line length

2. ESLint (code quality)
   └── Auto-fixes: unused imports, sorting, simple patterns

3. TypeScript (type checking)
   └── Reports: type errors (no auto-fix)

4. Stylelint (if present)
   └── Auto-fixes: CSS property order, formatting
```

---

## Commands Executed

```bash
# 1. Format with Prettier
npx prettier --write "src/**/*.{ts,tsx,js,jsx,json,css,scss,md}"

# 2. Lint with ESLint
npx eslint . --ext .ts,.tsx,.js,.jsx --fix

# 3. Type check
npx tsc --noEmit

# 4. Stylelint (if configured)
npx stylelint "**/*.{css,scss}" --fix
```

---

## Example Session

**User**: `/lint-fix`

**Claude**:

### Running Linters

**1. Prettier (Formatting)**
```
Checking formatting...
✓ 145 files formatted
  - src/components/Button.tsx
  - src/utils/helpers.ts
  - ... 143 more
```

**2. ESLint (Code Quality)**
```
Running ESLint with --fix...

Auto-fixed:
  - 23 unused imports removed
  - 12 import order fixes
  - 8 prefer-const fixes
  - 5 no-explicit-any fixes

Remaining issues (manual fix required):
  src/services/api.ts
    12:5  error  'response' is assigned but never used  @typescript-eslint/no-unused-vars
    45:10 error  Unexpected any                         @typescript-eslint/no-explicit-any

  src/components/Form.tsx
    78:3  warning  Missing return type                  @typescript-eslint/explicit-function-return-type
```

**3. TypeScript (Type Check)**
```
Running tsc --noEmit...

Found 2 type errors:
  src/utils/api.ts:34:5
    Type 'string' is not assignable to type 'number'

  src/components/UserList.tsx:56:10
    Property 'email' does not exist on type 'User'
```

**4. Stylelint (CSS)**
```
Running Stylelint...
✓ All CSS files valid
```

---

### Summary

| Tool | Status | Auto-fixed | Remaining |
|------|--------|------------|-----------|
| Prettier | ✓ | 145 files | 0 |
| ESLint | ⚠️ | 48 issues | 3 issues |
| TypeScript | ✗ | N/A | 2 errors |
| Stylelint | ✓ | 0 | 0 |

**Action Required:**
- Fix 2 ESLint errors manually
- Fix 2 TypeScript errors

Would you like me to fix the remaining issues?

---

## Configuration Files

### ESLint (.eslintrc.js)
```javascript
module.exports = {
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'prettier', // Must be last
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    'import/order': ['error', {
      'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      'newlines-between': 'always',
      'alphabetize': { 'order': 'asc' }
    }],
  },
};
```

### Prettier (.prettierrc)
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

---

## Package.json Scripts

```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "lint:all": "npm run format && npm run lint:fix && npm run typecheck"
  }
}
```

---

## Common Auto-Fixes

### ESLint Auto-Fixes
| Issue | Auto-fixed |
|-------|-----------|
| Unused imports | ✓ |
| Import order | ✓ |
| Prefer const | ✓ |
| No var | ✓ |
| Trailing commas | ✓ |
| Semicolons | ✓ |
| Quotes | ✓ |

### Manual Fixes Required
| Issue | Why |
|-------|-----|
| Unused variables | May be intentional |
| Type errors | Needs code logic changes |
| any types | Needs proper typing |
| Complex patterns | Context-dependent |

---

## Best Practices

1. **Run Before Commits**: Add to pre-commit hook
2. **Fix Incrementally**: Don't let issues accumulate
3. **Configure Rules**: Align with team standards
4. **IDE Integration**: Enable format-on-save

---

## Troubleshooting

### "Module not found"
```bash
npm install -D eslint prettier typescript
```

### "Config file not found"
```bash
npx eslint --init
npx prettier --init
```

### "Too many errors"
```bash
# Fix file by file
npx eslint src/specific-file.ts --fix
```

---

## Related Commands

- `/test-and-build` - Run tests and build after linting
- `/review-changes` - Code review including lint issues
- `/commit-push-pr` - Commit after successful lint
