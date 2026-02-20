---
name: backend-patterns
description: Provides comprehensive patterns for API design, database operations, caching strategies, and backend architecture best practices.
---

# Backend Patterns

API design, database patterns, caching strategies, and backend architecture guidance.

---

## Overview

This skill provides architectural guidance for building robust backend systems. For detailed implementation examples, see the `references/` directory.

**Core principles:**
- Use proven patterns for common problems
- Choose the right pattern for your use case
- Optimize for maintainability and performance
- Follow security best practices

---

## API Design Patterns

### When to Use REST
- CRUD operations
- Resource-based data models
- Standard HTTP semantics needed
- Client needs caching support

### Key Conventions
- Use plural nouns for resources (`/users`, not `/user`)
- Use HTTP methods correctly (GET read, POST create, PATCH update, DELETE remove)
- Return consistent response formats
- Include pagination for lists
- Support filtering and sorting

**Detailed examples:** See `references/api-patterns.md`

---

## Database Patterns

### Repository Pattern
**Use when:**
- You need to abstract database access
- Testing requires easy mocking
- Multiple data sources might be used
- Domain logic should be separated from data access

### Unit of Work Pattern
**Use when:**
- Multiple database operations must succeed or fail together
- You need transactional consistency
- Complex business operations span multiple entities

### Query Builder
**Use when:**
- Dynamic query construction is needed
- Type safety for queries is desired
- SQL complexity should be abstracted

**Detailed examples:** See `references/database-operations.md`

---

## Caching Strategies

### Cache-Aside (Lazy Loading)
**Best for:**
- Read-heavy workloads
- Data that doesn't change frequently
- Cache misses are acceptable

### Write-Through Cache
**Best for:**
- Write-heavy workloads
- Consistency is critical
- Data must be immediately available after write

### Cache Invalidation Strategies
- **TTL-based**: Set expiration time (simple, may serve stale data)
- **Event-based**: Invalidate on specific events (complex, always fresh)
- **Pattern-based**: Delete keys matching pattern (flexible, requires careful key design)

**Detailed examples:** See `references/caching.md`

---

## Authentication & Authorization

### JWT vs Session-Based

**Use JWT when:**
- Building stateless APIs
- Microservices architecture
- Mobile/SPA clients
- Horizontal scaling needed

**Use Session-Based when:**
- Server-side rendering
- Easy token revocation needed
- Simpler implementation preferred

### Authorization Patterns

**RBAC (Role-Based Access Control):**
- Users have roles (admin, user, guest)
- Roles have permissions
- Good for most applications

**ABAC (Attribute-Based Access Control):**
- Access based on user/resource attributes
- More flexible, more complex
- Good for fine-grained access control

**Detailed examples:** See `references/authentication.md`

---

## Error Handling

### Error Hierarchy
1. **Application Errors** (expected, handled gracefully)
   - ValidationError
   - NotFoundError
   - UnauthorizedError
   - ForbiddenError

2. **System Errors** (unexpected, logged and monitored)
   - DatabaseError
   - NetworkError
   - ThirdPartyAPIError

### Best Practices
- Use custom error classes
- Implement global error handler
- Log errors with context
- Never expose internal errors to clients
- Return consistent error format

**Detailed examples:** See `references/error-handling.md`

---

## Background Jobs & Async Processing

### Job Queue Pattern
**Use when:**
- Long-running tasks (email sending, image processing)
- Tasks that can be retried
- Tasks should run asynchronously
- System resilience is important

**Key features:**
- Job persistence
- Retry mechanism
- Priority queues
- Dead letter queues

### Event-Driven Architecture
**Use when:**
- Microservices need to communicate
- Systems should be decoupled
- Real-time data processing needed
- Event sourcing is required

**Trade-offs:**
- **Pros**: Loose coupling, scalability, resilience
- **Cons**: Complexity, eventual consistency, debugging difficulty

**Detailed examples:** See `references/background-jobs.md`

---

## Performance Optimization

### Database Optimization
1. **Indexing**: Index frequently queried columns
2. **Query optimization**: Avoid N+1 queries, use JOINs
3. **Connection pooling**: Reuse database connections
4. **Read replicas**: Distribute read load

### Caching Layers
1. **Application cache**: In-memory (Redis, Memcached)
2. **CDN**: Static assets, API responses
3. **Database query cache**: Built-in caching

### Monitoring
- Track response times
- Monitor error rates
- Watch database query performance
- Alert on anomalies

---

## Architectural Patterns

### Layered Architecture
```
Controllers (HTTP layer)
    ↓
Services (Business logic)
    ↓
Repositories (Data access)
    ↓
Database
```

**Best for:**
- Traditional web applications
- Clear separation of concerns
- Team with different expertise levels

### Microservices
**Use when:**
- Large, complex applications
- Independent scaling needed
- Multiple teams
- Different technology stacks required

**Challenges:**
- Distributed system complexity
- Service communication overhead
- Data consistency across services
- Deployment complexity

### Serverless
**Use when:**
- Unpredictable traffic patterns
- Event-driven workloads
- Low operational overhead desired
- Cost optimization for low traffic

**Limitations:**
- Cold start latency
- Execution time limits
- Vendor lock-in
- Limited customization

---

## Decision Matrix

| Scenario | Pattern | Rationale |
|----------|---------|-----------|
| Simple CRUD API | REST + Repository | Standard, well-understood |
| Real-time updates | WebSocket + Event Bus | Bidirectional, low latency |
| Heavy read load | Cache-Aside + Read Replicas | Reduce DB load |
| Complex transactions | Unit of Work | Ensure consistency |
| Async processing | Job Queue | Decouple, retry, scale |
| Microservices comm | Event-Driven | Loose coupling |
| User authentication | JWT + RBAC | Stateless, scalable |
| File uploads | Background Jobs | Async, non-blocking |

---

## Quick Reference

### API Design
- REST conventions → `references/api-patterns.md`
- Rate limiting → `references/api-patterns.md`

### Database
- Repository pattern → `references/database-operations.md`
- Query optimization → `references/database-operations.md`
- Indexing strategy → `references/database-operations.md`

### Caching
- Cache strategies → `references/caching.md`
- Invalidation patterns → `references/caching.md`

### Security
- Authentication → `references/authentication.md`
- Authorization → `references/authentication.md`

### Async Processing
- Job queues → `references/background-jobs.md`
- Event-driven → `references/background-jobs.md`

### Error Handling
- Custom errors → `references/error-handling.md`
- Global handler → `references/error-handling.md`

---

## Resources

- REST API Design: https://restfulapi.net/
- Database Patterns: Martin Fowler's PoEAA
- Microservices: https://microservices.io/patterns/
- Caching Best Practices: https://aws.amazon.com/caching/best-practices/
