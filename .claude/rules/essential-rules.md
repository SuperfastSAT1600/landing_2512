# Essential Rules

For testing, specs, verification, git — see `workflow/`. For agents/skills — see `orchestration/`.

---

## Security (Critical)

**Secrets**: Use `process.env.API_KEY`, never hardcode. Add `.env` to `.gitignore`. Use Supabase Vault.

**Input validation**: Parameterized queries only (`WHERE id = $1`). Escape user input, avoid `dangerouslySetInnerHTML`. Array syntax for commands, never string interpolation.

**Auth**: bcrypt min 12 rounds. JWT 15-30 min expiry, httpOnly cookies. Rate limit auth endpoints (5/15 min).

**Cookies**: Always `httpOnly: true`, `secure: true` (prod), `sameSite: 'strict'`.

**Errors**: Log full errors server-side. Return generic messages to clients. Never expose stack traces.

---

## Coding Style

- **No monolithic files.** Split into multiple small, focused files. Each file = one concern.
- Files: <200 lines hard limit | Functions: <30 lines (ideally <15) | Max nesting: 3 levels
- If a file is approaching 150 lines, proactively split it before it grows further.
- See `coding-standards` skill for naming, immutability, early returns, magic numbers.

---

## TypeScript

- Never `any` — use `unknown` or proper types
- Avoid `as` assertions | No `// @ts-ignore`
- See `coding-standards` skill for type inference patterns.

---

## React

- Immutable state updates | Stable IDs for keys (not index) | Clean up effects
- Use React Query for data fetching | Handle loading/error states | Cancel requests in cleanup

---

## Error Handling

- Use typed error classes: `AppError(message, code, statusCode)` → `ValidationError`, `NotFoundError`, etc.
- Always `try/catch` async route handlers, pass to `next(error)`
- Log: error, requestId, operation, sanitized input. Never log passwords, tokens, PII.

---

## API Design

- Success: `{ data: {...}, meta: { requestId } }` | Error: `{ error: { code, message } }`
- Status codes: 200 success, 201 created, 400 validation, 401 unauthed, 403 forbidden, 404 not found, 500 server
- Plural noun endpoints: `/api/users` | GET read, POST create, PATCH update, DELETE remove

---

## Dependencies

- **Approved**: `date-fns`, `zod`, `react-hook-form`, `vitest`, `@reduxjs/toolkit`
- **Forbidden**: `moment.js` (use date-fns), full `lodash` (import specific functions)
- Before adding: check bundle size (bundlephobia.com), verify maintained, check TS support

---

## Quick Checklist

**Before commit**: No hardcoded secrets | Inputs validated | Errors handled | Tests pass 80%+ | No `any` | Playwright E2E run (if UI/API/auth changed) | Spec written if warranted

**Before PR**: <400 lines changed | Conventional commits | No console.logs | Docs updated
