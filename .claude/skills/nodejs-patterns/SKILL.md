---
name: nodejs-patterns
description: Provides best practices for Node.js backend development including layered architecture, configuration management, error handling, and service patterns with Supabase integration.
---

# Node.js Patterns

Best practices for Node.js backend development. This guide provides high-level patterns and procedural guidance. See `references/` for detailed implementation examples.

---

## Quick Reference

| Pattern | Use For | Reference |
|---------|---------|-----------|
| Layered Architecture | Project structure, separation of concerns | `references/layered-architecture.md` |
| Configuration | Environment variables, type-safe config | `references/configuration.md` |
| Error Handling | Custom errors, middleware, typed errors | `references/error-handling.md` |
| Supabase Integration | Database operations, auth, storage | `references/supabase-integration.md` |
| Logging | Structured logging, request tracing | `references/logging.md` |

---

## Layered Architecture

### Pattern Overview
Separate your application into distinct layers with clear responsibilities:

- **Controllers**: Handle HTTP requests/responses, validate input, call services
- **Services**: Contain business logic, orchestrate operations
- **Repositories**: Data access layer, database queries
- **Middleware**: Cross-cutting concerns (auth, logging, validation)
- **Routes**: Define API endpoints, apply middleware

### When to Use
- Building REST APIs
- Applications with complex business logic
- Multi-developer projects requiring clear boundaries

### How to Implement
1. Create layer-specific directories (`controllers/`, `services/`, `repositories/`)
2. Keep controllers thin (request/response only)
3. Put business logic in services
4. Isolate data access in repositories
5. Use dependency injection for testability

See `references/layered-architecture.md` for complete implementation examples.

---

## Configuration Management

### Pattern Overview
Validate environment variables at startup using Zod for type safety. Export a structured config object throughout the app.

### When to Use
- Any production Node.js application
- When type safety for config is needed
- To fail fast on misconfiguration

### How to Implement
1. Create `config/env.ts` with Zod schema
2. Validate `process.env` on startup
3. Exit with error if validation fails
4. Export typed config object from `config/index.ts`
5. Import config throughout app instead of using `process.env` directly

See `references/configuration.md` for complete validation schemas.

---

## Error Handling

### Pattern Overview
Use custom error classes with proper status codes. Handle all errors in central middleware. Log full details server-side, return safe messages to clients.

### When to Use
- All production applications
- APIs that need consistent error responses
- When you need typed error handling

### How to Implement
1. Create custom error classes extending `AppError`
2. Throw specific errors in services (`NotFoundError`, `ValidationError`)
3. Use async handler wrapper for route handlers
4. Implement central error handler middleware
5. Log errors with request context
6. Return consistent error format to clients

See `references/error-handling.md` for complete error class hierarchy and middleware.

---

## Supabase Integration

### Pattern Overview
Use service role key for admin operations (bypasses RLS). Use anon key + user token for user-scoped operations (respects RLS).

### When to Use
- When using Supabase as your backend
- For applications with Row Level Security policies
- When you need both admin and user-scoped operations

### How to Implement
1. Create server-side client with service role key
2. Create function to generate user-scoped clients
3. Use service role client for admin operations
4. Use user-scoped client for user operations
5. Handle Supabase-specific errors
6. Use database functions for transactions

See `references/supabase-integration.md` for client setup and common patterns.

---

## Logging

### Pattern Overview
Use structured logging with Pino. Add context to all log entries. Redact sensitive data automatically. Use appropriate log levels.

### When to Use
- All production applications
- When you need request tracing
- For debugging and monitoring

### How to Implement
1. Configure Pino with proper log level and redaction
2. Create child loggers with service context
3. Log structured data (objects, not strings)
4. Add request IDs for tracing
5. Use appropriate log levels (debug/info/warn/error)
6. Never log passwords, tokens, or PII

See `references/logging.md` for complete logger configuration and usage patterns.

---

## Best Practices Summary

### Application Structure
- Use layered architecture for separation of concerns
- Keep files under 300 lines
- One class/service per file
- Group related functionality in feature modules

### Security
- Validate all input at API boundaries with Zod
- Use parameterized queries (Supabase handles this)
- Never expose service role key to clients
- Implement rate limiting on public endpoints
- Use helmet for security headers
- Enable CORS properly

### Error Handling
- Use typed custom errors
- Handle async errors with wrapper or try-catch
- Log full errors server-side
- Return safe error messages to clients
- Include request IDs for tracing

### Configuration
- Validate environment variables at startup
- Use type-safe config object
- Never commit secrets to version control
- Document required env vars in `.env.example`

### Logging
- Use structured logging (objects, not strings)
- Add context to all log entries
- Redact sensitive data automatically
- Use appropriate log levels
- Include request IDs for distributed tracing

### Testing
- Test services independently with mocked repositories
- Test controllers with mocked services
- Mock Supabase client in tests
- Aim for 80%+ coverage on business logic

### Performance
- Use pagination for large datasets
- Implement caching where appropriate
- Use connection pooling
- Monitor with health check endpoints
- Implement graceful shutdown

---

## Common Patterns

### Creating a New Resource
1. Define Zod schema for validation
2. Create service with CRUD methods
3. Create controller handlers with validation
4. Define routes with middleware
5. Write unit tests for service
6. Write integration tests for API

### Adding Authentication
1. Use Supabase Auth or implement JWT
2. Create auth middleware to verify tokens
3. Extract user from token and attach to request
4. Protect routes by adding auth middleware
5. Implement rate limiting on auth endpoints

### Adding Authorization
1. Define permission checks in middleware
2. Check user roles/permissions
3. Throw `ForbiddenError` if unauthorized
4. Use RLS policies in Supabase for data access control

### Background Jobs
1. Use service role client (admin access)
2. Implement job runner (node-cron, Bull)
3. Add proper error handling
4. Log job execution
5. Monitor job failures

### File Uploads
1. Use Supabase Storage API
2. Validate file types and sizes
3. Generate unique file names
4. Store file paths in database
5. Implement cleanup for orphaned files

---

## Anti-Patterns to Avoid

1. **Fat Controllers**: Keep business logic in services, not controllers
2. **No Validation**: Always validate input at API boundaries
3. **Exposing Errors**: Never return stack traces or internal details to clients
4. **Hardcoded Config**: Use environment variables, not hardcoded values
5. **String Logging**: Use structured objects, not string interpolation
6. **No Request IDs**: Always include request IDs for tracing
7. **Ignoring Async Errors**: Always handle promise rejections
8. **Service Role Everywhere**: Use user-scoped clients for user operations
9. **No Rate Limiting**: Protect public endpoints from abuse
10. **Missing Graceful Shutdown**: Handle SIGTERM/SIGINT properly

---

For detailed implementation examples, see:
- `references/layered-architecture.md` - Complete Express app setup
- `references/configuration.md` - Environment variable validation
- `references/error-handling.md` - Error classes and middleware
- `references/supabase-integration.md` - Database operations
- `references/logging.md` - Structured logging setup
