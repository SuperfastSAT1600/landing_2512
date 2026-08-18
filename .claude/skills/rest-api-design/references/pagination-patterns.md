# Pagination Patterns

Comprehensive guide to API pagination strategies with performance analysis and implementation examples.

**Sources:** RFC 8288 (Web Linking), Database Optimization Research, Production API Standards

---

## Pagination Strategy Comparison

| Pattern | Use Case | Performance | Complexity | Consistency |
|---------|----------|-------------|------------|-------------|
| **Offset** | Small datasets, simple UIs | ❌ Degrades at scale | ✅ Simple | ⚠️ Skips/duplicates possible |
| **Cursor** | Large datasets, feeds | ✅ Constant time | ⚠️ Moderate | ✅ Consistent |
| **Keyset** | Sorted datasets, reports | ✅ Excellent | ⚠️ Complex | ✅ Consistent |

**Recommendation:** Use cursor-based for most production APIs.

---

## 1. Offset-Based Pagination

### Overview

**Format:** `?page=2&perPage=20` or `?offset=20&limit=20`

**How it works:**
```sql
-- Page 1
SELECT * FROM users ORDER BY created_at DESC LIMIT 20 OFFSET 0;

-- Page 2
SELECT * FROM users ORDER BY created_at DESC LIMIT 20 OFFSET 20;
```

**Performance:** O(n) - Database must scan `offset` rows before returning results. At offset 10,000, database scans 10,000 rows to return 20.

---

### Request/Response Example

**Request:**
```http
GET /v1/users?page=2&perPage=20&sort=-createdAt HTTP/1.1
Host: api.example.com
```

**Response:**
```json
{
  "data": [
    {
      "id": "21",
      "name": "User 21",
      "email": "user21@example.com",
      "createdAt": "2026-01-27T10:00:00Z"
    }
    // ... 19 more items
  ],
  "meta": {
    "page": 2,
    "perPage": 20,
    "total": 1543,
    "totalPages": 78,
    "hasNextPage": true,
    "hasPreviousPage": true
  },
  "links": {
    "first": "/v1/users?page=1&perPage=20&sort=-createdAt",
    "prev": "/v1/users?page=1&perPage=20&sort=-createdAt",
    "self": "/v1/users?page=2&perPage=20&sort=-createdAt",
    "next": "/v1/users?page=3&perPage=20&sort=-createdAt",
    "last": "/v1/users?page=78&perPage=20&sort=-createdAt"
  }
}
```

---

### Implementation (Node.js + PostgreSQL)

```typescript
import { Request, Response } from 'express';
import { db } from './db';

interface PaginationQuery {
  page?: string;
  perPage?: string;
  sort?: string;
}

export async function listUsers(req: Request<{}, {}, {}, PaginationQuery>, res: Response) {
  // Parse and validate pagination params
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const perPage = Math.min(100, Math.max(1, parseInt(req.query.perPage || '20', 10)));
  const offset = (page - 1) * perPage;

  // Parse sort parameter
  const sort = req.query.sort || '-createdAt';
  const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
  const sortOrder = sort.startsWith('-') ? 'DESC' : 'ASC';

  // Validate sort field (prevent SQL injection)
  const allowedSortFields = ['createdAt', 'name', 'email'];
  if (!allowedSortFields.includes(sortField)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_SORT_FIELD',
        message: "Sort field must be one of: " + allowedSortFields.join(', ')
      }
    });
  }

  try {
    // Get total count (can be expensive on large tables)
    const [{ count: total }] = await db.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM users'
    );

    // Get paginated data
    const users = await db.query(
      "SELECT id, name, email, created_at as \"createdAt\" " +
      "FROM users " +
      "ORDER BY " + sortField + " " + sortOrder + " " +
      "LIMIT $1 OFFSET $2",
      [perPage, offset]
    );

    const totalPages = Math.ceil(total / perPage);
    const baseUrl = "/v1/users?perPage=" + perPage + "&sort=" + sort;

    return res.json({
      data: users,
      meta: {
        page,
        perPage,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      },
      links: {
        first: baseUrl + "&page=1",
        prev: page > 1 ? baseUrl + "&page=" + (page - 1) : null,
        self: baseUrl + "&page=" + page,
        next: page < totalPages ? baseUrl + "&page=" + (page + 1) : null,
        last: baseUrl + "&page=" + totalPages
      }
    });
  } catch (error) {
    console.error('Pagination error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch users'
      }
    });
  }
}
```

---

