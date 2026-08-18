---
name: rest-api-design
description: Authoritative guide for designing RESTful APIs based on IETF RFCs, OpenAPI standards, and industry specifications.
---

# REST API Design

Authoritative guide for designing RESTful APIs based on IETF RFCs, OpenAPI standards, and industry specifications.

**Sources:** RFC 9110 (HTTP Semantics), OpenAPI 3.1+, JSON:API v1.1, Roy Fielding's REST dissertation

---

## Resource Naming (REST Principles)

**Rules:** Nouns (not verbs), plural collections, hierarchical structure
```
✅ /users, /users/123, /users/123/posts
❌ /getUser, /createUser, /user_posts
```

---

## HTTP Methods (RFC 9110)

| Method | Purpose | Idempotent | Response |
|--------|---------|------------|----------|
| GET | Retrieve resource | Yes | 200 OK |
| POST | Create resource | No | 201 Created + Location header |
| PUT | Replace entire resource | Yes | 200 OK / 204 No Content |
| PATCH | Partial update | Partially | 200 OK |
| DELETE | Remove resource | Yes | 204 No Content |

---

## Status Codes (RFC 9110)

**Success (2xx):** 200 OK, 201 Created, 204 No Content
**Client Error (4xx):** 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Validation Error, 429 Too Many Requests (include `Retry-After` header)
**Server Error (5xx):** 500 Internal Error, 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout

**Note:** 4xx errors should NOT be retried without request modification; 5xx errors MAY be retried with backoff.

---

## Response Format (JSON:API Standard)

```json
// Success
{ "data": {...}, "meta": { "timestamp": "2026-01-23T10:00:00Z" } }

// Error
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
```

---

## Pagination

**Offset (simple, small datasets):** `?page=2&perPage=20`
**Cursor (17x faster for large datasets):** `?cursor=encoded_cursor&limit=20`

Cursor pagination avoids data inconsistency issues (skipped/duplicate results) and performs better at scale. Include `nextCursor`, `hasMore` in meta.

**Detailed Guide:** See `references/pagination-patterns.md` for offset vs cursor vs keyset comparison, performance benchmarks, and complete implementation examples with database indexes.

---

## Versioning Strategies

**URL (recommended):** `/v1/users`, `/v2/users` - Clear, cacheable, widely adopted (AWS, Stripe)
**Header:** `Accept: application/vnd.api.v1+json` - Cleaner URLs, harder to debug
**Query Parameter:** `?version=1` - Rarely used

**Best Practice:** Use semantic versioning (Major.Minor.Patch), maintain backward compatibility, document deprecation timelines.

**Detailed Guide:** See `references/versioning-strategies.md` for breaking vs non-breaking changes, deprecation strategies with Sunset headers, and migration guide templates.

---

## Filtering, Sorting, Searching

```
GET /users?role=admin&status=active         # Filtering
GET /users?sort=-createdAt,name             # Sorting (- for descending)
GET /posts?search=javascript                # Search
GET /users?fields=id,name,email             # Sparse fieldsets
```

---

## Authentication & Rate Limiting

**JWT Bearer Token:** `Authorization: Bearer <token>`
**Rate Limit Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
**429 Response:** Must include `Retry-After` header

---

## OpenAPI Specification

Document your API with OpenAPI 3.1 for client generation, validation, and documentation.

**Complete Example:** See `references/openapi-examples.md` for full OpenAPI spec with paths, schemas, security schemes (Bearer, OAuth2), reusable components, pagination responses, and error schemas.

---

## Resources

**Reference Guides:**
- `references/openapi-examples.md` - Complete OpenAPI 3.1 specification example
- `references/versioning-strategies.md` - API versioning, deprecation, and migration strategies
- `references/pagination-patterns.md` - Offset, cursor, and keyset pagination with benchmarks

**External Standards:**
- [RFC 9110 - HTTP Semantics](https://datatracker.ietf.org/doc/html/rfc9110)
- [OpenAPI Specification 3.1+](https://spec.openapis.org/oas/v3.1.0.html)
- [JSON:API v1.1](https://jsonapi.org/format/)
- [Roy Fielding's REST Dissertation](https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm)
- [RFC 8288 - Web Linking](https://www.rfc-editor.org/rfc/rfc8288.html)
- [RFC 8594 - Sunset Header](https://www.rfc-editor.org/rfc/rfc8594.html)
