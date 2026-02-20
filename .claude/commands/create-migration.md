---
name: create-migration
description: Generate database migration script with rollback and validation
---

# Create Migration Command

Generate safe, reversible database migration scripts with automatic rollback and validation SQL.

---

## Purpose

Create production-ready database migrations that safely evolve your schema while maintaining data integrity and rollback capability.

---

## When to Use

- Adding/modifying database tables
- Changing column types or constraints
- Creating/dropping indexes
- Data transformations
- Schema refactoring

---

## What It Does

1. **Analyzes** current schema and desired changes
2. **Generates** forward migration SQL
3. **Creates** rollback SQL
4. **Adds** validation queries
5. **Tests** migration on staging database (optional)
6. **Documents** changes and risks

---

## Usage

```bash
/create-migration <description>

# Examples
/create-migration "add user preferences table"
/create-migration "add email index to users"
/create-migration "change status column to enum"
```

---

## Agents Used

- `migration-specialist` - Database migration expert
- `database-architect` - Schema design validation

---

## Generated Migration Structure

### File Name
```
migrations/YYYYMMDD_HHMMSS_description.sql

Example:
migrations/20260121_143022_add_user_preferences_table.sql
```

### File Content
```sql
-- =============================================================================
-- Migration: Add user preferences table
-- Author: Claude Code + User
-- Date: 2026-01-21 14:30:22
-- Ticket: PROJ-123
-- =============================================================================
--
-- Description:
-- Creates a new user_preferences table to store user-specific settings
-- like theme, language, and notification preferences.
--
-- Risk Level: LOW
-- - New table only, no changes to existing tables
-- - Foreign key constraint to users table
-- - Fully reversible
--
-- Dependencies:
-- - users table must exist
--
-- =============================================================================

-- =============================================================================
-- UP MIGRATION (Apply Changes)
-- =============================================================================

BEGIN;

-- Create table
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(50) NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    email_notifications BOOLEAN NOT NULL DEFAULT true,
    push_notifications BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT user_preferences_unique_user UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_theme ON user_preferences(theme);

-- Add trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE user_preferences IS 'User-specific preferences and settings';
COMMENT ON COLUMN user_preferences.theme IS 'UI theme: light, dark, or auto';
COMMENT ON COLUMN user_preferences.timezone IS 'IANA timezone identifier';

COMMIT;

-- =============================================================================
-- DOWN MIGRATION (Rollback)
-- =============================================================================

BEGIN;

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
DROP INDEX IF EXISTS idx_user_preferences_theme;
DROP INDEX IF EXISTS idx_user_preferences_user_id;
DROP TABLE IF EXISTS user_preferences CASCADE;

COMMIT;

-- =============================================================================
-- VALIDATION QUERIES
-- =============================================================================

-- Verify table exists
SELECT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'user_preferences'
) AS table_exists;

-- Verify columns exist
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_preferences'
ORDER BY ordinal_position;

-- Verify indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'user_preferences';

-- Verify constraints exist
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'user_preferences'::regclass;

-- Count rows (should be 0 after initial creation)
SELECT COUNT(*) FROM user_preferences;
```

---

## Migration Patterns

### Pattern 1: Add Column (Safe)
```sql
-- Add column as nullable first
ALTER TABLE users ADD COLUMN status VARCHAR(50);

-- Backfill with default value
UPDATE users SET status = 'active' WHERE status IS NULL;

-- Add NOT NULL constraint after backfill
ALTER TABLE users ALTER COLUMN status SET NOT NULL;

-- Add default for new rows
ALTER TABLE users ALTER COLUMN status SET DEFAULT 'active';
```

### Pattern 2: Change Column Type (Risky)
```sql
-- Create new column with new type
ALTER TABLE users ADD COLUMN email_new VARCHAR(255);

-- Copy data with transformation
UPDATE users SET email_new = LOWER(TRIM(email));

-- Verify data integrity
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM users WHERE email_new IS NULL AND email IS NOT NULL) THEN
        RAISE EXCEPTION 'Data migration failed: NULL values found';
    END IF;
END $$;

-- Drop old column, rename new
ALTER TABLE users DROP COLUMN email;
ALTER TABLE users RENAME COLUMN email_new TO email;

-- Add NOT NULL and unique constraint
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
CREATE UNIQUE INDEX users_email_unique ON users(email);
```

### Pattern 3: Add Index (Zero Downtime)
```sql
-- Create index concurrently (doesn't lock table)
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- Verify index was created
SELECT indexname FROM pg_indexes WHERE indexname = 'idx_users_email';
```

### Pattern 4: Rename Column (Multi-step)
```sql
-- Step 1: Add new column
ALTER TABLE users ADD COLUMN email_address VARCHAR(255);

-- Step 2: Dual-write in application (deploy this change)
-- Application writes to both 'email' and 'email_address'

-- Step 3: Backfill new column
UPDATE users SET email_address = email WHERE email_address IS NULL;

-- Step 4: Switch reads to new column (deploy this change)
-- Application reads from 'email_address'

-- Step 5: Drop old column (wait 1 week, then deploy)
ALTER TABLE users DROP COLUMN email;
```