### Optimization: COUNT(*) Alternatives

**Problem:** `COUNT(*)` is expensive on large tables.

**Solutions:**

**1. Approximate count (PostgreSQL):**
```typescript
// Fast but approximate
const [{ estimate }] = await db.query(`
  SELECT reltuples::bigint AS estimate
  FROM pg_class
  WHERE relname = 'users'
`);
```

**2. Cached count:**
```typescript
// Update count in background job, read from cache
const total = await redis.get('users:count') || 0;
```

**3. Omit total after certain page:**
```typescript
// Only calculate total for first page
const total = page === 1
  ? await db.query('SELECT COUNT(*) FROM users')
  : null;
```

---

### Problems with Offset Pagination

**1. Performance degradation:**
```sql
-- Fast
SELECT * FROM users LIMIT 20 OFFSET 0;  -- 5ms

-- Slow (database scans 10,000 rows)
SELECT * FROM users LIMIT 20 OFFSET 10000;  -- 500ms
```

**2. Inconsistent results (items added/removed between requests):**
```
Page 1: [A, B, C, D, E]
-- New item "X" inserted at position 1
Page 2: [D, E, F, G, H]  -- Item "D" appears on both pages!
```

**3. Duplicate/skipped items:**
- If item deleted: items shift, some skipped
- If item added: items shift, some duplicated

**Use offset pagination only for:**
- Small datasets (<10k rows)
- Admin UIs where page jumping needed
- Reports where total count required

---

## 2. Cursor-Based Pagination (Recommended)

### Overview

**Format:** `?cursor=encodedCursor&limit=20`

**How it works:**
- Cursor encodes the position of last item (e.g., ID + timestamp)
- Next request fetches items after cursor
- Performance: O(log n) with proper indexing (constant time per page)

**Advantages:**
- ✅ Consistent results (no skips/duplicates)
- ✅ Constant performance at any depth
- ✅ Works with real-time data
- ✅ Scalable to billions of rows

**Disadvantages:**
- ❌ Can't jump to specific page
- ❌ No total count/pages
- ⚠️ Cursor must be treated as opaque token

---

### Request/Response Example

**Initial Request:**
```http
GET /v1/posts?limit=20 HTTP/1.1
Host: api.example.com
```

**Response:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Post 1",
      "createdAt": "2026-01-28T12:00:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "title": "Post 2",
      "createdAt": "2026-01-28T11:55:00Z"
    }
    // ... 18 more items
  ],
  "meta": {
    "nextCursor": "eyJpZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAxNCIsImNyZWF0ZWRBdCI6IjIwMjYtMDEtMjhUMTA6MDA6MDBaIn0=",
    "hasMore": true,
    "limit": 20
  },
  "links": {
    "self": "/v1/posts?limit=20",
    "next": "/v1/posts?cursor=eyJpZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAxNCIsImNyZWF0ZWRBdCI6IjIwMjYtMDEtMjhUMTA6MDA6MDBaIn0=&limit=20"
  }
}
```

**Next Page Request:**
```http
GET /v1/posts?cursor=eyJpZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAxNCIsImNyZWF0ZWRBdCI6IjIwMjYtMDEtMjhUMTA6MDA6MDBaIn0=&limit=20 HTTP/1.1
Host: api.example.com
```

---

### Implementation (Node.js + PostgreSQL)

```typescript
import { Request, Response } from 'express';
import { db } from './db';

interface CursorPaginationQuery {
  cursor?: string;
  limit?: string;
}

interface Cursor {
  id: string;
  createdAt: string;
}

// Encode cursor as base64 JSON
function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64');
}

// Decode cursor from base64 JSON
function decodeCursor(encoded: string): Cursor | null {
  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
}

