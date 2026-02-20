# Error Handling - Detailed Examples

Comprehensive error handling patterns for backend applications.

---

## Custom Error Classes

```typescript
class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
  }
}

class NotFoundError extends AppError {
  constructor(resource: string) {
    super(resource + " not found", 404, 'NOT_FOUND');
  }
}

class ValidationError extends AppError {
  constructor(public fields: Record<string, string>) {
    super('Validation failed', 400, 'VALIDATION_ERROR');
  }
}

class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}
```

## Global Error Handler

```typescript
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error instanceof ValidationError && { fields: error.fields })
      }
    });
  }

  // Log unexpected errors
  logger.error('Unexpected error', { error, req });

  // Don't expose internal errors
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  });
});
```

## Usage in Controllers

```typescript
async function getUserById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const user = await userService.findById(id);

    if (!user) {
      throw new NotFoundError('User');
    }

    res.json({ data: user });
  } catch (error) {
    next(error);
  }
}
```

---

## Resources

- Error Handling Best Practices: https://nodejs.org/en/docs/guides/error-handling/
