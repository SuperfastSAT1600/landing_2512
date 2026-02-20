# API Versioning Strategies

Comprehensive guide to API versioning approaches, deprecation strategies, and version management.

**Sources:** RFC 9110 (HTTP Semantics), API Platform Standards (AWS, Stripe, GitHub), Semantic Versioning

---

## Versioning Approaches

### 1. URI Versioning (Recommended)

**Format:** `/v{major}/resource`

**Advantages:**
- Clear and explicit
- Easy to test and debug
- Cache-friendly (different URLs)
- Works with all HTTP clients
- Widely adopted (AWS, Stripe, Twilio, GitHub)

**Disadvantages:**
- Pollutes URI space
- Requires routing changes for new versions

**Example:**
```
GET https://api.example.com/v1/users
GET https://api.example.com/v2/users

# Nested resources maintain version
GET https://api.example.com/v1/users/123/posts
```

**Implementation (Express):**
```typescript
// v1 routes
app.use('/v1/users', v1UsersRouter);

// v2 routes
app.use('/v2/users', v2UsersRouter);

// Default to latest (optional)
app.use('/users', v2UsersRouter);
```

**Best Practices:**
- Only major version in URL (`/v1`, not `/v1.2`)
- Minor/patch versions backwards-compatible
- Keep old versions active for deprecation period
- Document version in OpenAPI `info.version`

---

### 2. Header Versioning

**Format:** Custom header or Accept header with media type versioning

**Advantages:**
- Clean URIs
- More RESTful (same resource, different representations)
- Flexible version negotiation

