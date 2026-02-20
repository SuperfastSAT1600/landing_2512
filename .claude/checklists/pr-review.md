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