### Pattern 5: Data Migration
```sql
-- Migrate data from old structure to new structure
INSERT INTO user_profiles (user_id, bio, avatar_url, location)
SELECT
    id AS user_id,
    bio,
    avatar_url,
    location
FROM users
WHERE bio IS NOT NULL OR avatar_url IS NOT NULL OR location IS NOT NULL;

-- Verify migration
DO $$
DECLARE
    old_count INTEGER;
    new_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO old_count FROM users WHERE bio IS NOT NULL;
    SELECT COUNT(*) INTO new_count FROM user_profiles;

    IF old_count != new_count THEN
        RAISE EXCEPTION 'Data migration verification failed: counts do not match';
    END IF;
END $$;
```

---

## Risk Assessment

### LOW RISK
- Creating new tables
- Adding nullable columns
- Creating indexes (CONCURRENTLY)
- Adding comments

### MEDIUM RISK
- Adding NOT NULL columns (requires backfill)
- Dropping nullable columns
- Adding foreign keys (requires validation)
- Renaming tables/columns

### HIGH RISK
- Changing column types
- Dropping tables
- Removing NOT NULL constraints
- Large data transformations

---

## Zero-Downtime Migrations

For production databases that cannot have downtime:

### Principles
1. **Backwards Compatible**: Old code works during migration
2. **Multi-Phase**: Deploy in stages
3. **Rollback Ready**: Can revert at any stage
4. **Verified**: Test each step

### Example: Add NOT NULL Column
```sql
-- Phase 1: Add nullable column
ALTER TABLE users ADD COLUMN status VARCHAR(50);

-- Deploy: Application writes to new column

-- Phase 2: Backfill existing rows
UPDATE users SET status = 'active' WHERE status IS NULL;

-- Phase 3: Add NOT NULL constraint
ALTER TABLE users ALTER COLUMN status SET NOT NULL;

-- Deploy: Application assumes column is NOT NULL
```

---

## Validation

### Pre-Migration Checks
```bash
# Backup database
pg_dump -U postgres mydb > backup_before_migration.sql

# Check database connection
psql -U postgres -c "SELECT version();"

# Check for locks
SELECT * FROM pg_locks WHERE NOT granted;
```

### Post-Migration Checks
```bash
# Run validation queries from migration file

# Check row counts
SELECT COUNT(*) FROM user_preferences;

# Check constraints
SELECT conname FROM pg_constraint WHERE conrelid = 'user_preferences'::regclass;

# Verify application still works
curl http://localhost:3000/health
```

---

## Best Practices

### DO
- ✅ Always write rollback SQL
- ✅ Test on staging first
- ✅ Use transactions (BEGIN/COMMIT)
- ✅ Add validation queries
- ✅ Document risks and dependencies
- ✅ Use CONCURRENTLY for indexes
- ✅ Backfill before adding NOT NULL

### DON'T
- ❌ Skip rollback preparation
- ❌ Test in production first
- ❌ Mix schema and data changes
- ❌ Drop columns immediately (wait 1 week)
- ❌ Change column types directly
- ❌ Run DDL without transaction

---

## Example Session

```
User: "/create-migration add index to users email"

Agent: Creating migration...

Analyzing schema...
  - Table: users exists ✓
  - Column: email exists ✓
  - Current indexes: id (primary key)

Proposed changes:
  + CREATE INDEX CONCURRENTLY idx_users_email ON users(email)

Risk Assessment: LOW
  - Index creation only
  - Uses CONCURRENTLY (no table lock)
  - Fully reversible

Generated migration file:
  migrations/20260121_143500_add_users_email_index.sql

Preview:
──────────────────────────────────────
-- UP
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- DOWN
DROP INDEX CONCURRENTLY IF EXISTS idx_users_email;

-- VALIDATE
SELECT indexname FROM pg_indexes WHERE indexname = 'idx_users_email';
──────────────────────────────────────

Ready to apply to staging? (y/n)
```

---

## Integration

### With Supabase

**Supabase CLI:**
```bash
# Create new migration
supabase migration new add_user_preferences

# Claude can enhance generated migration with:
# - Better error handling
# - Rollback SQL
# - Validation queries
# - Risk documentation
```

**TypeORM:**
```bash
# Generate TypeORM migration
npm run typeorm migration:generate -- -n AddUserPreferences

# Claude enhances with safety checks
```

---

## Output Files

```
migrations/
├── 20260121_143022_add_user_preferences_table.sql
├── 20260121_143500_add_users_email_index.sql
└── README.md  # Migration log
```

**README.md:**
```markdown
# Migration Log

## 2026-01-21

### add_user_preferences_table
- Status: Applied ✓
- Applied at: 2026-01-21 14:35:00
- Duration: 0.8s
- Rows affected: 0

### add_users_email_index
- Status: Applied ✓
- Applied at: 2026-01-21 14:40:00
- Duration: 2.3s
```

---

## Related Commands

```bash
# Create migration + test it
/create-migration "add status column" && npm run migrate:test

# Create migration + review changes
/create-migration "refactor user schema" && /review-changes
```
