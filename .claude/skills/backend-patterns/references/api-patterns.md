# API Patterns - Detailed Examples

Comprehensive API implementation patterns and examples.

---

## RESTful API Conventions

```
GET    /api/users          # List users
GET    /api/users/:id      # Get user
POST   /api/users          # Create user
PUT    /api/users/:id      # Update user (full)
PATCH  /api/users/:id      # Update user (partial)
DELETE /api/users/:id      # Delete user
```

## Request/Response Format

```typescript
// Request body
POST /api/users
{
  "name": "Alice",
  "email": "alice@example.com"
}

// Success response
HTTP 201 Created
{
  "data": {
    "id": "123",
    "name": "Alice",
    "email": "alice@example.com",
    "createdAt": "2024-01-20T10:00:00Z"
  }
}

// Error response
HTTP 400 Bad Request
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "fields": {
      "email": "Must be a valid email address"
    }
  }
}
```

## Pagination

```typescript
GET /api/users?page=2&limit=20

{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

## Filtering & Sorting

```
GET /api/users?status=active&sort=-createdAt&search=alice
```

## Rate Limiting

### Token Bucket Algorithm

```typescript
class RateLimiter {
  async checkLimit(key: string, limit: number, window: number): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - window;

    // Remove old entries
    await redis.zremrangebyscore(key, 0, windowStart);

    // Count requests in window
    const count = await redis.zcard(key);

    if (count >= limit) {
      return false;
    }

    // Add current request
    await redis.zadd(key, now, now + "-" + Math.random());
    await redis.expire(key, Math.ceil(window / 1000));

    return true;
  }
}
```

---

## Resources

- REST API Design: https://restfulapi.net/
- HTTP Status Codes: https://httpstatuses.com/
