# Error Handling Examples

Complete implementation examples for error handling patterns in Node.js.

---

## Custom Error Classes

### Application Error Hierarchy
```typescript
// src/utils/errors.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? resource + " " + id + " not found" : resource + " not found";
    super(message, 'NOT_FOUND', 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}
```

---

## Error Handler Middleware

### Central Error Handling
```typescript
// src/middleware/errorHandler.ts
import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // Log error
  logger.error({
    err,
    requestId: req.id,
    method: req.method,
    path: req.path,
  });

  // Handle known errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId: req.id,
      },
    });
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: err.errors,
        requestId: req.id,
      },
    });
  }

  // Handle unknown errors
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId: req.id,
    },
  });
};
```

---

## Usage Examples

### In Services
```typescript
// src/services/userService.ts
import { NotFoundError, ConflictError } from '../utils/errors';

export class UserService {
  async findById(id: string) {
    const user = await db.users.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundError('User', id);
    }

    return user;
  }

  async create(email: string, password: string) {
    const existing = await db.users.findUnique({ where: { email } });

    if (existing) {
      throw new ConflictError('Email already registered');
    }

    return await db.users.create({ data: { email, password } });
  }
}
```

### In Controllers
```typescript
// src/controllers/userController.ts
import { asyncHandler } from '../utils/asyncHandler';
import { userService } from '../services/userService';

export const getUserById = asyncHandler(async (req, res) => {
  // Errors automatically caught and passed to error handler
  const user = await userService.findById(req.params.id);
  res.json({ data: user });
});
```

---

## Best Practices

1. **Use typed errors**: Create specific error classes for different error types
2. **Include error codes**: Use consistent error codes for client-side handling
3. **Log server-side**: Always log full error details on the server
4. **Return safe messages**: Never expose sensitive information in error messages
5. **Include request IDs**: Add request IDs for tracing in distributed systems
6. **Handle async errors**: Use async wrapper or try-catch in all async route handlers
7. **Validate early**: Validate input at API boundaries to fail fast
