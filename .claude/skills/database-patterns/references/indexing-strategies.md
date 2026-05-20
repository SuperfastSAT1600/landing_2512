# PostgreSQL Indexing Strategies

Comprehensive guide to index types, usage patterns, and maintenance for PostgreSQL 14+.

---

## Index Types and When to Use Them

### B-tree (Default, 90% of Use Cases)

**Best for:**
- Equality comparisons: `WHERE column = value`
- Range queries: `WHERE column > value`, `BETWEEN x AND y`
- Sorting: `ORDER BY column`
- Pattern matching (prefix): `WHERE email LIKE 'user%'`

```sql
-- Standard B-tree index
CREATE INDEX idx_users_email ON users(email);

-- Multi-column B-tree (order matters!)
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
-- Efficient for: WHERE user_id = ? AND status = ?
-- Efficient for: WHERE user_id = ?
-- NOT efficient for: WHERE status = ?
```

**When NOT to use:**
- Full-text search (use GIN with tsvector)
- Array/JSONB queries (use GIN)
- Suffix matching: `WHERE email LIKE '%gmail.com'` (use trigram index)

---

### Hash Index (PostgreSQL 10+)

**Best for:**
- Equality comparisons only: `WHERE column = value`
- Slightly faster than B-tree for exact matches
- Smaller index size than B-tree

```sql
CREATE INDEX idx_users_id_hash ON users USING hash(id);
```

**Limitations:**
- No range queries
- No sorting support
- Cannot be used for UNIQUE constraints
- Rarely used in practice (B-tree almost as fast, more versatile)

**Use case:** Large lookup tables with equality-only queries.

---

### GIN (Generalized Inverted Index)

**Best for:**
- Array queries: `WHERE tags @> ARRAY['postgresql']`
- JSONB queries: `WHERE data @> '{"status": "active"}'`
- Full-text search: `WHERE to_tsvector(content) @@ to_tsquery('postgres')`
- Trigram search: `WHERE name ILIKE '%search%'`

```sql
-- Array containment
CREATE INDEX idx_posts_tags ON posts USING gin(tags);
SELECT * FROM posts WHERE tags @> ARRAY['postgresql', 'indexing'];

-- JSONB queries
CREATE INDEX idx_users_metadata ON users USING gin(metadata);
SELECT * FROM users WHERE metadata @> '{"plan": "premium"}';

-- Full-text search
CREATE INDEX idx_posts_content_fts ON posts USING gin(to_tsvector('english', content));
SELECT * FROM posts WHERE to_tsvector('english', content) @@ to_tsquery('postgres & performance');

-- Trigram search (fuzzy matching)
CREATE EXTENSION pg_trgm;
CREATE INDEX idx_users_name_trgm ON users USING gin(name gin_trgm_ops);
SELECT * FROM users WHERE name ILIKE '%john%';
```

**GIN best practices:**
1. GIN indexes are slower to update (insert/update) than B-tree
2. Use for read-heavy columns (tags, JSONB metadata)
3. Larger index size than B-tree
4. Consider `fastupdate = off` for high-churn tables to avoid bloat

```sql
-- Disable fastupdate for high-write tables
CREATE INDEX idx_logs_data ON logs USING gin(data) WITH (fastupdate = off);
```

---

### GiST (Generalized Search Tree)

**Best for:**
- Geometric data: points, lines, polygons (PostGIS)
- Range types: int4range, tstzrange
- Full-text search (alternative to GIN, smaller index)
- Nearest-neighbor searches (KNN)

```sql
-- IP address ranges
CREATE INDEX idx_ip_ranges ON ip_blocks USING gist(ip_range);
SELECT * FROM ip_blocks WHERE ip_range @> '192.168.1.100'::inet;

-- Geometric queries (PostGIS)
CREATE INDEX idx_locations_geom ON locations USING gist(geom);
SELECT * FROM locations WHERE ST_DWithin(geom, ST_MakePoint(-73.9, 40.7), 1000);

-- Nearest neighbor (KNN)
SELECT * FROM locations ORDER BY geom <-> ST_MakePoint(-73.9, 40.7) LIMIT 10;
```

