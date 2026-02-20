---
description: Run tests and build, fixing any errors that occur
allowed-tools: Bash(npm test:*), Bash(npm run build:*), Bash(pytest:*), Bash(cargo test:*), Bash(cargo build:*), Bash(make:*), Read, Edit, Write
---

# Test and Build

This command runs the test suite and builds the project, fixing any issues found.

## Usage
Use this command before creating a PR or after making significant changes.

## Instructions

You will run tests and build the project, fixing any errors that occur.

1. **Run Tests**
   - Execute the project's test command (e.g., `npm test`, `pytest`, `cargo test`)
   - If tests fail:
     - Analyze the failure messages
     - Fix the underlying issues
     - Re-run tests to verify fixes
   - Continue until all tests pass

2. **Run Build**
   - Execute the project's build command (e.g., `npm run build`, `make`, `cargo build`)
   - If build fails:
     - Analyze error messages (type errors, linting errors, etc.)
     - Fix the issues
     - Re-run build to verify fixes
   - Continue until build succeeds

3. **Verify**
   - Run final test suite to ensure fixes didn't break anything
   - Run final build to ensure everything compiles
   - Report summary of what was fixed

## Example Workflow

```bash
# Run tests
npm test

# If failures, fix and re-run
# (Fix code...)
npm test

# Run build
npm run build

# If failures, fix and re-run
# (Fix code...)
npm run build

# Final verification
npm test && npm run build
```

## Notes
- Fix issues one at a time, testing after each fix
- Don't skip or ignore test failures
- Type errors must be fixed, don't use `@ts-ignore` unless absolutely necessary
- Linting errors should be fixed properly, not disabled