**Disadvantages:**
- Harder to test (can't just paste URL in browser)
- Cache complexity (Vary header required)
- Not all clients support custom headers

**Custom Header Example:**
```http
GET /users HTTP/1.1
Host: api.example.com
API-Version: 2
```

**Accept Header Example (GitHub style):**
```http
GET /users HTTP/1.1
Host: api.example.com
Accept: application/vnd.example.v2+json
```

**Implementation (Express):**
```typescript
app.use('/users', (req, res, next) => {
  const version = req.headers['api-version'] || '1';

  if (version === '1') {
    return v1UsersRouter(req, res, next);
  } else if (version === '2') {
    return v2UsersRouter(req, res, next);
  } else {
    return res.status(400).json({
      error: {
        code: 'INVALID_VERSION',
        message: "API version " + version + " not supported"
      }
    });
  }
});

// Set cache control
app.use((req, res, next) => {
  res.set('Vary', 'API-Version');
  next();
});
```

**Best Practices:**
- Always include `Vary: API-Version` header for caching
- Default to stable version if header missing
- Document header requirements clearly
- Return 400 for invalid version requests

---

### 3. Content Negotiation

**Format:** Accept header with version parameter

**Example:**
```http
GET /users HTTP/1.1
Host: api.example.com
Accept: application/json; version=2
```

**Rarely used:** More complex than other approaches with no clear advantages.

---

### 4. Query Parameter Versioning

**Format:** `?version=1` or `?api-version=1`

**NOT Recommended:**
- Pollutes query parameters
- Caching issues
- Poor semantics (version isn't a filter)
- Rarely used in production APIs

**Only use for:**
- Webhooks where URL is registered once
- Backward compatibility during migration

---

## Semantic Versioning

Follow semantic versioning principles for API versions:

**Format:** `MAJOR.MINOR.PATCH`

- **MAJOR:** Breaking changes (increment when backwards incompatibility introduced)
- **MINOR:** New features, backwards-compatible (new endpoints, optional fields)
- **PATCH:** Bug fixes, backwards-compatible

**Examples:**
```
1.0.0 → 1.1.0  Added new optional field to response
1.1.0 → 1.1.1  Fixed date format bug
1.1.1 → 2.0.0  Removed deprecated endpoint (breaking change)
```

**URL Versioning:** Only expose MAJOR version (`/v1`, `/v2`)
**OpenAPI:** Document full version in `info.version: "2.1.3"`

---

## Breaking vs Non-Breaking Changes

### Breaking Changes (Require Major Version Bump)

**Removals:**
- Removing endpoints
- Removing request/response fields
- Removing enum values

**Type Changes:**
- Changing field types (`string` → `number`)
- Changing field from optional to required
- Changing response structure

**Behavior Changes:**
- Changing endpoint semantics
- Changing authentication requirements
- Changing default values

**Error Changes:**
- Changing error response format
- New required error handling

**Example:**
```json
// v1 response
{ "userId": 123, "name": "John" }

// v2 response (BREAKING: userId type changed)
{ "userId": "123", "name": "John" }
```

---

### Non-Breaking Changes (Minor/Patch)

**Safe Additions:**
- New endpoints
- New optional request fields
- New response fields (clients should ignore unknown fields)
- New enum values (if client handles unknown gracefully)
- Bug fixes

**Example:**
```json
// v1.0 response
{ "userId": "123", "name": "John" }

// v1.1 response (NON-BREAKING: added optional field)
{ "userId": "123", "name": "John", "email": "john@example.com" }
```

**Client Rule:** Ignore unknown fields (Postel's Law: "Be conservative in what you send, liberal in what you accept")

---

## Deprecation Strategy

### Sunset Header (RFC 8594)

**Format:**
```http
HTTP/1.1 200 OK
Sunset: Sat, 31 Dec 2026 23:59:59 GMT
Deprecation: true
Link: <https://api.example.com/docs/v2-migration>; rel="sunset"
```

**Meaning:**
- `Sunset`: Date when endpoint will be removed
- `Deprecation`: Marks as deprecated
- `Link`: Points to migration guide

**Implementation (Express):**
```typescript
// Mark v1 as deprecated
app.use('/v1/*', (req, res, next) => {
  const sunsetDate = new Date('2026-12-31T23:59:59Z');
  res.set('Sunset', sunsetDate.toUTCString());
  res.set('Deprecation', 'true');
  res.set('Link', '<https://api.example.com/docs/v2-migration>; rel="sunset"');
  next();
});
```

---

### Deprecation Timeline

**Best Practice:** 6-12 month deprecation period

**Week 0 (Announcement):**
- Announce new version and deprecation plan
- Add Sunset headers to old version
- Publish migration guide

**Week 1-4 (Early Adoption):**
- Monitor v2 adoption metrics
- Address early issues
- Send email to API consumers

**Month 2-3 (Migration Period):**
- Send targeted emails to users still on v1
- Provide migration support

**Month 4-5 (Warning Period):**
- Increase frequency of deprecation warnings
- Log all v1 API calls
- Contact remaining v1 users directly

**Month 6 (Sunset):**
- Return 410 Gone for v1 endpoints
- Redirect to v2 in documentation

**Example 410 Response:**
```json
{
  "error": {
    "code": "VERSION_SUNSET",
    "message": "API v1 was sunset on 2026-12-31. Please migrate to v2.",
    "migrationGuide": "https://api.example.com/docs/v2-migration",
    "supportEmail": "api-support@example.com"
  }
}
```

---

## Version Migration Guide Template

```markdown
# Migration Guide: v1 → v2

## Breaking Changes

### 1. User ID Type Change
**v1:** `userId` was numeric
**v2:** `userId` is string (UUIDs)

**Before:**
```json
{ "userId": 123 }
```

**After:**
```json
{ "userId": "550e8400-e29b-41d4-a716-446655440000" }
```

**Action:** Update your client code to handle string IDs.

---

### 2. Pagination Response Structure
**v1:** Offset-based with `page`/`perPage`
**v2:** Cursor-based with `cursor`/`limit`

**Before:**
```http
GET /v1/users?page=2&perPage=20
```

**After:**
```http
GET /v2/users?cursor=abc123&limit=20
```

**Action:** Implement cursor-based pagination in your client.

---

## New Features

### 1. Sparse Fieldsets
Request only specific fields to reduce payload size:
```http
GET /v2/users?fields=id,name,email
```

### 2. Batch Operations
Create multiple resources in one request:
```http
POST /v2/users/batch
Content-Type: application/json

{
  "users": [
    { "name": "John", "email": "john@example.com" },
    { "name": "Jane", "email": "jane@example.com" }
  ]
}
```

---

## Timeline
- **2026-06-01:** v2 released, v1 deprecated
- **2026-12-31:** v1 sunset (returns 410 Gone)

## Support
- Migration questions: api-support@example.com
- Full v2 docs: https://api.example.com/v2/docs
```

---

## Multi-Version Maintenance

### Code Organization

**Shared Logic (DRY):**
```typescript
// src/services/userService.ts
export class UserService {
  async getUser(id: string) {
    return db.users.findById(id);
  }
}

// src/v1/controllers/userController.ts
import { UserService } from '../../services/userService';

export async function getUser(req, res) {
  const user = await userService.getUser(req.params.id);
  // Transform to v1 format
  return res.json({ userId: parseInt(user.id), name: user.name });
}

// src/v2/controllers/userController.ts
import { UserService } from '../../services/userService';

export async function getUser(req, res) {
  const user = await userService.getUser(req.params.id);
  // Return v2 format (UUID string)
  return res.json({ userId: user.id, name: user.name });
}
```

### Testing Strategy

Test all supported versions:
```typescript
describe('User API', () => {
  describe('v1', () => {
    it('should return numeric userId', async () => {
      const res = await request(app).get('/v1/users/123');
      expect(res.body.userId).toBe(123);
    });
  });

  describe('v2', () => {
    it('should return UUID userId', async () => {
      const res = await request(app).get('/v2/users/550e8400-e29b-41d4-a716-446655440000');
      expect(res.body.userId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
  });
});
```

---

## Real-World Examples

**Stripe:** URI versioning with date-based versions
```
https://api.stripe.com/v1/charges
Header: Stripe-Version: 2024-06-20
```

**GitHub:** Header versioning with media types
```
Accept: application/vnd.github.v3+json
```

**AWS:** URI versioning with dates
```
https://s3.amazonaws.com/2006-03-01/bucket/key
```

**Twilio:** URI versioning with major version
```
https://api.twilio.com/2010-04-01/Accounts
```

---

## Decision Matrix

| Factor | URI Versioning | Header Versioning |
|--------|----------------|-------------------|
| Ease of use | ✅ Best | ⚠️ Requires header knowledge |
| Browser testable | ✅ Yes | ❌ No |
| Cache-friendly | ✅ Different URLs | ⚠️ Requires Vary header |
| RESTful | ⚠️ Debatable | ✅ More RESTful |
| Adoption | ✅ Most common | ⚠️ Less common |
| **Recommendation** | **Production APIs** | **Internal/advanced APIs** |

---

## References

- [RFC 8594 - Sunset Header](https://www.rfc-editor.org/rfc/rfc8594.html)
- [Semantic Versioning 2.0.0](https://semver.org/)
- [Stripe API Versioning](https://stripe.com/docs/api/versioning)
- [AWS API Versioning](https://docs.aws.amazon.com/general/latest/gr/api-versioning.html)
- [GitHub API Versioning](https://docs.github.com/en/rest/overview/api-versions)
