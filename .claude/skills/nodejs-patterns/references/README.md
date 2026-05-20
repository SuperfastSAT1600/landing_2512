# Node.js Patterns - Reference Documentation

This directory contains detailed implementation examples for Node.js backend patterns. The main `SKILL.md` provides high-level guidance and procedural instructions, while these references contain complete code examples.

---

## Reference Files

### `layered-architecture.md` (926 words, 8.4KB)
Complete implementation examples for:
- Project directory structure
- Express application factory pattern
- Server entry point with graceful shutdown
- Service layer pattern with full CRUD examples
- Async handler wrapper
- Validation middleware
- Rate limiting middleware

### `configuration.md` (216 words, 2.1KB)
Complete implementation examples for:
- Environment variable validation with Zod
- Type-safe configuration object
- Startup validation with error handling
- Best practices for config management

### `error-handling.md` (492 words, 4.2KB)
Complete implementation examples for:
- Custom error class hierarchy
- Central error handler middleware
- Error handling in services and controllers
- Usage patterns and best practices

### `supabase-integration.md` (701 words, 5.8KB)
Complete implementation examples for:
- Server-side Supabase client setup
- Service role vs anon key usage
- Pagination patterns
- Transaction-like operations
- Error handling
- Real-time subscriptions
- Storage operations

### `logging.md` (569 words, 4.8KB)
Complete implementation examples for:
- Production-ready Pino logger configuration
- Usage patterns in services and controllers
- HTTP request logging
- Log levels and when to use them
- Structured logging best practices
- Sensitive data redaction

---

## Usage

When implementing Node.js backend features:

1. **Start with SKILL.md**: Read the pattern overview and "How to Implement" section
2. **Reference detailed examples**: Follow the reference link for complete code
3. **Copy and adapt**: Use the examples as templates, adapting to your specific needs
4. **Follow best practices**: Each reference includes specific best practices for that pattern

---

## File Organization

The split between SKILL.md and references/ follows this principle:

- **SKILL.md** (1,170 words, 8.4KB): Procedural guidance (WHAT and WHEN)
- **references/** (2,904 words, 25.3KB): Detailed examples (HOW)

This allows the main skill file to remain focused and scannable while preserving all detailed implementation examples for reference.
