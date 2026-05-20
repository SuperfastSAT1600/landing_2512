---
name: documentation-patterns
description: Provides essential documentation standards for code, APIs, and projects including JSDoc/TSDoc, README structure, ADR format, and changelog best practices.
---

# Documentation Patterns

Essential documentation standards for code, APIs, and projects. Covers JSDoc/TSDoc, README structure, ADR format, and changelog best practices.

**Authoritative Sources:**
- [JSDoc Documentation](https://jsdoc.app/) - JSDoc standard tags and syntax
- [TSDoc Specification](https://tsdoc.org/) - TypeScript documentation best practices
- [Keep a Changelog](https://keepachangelog.com/) - Semantic changelog format
- [Architectural Decision Records](https://adr.github.io/) - ADR template and process
- [Google Style Guide](https://developers.google.com/style) - Technical writing standards

---

## JSDoc/TSDoc Function Documentation

**Standard format for all functions:**
```typescript
/**
 * Brief description (1 sentence).
 *
 * Longer explanation if needed (2-3 sentences).
 *
 * @param name - Description
 * @returns What the function returns
 * @throws {ErrorType} When this error occurs
 *
 * @example
 * const result = functionName(arg);
 * console.log(result); // expected output
 */
```

**Key tags:** `@param`, `@returns`, `@throws`, `@example`, `@deprecated`, `@internal`

**For types/interfaces:**
```typescript
/**
 * Brief description of what this represents.
 */
interface User {
  /** Unique identifier */
  id: string;
  /** User's email (must be unique) */
  email: string;
}
```

---

## README Structure

**Minimal (required):**
1. Brief description (1-2 sentences)
2. Installation/Quick start
3. Basic usage example
4. Link to docs

**Extended:**
1. Badges (CI, coverage, license)
2. Description + why it exists
3. Features (bulleted)
4. Prerequisites
5. Installation steps
6. Usage examples
7. Configuration (if applicable)
8. Contributing guidelines
9. License

---

## API Endpoint Documentation

**For each endpoint:**
- Summary + description
- HTTP method + path
- Authentication required (Y/N)
- Request parameters/body (table: field | type | required | description)
- Success response (with example JSON)
- Error responses (status | code | description)

**Document in markdown or OpenAPI/Swagger.** Use schema references for complex types.

---

## Architectural Decision Record (ADR)

**Template format:**
```markdown
# ADR-[NUMBER]: [DECISION TITLE]

## Status
Accepted | Superseded | Deprecated

## Context
[Problem/requirements that prompted this decision]

## Options Considered
[List 2-3 alternatives with pros/cons]

## Decision
[What was decided and why]

## Consequences
[Impacts: positive and negative]
```

**Store in:** `.adr/` or `docs/adr/` directory. Number sequentially (ADR-001, ADR-002...).

---

## Code Comments Best Practices

**DO:**
- Explain WHY (not WHAT)
- Document complex algorithms
- Cite external references or requirements
- Use for non-obvious business logic

**DON'T:**
- State the obvious (`// increment counter`)
- Repeat the code
- Use for self-documenting code

**Example:**
```typescript
// Exponential backoff per API throttling guidelines (RFC 6429)
// to avoid overwhelming the service after transient failures
const delay = Math.pow(2, attempt) * 1000;
```

---

## Changelog Format (Keep a Changelog)

**File:** `CHANGELOG.md` at project root

**Sections per version:**
- Added (new features)
- Changed (existing functionality changes)
- Deprecated (features to remove soon)
- Removed (removed features)
- Fixed (bug fixes)
- Security (security patches)

**Format:**
```markdown
## [VERSION] - YYYY-MM-DD

### Added
- Feature description (#123)

### Fixed
- Bug description
```

**Semantic Versioning:** MAJOR.MINOR.PATCH

---

## Inline Documentation Requirements

**Functions:** JSDoc with @param, @returns, @example required if public

**Complex logic:** Single comment explaining "why" before block

**Edge cases:** Comment why handling is non-standard

**Public APIs:** Full TSDoc with examples

---

## Resources

- [JSDoc.app](https://jsdoc.app/)
- [TSDoc.org](https://tsdoc.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [ADR GitHub](https://adr.github.io/)
- [Google Developer Style Guide](https://developers.google.com/style)
