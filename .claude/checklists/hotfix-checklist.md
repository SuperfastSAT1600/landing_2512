# Hotfix Checklist

Use this checklist for urgent production fixes. Speed is important, but don't skip critical safety steps.

---

## Incident Assessment (5 minutes max)

### Severity Determination
- [ ] **P0 - Critical**: Complete outage, data loss, security breach
- [ ] **P1 - High**: Major feature broken, significant user impact
- [ ] **P2 - Medium**: Feature degraded, workaround exists
- [ ] **P3 - Low**: Minor issue, low impact

### Impact Assessment
- [ ] Number of affected users estimated
- [ ] Revenue/business impact assessed
- [ ] Security implications checked
- [ ] Data integrity verified

### Communication
- [ ] Incident channel created (Slack/Teams)
- [ ] On-call team notified
- [ ] Stakeholders informed
- [ ] Status page updated (if P0/P1)

---

## Root Cause Analysis (Quick)

### Identify the Issue
- [ ] Reproduce the issue
- [ ] Check recent deployments
- [ ] Review error logs
- [ ] Check external dependencies

### Scope the Fix
- [ ] Minimal fix identified
- [ ] Affected code/files known
- [ ] Risk of fix assessed
- [ ] Rollback option evaluated

---

## Hotfix Development

### Code Changes
- [ ] Branch from production (not develop)
- [ ] Minimal changes only (fix, not improve)
- [ ] No refactoring
- [ ] No unrelated changes

### Branch Naming
```
hotfix/short-description
hotfix/issue-123-fix-login
```

### Quick Validation
- [ ] Fix compiles/builds
- [ ] Unit tests pass
- [ ] Fix actually resolves the issue
- [ ] No obvious regressions

---

## Expedited Review

### Abbreviated Review (P0/P1)
- [ ] At least one other engineer reviews
- [ ] Focus: Does fix solve problem without breaking other things?
- [ ] Skip: Style, optimization, best practices (fix later)

### Review Questions
- [ ] Does the fix address the root cause?
- [ ] Could this fix cause other issues?
- [ ] Is this the safest minimal fix?
- [ ] What's the rollback plan?

### Approval
- [ ] Reviewer approved
- [ ] Tech lead/manager aware (for P0/P1)

---

## Pre-Deployment

### Testing (Abbreviated)
- [ ] Fix works in local environment
- [ ] Critical path smoke test
- [ ] Specific issue verified as fixed
- [ ] No new errors introduced

### Deployment Preparation
- [ ] Current production state noted
- [ ] Rollback command ready
- [ ] Monitoring dashboards open
- [ ] Support team notified

---

## Deployment

### Deploy Steps
- [ ] Deploy to staging (quick sanity check)
- [ ] Deploy to production
- [ ] Monitor for 15 minutes minimum
- [ ] Verify fix in production

### Monitoring During Deploy
- [ ] Error rates
- [ ] Response times
- [ ] Key business metrics
- [ ] User reports

### Verification
- [ ] Issue confirmed resolved
- [ ] No new issues introduced
- [ ] Metrics back to normal

---

## Post-Hotfix (Within 24 Hours)

### Immediate
- [ ] Status page updated (resolved)
- [ ] Stakeholders notified
- [ ] Incident channel updated

### Code Hygiene
- [ ] Hotfix merged to main/develop
- [ ] No branch divergence
- [ ] CI/CD passes on all branches

### Documentation
- [ ] Incident documented
- [ ] Root cause documented
- [ ] Fix documented

---

## Post-Mortem (Within 48 Hours)

### Schedule
- [ ] Post-mortem meeting scheduled
- [ ] All involved parties invited
- [ ] Timeline of events prepared

### Post-Mortem Document
- [ ] What happened
- [ ] Timeline of events
- [ ] Root cause analysis
- [ ] What went well
- [ ] What could improve
- [ ] Action items with owners

### Prevention
- [ ] How to prevent recurrence
- [ ] Monitoring improvements
- [ ] Testing improvements
- [ ] Process improvements

---

## Rollback Procedure

If hotfix makes things worse:

### Immediate Rollback
```bash
# Revert to previous deployment
kubectl rollout undo deployment/app-name
# or
git revert <hotfix-commit>
git push
```

### Rollback Criteria
- Error rate increases significantly
- New critical bugs introduced
- Fix doesn't resolve original issue
- Performance severely degraded

### Post-Rollback
- [ ] Notify team of rollback
- [ ] Update status page
- [ ] Re-assess the issue
- [ ] Plan new fix

---

## Communication Templates

### Initial Notification
```
INCIDENT: [Brief description]
SEVERITY: P[0-3]
IMPACT: [User impact]
STATUS: Investigating
CHANNEL: #incident-[name]
```

### Update
```
UPDATE: [What changed]
STATUS: [Investigating/Fixing/Deploying/Monitoring]
ETA: [If known]
```

### Resolution
```
RESOLVED: [Brief description]
DURATION: [Total time]
ROOT CAUSE: [Brief]
POST-MORTEM: [Scheduled/Link]
```

---

## Quick Reference: Severity Levels

| Severity | Response Time | Examples |
|----------|---------------|----------|
| P0 | Immediate | Complete outage, security breach, data loss |
| P1 | <30 minutes | Major feature broken, checkout down |
| P2 | <2 hours | Feature degraded, slow performance |
| P3 | Next business day | Minor bug, cosmetic issue |

---

## Emergency Contacts

| Role | Name | Phone | Slack |
|------|------|-------|-------|
| Primary On-Call | | | |
| Secondary On-Call | | | |
| Engineering Lead | | | |
| DevOps/SRE | | | |
| Product Owner | | | |

---

## Don't Do During Hotfix

- [ ] Don't add new features
- [ ] Don't refactor code
- [ ] Don't update dependencies
- [ ] Don't fix other bugs
- [ ] Don't skip testing entirely
- [ ] Don't skip code review (even abbreviated)
- [ ] Don't forget to merge to develop

---

## Notes

Document incident-specific information here.
