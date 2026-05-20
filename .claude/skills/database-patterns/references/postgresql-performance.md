# PostgreSQL Performance Optimization

Deep dive into PostgreSQL 14+ performance tuning, query optimization, and maintenance strategies.

---

## Query Optimization Fundamentals

### Understanding Query Plans with EXPLAIN ANALYZE

```sql
-- Basic execution plan
EXPLAIN SELECT * FROM orders WHERE user_id = 123;

-- Actual execution with timing (always use this)
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM orders WHERE user_id = 123;
```

**Key metrics to watch:**
- **Execution Time**: Total query duration (aim for <100ms for OLTP queries)
- **Planning Time**: Time spent creating execution plan (high = statistics outdated)
- **Rows**: Estimated vs actual (huge difference = statistics problem)
- **Buffers**: Shared hits (good) vs reads (requires disk I/O)
- **Node Types**: Seq Scan (bad on large tables), Index Scan/Bitmap Heap Scan (good)

### Reading EXPLAIN Output

```sql
-- Bad: Sequential scan on large table
Seq Scan on orders  (cost=0.00..180000.00 rows=5000000 width=45) (actual time=2150.234)
  Filter: (status = 'pending')
  Rows Removed by Filter: 4950000
-- FIX: Add index on status column

-- Good: Index scan
Index Scan using idx_orders_status on orders  (cost=0.42..850.15 rows=50000 width=45) (actual time=12.456)
  Index Cond: (status = 'pending')

-- Nested Loop warning on large sets
Nested Loop  (cost=1.42..25000.00 rows=10000)
  -> Seq Scan on orders
  -> Index Scan on users
-- FIX: Hash Join or Merge Join preferred for large datasets
```

**Action items from EXPLAIN:**
1. Seq Scan on table >10k rows → Add index
2. High planning time (>50ms) → Run `ANALYZE table_name`
3. Estimated rows ≠ actual rows (2x+ difference) → Update statistics
4. Rows Removed by Filter >90% → Add partial index or refactor WHERE
5. Buffers read >1000 → Data not cached, optimize query or increase shared_buffers

---

## VACUUM Strategies

### Autovacuum Tuning

PostgreSQL's autovacuum prevents transaction ID wraparound and reclaims space. Default settings are conservative.

```sql
-- Check autovacuum settings
SHOW autovacuum_max_workers;
SHOW autovacuum_naptime;

-- Per-table tuning for high-write tables
ALTER TABLE orders SET (
  autovacuum_vacuum_scale_factor = 0.05,  -- Default: 0.2 (vacuum at 5% dead tuples)
  autovacuum_analyze_scale_factor = 0.02, -- Default: 0.1 (analyze at 2% changes)
  autovacuum_vacuum_cost_limit = 1000     -- Default: 200 (faster vacuum)
);

-- Monitor autovacuum activity
SELECT schemaname, relname, last_vacuum, last_autovacuum, n_dead_tup
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;
```

**When to run manual VACUUM:**
- After bulk DELETE or UPDATE (>20% of table)
- Before major queries (ensures accurate statistics)
- Tables with high churn (logs, sessions)

```sql
-- Manual vacuum with analyze
VACUUM (ANALYZE, VERBOSE) orders;

-- Full vacuum (rewrites table, requires exclusive lock, rarely needed)
VACUUM FULL orders;  -- Use only during maintenance windows
```

**Vacuum best practices:**
1. Never disable autovacuum globally
2. For append-only tables (logs), reduce autovacuum frequency
3. For high-update tables (sessions), increase autovacuum frequency
4. Monitor bloat with pg_stat_user_tables
5. Schedule VACUUM during low-traffic periods for large tables

---

## Connection Pooling

PostgreSQL uses process-per-connection model. High connection counts degrade performance.

### PgBouncer (Recommended)

**Connection modes:**
- **Session pooling**: Client gets same connection for entire session (safest, default)
- **Transaction pooling**: Connection returned after each transaction (highest throughput, no prepared statements)
- **Statement pooling**: Connection returned after each query (rarely used, breaks transactions)

```ini
; pgbouncer.ini
[databases]
mydb = host=localhost port=5432 dbname=mydb

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000        ; App connections
default_pool_size = 25        ; Postgres connections per user/db
reserve_pool_size = 5         ; Emergency connections
max_db_connections = 30       ; Total connections to Postgres

; Timeouts
server_idle_timeout = 600
server_lifetime = 3600
```