**GiST vs GIN:**
- GIN: Faster queries, slower updates, larger index
- GiST: Slower queries, faster updates, smaller index
- Use GIN for read-heavy, GiST for write-heavy

---

### BRIN (Block Range Index)

**Best for:**
- Large tables (>10M rows) with natural ordering
- Time-series data (created_at, log timestamps)
- Sequential writes (append-only tables)

```sql
-- BRIN on timestamp column (log table)
CREATE INDEX idx_logs_created_brin ON logs USING brin(created_at);

-- Query with time range (uses BRIN efficiently)
SELECT * FROM logs WHERE created_at >= '2024-01-01' AND created_at < '2024-02-01';
```

**BRIN characteristics:**
- **Tiny index size**: 1000x smaller than B-tree
- **Fast index creation**: Scans table once
- **Fast updates**: No per-row overhead
- **Requires table correlation**: Data must be physically ordered

**When to use BRIN:**
- Append-only tables (logs, events, analytics)
- Natural ordering by partition key
- Tables too large for B-tree index

**When NOT to use BRIN:**
- Random inserts/updates (breaks correlation)
- Low cardinality columns
- Need exact row lookup (use B-tree)

```sql
-- Check column correlation (-1 to 1, closer to ±1 = better for BRIN)
SELECT tablename, attname, correlation
FROM pg_stats
WHERE tablename = 'logs' AND attname = 'created_at';
-- correlation > 0.9: BRIN is excellent
-- correlation < 0.5: Use B-tree instead
```

---

## Composite Index Column Ordering

Order matters! PostgreSQL uses leftmost-prefix rule.

```sql
-- Index on (user_id, created_at, status)
CREATE INDEX idx_orders_composite ON orders(user_id, created_at, status);
```

**Queries that use this index:**
1. `WHERE user_id = ?` (uses first column)
2. `WHERE user_id = ? AND created_at > ?` (uses first two columns)
3. `WHERE user_id = ? AND created_at > ? AND status = ?` (uses all three columns)
4. `WHERE user_id = ? AND status = ?` (uses first column only, skips created_at)

**Queries that DON'T use this index:**
1. `WHERE created_at > ?` (first column missing)
2. `WHERE status = ?` (first column missing)
3. `WHERE created_at > ? AND status = ?` (first column missing)

### Column Ordering Rules

**Rule 1: Equality before Range**
```sql
-- GOOD: Equality first (user_id), range last (created_at)
CREATE INDEX idx_orders_optimal ON orders(user_id, status, created_at);
-- Efficient for: WHERE user_id = ? AND status = ? AND created_at > ?

-- BAD: Range first blocks subsequent columns
CREATE INDEX idx_orders_suboptimal ON orders(created_at, user_id, status);
-- Less efficient: WHERE created_at > ? AND user_id = ? AND status = ?
```

**Rule 2: High Cardinality before Low Cardinality**
```sql
-- GOOD: user_id (high cardinality) before status (low cardinality)
CREATE INDEX idx_orders_good ON orders(user_id, status);

-- BAD: status (3 values) before user_id (millions of values)
CREATE INDEX idx_orders_bad ON orders(status, user_id);
-- Less selective, larger index scans
```

**Rule 3: Most Frequent Query Columns First**
```sql
-- If 90% of queries filter by user_id, 50% by status, 10% by created_at:
CREATE INDEX idx_orders_frequent ON orders(user_id, status, created_at);
```

**Rule 4: Descending Order for ORDER BY DESC**
```sql
-- Query: ORDER BY created_at DESC
CREATE INDEX idx_posts_created_desc ON posts(created_at DESC);
-- Avoids in-memory sort
```

---

## Partial Indexes (Filtered Indexes)

Index only rows matching a WHERE condition. Smaller, faster indexes.

