# PostgreSQL Migration Patterns

Production-safe database migration strategies for PostgreSQL 14+ with zero-downtime techniques.

---

## Zero-Downtime Migration Principles

### The Problem

Traditional migrations lock tables, causing downtime:
- ADD COLUMN with DEFAULT: Rewrites entire table (minutes to hours)
- ALTER COLUMN TYPE: Exclusive lock, rewrites table
- DROP COLUMN: Locks table briefly, but breaks old app code
- CREATE INDEX: Locks table for writes (use CONCURRENTLY)

### The Solution

**Multi-phase migrations:**
1. **Phase 1**: Add schema change (backward-compatible)
2. **Phase 2**: Deploy app code to use new schema
3. **Phase 3**: Backfill data (if needed)
4. **Phase 4**: Remove old schema

---

## Adding Columns Safely

### Adding Nullable Column (Always Safe)

```sql
-- Phase 1: Add column (instant, no table rewrite)
ALTER TABLE users ADD COLUMN phone TEXT;

-- Phase 2: Deploy app code that populates phone
-- Phase 3: Backfill existing rows (optional)
UPDATE users SET phone = NULL WHERE phone IS NULL;

-- Phase 4: Add constraint (if needed)
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;
```

**Safe:** No table rewrite, no exclusive lock.

### Adding Column with DEFAULT (PostgreSQL 11+)

```sql
-- SAFE: PostgreSQL 11+ doesn't rewrite table
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';

-- UNSAFE: PostgreSQL 10 and below rewrites entire table
-- Workaround for PG 10:
ALTER TABLE users ADD COLUMN role TEXT;
UPDATE users SET role = 'user' WHERE role IS NULL;  -- Backfill in batches
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';
```

**PostgreSQL 11+ optimization:** Default stored in metadata, not written to every row.

### Adding NOT NULL Column (Requires Backfill)

```sql
-- Phase 1: Add nullable column with default
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;

-- Phase 2: Deploy app code that sets email_verified
-- Wait for all old app instances to stop writing NULLs

-- Phase 3: Backfill NULLs (in batches to avoid long lock)
DO $$
DECLARE
  batch_size INT := 10000;
  updated INT;
BEGIN
  LOOP
    UPDATE users
    SET email_verified = false
    WHERE email_verified IS NULL
    LIMIT batch_size;

    GET DIAGNOSTICS updated = ROW_COUNT;
    EXIT WHEN updated = 0;
    COMMIT;  -- Release lock between batches
    PERFORM pg_sleep(0.1);  -- Throttle to avoid load spike
  END LOOP;
END $$;

-- Phase 4: Add NOT NULL constraint
ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;
```

**Key:** Backfill in small batches (1k-10k rows) to avoid locking table for minutes.

---

## Changing Column Types Safely

### The Problem

```sql
-- UNSAFE: Rewrites entire table, exclusive lock for minutes/hours
ALTER TABLE users ALTER COLUMN id TYPE BIGINT;
```

### Safe Approach: Dual-Write Pattern

```sql
-- Phase 1: Add new column
ALTER TABLE users ADD COLUMN id_new BIGINT;

-- Phase 2: Backfill data (in batches)
UPDATE users SET id_new = id::BIGINT WHERE id_new IS NULL LIMIT 10000;
-- Repeat in batches until complete

-- Phase 3: Create index on new column
CREATE UNIQUE INDEX CONCURRENTLY idx_users_id_new ON users(id_new);

-- Phase 4: Deploy app code to use id_new
-- Wait for all old instances to stop using id

-- Phase 5: Swap columns
ALTER TABLE users RENAME COLUMN id TO id_old;
ALTER TABLE users RENAME COLUMN id_new TO id;

-- Phase 6: Drop old column
ALTER TABLE users DROP COLUMN id_old;
```

**Alternative: Using USING Clause (Still Requires Lock)**

```sql
-- Faster than default cast, but still locks table
ALTER TABLE users ALTER COLUMN created_at TYPE TIMESTAMPTZ
USING created_at AT TIME ZONE 'UTC';
-- Use during maintenance window only
```

---

## Creating Indexes Safely

### Always Use CONCURRENTLY in Production

