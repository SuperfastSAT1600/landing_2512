---
description: Comprehensive code review of all changes
allowed-tools: Bash(git diff:*), Bash(git status:*), Read, Grep, Glob
---

# Review Changes

This command performs a comprehensive review of all changes in the current branch.

## Usage
Use before creating a PR to ensure code quality and catch issues early.

## Instructions

Perform a thorough review of all changes in the current branch:

1. **Get Branch Diff**
   - Run `git diff main...HEAD` (or appropriate base branch)
   - Review ALL files that changed, not just recent commits

2. **Code Quality Checks**
   - **Correctness**: Does the code do what it's supposed to?
   - **Edge Cases**: Are edge cases handled?
   - **Error Handling**: Are errors caught and handled appropriately?
   - **Security**: Any security vulnerabilities? (SQL injection, XSS, etc.)
   - **Performance**: Any obvious performance issues?

3. **Code Style Checks**
   - **Consistency**: Does it match project style?
   - **Naming**: Are names clear and descriptive?
   - **Comments**: Are complex parts commented? Are there unnecessary comments?
   - **Complexity**: Is code overly complex? Can it be simplified?

4. **Testing Checks**
   - Are there tests for new functionality?
   - Do tests cover edge cases?
   - Are existing tests still valid?

5. **Documentation Checks**
   - Are public APIs documented?
   - Is CLAUDE.md updated if needed?
   - Are breaking changes noted?

6. **Report Findings**
   - List any issues found with file:line references
   - Suggest fixes for each issue
   - Prioritize by severity (critical, important, minor)

## Example Report Format

```markdown
## Review Summary

**Files Changed**: 8
**Lines Added**: 245
**Lines Removed**: 103

## Issues Found

### Critical
- [src/auth.ts:42](src/auth.ts#L42) - SQL injection vulnerability in login query
- [src/api.ts:156](src/api.ts#L156) - Missing error handling for API call

### Important
- [src/components/Form.tsx:78](src/components/Form.tsx#L78) - Form validation doesn't check for empty string
- [tests/auth.test.ts](tests/auth.test.ts) - Missing tests for password reset flow

### Minor
- [src/utils/format.ts:23](src/utils/format.ts#L23) - Complex nested ternary could be simplified
- [src/constants.ts:12](src/constants.ts#L12) - Magic number should be a named constant

## Recommended Actions
1. Fix critical SQL injection before proceeding
2. Add error handling to API calls
3. Add form validation tests
4. Consider refactoring complex utils
```

## Notes
- Be thorough but practical
- Focus on real issues, not nitpicks
- Suggest concrete improvements
- Reference specific file locations
