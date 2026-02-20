---
name: database-patterns
description: Provides essential database design patterns for relational databases based on SQL standards, PostgreSQL documentation, and industry best practices.
---

# Database Patterns

Essential database design patterns for relational databases. Based on SQL standards, PostgreSQL documentation, and industry best practices.

**Sources:** PostgreSQL Documentation, ISO/IEC 9075 (SQL Standard), "Use The Index, Luke" by Markus Winand, Database Design Best Practices

---

## Normalization

**1NF**: Atomic values, no repeating groups, each row unique
**2NF**: 1NF + no partial dependencies (all non-key attributes depend on entire primary key)
**3NF**: 2NF + no transitive dependencies (non-key attributes depend only on primary key)
**BCNF**: 3NF + every determinant is a candidate key

**When to denormalize**: Read-heavy workloads, aggregations, reporting tables (materialized views preferred)

---

## Relationships

**1:1** - FK in either table with UNIQUE constraint
**1:N** - FK in child table pointing to parent PK
**M:N** - Junction table with composite PK (parent_id, child_id)

```sql
-- 1:N with cascade delete
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_posts_user_id ON posts(user_id);
```

---

## Indexing Strategies

**B-tree** (default): Equality and range queries (>, <, BETWEEN, ORDER BY)
**Hash**: Equality only, faster for exact matches
**GIN**: Arrays, JSONB, full-text search
**GiST**: Geometric data, range types, nearest-neighbor searches
**BRIN**: Large tables with natural ordering (time-series, append-only)
**Partial**: Index subset matching WHERE condition
**Covering**: INCLUDE columns to avoid table lookups

**Composite index rule**: Leftmost columns used first (WHERE a=? AND b=? uses index on (a,b); WHERE b=? does not)

```sql
-- Partial index for active records only
CREATE INDEX idx_active_users ON users(email) WHERE deleted_at IS NULL;
```

**See `references/indexing-strategies.md` for detailed index types, column ordering rules, maintenance strategies, and common mistakes.**

---

## Query Optimization

**EXPLAIN ANALYZE**: Shows actual execution plan with timing
- Seq Scan on large tables = missing index
- High cost estimates = update statistics (ANALYZE table)
- Nested Loop on large datasets = consider JOIN algorithm change

**N+1 Prevention**: Use JOINs, batch loading (DataLoader), or eager loading (Supabase client with select/join)

**Pagination**: Cursor-based for large datasets (WHERE (created_at, id) < (?, ?) ORDER BY created_at DESC, id DESC LIMIT n)

**See `references/postgresql-performance.md` for EXPLAIN interpretation, VACUUM strategies, connection pooling, partitioning, materialized views, and common performance pitfalls.**

---

## Transactions (ACID)

**Atomicity**: All operations succeed or all fail
**Consistency**: Database moves from valid state to valid state
**Isolation**: Concurrent transactions don't interfere
**Durability**: Committed changes persist after crash

**Isolation Levels** (PostgreSQL default: Read Committed):
- Read Uncommitted: Dirty reads allowed
- Read Committed: No dirty reads
- Repeatable Read: No phantom reads
- Serializable: Full isolation, may require retry logic

---

## Migration Safety

**Safe operations**:
- Add nullable column: ALTER TABLE users ADD COLUMN phone TEXT;
- Add column with DEFAULT (PG 11+): Instant, no table rewrite
- CREATE INDEX CONCURRENTLY: Non-blocking (PostgreSQL)

**Unsafe operations**:
- Add NOT NULL without DEFAULT on existing table (locks table, fails if nulls exist)
- Rename column: Use dual-write pattern (add new, copy data, update app, drop old)
- Drop column: May require application deployment first

**Large table batching**: Process in chunks with cursor pagination to avoid long locks

**See `references/migration-patterns.md` for zero-downtime techniques, changing column types safely, backfilling strategies, rollback patterns, and blue-green deployment with migrations.**

---

## Resources

- PostgreSQL Official Documentation: https://www.postgresql.org/docs/current/
- ISO/IEC 9075 SQL Standard: https://www.iso.org/standard/76583.html
- Use The Index, Luke (Indexing Guide): https://use-the-index-luke.com/
- Database Normalization Theory: https://www.seas.upenn.edu/~zives/03f/cis550/codd.pdf
- Supabase Performance Guide: https://supabase.com/docs/guides/database/postgres/performance