```sql
-- GOOD: Non-blocking index creation
CREATE INDEX CONCURRENTLY idx_orders_user_id ON orders(user_id);

-- BAD: Blocks writes during creation (minutes for large tables)
CREATE INDEX idx_orders_user_id ON orders(user_id);
```

### Handling CONCURRENTLY Failures

```sql
-- Create index
CREATE INDEX CONCURRENTLY idx_orders_status ON orders(status);
-- ERROR: deadlock detected

-- Check for invalid index
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE indexdef LIKE '%INVALID%';

-- Drop and retry
DROP INDEX CONCURRENTLY idx_orders_status;
CREATE INDEX CONCURRENTLY idx_orders_status ON orders(status);
```

**CONCURRENTLY notes:**
- Cannot run inside transaction block
- Takes longer than regular CREATE INDEX (scans table multiple times)
- May fail and leave INVALID index (must drop and retry)

### Creating Indexes on Large Tables

```sql
-- Option 1: Increase maintenance_work_mem temporarily
SET maintenance_work_mem = '2GB';
CREATE INDEX CONCURRENTLY idx_orders_created ON orders(created_at);

-- Option 2: Create index on new table, then swap
CREATE TABLE orders_new (LIKE orders INCLUDING ALL);
CREATE INDEX idx_orders_new_created ON orders_new(created_at);
-- Copy data, swap tables (advanced, requires planning)
```

---

## Dropping Columns Safely

### The Problem

```sql
-- UNSAFE: Breaks old app code immediately
ALTER TABLE users DROP COLUMN legacy_field;
-- Old app instances crash: "column legacy_field does not exist"
```

### Safe Multi-Phase Approach

```sql
-- Phase 1: Deploy app code that stops reading/writing legacy_field
-- Wait for all old instances to stop (zero deployments using column)

-- Phase 2: Drop column (safe now)
ALTER TABLE users DROP COLUMN legacy_field;
```

