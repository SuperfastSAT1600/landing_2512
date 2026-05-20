# Deployment Checklist

Use this checklist before deploying to production environments.

---

## Pre-Deployment Preparation

### Code Readiness
- [ ] All features for this release are complete
- [ ] All PRs are merged to deployment branch
- [ ] No work-in-progress code included
- [ ] Version number/tag is updated
- [ ] Changelog is updated

### Testing Verification
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] E2E tests pass in staging
- [ ] Manual QA sign-off (if required)
- [ ] Performance testing completed (if applicable)

### Environment Configuration
- [ ] Environment variables documented
- [ ] New env vars added to production
- [ ] Feature flags configured correctly
- [ ] Third-party service credentials verified
- [ ] Secrets rotated (if scheduled)

---

## Database Considerations

### Migrations
- [ ] Database migrations reviewed
- [ ] Migrations are backward compatible (can rollback)
- [ ] Migrations tested on staging data
- [ ] Large migrations have been tested for performance
- [ ] No migrations that lock tables for extended periods

### Data Backup
- [ ] Database backup created before deployment
- [ ] Backup verified and accessible
- [ ] Point-in-time recovery enabled
- [ ] Know how to restore from backup

---

## Infrastructure Readiness

### Capacity
- [ ] Sufficient server capacity
- [ ] Auto-scaling configured
- [ ] Resource limits reviewed
- [ ] Cost estimates checked

### Dependencies
- [ ] All external services healthy
- [ ] API rate limits reviewed
- [ ] CDN cache invalidation planned
- [ ] DNS changes propagated (if applicable)

### Monitoring
- [ ] Health check endpoints working
- [ ] Alerting configured and tested
- [ ] Dashboard access verified
- [ ] Log aggregation functioning
- [ ] Error tracking enabled

---

## Deployment Plan

### Communication
- [ ] Team notified of deployment window
- [ ] Stakeholders informed
- [ ] Status page prepared for updates
- [ ] Support team briefed on changes

### Timing
- [ ] Deployment window approved
- [ ] No conflicting maintenance
- [ ] On-call engineer identified
- [ ] Rollback plan reviewed

### Rollback Plan
- [ ] Rollback procedure documented
- [ ] Previous version available for rollback
- [ ] Database rollback plan (if migrations)
- [ ] Rollback criteria defined (what triggers rollback)

---

## During Deployment

### Health Checks
- [ ] Monitor deployment progress
- [ ] Verify new instances are healthy
- [ ] Check application logs for errors
- [ ] Verify database connectivity
- [ ] Test critical user flows

### Staged Rollout (if applicable)
- [ ] Canary deployment successful
- [ ] Gradual traffic shift monitored
- [ ] No spike in errors during rollout
- [ ] Performance metrics within bounds

---

## Post-Deployment Verification

### Functionality
- [ ] Critical paths working (login, checkout, etc.)
- [ ] New features functioning as expected
- [ ] No regression in existing features
- [ ] API responses correct
- [ ] Background jobs running

### Performance
- [ ] Response times within SLA
- [ ] No increase in error rates
- [ ] Resource utilization normal
- [ ] No memory leaks detected

### Monitoring
- [ ] No alerts firing
- [ ] Logs show normal operation
- [ ] Metrics dashboards green
- [ ] User feedback channels checked

---

## Post-Deployment Tasks

### Documentation
- [ ] Deployment documented (date, version, changes)
- [ ] Any issues encountered logged
- [ ] Runbook updated if needed
- [ ] Architecture diagrams updated

### Communication
- [ ] Team notified of successful deployment
- [ ] Stakeholders updated
- [ ] Status page updated (if was degraded)
- [ ] Release notes published

### Cleanup
- [ ] Old deployment artifacts cleaned up
- [ ] Feature flags cleaned up (if applicable)
- [ ] Temporary migrations removed
- [ ] Monitoring for next 24-48 hours

---

## Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| On-Call Primary | | |
| On-Call Secondary | | |
| Database Admin | | |
| Infrastructure | | |
| Product Owner | | |

---

## Rollback Triggers

Initiate rollback if:
- [ ] Error rate > 5% (sustained 5+ minutes)
- [ ] P95 latency > 2x baseline
- [ ] Critical functionality broken
- [ ] Security vulnerability discovered
- [ ] Data integrity issues detected

---

## Notes

Document any deployment-specific considerations here.
