# Authentication & Authorization - Detailed Examples

Comprehensive authentication and authorization patterns.

---

## JWT Authentication

```typescript
function generateToken(user: User): string {
  return jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new UnauthorizedError('Invalid token');
  }
}
```

**Best practices:**
- Use short expiration times (15-30 minutes)
- Store tokens in httpOnly cookies
- Implement refresh token mechanism
- Use strong secret keys (min 256 bits)

## RBAC (Role-Based Access Control)

```typescript
function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user.permissions.includes(permission)) {
      throw new ForbiddenError("Missing permission: " + permission);
    }

    next();
  };
}

// Usage
app.delete('/api/users/:id',
  requirePermission('users:delete'),
  deleteUserHandler
);
```

## Session-Based Authentication

```typescript
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));
```

---

## Resources

- JWT Best Practices: https://tools.ietf.org/html/rfc8725
- OWASP Authentication: https://owasp.org/www-project-authentication-cheat-sheet/
