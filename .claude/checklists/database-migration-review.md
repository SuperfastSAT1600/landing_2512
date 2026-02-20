# Database Migration Review Checklist

Use this checklist when reviewing database migrations before deployment.

---

## Migration Overview

### Basic Information
- [ ] Migration has a descriptive name
- [ ] Purpose of migration documented
- [ ] Affected tables/columns listed
- [ ] Expected data volume impact estimated

### Reversibility
- [ ] Down/rollback migration provided
- [ ] Rollback migration tested
- [ ] Data preservation on rollback verified
- [ ] Rollback time estimated

---

## Schema Changes

### Adding Tables
- [ ] Table name follows naming convention (snake_case, plural)
- [ ] Primary key defined
- [ ] Required indexes created
- [ ] Foreign keys with proper constraints
- [ ] Appropriate column types chosen
- [ ] NOT NULL constraints where appropriate
- [ ] DEFAULT values set where needed

### Modifying Tables
- [ ] Column additions are nullable or have defaults
- [ ] Column type changes are safe (no data loss)
- [ ] Column renames have migration path
- [ ] Constraints added after data validation
- [ ] No breaking changes to existing queries

### Removing Tables/Columns
- [ ] Data backup created (if needed)
- [ ] Dependent code already removed
- [ ] No foreign key violations
- [ ] Audit trail preserved (if required)

---

## Index Management

### Adding Indexes
- [ ] Index name is descriptive
- [ ] Index improves query performance (EXPLAIN analyzed)
- [ ] Index doesn't duplicate existing indexes
- [ ] Partial indexes considered for large tables
- [ ] Index created CONCURRENTLY (if supported and large table)

### Removing Indexes
- [ ] No queries depend on this index
- [ ] Performance tested without index
- [ ] Alternative indexes exist if needed

---

## Data Migration

### Data Integrity
- [ ] Data transformation logic is correct
- [ ] NULL values handled properly
- [ ] Data types converted safely
- [ ] Character encoding preserved
- [ ] Precision not lost in numeric conversions

### Data Validation
- [ ] Pre-migration validation queries prepared
- [ ] Post-migration validation queries prepared
- [ ] Row counts will match (or difference documented)
- [ ] Checksums for critical data (if applicable)

### Large Data Migrations
- [ ] Batch processing implemented
- [ ] Transaction size manageable
- [ ] Progress logging included
- [ ] Resumable if interrupted
- [ ] Estimated runtime acceptable

---

## Performance Considerations

### Lock Analysis
- [ ] Lock duration estimated
- [ ] Tables locked identified
- [ ] Lock impact on application assessed
- [ ] Off-peak deployment planned (if long locks)

### Query Impact
- [ ] Existing queries still work
- [ ] ORM migrations generated correctly
- [ ] Application code updated if needed
- [ ] Query plans verified after migration

### Resource Usage
- [ ] Disk space requirements estimated
- [ ] Transaction log space sufficient
- [ ] Memory requirements reasonable
- [ ] CPU impact acceptable

---

## Safety Checks

### Zero-Downtime Deployment
- [ ] Migration is backward compatible
- [ ] Old code works with new schema
- [ ] New code works with old schema
- [ ] No application downtime required

### Constraint Safety
- [ ] Constraints added in separate migration from data changes
- [ ] Constraints validated before enabling
- [ ] Invalid data handled before constraint

### Foreign Key Safety
- [ ] Referenced data exists before adding FK
- [ ] Cascading deletes reviewed
- [ ] Orphaned records handled

---

## Testing

### Local Testing
- [ ] Migration runs successfully on fresh database
- [ ] Migration runs successfully on copy of production data
- [ ] Rollback runs successfully
- [ ] Application works after migration

### Staging Testing
- [ ] Migration tested on staging with production-like data
- [ ] Performance acceptable on staging
- [ ] Application tested after staging migration
- [ ] Rollback tested on staging

---

## Deployment Plan

### Pre-Deployment
- [ ] Database backup created
- [ ] Point-in-time recovery verified
- [ ] Maintenance window scheduled (if needed)
- [ ] Team notified

### During Migration
- [ ] Monitor lock wait times
- [ ] Monitor replication lag
- [ ] Monitor disk space
- [ ] Application health monitoring

### Post-Migration
- [ ] Validate data integrity
- [ ] Run application smoke tests
- [ ] Verify no errors in logs
- [ ] Update documentation

---

## Rollback Criteria

Rollback if:
- [ ] Migration fails or times out
- [ ] Data integrity check fails
- [ ] Application errors increase significantly
- [ ] Performance degrades unacceptably
- [ ] Replication lag exceeds threshold

---

## Common Migration Patterns

### Safe Column Addition
```sql
-- Good: Nullable column with default
ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'active';

-- Bad: NOT NULL without default on existing table
-- ALTER TABLE users ADD COLUMN status VARCHAR(50) NOT NULL; -- DANGEROUS
```

### Safe Index Creation (PostgreSQL)
```sql
-- Good: Non-blocking index creation
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- Bad: Blocking index creation on large table
-- CREATE INDEX idx_users_email ON users(email); -- Locks table
```

### Safe Column Removal
```sql
-- Step 1: Stop using column in application
-- Step 2: Remove column (later deployment)
ALTER TABLE users DROP COLUMN deprecated_field;
```

---

## Documentation

- [ ] Migration purpose documented
- [ ] Schema changes documented
- [ ] Rollback procedure documented
- [ ] Any data transformations documented
- [ ] Post-migration tasks documented

---

## Notes

Document any migration-specific considerations here.