export async function listPosts(req: Request<{}, {}, {}, CursorPaginationQuery>, res: Response) {
  // Parse limit
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));

  // Decode cursor
  let cursor: Cursor | null = null;
  if (req.query.cursor) {
    cursor = decodeCursor(req.query.cursor);
    if (!cursor) {
      return res.status(400).json({
        error: {
          code: 'INVALID_CURSOR',
          message: 'Cursor is invalid or corrupted'
        }
      });
    }
  }

  try {
    // Build query
    let query: string;
    let params: any[];

    if (cursor) {
      // Fetch items after cursor
      // IMPORTANT: Use composite index on (created_at DESC, id DESC)
      query = `
        SELECT id, title, content, created_at as "createdAt"
        FROM posts
        WHERE (created_at, id) < ($1, $2)
        ORDER BY created_at DESC, id DESC
        LIMIT $3
      `;
      params = [cursor.createdAt, cursor.id, limit + 1];
    } else {
      // First page
      query = `
        SELECT id, title, content, created_at as "createdAt"
        FROM posts
        ORDER BY created_at DESC, id DESC
        LIMIT $1
      `;
      params = [limit + 1];
    }

    const posts = await db.query(query, params);

    // Check if there are more results
    const hasMore = posts.length > limit;
    const data = hasMore ? posts.slice(0, limit) : posts;

    // Generate next cursor from last item
    let nextCursor: string | null = null;
    if (hasMore && data.length > 0) {
      const lastItem = data[data.length - 1];
      nextCursor = encodeCursor({
        id: lastItem.id,
        createdAt: lastItem.createdAt
      });
    }

    const baseUrl = "/v1/posts?limit=" + limit;

    return res.json({
      data,
      meta: {
        nextCursor,
        hasMore,
        limit
      },
      links: {
        self: cursor ? baseUrl + "&cursor=" + req.query.cursor : baseUrl,
        next: nextCursor ? baseUrl + "&cursor=" + nextCursor : null
      }
    });
  } catch (error) {
    console.error('Cursor pagination error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch posts'
      }
    });
  }
}
```

---

### Database Index (Critical for Performance)

```sql
-- Composite index for cursor pagination
-- IMPORTANT: Index must match ORDER BY clause exactly
CREATE INDEX idx_posts_created_at_id ON posts (created_at DESC, id DESC);

-- For filtering + pagination (e.g., posts by user)
CREATE INDEX idx_posts_user_created_at_id ON posts (user_id, created_at DESC, id DESC);
```

**Without index:** Full table scan on every request
**With index:** Index-only scan, constant time at any depth

---

### Cursor Security

**Bad Practice (Exposes internals):**
```json
{
  "nextCursor": "2026-01-28T10:00:00Z|550e8400-e29b-41d4-a716-446655440014"
}
```

**Good Practice (Opaque token):**
```json
{
  "nextCursor": "eyJpZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAxNCIsImNyZWF0ZWRBdCI6IjIwMjYtMDEtMjhUMTA6MDA6MDBaIn0="
}
```

**Best Practice (Signed/encrypted):**
```typescript
import crypto from 'crypto';

const SECRET = process.env.CURSOR_SECRET!;

function encodeCursor(cursor: Cursor): string {
  const payload = JSON.stringify(cursor);
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('hex');

  return Buffer.from(payload + "." + signature).toString('base64');
}

function decodeCursor(encoded: string): Cursor | null {
  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    const [payload, signature] = decoded.split('.');

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', SECRET)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      return null; // Tampered cursor
    }

    return JSON.parse(payload);
  } catch (error) {
    return null;
  }
}
```

---

## 3. Keyset Pagination

### Overview

**Similar to cursor pagination** but uses actual column values instead of encoded cursor.

**Format:** `?afterId=123&limit=20` or `?afterDate=2026-01-28T10:00:00Z&limit=20`

**How it works:**
```sql
SELECT * FROM users
WHERE id > 123
ORDER BY id ASC
LIMIT 20;
```

**Advantages:**
- ✅ Human-readable parameters
- ✅ Constant performance with index
- ✅ Simple implementation

**Disadvantages:**
- ❌ Exposes database internals
- ❌ Harder to use with composite sorting
- ⚠️ Only works with unique, sequential keys

---

### Example

**Request:**
```http
GET /v1/users?afterId=550e8400-e29b-41d4-a716-446655440100&limit=20 HTTP/1.1
```

**Implementation:**
```typescript
export async function listUsers(req: Request, res: Response) {
  const limit = Math.min(100, parseInt(req.query.limit as string || '20', 10));
  const afterId = req.query.afterId as string | undefined;

  let query: string;
  let params: any[];

  if (afterId) {
    query = `
      SELECT id, name, email
      FROM users
      WHERE id > $1
      ORDER BY id ASC
      LIMIT $2
    `;
    params = [afterId, limit + 1];
  } else {
    query = `SELECT id, name, email FROM users ORDER BY id ASC LIMIT $1`;
    params = [limit + 1];
  }

  const users = await db.query(query, params);
  const hasMore = users.length > limit;
  const data = hasMore ? users.slice(0, limit) : users;

  return res.json({
    data,
    meta: {
      hasMore,
      afterId: hasMore ? data[data.length - 1].id : null
    }
  });
}
```

**Use keyset pagination when:**
- Sorting by single unique column (id, timestamp)
- Internal/admin APIs (exposing IDs is acceptable)
- Simplicity preferred over cursor opaqueness

---

## 4. Link Header Pagination (RFC 8288)

### Overview

**HTTP Link Header** provides pagination links in response headers instead of body.

**Format:**
```http
Link: <https://api.example.com/users?page=1>; rel="first",
      <https://api.example.com/users?page=2>; rel="prev",
      <https://api.example.com/users?page=4>; rel="next",
      <https://api.example.com/users?page=10>; rel="last"
