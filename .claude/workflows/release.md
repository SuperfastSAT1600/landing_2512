# Release Workflow

Prepare and deploy a new release version.

---

## Prerequisites

- [ ] All features for release merged
- [ ] Release branch created (if using GitFlow)
- [ ] Release version determined (semver)
- [ ] Release notes drafted

---

## Workflow Steps

### Step 1: Code Freeze Verification
**Agent**: Main context
**Duration**: 10 minutes

**Actions**:
1. Verify all PRs merged
2. Check for pending critical fixes
3. Confirm branch is stable
4. Lock release branch

**Checklist**:
- [ ] All planned features merged
- [ ] No pending critical PRs
- [ ] Branch up to date with main
- [ ] CI passing

---

### Step 2: Dependency Audit
**Agent**: `dependency-manager`
**Duration**: 15-20 minutes

**Actions**:
1. Run security audit
2. Check for outdated packages
3. Verify license compliance
4. Update if needed

**Output**:
- Audit report
- Updated dependencies (if safe)
- Known issues documented

**Gate**: ⏸️ **Fix critical vulnerabilities before release**

---

### Step 3: Security Review
**Agent**: `security-reviewer`
**Duration**: 30-60 minutes

**Actions**:
1. Full security scan
2. Review recent changes
3. Check for exposed secrets
4. Verify auth/permissions

**Output**: Security report with:
- Findings categorized by severity
- Recommendations
- Sign-off for release

**Gate**: ⏸️ **No critical security issues**

---

### Step 4: Full Test Suite
**Agent**: Main context
**Duration**: Variable

**Actions**:
1. Run all unit tests
2. Run integration tests
3. Run E2E tests
4. Performance tests (if applicable)

**Checklist**:
- [ ] Unit tests: ✅ passing
- [ ] Integration tests: ✅ passing
- [ ] E2E tests: ✅ passing
- [ ] Coverage meets threshold

---

### Step 5: Documentation Update
**Agent**: `doc-updater`
**Duration**: 20-30 minutes

**Actions**:
1. Update changelog
2. Update version in docs
3. Review API documentation
4. Update migration guide (if breaking)

**Output**:
- CHANGELOG.md updated
- Version bumped in package.json
- Documentation reflects changes

---

### Step 6: Version Bump & Tag
**Agent**: Main context
**Duration**: 5-10 minutes

**Actions**:
```bash
# Bump version
npm version [major|minor|patch]

# Or manually
# 1. Update package.json version
# 2. Update package-lock.json
# 3. Commit: "chore(release): v1.2.0"
# 4. Tag: git tag v1.2.0
```

**Version Decision**:
- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes only

---

### Step 7: Build & Verify
**Agent**: Main context
**Duration**: 10-15 minutes

**Actions**:
1. Production build
2. Verify build artifacts
3. Test built output
4. Size check (if applicable)

**Checklist**:
- [ ] Build succeeds
- [ ] Artifacts generated correctly
- [ ] No build warnings
- [ ] Bundle size acceptable

---

### Step 8: Deploy to Staging
**Agent**: Main context
**Duration**: 15-30 minutes

**Actions**:
1. Deploy to staging environment
2. Run smoke tests
3. Verify core functionality
4. Check monitoring/logs

**Staging Checklist**:
- [ ] Deployment successful
- [ ] Health checks passing
- [ ] Core features working
- [ ] No errors in logs

**Gate**: ⏸️ **Staging verification required**

---

### Step 9: Deploy to Production
**Agent**: Main context
**Duration**: 15-30 minutes

**Auto-Gate**: 🔄 **Deployment Checklists Auto-Triggered**
> Before deploying to production, automatically run through:
> - `.claude/checklists/deployment-checklist.md` (infrastructure & env vars)
> - `.claude/checklists/pre-release.md` (feature completeness)

**Actions**:
1. Deploy to production
2. Monitor deployment
3. Run smoke tests
4. Verify metrics

**Production Checklist**:
- [ ] Deployment successful
- [ ] Health checks passing
- [ ] Core features working
- [ ] Error rates normal
- [ ] Performance metrics normal

---

### Step 10: Post-Release
**Agent**: Main context
**Duration**: 10-15 minutes

**Actions**:
1. Push tags to remote
2. Create GitHub release
3. Announce release (if applicable)
4. Close release milestone

```bash
# Push tags
git push origin v1.2.0

# Create GitHub release
gh release create v1.2.0 \
  --title "v1.2.0" \
  --notes-file CHANGELOG.md
```

---

## Release Checklist Summary

### Pre-Release
- [ ] All features merged
- [ ] Dependencies audited
- [ ] Security reviewed
- [ ] All tests passing
- [ ] Documentation updated

### Release
- [ ] Version bumped
- [ ] Build verified
- [ ] Staging tested
- [ ] Production deployed
- [ ] Tags pushed

### Post-Release
- [ ] GitHub release created
- [ ] Announcement made
- [ ] Milestone closed
- [ ] Monitoring verified

---

## Rollback Plan

### If Issues Found

1. **Immediate**: Revert deployment
   ```bash
   # Vercel
   vercel rollback

   # Kubernetes
   kubectl rollout undo deployment/app
   ```

2. **Hotfix**: If critical
   - Create hotfix branch
   - Fix issue
   - Fast-track release

3. **Post-mortem**:
   - Document what happened
   - Identify root cause
   - Prevent recurrence

---

## Tips

1. **Don't rush**: Thorough verification prevents issues
2. **Monitor closely**: Watch metrics after deploy
3. **Have rollback ready**: Know how to revert
4. **Communicate**: Keep team informed
5. **Document**: Update runbooks if needed
