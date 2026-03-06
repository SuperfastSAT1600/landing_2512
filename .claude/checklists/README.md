# Checklists Directory

Standardized checklists for common development tasks.

---

## What Are Checklists?

Checklists ensure consistent quality by providing step-by-step verification criteria. They help prevent common mistakes and ensure nothing is overlooked.

---

## Available Checklists (12)

| Checklist | Purpose | When to Use |
|-----------|---------|-------------|
| `pr-review.md` | PR review criteria | Before approving any PR |
| `security-audit.md` | Security review | Before release, after major changes |
| `performance-audit.md` | Performance review | Optimization tasks, before release |
| `accessibility-audit.md` | A11y compliance | UI changes, before release |
| `pre-release.md` | Release readiness | Before every release |
| `onboarding.md` | New developer setup | New team member joining |
| `deployment-checklist.md` | Pre-deployment verification | Before production deployments |
| `database-migration-review.md` | Schema change validation | Before running migrations |
| `dependency-audit.md` | Package review | Adding/updating dependencies |
| `hotfix-checklist.md` | Urgent fix process | P0/P1 production issues |
| `build-errors-checklist.md` | Build error resolution | Systematic troubleshooting of build failures |
| `e2e-testing-checklist.md` | E2E test quality | Creating reliable end-to-end tests |

---

## How to Use

1. Copy the relevant checklist
2. Work through each item
3. Mark items as complete: `- [x]`
4. Document any exceptions
5. Archive completed checklist with PR/release

---

## Creating Custom Checklists

```markdown
# Checklist Name

Brief description of when to use this checklist.

## Section 1
- [ ] Item 1
- [ ] Item 2

## Section 2
- [ ] Item 3
- [ ] Item 4

## Notes
Additional context or exceptions.
```

---

## Best Practices

1. **Complete all items**: Don't skip steps
2. **Document exceptions**: Note why an item was skipped
3. **Update regularly**: Keep checklists current
4. **Share feedback**: Improve checklists based on experience