**Sizing formula:**
```
Postgres connections = (CPU cores × 2) + effective_spindle_count
- For 4 cores + SSD: ~10-20 connections
- Use PgBouncer to pool 100s of app connections into 10-20 Postgres connections
```

**Supabase users:**
Supabase provides built-in connection pooling. Use transaction mode for best performance:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://xxx.supabase.co',
  'key',
  {
    db: { schema: 'public' },
    global: { headers: { 'x-connection-mode': 'transaction' } }
  }
)
```

---

## Partitioning Strategies

Partition large tables (>10M rows) to improve query performance and maintenance speed.

### Range Partitioning (Time-Series Data)

```sql
-- Parent table (stores no data)
CREATE TABLE orders (
  id BIGSERIAL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL,
  total NUMERIC(10,2)
) PARTITION BY RANGE (created_at);

-- Partitions by month
CREATE TABLE orders_2024_01 PARTITION OF orders
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE orders_2024_02 PARTITION OF orders
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Indexes on partitions (not parent)
CREATE INDEX idx_orders_2024_01_user ON orders_2024_01(user_id);
CREATE INDEX idx_orders_2024_02_user ON orders_2024_02(user_id);

-- Query automatically routes to correct partition
SELECT * FROM orders WHERE created_at >= '2024-01-15' AND created_at < '2024-01-20';
-- Scans only orders_2024_01 partition
```

**Benefits:**
- Queries with time filters only scan relevant partitions (partition pruning)
- VACUUM/ANALYZE runs faster on smaller partitions
- Drop old partitions instantly (vs slow DELETE)
- Archival: Detach partition, move to slower storage

### List Partitioning (Categorical Data)

```sql
CREATE TABLE logs (
  id BIGSERIAL,
  level TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY LIST (level);

CREATE TABLE logs_error PARTITION OF logs FOR VALUES IN ('ERROR', 'FATAL');
CREATE TABLE logs_info PARTITION OF logs FOR VALUES IN ('INFO', 'DEBUG');
```

### Hash Partitioning (Even Distribution)

```sql
-- Distribute large table evenly across 4 partitions
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY HASH (user_id);

CREATE TABLE analytics_events_0 PARTITION OF analytics_events
  FOR VALUES WITH (MODULUS 4, REMAINDER 0);

CREATE TABLE analytics_events_1 PARTITION OF analytics_events
  FOR VALUES WITH (MODULUS 4, REMAINDER 1);

-- ... create partitions 2 and 3
```

**Partitioning best practices:**
1. Partition key should be in most queries (enables pruning)
2. Partition size: 10M-100M rows per partition
3. Don't over-partition (>100 partitions hurts planning time)
4. Add indexes to partitions, not parent table
5. Use trigger to auto-create future partitions (time-series)

---

## Materialized Views for Aggregations

Precompute expensive aggregations for dashboards and reports.

```sql
-- Expensive query (runs every page load)
SELECT
  date_trunc('day', created_at) as day,
  COUNT(*) as order_count,
  SUM(total) as revenue
FROM orders
GROUP BY date_trunc('day', created_at)
ORDER BY day DESC;

-- Create materialized view (computed once)
CREATE MATERIALIZED VIEW daily_revenue AS
SELECT
  date_trunc('day', created_at) as day,
  COUNT(*) as order_count,
  SUM(total) as revenue
FROM orders
GROUP BY date_trunc('day', created_at)
ORDER BY day DESC;

-- Add index for fast lookups
CREATE INDEX idx_daily_revenue_day ON daily_revenue(day);

-- Query materialized view (instant)
SELECT * FROM daily_revenue WHERE day >= NOW() - INTERVAL '30 days';

-- Refresh materialized view (scheduled job, every hour)
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_revenue;
-- CONCURRENTLY allows queries during refresh (requires unique index)
```

**Refresh strategies:**
1. Full refresh: `REFRESH MATERIALIZED VIEW` (fast if source data is small)
2. Concurrent refresh: `REFRESH MATERIALIZED VIEW CONCURRENTLY` (non-blocking, requires unique index)
3. Incremental refresh: Use triggers to update only changed rows (custom solution)
4. Scheduled refresh: pg_cron or application scheduler

**Use cases:**
- Dashboard metrics (refresh every 5-15 minutes)
- Reports with complex joins (daily/weekly refresh)
- Leaderboards (refresh every minute)
- Analytics aggregations (hourly/daily refresh)

---

## Common Performance Pitfalls

### 1. Missing Indexes on Foreign Keys

```sql
-- BAD: No index on foreign key (JOIN is slow)
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id)
);

