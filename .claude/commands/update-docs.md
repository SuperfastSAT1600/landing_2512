# Update Docs Command

Synchronize documentation with code changes.

---

## Usage

```
/update-docs [scope]
```

**Examples:**
```
/update-docs                   # Update all documentation
/update-docs src/api          # Update API docs only
/update-docs --readme         # Update README only
/update-docs --changelog      # Generate changelog entry
```

---

## What This Command Does

Delegates to the doc-updater agent to:

1. **Analyze Changes**: Find code changes since last doc update
2. **Identify Gaps**: Find outdated or missing documentation
3. **Update Docs**: Sync documentation with code
4. **Generate**: Create new docs where needed
5. **Verify**: Ensure docs match current implementation

---

## Documentation Types

### 1. README.md
- Project description
- Installation instructions
- Quick start guide
- Configuration options
- Usage examples

### 2. API Documentation
- Endpoint descriptions
- Request/response formats
- Authentication requirements
- Error codes
- OpenAPI/Swagger sync

### 3. Code Documentation
- JSDoc/TSDoc comments
- Function descriptions
- Parameter documentation
- Return value documentation
- Example usage

### 4. Changelog
- Version history
- Breaking changes
- New features
- Bug fixes
- Migration guides

---

## Example Session

**User**: `/update-docs`

**Claude**:

### Documentation Analysis

**Analyzing changes since last documentation update...**

```
Files changed: 23
New exports: 5
Modified APIs: 3
Deleted functions: 2
```

---

### Identified Documentation Gaps

**README.md**
- [ ] Missing: New `REDIS_URL` environment variable
- [ ] Outdated: Installation command (npm → pnpm)
- [ ] Missing: New authentication section

**API Documentation**
- [ ] New endpoint: `POST /api/users/bulk`
- [ ] Changed: `GET /api/users` now supports `cursor` pagination
- [ ] Removed: `DELETE /api/users/batch` (deprecated)

**Code Comments**
- [ ] Missing JSDoc: `src/services/UserService.ts:createBulk()`
- [ ] Outdated JSDoc: `src/utils/pagination.ts:paginate()`

---

### Updating Documentation

**1. README.md Updates**

```markdown
## Environment Variables

+ REDIS_URL=redis://localhost:6379  # New: Required for caching

## Installation

- npm install
+ pnpm install

## Authentication

+ ### API Keys
+ Generate an API key in the dashboard settings.
+ Include in requests: `Authorization: Bearer <api-key>`
```

**2. API Documentation Updates**

```markdown
## POST /api/users/bulk

Create multiple users in a single request.

**Request Body:**
\`\`\`json
{
  "users": [
    { "email": "user1@example.com", "name": "User 1" },
    { "email": "user2@example.com", "name": "User 2" }
  ]
}
\`\`\`

**Response:**
\`\`\`json
{
  "data": {
    "created": 2,
    "failed": 0,
    "users": [...]
  }
}
\`\`\`
```

**3. JSDoc Updates**

```typescript
/**
 * Creates multiple users in a single transaction.
 *
 * @param users - Array of user creation data
 * @param options - Optional creation options
 * @returns Promise resolving to created users and any failures
 *
 * @example
 * const result = await userService.createBulk([
 *   { email: 'user1@example.com', name: 'User 1' },
 *   { email: 'user2@example.com', name: 'User 2' },
 * ]);
 */
async createBulk(
  users: CreateUserInput[],
  options?: BulkCreateOptions
): Promise<BulkCreateResult>
```

---

### Documentation Updated

| Document | Changes | Status |
|----------|---------|--------|
| README.md | 3 updates | ✅ Updated |
| API.md | 2 new, 1 updated, 1 removed | ✅ Updated |
| JSDoc | 2 functions | ✅ Updated |
| CHANGELOG.md | 1 entry | ✅ Generated |

---

## Changelog Generation

**User**: `/update-docs --changelog`

**Claude**:

### Changelog Entry

```markdown
## [1.2.0] - 2024-01-15

### Added
- Bulk user creation endpoint (`POST /api/users/bulk`)
- Redis caching support for improved performance
- API key authentication method

### Changed
- User list endpoint now supports cursor-based pagination
- Installation switched from npm to pnpm

### Deprecated
- Batch delete endpoint (`DELETE /api/users/batch`) - use bulk operations instead

### Removed
- Legacy session-based authentication (use JWT instead)

### Fixed
- User email validation now accepts plus-addressed emails
- Timezone handling in date filters

### Security
- Updated jsonwebtoken to address CVE-2022-23529
```

---

## Documentation Standards

### JSDoc Format
```typescript
/**
 * Brief description of the function.
 *
 * Longer description if needed, explaining behavior,
 * edge cases, or important notes.
 *
 * @param paramName - Description of parameter
 * @param [optionalParam] - Optional parameter description
 * @returns Description of return value
 * @throws {ErrorType} When this error occurs
 *
 * @example
 * // Example usage
 * const result = myFunction('input');
 */
```

### README Structure
```markdown
# Project Name

Brief description.

## Features
## Installation
## Quick Start
## Configuration
## API Reference
## Contributing
## License
```

---

## Best Practices

1. **Keep In Sync**: Update docs with every code change
2. **Examples**: Include usage examples
3. **Versioning**: Update changelog with versions
4. **Review**: Include docs in code review
5. **Automate**: Use doc generation tools

---

## Related Commands

- `/full-feature` - Includes documentation phase
- `/review-changes` - Review includes doc check
- `/commit-push-pr` - Ensures docs are committed
