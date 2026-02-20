# AI-Generated Code Review Checklist

Use this checklist during PR reviews to detect and fix common AI-generated code patterns.

---

## Quick Scan (2 minutes)

Before diving into details, do a quick visual scan:

- [ ] **File count**: Is the PR touching too many unrelated files?
- [ ] **Similarity**: Do similar files (e.g., all API routes) look structurally similar?
- [ ] **Naming**: Are variable/function names consistent across files?
- [ ] **Imports**: Are import styles consistent?

---

## Structure & Consistency

### Export Patterns
- [ ] All files in same layer use same export style (`export default` vs named vs `module.exports`)
- [ ] Component files export consistently
- [ ] Utility files export consistently

### Function Declarations
- [ ] Arrow functions vs function declarations used consistently per context
- [ ] Handler naming is consistent (`handleX` vs `onX` vs `xHandler`)
- [ ] Async functions only where needed

### Error Handling
- [ ] Same error handling pattern used in similar functions
- [ ] Error responses follow same format
- [ ] No mixing of try-catch and .catch() in same file

---

## Naming & Style

### Variables
- [ ] Same concepts use same names across files (`isLoading` everywhere, not `loading` in some)
- [ ] Boolean variables use `is`/`has`/`should` prefix consistently
- [ ] No overly verbose names (`userEmailAddressString`)
- [ ] No cryptic abbreviations (`usrEml`)

### Functions
- [ ] Getter functions: `getX` or `fetchX` (pick one)
- [ ] Event handlers: `handleX` or `onX` (pick one)
- [ ] Validation: `validateX` or `isValidX` (pick one)
- [ ] Async operations named consistently

### Types
- [ ] Type names use PascalCase
- [ ] Props interfaces end with `Props`
- [ ] No single-use interfaces (inline instead)

---

## Complexity & Engineering

### Over-Engineering Signs
- [ ] No factory functions for simple objects
- [ ] No wrapper functions that just call another function
- [ ] No design patterns for <3 variants (use if/switch instead)
- [ ] No interfaces used only once
- [ ] No generic solutions for specific problems

### Kitchen Sink Signs
- [ ] No validation for TypeScript-guaranteed types
- [ ] No null checks where type system guarantees non-null
- [ ] No error handling for impossible scenarios
- [ ] No duplicate framework validation

### Simplification Opportunities
- [ ] Could any abstraction be inlined?
- [ ] Could any wrapper be removed?
- [ ] Could any interface be simplified to inline type?
- [ ] Could complex logic be replaced with simpler approach?

---

## Documentation & Comments

### Comment Quality
- [ ] No comments stating what code does (`// increment counter`)
- [ ] Comments explain *why*, not *what*
- [ ] No commented-out code (delete it)
- [ ] No stale comments referencing old code

### JSDoc Accuracy
- [ ] JSDoc parameters match actual function parameters
- [ ] Return types documented correctly
- [ ] Examples in JSDoc actually work
- [ ] No copy-pasted JSDoc from similar functions

### TODOs & Placeholders
- [ ] No unaddressed TODO comments
- [ ] No placeholder values (`your-api-key-here`)
- [ ] No generic error messages (`Something went wrong`)
- [ ] No `console.log` left in production code

---

## Code Flow

### Async Patterns
- [ ] `async` only used when function contains `await`
- [ ] Consistent use of async/await (not mixing with `.then()`)
- [ ] No unnecessary Promise wrapping

### Control Flow
- [ ] Early returns used to reduce nesting
- [ ] No excessive guard clauses
- [ ] Logic flows naturally (no goto-like patterns)

### Type Safety
- [ ] No `any` types (use `unknown` if needed)
- [ ] No type assertions (`as X`) without comment explaining why
- [ ] TypeScript inference used where possible

---

## Configuration Files

### Schema Validation
- [ ] All settings files include `$schema` property
- [ ] Same property names used across all settings files
- [ ] No typos in property names (`disabledMcpjsonServers` vs `disabledMcpServers`)

### Hook Consistency
- [ ] All hooks use same matcher syntax
- [ ] All hooks use same command style (shell script with `$file_path`)
- [ ] No fragile piping patterns (avoid `jq` in hooks)

---

## Copy-Paste Detection

### Duplicate Logic
- [ ] Similar logic extracted to shared utility
- [ ] No recreated utility functions
- [ ] Date formatting done one way
- [ ] String manipulation done one way

### Inconsistent Implementations
- [ ] Same API call pattern across services
- [ ] Same error handling across similar operations
- [ ] Same validation approach across forms

---

## Red Flags Summary

Stop and investigate if you see:

| Red Flag | What It Indicates |
|----------|-------------------|
| 5+ files with different patterns | AI sessions didn't maintain context |
| Factory for 1 variant | Over-engineering |
| Interface used once | Over-engineering |
| `// increment counter` | Obvious comments |
| `Something went wrong` | Template placeholder |
| `TODO: implement` | Incomplete code |
| `isLoadingData` + `loading` | Naming drift |
| `getUser` + `fetchOrder` | Inconsistent naming |
| `async` without `await` | Unnecessary async |
| `if (typeof x !== 'string')` after TS type | Redundant validation |

---

## Quick Fixes

### For Inconsistency
1. Pick the dominant pattern
2. Apply it to all similar files
3. Add to project style guide

### For Over-Engineering
1. Inline single-use abstractions
2. Remove wrapper functions
3. Replace patterns with conditionals

### For Verbosity
1. Delete obvious comments
2. Shorten variable names
3. Remove redundant type annotations

### For Template Smell
1. Implement or delete TODOs
2. Replace placeholder values
3. Make error messages specific

---

## Reviewer Checklist Summary

Before approving:

- [ ] Similar files follow same patterns
- [ ] Naming is consistent across codebase
- [ ] No unnecessary abstractions
- [ ] No obvious comments or verbose names
- [ ] No placeholder values or TODOs
- [ ] Configuration files use same schema
- [ ] Code flow is natural and idiomatic

---

## Resources

- Detailed detection rules: `.claude/rules/ai-code-detection.md`
- Coding style guide: `.claude/rules/coding-style.md`
- General code review: `.claude/rules/code-review.md`