```

**Advantages:**
- ✅ Follows HTTP standards (RFC 8288)
- ✅ Separates pagination from data
- ✅ Used by GitHub, GitLab

**Disadvantages:**
- ⚠️ Harder to parse than JSON
- ⚠️ Less discoverable

---

### Implementation

```typescript
export async function listUsers(req: Request, res: Response) {
  const page = parseInt(req.query.page as string || '1', 10);
  const perPage = 20;
  const total = 200; // from count query
  const totalPages = Math.ceil(total / perPage);

  // Build Link header
  const links: string[] = [];
  const baseUrl = 'https://api.example.com/users';

  links.push("<" + baseUrl + "?page=1>; rel=\"first\"");
  if (page > 1) {
    links.push("<" + baseUrl + "?page=" + (page - 1) + ">; rel=\"prev\"");
  }
  if (page < totalPages) {
    links.push("<" + baseUrl + "?page=" + (page + 1) + ">; rel=\"next\"");
  }
  links.push("<" + baseUrl + "?page=" + totalPages + ">; rel=\"last\"");

  res.set('Link', links.join(', '));

  // Data in body
  const users = []; // ... fetch users
  return res.json({ data: users });
}
```

**Response:**
```http
HTTP/1.1 200 OK
Link: <https://api.example.com/users?page=1>; rel="first",
      <https://api.example.com/users?page=2>; rel="prev",
      <https://api.example.com/users?page=4>; rel="next",
      <https://api.example.com/users?page=10>; rel="last"

{
  "data": [...]
}
```

---

## Performance Benchmarks

**Dataset:** 1 million rows

| Pattern | Page 1 | Page 100 | Page 1000 | Page 10000 |
|---------|--------|----------|-----------|------------|
| Offset | 5ms | 50ms | 500ms | 5000ms |
| Cursor | 5ms | 5ms | 5ms | 5ms |
| Keyset | 5ms | 5ms | 5ms | 5ms |

**Conclusion:** Cursor/keyset pagination is **17x faster** at page 1000, **1000x faster** at page 10000.

---

## Best Practices Summary

### Choose the Right Pattern

| Use Case | Pattern | Reason |
|----------|---------|--------|
| News feed, activity stream | Cursor | Real-time updates, infinite scroll |
| Search results (<10k) | Offset | User expects page jumping |
| Admin data tables | Offset | Need total count, page jumping |
| Logs, analytics | Cursor/Keyset | Large datasets, sequential access |
| Time-series data | Keyset (timestamp) | Efficient range queries |

### Implementation Checklist

- [ ] Validate `limit`/`perPage` (min 1, max 100)
- [ ] Add database index matching ORDER BY clause
- [ ] Handle empty results gracefully
- [ ] Encode cursors as opaque tokens (base64 JSON minimum, signed/encrypted best)
- [ ] Include `hasMore`/`hasNextPage` in meta
- [ ] Provide navigation links in `links` or `Link` header
- [ ] Return 400 for invalid cursor
- [ ] Document pagination in OpenAPI spec
- [ ] Consider caching `COUNT(*)` for offset pagination
- [ ] Monitor slow queries and optimize indexes

### Response Template

```json
{
  "data": [...],
  "meta": {
    "nextCursor": "...",
    "hasMore": true,
    "limit": 20
  },
  "links": {
    "self": "/v1/posts?limit=20",
    "next": "/v1/posts?cursor=...&limit=20"
  }
}
```

---

## References

- [RFC 8288 - Web Linking](https://www.rfc-editor.org/rfc/rfc8288.html)
- [Use the Index, Luke! - Pagination](https://use-the-index-luke.com/no-offset)
- [Cursor Pagination Guide](https://www.merge.dev/blog/cursor-pagination)
- [JSON:API Pagination](https://jsonapi.org/format/#fetching-pagination)
- [Slack API Pagination](https://api.slack.com/docs/pagination)
