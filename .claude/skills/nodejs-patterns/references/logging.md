# Logging Examples

Complete implementation examples for structured logging in Node.js using Pino.

---

## Logger Configuration

### Production-Ready Logger Setup
```typescript
// src/utils/logger.ts
import pino from 'pino';
import { config } from '../config';

export const logger = pino({
  level: config.logging.level,
  transport: config.server.isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
        },
      },
  base: {
    env: config.server.env,
  },
  redact: ['req.headers.authorization', 'password', 'token'],
});

// Child logger with context
export function createLogger(context: string) {
  return logger.child({ context });
}
```

---

## Usage Patterns

### In Services
```typescript
// src/services/userService.ts
import { createLogger } from '../utils/logger';

const log = createLogger('UserService');

export class UserService {
  async create(data: CreateUserInput) {
    log.info({ email: data.email }, 'Creating user');

    try {
      const user = await db.users.create({ data });
      log.info({ userId: user.id }, 'User created successfully');
      return user;
    } catch (error) {
      log.error({ err: error, email: data.email }, 'Failed to create user');
      throw error;
    }
  }
}
```

### In Controllers
```typescript
// src/controllers/orderController.ts
import { createLogger } from '../utils/logger';

const log = createLogger('OrderController');

export const createOrder = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  log.info({ userId, requestId: req.id }, 'Processing order creation');

  const order = await orderService.create(userId, req.body);

  log.info({ orderId: order.id, userId }, 'Order created');

  res.status(201).json({ data: order });
});
```

---

## Request Logging

### HTTP Request Logging
```typescript
// src/app.ts
import { pinoHttp } from 'pino-http';
import { logger } from './utils/logger';

app.use(pinoHttp({
  logger,
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => {
    return req.method + " " + req.url + " completed";
  },
  customErrorMessage: (req, res, err) => {
    return req.method + " " + req.url + " errored";
  },
}));
```

---

## Log Levels

### When to Use Each Level

**debug**: Detailed diagnostic information
```typescript
log.debug({ query: sql, params }, 'Executing database query');
```

**info**: General informational messages
```typescript
log.info({ userId }, 'User logged in');
```

**warn**: Warning messages for potential issues
```typescript
log.warn({ attemptCount: 3 }, 'Multiple failed login attempts');
```

**error**: Error events that might still allow the app to continue
```typescript
log.error({ err, userId }, 'Failed to process payment');
```

---

## Structured Logging

### Best Practices
```typescript
// Good: Structured data
log.info({ userId: user.id, email: user.email }, 'User created');

// Bad: String interpolation
log.info("User " + user.id + " created with email " + user.email);

// Good: Context-rich error logging
log.error({
  err,
  userId,
  operation: 'createOrder',
  input: sanitize(orderData)
}, 'Order creation failed');

// Bad: Minimal error logging
log.error('Error creating order');
```

---

## Sensitive Data Redaction

### Automatic Redaction
```typescript
export const logger = pino({
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'token',
      'secret',
      'apiKey',
      'creditCard',
      '*.password',
      '*.token',
    ],
    remove: true, // Completely remove instead of replacing with [Redacted]
  },
});
```

### Manual Sanitization
```typescript
function sanitizeForLogging(data: any) {
  const sanitized = { ...data };
  delete sanitized.password;
  delete sanitized.token;
  delete sanitized.creditCard;
  return sanitized;
}

log.info({ user: sanitizeForLogging(userData) }, 'User data processed');
```

---

## Best Practices

1. **Use structured logging**: Pass objects instead of string interpolation
2. **Add context**: Include request IDs, user IDs, and operation names
3. **Redact sensitive data**: Never log passwords, tokens, or PII
4. **Use appropriate levels**: debug < info < warn < error
5. **Create child loggers**: Add service/module context automatically
6. **Log errors properly**: Include error object and context
7. **Use pretty printing in dev**: Enable pino-pretty for local development
8. **Keep production logs JSON**: Structured JSON for production log aggregation