**Important:** Dropping a column in PostgreSQL is instant (marks column as dropped, doesn't rewrite table). The issue is backward compatibility, not performance.

---

## Renaming Columns/Tables Safely

### Renaming Columns (Dual-Write Pattern)

```sql
-- Phase 1: Add new column
ALTER TABLE users ADD COLUMN full_name TEXT;

-- Phase 2: Backfill data
UPDATE users SET full_name = name WHERE full_name IS NULL;

-- Phase 3: Deploy app code to write both columns
-- app.js: UPDATE users SET name = ?, full_name = ?

-- Phase 4: Deploy app code to read from full_name, write both
-- app.js: SELECT full_name FROM users

-- Phase 5: Deploy app code to only use full_name
-- app.js: UPDATE users SET full_name = ?

-- Phase 6: Drop old column
ALTER TABLE users DROP COLUMN name;
```

### Renaming Tables (Use Views)

```sql
-- Phase 1: Rename table
ALTER TABLE users RENAME TO accounts;

-- Phase 2: Create view with old name
CREATE VIEW users AS SELECT * FROM accounts;

-- Phase 3: Deploy app code to use accounts
-- Wait for all old instances to stop using users view

-- Phase 4: Drop view
DROP VIEW users;
```

---

## Backfilling Data Safely

### Batch Processing to Avoid Locks

```sql
-- BAD: Locks table for entire duration
UPDATE orders SET country = 'US' WHERE country IS NULL;
-- Locks table for minutes on large tables

-- GOOD: Batch updates with throttling
DO $$
DECLARE
  batch_size INT := 5000;
  rows_updated INT;
  total_updated INT := 0;
BEGIN
  LOOP
    -- Update batch
    WITH batch AS (
      SELECT id FROM orders
      WHERE country IS NULL
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED  -- Skip locked rows (avoid contention)
    )
    UPDATE orders
    SET country = 'US'
    FROM batch
    WHERE orders.id = batch.id;

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    total_updated := total_updated + rows_updated;

    -- Log progress
    RAISE NOTICE 'Updated % rows (total: %)', rows_updated, total_updated;

    -- Exit if no more rows
    EXIT WHEN rows_updated = 0;

    -- Commit and throttle
    COMMIT;
    PERFORM pg_sleep(0.1);  -- 100ms pause between batches
  END LOOP;

  RAISE NOTICE 'Backfill complete: % total rows updated', total_updated;
END $$;
```

**Key techniques:**
- `FOR UPDATE SKIP LOCKED`: Avoids blocking on locked rows
- `COMMIT` between batches: Releases locks
- `pg_sleep()`: Throttles to avoid load spikes
- Batch size: 1k-10k rows (balance lock duration vs total batches)

### Backfilling with Joins (Complex Data)

```sql
-- Backfill orders.user_country from users.country
DO $$
DECLARE
  batch_size INT := 5000;
  rows_updated INT;
BEGIN
  LOOP
    WITH batch AS (
      SELECT o.id, u.country
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.user_country IS NULL
      LIMIT batch_size
      FOR UPDATE OF o SKIP LOCKED
    )
    UPDATE orders
    SET user_country = batch.country
    FROM batch
    WHERE orders.id = batch.id;

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    EXIT WHEN rows_updated = 0;

    COMMIT;
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;
```

---

## Rolling Back Migrations

### Safe Rollback Strategy

Every migration should have a rollback plan.

```sql
-- Migration: Add user_type column
-- up.sql
ALTER TABLE users ADD COLUMN user_type TEXT DEFAULT 'standard';
CREATE INDEX CONCURRENTLY idx_users_type ON users(user_type);

-- down.sql (rollback)
DROP INDEX CONCURRENTLY idx_users_type;
ALTER TABLE users DROP COLUMN user_type;
```

### Testing Rollbacks

```sql
-- Test rollback in transaction (development only)
BEGIN;
  -- Run migration
  ALTER TABLE users ADD COLUMN test_column TEXT;

  -- Verify migration
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'users' AND column_name = 'test_column';

  -- Rollback
ROLLBACK;

-- Verify rollback
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'test_column';
-- Returns 0 rows
```

**Important:** CONCURRENTLY operations cannot run in transactions.

---

## Migration Testing Strategies

### 1. Test on Production Clone

```bash
# Clone production database (anonymize sensitive data)
pg_dump production_db | psql staging_db

# Run migration on staging
psql staging_db < migrations/001_add_user_type.sql

# Verify data integrity
psql staging_db -c "SELECT COUNT(*) FROM users WHERE user_type IS NULL;"

# Test rollback
psql staging_db < migrations/001_add_user_type_down.sql
```

### 2. Measure Migration Duration

```sql
-- Time migration on production clone
\timing on
ALTER TABLE users ADD COLUMN phone TEXT DEFAULT '';
-- Time: 45.123 ms (acceptable)

ALTER TABLE orders ADD COLUMN total_refunded NUMERIC(10,2);
-- Time: 3456.789 ms (3.4s, acceptable for small table, not for 10M rows)
```

**Rule of thumb:**
- <100ms: Safe to run anytime
- 100ms-1s: Run during low-traffic period
- 1s-10s: Schedule maintenance window
- >10s: Use multi-phase migration

### 3. Load Testing After Migration

```bash
# Run load test before migration
ab -n 10000 -c 100 https://api.example.com/orders

# Run migration

# Run load test after migration (compare latency)
ab -n 10000 -c 100 https://api.example.com/orders
```

---

## Blue-Green Deployment with Database Migrations

### Strategy: Backward-Compatible Migrations

All migrations must work with both old and new app code simultaneously.

```
Timeline:
1. Deploy migration (DB supports old + new schema)
2. Deploy new app code (uses new schema)
3. Old app instances gradually replaced (still use old schema)
4. All traffic on new app code
5. Clean up old schema (drop unused columns/tables)
```

### Example: Adding a Required Field

```sql
-- Step 1: Add nullable column (backward-compatible)
ALTER TABLE orders ADD COLUMN notes TEXT;

-- Step 2: Deploy app v2 (populates notes field)
-- Old app v1 still runs, inserts NULL for notes

-- Step 3: Backfill NULLs (after all v1 instances stopped)
UPDATE orders SET notes = '' WHERE notes IS NULL;

-- Step 4: Add NOT NULL constraint (after backfill complete)
ALTER TABLE orders ALTER COLUMN notes SET NOT NULL;
```

**Key:** Each step is deployable independently. Rollback is safe at any point.

---

## Common Migration Mistakes

### 1. Adding NOT NULL Column Without Default

```sql
-- WRONG: Fails if table has existing rows
ALTER TABLE users ADD COLUMN email TEXT NOT NULL;
-- ERROR: column "email" contains null values

-- RIGHT: Add nullable, backfill, then add constraint
ALTER TABLE users ADD COLUMN email TEXT;
UPDATE users SET email = 'unknown@example.com' WHERE email IS NULL;
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
```

### 2. Creating Index Without CONCURRENTLY

```sql
-- WRONG: Locks table for writes (production downtime)
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- RIGHT: Non-blocking index creation
CREATE INDEX CONCURRENTLY idx_orders_user_id ON orders(user_id);
```

### 3. Running Long Migration in Transaction

```sql
-- WRONG: Holds locks for entire transaction (minutes)
BEGIN;
  ALTER TABLE users ADD COLUMN phone TEXT;
  UPDATE users SET phone = legacy_phone WHERE phone IS NULL;  -- 10M rows
  ALTER TABLE users DROP COLUMN legacy_phone;
COMMIT;

-- RIGHT: Break into separate steps
ALTER TABLE users ADD COLUMN phone TEXT;
-- Backfill in batches (separate script)
-- Deploy app code
ALTER TABLE users DROP COLUMN legacy_phone;
```

### 4. Dropping Column Before App Deployment

```sql
-- WRONG: Breaks old app code immediately
ALTER TABLE users DROP COLUMN legacy_field;
-- Old app: SELECT legacy_field FROM users → ERROR

-- RIGHT: Deploy app code first, then drop column
-- 1. Deploy app v2 (doesn't use legacy_field)
-- 2. Wait for all v1 instances to stop
-- 3. DROP COLUMN legacy_field
```

### 5. Not Testing Rollback

```sql
-- Always write down.sql (rollback script)
-- migrations/001_add_user_type_up.sql
ALTER TABLE users ADD COLUMN user_type TEXT DEFAULT 'standard';

-- migrations/001_add_user_type_down.sql
ALTER TABLE users DROP COLUMN user_type;

-- Test rollback before production
```

---

## Migration Checklist

**Before Running Migration:**
- [ ] Tested on production clone with production data volume
- [ ] Measured migration duration (<1s preferred, <10s max)
- [ ] Written rollback script (down.sql)
- [ ] Tested rollback on staging
- [ ] Verified backward compatibility (old app code works with new schema)
- [ ] Used CONCURRENTLY for index creation
- [ ] Planned backfill strategy for large data changes (batching)
- [ ] Scheduled during low-traffic period (if >1s duration)
- [ ] Notified team of migration window

**After Running Migration:**
- [ ] Verified migration completed successfully
- [ ] Checked for INVALID indexes (failed CONCURRENTLY)
- [ ] Ran ANALYZE on modified tables
- [ ] Monitored query performance (compare EXPLAIN before/after)
- [ ] Verified app functionality (smoke tests)
- [ ] Monitored error rates and latency (next 24 hours)

---

## Tools and Resources

### Migration Libraries

**Node.js:**
- `node-pg-migrate`: PostgreSQL-specific, supports CONCURRENTLY
- `knex.js`: Multi-database, migrations + query builder
- `TypeORM`: Migrations + ORM, auto-generates migrations from entities

**Python:**
- `alembic`: SQLAlchemy migrations, supports batch operations
- `Django migrations`: Built-in, automatic migration generation

**Go:**
- `golang-migrate`: Database-agnostic, supports PostgreSQL
- `goose`: Embeddable migrations

### PostgreSQL Extensions

```sql
-- Track migration history
CREATE TABLE schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log migration
INSERT INTO schema_migrations (version) VALUES ('001_add_user_type');
```

### Resources

- **PostgreSQL ALTER TABLE**: https://www.postgresql.org/docs/current/sql-altertable.html
- **Zero-Downtime Migrations**: https://www.braintreepayments.com/blog/safe-operations-for-high-volume-postgresql/
- **Strong Migrations Guide**: https://github.com/ankane/strong_migrations
- **Citus Blog (Postgres Migrations)**: https://www.citusdata.com/blog/
