# Pre-Release Checklist

Complete before every release.

---

## Code Quality

### Tests
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] All E2E tests passing
- [ ] Test coverage meets threshold (≥80%)
- [ ] No skipped tests (or documented reason)

### Build
- [ ] Production build succeeds
- [ ] No build warnings
- [ ] Bundle size acceptable
- [ ] Source maps generated (if needed)

### Linting
- [ ] No ESLint errors
- [ ] No TypeScript errors
- [ ] No Prettier issues
- [ ] No Stylelint issues (if applicable)

---

## Security

### Audit
- [ ] npm audit shows no critical/high issues
- [ ] Snyk scan passed (or issues documented)
- [ ] No new security warnings
- [ ] Secrets scan passed

### Review
- [ ] Security review completed (major changes)
- [ ] No hardcoded credentials
- [ ] Auth endpoints tested
- [ ] Permission checks verified

---

## Dependencies

- [ ] All dependencies up to date (or documented)
- [ ] No deprecated packages
- [ ] No conflicting peer dependencies
- [ ] License compliance verified
- [ ] Package-lock.json committed

---

## Database

### Migrations
- [ ] All migrations tested
- [ ] Migrations are reversible
- [ ] No data loss migrations
- [ ] Backup plan in place

### Performance
- [ ] New queries analyzed (EXPLAIN)
- [ ] Indexes added where needed
- [ ] No N+1 queries introduced

---

## Documentation

### Changelog
- [ ] CHANGELOG.md updated
- [ ] Breaking changes documented
- [ ] Migration guide (if needed)
- [ ] New features documented

### Technical Docs
- [ ] API documentation updated
- [ ] README reflects changes
- [ ] Environment variables documented
- [ ] Deployment notes updated

---

## Version

- [ ] Version number updated (package.json)
- [ ] Version follows semver
- [ ] Git tag created
- [ ] Version matches changelog

---

## Staging Verification

### Deployment
- [ ] Deployed to staging
- [ ] Health checks passing
- [ ] No errors in logs
- [ ] Metrics normal

### Functional
- [ ] Core features working
- [ ] New features working
- [ ] No regressions found
- [ ] Mobile responsive (if web)

### Performance
- [ ] Page load time acceptable
- [ ] API response times normal
- [ ] No memory leaks observed
- [ ] Database queries performant

---

## Rollback Plan

- [ ] Rollback procedure documented
- [ ] Rollback tested (or verified)
- [ ] Database rollback possible
- [ ] Feature flags ready (if applicable)

---

## Communication

- [ ] Release notes prepared
- [ ] Stakeholders notified
- [ ] Support team briefed (if needed)
- [ ] Monitoring team alerted

---

## Final Checks

- [ ] All items above completed
- [ ] Release branch up to date
- [ ] No pending merge conflicts
- [ ] CI/CD pipeline green
- [ ] Team approval obtained

---

## Release Decision

- [ ] **GO**: Ready for release
- [ ] **NO-GO**: Issues must be resolved

**Reason (if NO-GO)**: _______________

---

## Sign-Off

**Release Manager**: _______________
**Date**: _______________
**Version**: _______________
**Environment**: [ ] Staging [ ] Production
