# Essential Rules

For testing, specs, verification, git — see `workflow/`. For agents/skills — see `orchestration/`.

---

## Security

**Secrets**: `process.env.API_KEY`, never hardcode. `.env` in `.gitignore`. Supabase Vault for production.

**Auth**: bcrypt 12+ rounds. JWT 15-30 min expiry, httpOnly cookies. Rate limit auth (5/15 min).

**Cookies**: `httpOnly: true`, `secure: true` (prod), `sameSite: 'strict'`.

---

## Coding Style

- Files: <200 lines | Functions: <30 lines | Max nesting: 3 levels
- Split at 150 lines proactively. One concern per file.
- **Root-cause fixes only.** No defensive patches to mask problems. Fix logic so bad state cannot occur. Validate only at system boundaries.

---

## API Response Shape

- Success: `{ data: {...}, meta: { requestId } }` | Error: `{ error: { code, message } }`
- Plural noun endpoints: `/api/users`

---

## Dependencies

- **Approved**: `date-fns`, `zod`, `react-hook-form`, `vitest`, `@reduxjs/toolkit`
- **Forbidden**: `moment.js`, full `lodash`