-- GOOD: Index on foreign key
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id)
);
CREATE INDEX idx_posts_user_id ON posts(user_id);
```

### 2. SELECT * on Large Tables

```sql
-- BAD: Retrieves all columns (wasted I/O and network)
SELECT * FROM orders WHERE status = 'pending';

-- GOOD: Select only needed columns
SELECT id, user_id, total FROM orders WHERE status = 'pending';
```

### 3. Unbound Queries (No LIMIT)

```sql
-- BAD: May return millions of rows
SELECT * FROM logs WHERE level = 'ERROR';

-- GOOD: Always limit + paginate
SELECT * FROM logs WHERE level = 'ERROR' ORDER BY created_at DESC LIMIT 100;
```

### 4. OR Conditions Preventing Index Use

```sql
-- BAD: Index on (status) not used efficiently
SELECT * FROM orders WHERE status = 'pending' OR status = 'processing';

-- GOOD: Use IN (index used efficiently)
SELECT * FROM orders WHERE status IN ('pending', 'processing');

-- BETTER: Use UNION ALL if indexes differ
SELECT * FROM orders WHERE status = 'pending'
UNION ALL
SELECT * FROM orders WHERE status = 'processing';
```

### 5. Implicit Type Conversions

```sql
-- BAD: user_id is UUID, '123' is TEXT (no index used)
SELECT * FROM posts WHERE user_id = '123';

-- GOOD: Explicit cast
SELECT * FROM posts WHERE user_id = '123'::uuid;
```

### 6. LIKE with Leading Wildcard

```sql
-- BAD: Cannot use index
SELECT * FROM users WHERE email LIKE '%gmail.com';

-- GOOD: Use full-text search or trigram index
CREATE EXTENSION pg_trgm;
CREATE INDEX idx_users_email_trgm ON users USING gin (email gin_trgm_ops);
SELECT * FROM users WHERE email ILIKE '%gmail.com';
```

### 7. N+1 Query Problem

```sql
-- BAD: 1 query for posts + N queries for users
SELECT * FROM posts;  -- Returns 100 posts
-- App then runs: SELECT * FROM users WHERE id = ? (100 times)

-- GOOD: JOIN to fetch all data in one query
SELECT p.*, u.name, u.email
FROM posts p
JOIN users u ON p.user_id = u.id;
```

---

## PostgreSQL Configuration Tuning

**Key settings for performance (postgresql.conf):**

```ini
# Memory settings (adjust based on available RAM)
shared_buffers = 4GB              # 25% of RAM (max 8GB)
effective_cache_size = 12GB       # 50-75% of RAM
work_mem = 64MB                   # Per-operation memory (sort, hash)
maintenance_work_mem = 512MB      # For VACUUM, CREATE INDEX

# Parallelism (PostgreSQL 14+)
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_worker_processes = 8

# WAL and checkpoints
wal_buffers = 16MB
checkpoint_timeout = 15min
checkpoint_completion_target = 0.9

# Query planner
random_page_cost = 1.1            # SSD: 1.1, HDD: 4.0
effective_io_concurrency = 200    # SSD: 200, HDD: 2

# Logging slow queries
log_min_duration_statement = 1000  # Log queries >1s
```

**Verify settings:**
```sql
SHOW shared_buffers;
SHOW effective_cache_size;
SHOW work_mem;
```

---

## Monitoring Queries

```sql
-- Active queries (>1s)
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '1 second'
ORDER BY duration DESC;

-- Kill long-running query
SELECT pg_cancel_backend(pid);  -- Graceful cancel
SELECT pg_terminate_backend(pid);  -- Force terminate

-- Table statistics (identify hot tables)
SELECT schemaname, relname,
       seq_scan, seq_tup_read,
       idx_scan, idx_tup_fetch,
       n_tup_ins, n_tup_upd, n_tup_del
FROM pg_stat_user_tables
ORDER BY seq_tup_read DESC;

-- Index usage (find unused indexes)
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## Resources

- **PostgreSQL Performance Tuning**: https://wiki.postgresql.org/wiki/Performance_Optimization
- **EXPLAIN Visualizer**: https://explain.depesz.com/
- **PgBouncer Documentation**: https://www.pgbouncer.org/
- **pg_stat_statements Extension**: Track query performance over time