```sql
-- Index only active users (saves space if 95% are deleted_at IS NULL)
CREATE INDEX idx_users_active_email ON users(email) WHERE deleted_at IS NULL;

-- Query MUST include WHERE deleted_at IS NULL to use index
SELECT * FROM users WHERE email = 'user@example.com' AND deleted_at IS NULL;

-- Index only pending orders
CREATE INDEX idx_orders_pending ON orders(user_id, created_at) WHERE status = 'pending';

-- Index only recent data (last 30 days)
CREATE INDEX idx_logs_recent ON logs(level, created_at)
WHERE created_at > NOW() - INTERVAL '30 days';
```

**Benefits:**
- Smaller index size (50-90% reduction)
- Faster index scans
- Faster writes (fewer index updates)

**Drawbacks:**
- Query must match WHERE condition exactly
- More indexes to maintain (consider separate partial indexes per condition)

---

## Covering Indexes (Index-Only Scans)

Include extra columns in index to avoid table lookups.

```sql
-- Without INCLUDE: Index scan + table lookup
CREATE INDEX idx_orders_user ON orders(user_id);
SELECT user_id, total FROM orders WHERE user_id = 123;
-- Scans index, then fetches total from table (heap lookup)

-- With INCLUDE: Index-only scan (no table lookup)
CREATE INDEX idx_orders_user_covering ON orders(user_id) INCLUDE (total);
SELECT user_id, total FROM orders WHERE user_id = 123;
-- All data in index, no heap lookup

-- Multi-column covering index
CREATE INDEX idx_orders_covering ON orders(user_id, status)
INCLUDE (created_at, total);
SELECT user_id, status, created_at, total FROM orders WHERE user_id = 123;
```

**When to use INCLUDE:**
- Frequently accessed columns in SELECT
- Avoid expensive table lookups
- Trade-off: Larger index size vs faster queries

**INCLUDE vs adding column to index key:**
```sql
-- Option 1: Add total to index key
CREATE INDEX idx_orders_1 ON orders(user_id, total);
-- total is part of B-tree structure, sorted

-- Option 2: Use INCLUDE
CREATE INDEX idx_orders_2 ON orders(user_id) INCLUDE (total);
-- total stored in leaf nodes, not sorted, smaller index

-- Use INCLUDE when column is not used for filtering/sorting
```

---

## Index Maintenance

### Monitoring Index Usage

```sql
-- Find unused indexes (0 scans)
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
-- Drop unused indexes to save space and speed up writes

-- Index size
SELECT schemaname, tablename, indexname,
       pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;

-- Index efficiency (scans vs reads)
SELECT schemaname, tablename, indexname,
       idx_scan, idx_tup_read, idx_tup_fetch,
       idx_tup_read / NULLIF(idx_scan, 0) AS avg_tuples_per_scan
FROM pg_stat_user_indexes
WHERE idx_scan > 0
ORDER BY idx_scan DESC;
```

### Index Bloat

Indexes can become bloated over time (deleted rows not reclaimed).

```sql
-- Detect index bloat (requires pgstattuple extension)
CREATE EXTENSION pgstattuple;

SELECT schemaname, tablename, indexname,
       pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
       pgstatindex(indexrelid)
FROM pg_stat_user_indexes
WHERE schemaname = 'public';
-- Check leaf_fragmentation and avg_leaf_density

-- Rebuild bloated index
REINDEX INDEX CONCURRENTLY idx_orders_user_id;
-- CONCURRENTLY allows queries during rebuild (PostgreSQL 12+)
```

### Creating Indexes Without Blocking

```sql
-- ALWAYS use CONCURRENTLY in production
CREATE INDEX CONCURRENTLY idx_orders_status ON orders(status);

-- Standard CREATE INDEX locks table for writes (blocking)
CREATE INDEX idx_orders_status ON orders(status);  -- DON'T USE IN PRODUCTION
```

**CONCURRENTLY notes:**
- Takes longer to build (scans table multiple times)
- Non-blocking (allows reads and writes during creation)
- Can fail mid-creation (leaves INVALID index, must drop and retry)
- Cannot run inside transaction block

```sql
-- Check for invalid indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE indexdef LIKE '%INVALID%';

-- Drop and recreate
DROP INDEX CONCURRENTLY idx_orders_status;
CREATE INDEX CONCURRENTLY idx_orders_status ON orders(status);
```

