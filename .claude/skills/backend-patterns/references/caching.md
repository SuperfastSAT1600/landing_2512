# Caching Strategies - Detailed Examples

Comprehensive caching patterns and implementation strategies.

---

## Cache-Aside (Lazy Loading)

```typescript
async function getUser(id: string): Promise<User> {
  // Check cache first
  const cached = await cache.get("user:" + id);
  if (cached) return cached;

  // Cache miss - fetch from database
  const user = await db.users.findById(id);

  // Store in cache
  await cache.set("user:" + id, user, { ttl: 3600 });

  return user;
}
```

**When to use:**
- Read-heavy workloads
- Data doesn't change frequently
- Cache misses are acceptable

## Write-Through Cache

```typescript
async function updateUser(id: string, data: Partial<User>): Promise<User> {
  // Update database
  const user = await db.users.update(id, data);

  // Update cache
  await cache.set("user:" + id, user, { ttl: 3600 });

  return user;
}
```

**When to use:**
- Write-heavy workloads
- Consistency is critical
- Data must be immediately available after write

## Cache Invalidation

```typescript
async function deleteUser(id: string): Promise<void> {
  await db.users.delete(id);
  await cache.delete("user:" + id);
  await cache.delete("user:" + id + ":posts"); // Related caches
}
```

**Strategies:**
- **TTL-based**: Set expiration time on all cached data
- **Event-based**: Invalidate on specific events (create, update, delete)
- **Pattern-based**: Delete all keys matching a pattern (e.g., `user:123:*`)

---

## Resources

- Caching Strategies: https://aws.amazon.com/caching/best-practices/
- Redis Documentation: https://redis.io/docs/
