# PR Review Checklist

Use this checklist when reviewing pull requests.

---

## Quick Checks (Every PR)

### General
- [ ] PR title follows convention (`feat:`, `fix:`, `refactor:`, etc.)
- [ ] PR description explains what and why
- [ ] PR size is reasonable (<400 lines preferred)
- [ ] No merge conflicts
- [ ] Target branch is correct

### Code Quality
- [ ] Code is readable and self-documenting
- [ ] No obvious bugs or logic errors
- [ ] Error handling is appropriate
- [ ] No hardcoded values (use constants/config)
- [ ] No commented-out code
- [ ] No console.log or debug statements

### Tests
- [ ] New code has tests
- [ ] Tests are meaningful (not just coverage)
- [ ] All tests pass
- [ ] Edge cases covered

---

## Detailed Review (Significant Changes)

### Architecture
- [ ] Follows existing patterns
- [ ] Appropriate separation of concerns
- [ ] No circular dependencies
- [ ] Changes are in correct layer

### Security
- [ ] Input validation present
- [ ] No SQL injection risks
- [ ] No XSS vulnerabilities
- [ ] Authentication checks where needed
- [ ] No secrets in code

### Performance
- [ ] No N+1 database queries
- [ ] No unnecessary computations in loops
- [ ] Appropriate data structures used
- [ ] No memory leaks (subscriptions, listeners)

### API Changes (if applicable)
- [ ] Backward compatible (or breaking change documented)
- [ ] Error responses follow standard format
- [ ] Status codes are correct
- [ ] Documentation updated

### Database Changes (if applicable)
- [ ] Migration is reversible
- [ ] Indexes added for queries
- [ ] No data loss
- [ ] Migration tested

### UI Changes (if applicable)
- [ ] Responsive design
- [ ] Loading states handled
- [ ] Error states handled
- [ ] Accessibility considered

---

## AI-Generated Code Checks

If code was AI-generated, also verify:

### Consistency
- [ ] Similar files follow same patterns (export style, naming, error handling)
- [ ] No naming drift (`isLoading` everywhere, not `loading` in some)
- [ ] Handler naming consistent (`handleX` or `onX`, pick one)

### Over-Engineering
- [ ] No factory functions for simple objects
- [ ] No wrapper functions that just call another function
- [ ] No interfaces used only once (inline instead)
- [ ] No generic solutions for specific problems

### Placeholders
- [ ] No unaddressed TODO comments
- [ ] No placeholder values (`your-api-key-here`)
- [ ] No generic error messages (`Something went wrong`)

---

## Final Checks

- [ ] I understand what this code does
- [ ] I would be comfortable maintaining this
- [ ] No concerns blocking approval
- [ ] Feedback provided constructively

---

## Decision

- [ ] **Approve**: Ready to merge
- [ ] **Request Changes**: Issues must be addressed
- [ ] **Comment**: Suggestions only, can merge

---

## Notes

Document any exceptions or concerns here.