---

## Common Indexing Mistakes

### 1. Too Many Indexes

**Problem:** Every index slows down INSERT/UPDATE/DELETE.

```sql
-- BAD: 8 indexes on one table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_users_created ON users(created_at);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_plan ON users(plan);
CREATE INDEX idx_users_country ON users(country);
-- + 2 more...

-- GOOD: Composite indexes for common query patterns
CREATE INDEX idx_users_email ON users(email);  -- Unique lookups
CREATE INDEX idx_users_status_created ON users(status, created_at);  -- List queries
CREATE INDEX idx_users_country_plan ON users(country, plan);  -- Analytics
-- 3 indexes instead of 8
```

**Rule of thumb:** 5-7 indexes per table max (excluding primary key).

### 2. Duplicate Indexes

```sql
-- BAD: Redundant indexes
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at);
-- idx_orders_user is redundant (idx_orders_user_created covers it)

-- GOOD: Drop redundant index
DROP INDEX idx_orders_user;
```

### 3. Indexing Low-Cardinality Columns

```sql
-- BAD: status has 3 values (pending, completed, cancelled)
CREATE INDEX idx_orders_status ON orders(status);
-- Index scans 33% of table on average, not much better than seq scan

-- GOOD: Use partial index if one value is rare
CREATE INDEX idx_orders_pending ON orders(user_id, created_at)
WHERE status = 'pending';
-- Only 5% of orders are pending, index is small and efficient
```

**Rule:** Don't index columns with <10 distinct values unless using partial index.

### 4. Not Indexing Foreign Keys

```sql
-- BAD: No index on foreign key
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id)
);
-- JOIN users on posts is slow (seq scan on posts)

-- GOOD: Always index foreign keys
CREATE INDEX idx_posts_user_id ON posts(user_id);
```

### 5. Wrong Column Order in Composite Index

```sql
-- Query: WHERE status = 'pending' AND user_id = 123
-- BAD: Low cardinality first
CREATE INDEX idx_orders_bad ON orders(status, user_id);

-- GOOD: High cardinality first
CREATE INDEX idx_orders_good ON orders(user_id, status);
```

### 6. Missing Indexes on Sort Columns

```sql
-- Query: ORDER BY created_at DESC LIMIT 10
-- Without index: Full table scan + in-memory sort

-- With index: Index scan (fast)
CREATE INDEX idx_posts_created_desc ON posts(created_at DESC);
```

### 7. Function-Based Queries Without Expression Index

```sql
-- BAD: LOWER(email) requires seq scan
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';

-- GOOD: Expression index
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';
```

---

## Index Strategy Decision Tree

```
Query uses:
├─ Equality only (WHERE col = ?) → B-tree (default)
├─ Range (WHERE col > ?) → B-tree
├─ Prefix match (LIKE 'abc%') → B-tree
├─ Full-text search → GIN (tsvector)
├─ JSONB/Array queries → GIN
├─ Fuzzy search (ILIKE '%abc%') → GIN (trigram)
├─ Geospatial queries → GiST (PostGIS)
├─ Time-series (append-only, >10M rows) → BRIN
└─ Complex WHERE conditions → Partial index

Composite index column order:
1. Equality before range
2. High cardinality before low cardinality
3. Most frequent query columns first
4. Add INCLUDE for covering index if needed

Large table (>1M rows):
└─ CREATE INDEX CONCURRENTLY (non-blocking)

Write-heavy table:
└─ Minimize indexes (5-7 max), use partial indexes
```

---

## Resources

- **Use The Index, Luke**: https://use-the-index-luke.com/
- **PostgreSQL Index Types**: https://www.postgresql.org/docs/current/indexes-types.html
- **Index-Only Scans**: https://www.postgresql.org/docs/current/indexes-index-only-scans.html
- **pg_trgm Extension**: https://www.postgresql.org/docs/current/pgtrgm.html
- **pgstattuple Extension**: https://www.postgresql.org/docs/current/pgstattuple.html
