# Coding Standards

Core principles. For detailed patterns, see skills.

---

## Security (Critical)

- Never hardcode secrets (env vars, secret management)
- Parameterized queries only (SQL injection prevention)
- Hash passwords (bcrypt, min 10 rounds)
- JWT: Short expiry (15-30 min), httpOnly cookies
- Rate limit auth (5 attempts/15 min)
- Escape user input, avoid dangerouslySetInnerHTML
- Command injection: Array syntax, never string interpolation
- Secure cookies: httpOnly, secure in prod, sameSite strict
- Log server-side, return generic client messages
- Never expose stack traces or PII in production

---

## Style

- `const` over `let`, never `var`
- Immutable updates only
- Files <300 lines, functions <50 (ideally <20), max nesting 3
- Early returns for guards
- Naming: camelCase (vars/funcs), PascalCase (classes/types), UPPER_SNAKE_CASE (constants)
- Booleans: `isX`, `hasX`, `shouldX`
- No magic numbers (named constants)
- Comments explain "why" not "what"

---

## TypeScript

- Never `any` (use `unknown` or proper types)
- Avoid `as` assertions unless necessary
- No `// @ts-ignore`
- Let TypeScript infer when obvious

---

## React

- Immutable state updates
- Stable IDs for keys (not index)
- Clean up effects (cancel requests, remove listeners)
- React Query for data fetching
- Handle loading/error states, cancel in cleanup

---

## Testing

- **TDD**: RED → GREEN → REFACTOR
- **AAA**: Arrange → Act → Assert
- 80% coverage min, business logic 90%+
- Test happy/error/edge cases
- Mock externals (API, DB, filesystem)
- Independent tests (no shared state)

---

## Error Handling

- Typed error classes (code, status)
- Wrap async: try/catch, call next(error)
- Log: error, requestId, operation, sanitized input
- Never log: passwords, tokens, cards, PII

---

## API Design

- **Response**: Success `{data, meta}`, Error `{error: {code, message}}`
- **Status**: 200 (success), 201 (created), 400 (validation), 401 (auth), 403 (authz), 404 (not found), 500 (error)
- **Endpoints**: Plural nouns (`/api/users`), correct methods (GET, POST, PATCH, DELETE)

---

## Dependencies

- **Approved**: date-fns, zod, react-hook-form, vitest, @reduxjs/toolkit
- **Forbidden**: moment.js, full lodash
- **Before adding**: Bundle size, maintained, TypeScript support

---

## Checklist

**Commit**: No secrets, inputs validated, errors handled, tests pass (80%+), no `any`, docs updated
**PR**: <400 lines, conventional commits, no console.logs, docs current
