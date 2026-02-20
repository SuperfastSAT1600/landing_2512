# Essential Rules (Ultra-Compact)

Core rules that must be followed. For detailed patterns, see archived rules or skills.

---

## Security (Critical)

### Never Hardcode Secrets
- Use environment variables: `process.env.API_KEY`
- Add `.env` to `.gitignore`
- Use secret management (Supabase Vault)

### Input Validation
```typescript
// SQL: Always parameterized queries
const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// XSS: Escape user input, avoid dangerouslySetInnerHTML
// Command injection: Use array syntax, never string interpolation
```

### Authentication
- Hash passwords with bcrypt (min 10 rounds)
- JWT: Short expiry (15-30 min), httpOnly cookies
- Rate limit auth endpoints (5 attempts/15 min)

### HTTPS & Cookies
```typescript
res.cookie('session', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict'
});
```

### Error Messages
- Log full errors server-side
- Return generic messages to clients
- Never expose stack traces in production

---

## Coding Style

### Immutability
- Prefer `const` over `let`, never `var`
- Immutable updates: `setState([...state, item])`

### File & Function Limits
- Files: <300 lines
- Functions: <50 lines (ideally <20)
- Max nesting: 3 levels

### Early Returns
```typescript
// Good: flat structure
function process(order: Order): Result {
  if (!order) return { error: 'Order not found' };
  if (!order.items.length) return { error: 'Empty order' };
  return processPayment(order);
}
```

### Naming
- Variables/functions: camelCase, descriptive
- Classes/types: PascalCase
- Constants: UPPER_SNAKE_CASE
- Booleans: `isX`, `hasX`, `shouldX`

### No Magic Numbers
```typescript
const MAX_RETRY_ATTEMPTS = 3;
const SECONDS_IN_HOUR = 3600;
```

### Comments
- Explain "why", not "what"
- Document complex business logic
- No obvious comments

---

## TypeScript

### Type Safety
- Never use `any` - use `unknown` or proper types
- Avoid `as` assertions unless necessary
- No `// @ts-ignore`

### Inferred Types
```typescript
// Let TypeScript infer when obvious
const count = 5;           // not: const count: number = 5
const user = new User();   // not: const user: User = new User()
```

---

## React

### State Management
- Immutable updates only
- Use stable IDs for keys (not index)
- Clean up effects (cancel requests, remove listeners)

### Data Fetching
- Use React Query or similar
- Handle loading/error states
- Cancel requests in cleanup

---

## Testing

### TDD Cycle
1. **RED**: Write failing test
2. **GREEN**: Write minimal code to pass
3. **REFACTOR**: Improve while keeping green

### AAA Pattern
```typescript
test('adds item to cart', () => {
  // Arrange
  const cart = new ShoppingCart();
  const item = { id: '1', price: 10 };

  // Act
  cart.addItem(item);

  // Assert
  expect(cart.items).toHaveLength(1);
  expect(cart.total).toBe(10);
});
```

### Coverage
- Minimum 80% coverage
- Business logic: 90%+
- Test happy path, errors, and edge cases

### Mocking
- Mock external dependencies (APIs, DB, filesystem)
- Tests must be independent (no shared state)

---

## Error Handling

### Typed Errors
```typescript
class AppError extends Error {
  constructor(public message: string, public code: string, public statusCode = 500) {
    super(message);
  }
}

class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}
```

### Async Handling
```typescript
// Always handle promise rejections
app.get('/users/:id', async (req, res, next) => {
  try {
    const user = await userService.findById(req.params.id);
    res.json({ data: user });
  } catch (error) {
    next(error);
  }
});
```

### Logging
- Log: error, requestId, operation, sanitized input
- Never log: passwords, tokens, credit cards, PII

---

## API Design

### Response Format
```typescript
// Success
{ "data": { ... }, "meta": { "requestId": "..." } }

// Error
{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

### HTTP Status Codes
| Code | Use Case |
|------|----------|
| 200 | GET, PATCH, DELETE success |
| 201 | POST created |
| 400 | Validation error |
| 401 | Not authenticated |
| 403 | Not authorized |
| 404 | Not found |
| 500 | Server error |

### Endpoints
- Plural nouns: `/api/users`
- Correct methods: GET read, POST create, PATCH update, DELETE remove

---

## Dependencies

### Approved
- Date: `date-fns`
- Validation: `zod`
- Forms: `react-hook-form`
- Testing: `vitest`
- State: `@reduxjs/toolkit`

### Forbidden
- `moment.js` (use date-fns)
- Full `lodash` (import specific functions)

### Before Adding
1. Check bundle size (bundlephobia.com)
2. Verify maintained
3. Check TypeScript support

---

## Quick Checklist

### Before Commit
- [ ] No hardcoded secrets
- [ ] Inputs validated
- [ ] Errors handled
- [ ] Tests pass (80%+ coverage)
- [ ] No `any` types

### Before PR
- [ ] <400 lines changed
- [ ] Conventional commit messages
- [ ] No console.logs
- [ ] Documentation updated if needed
