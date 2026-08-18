# Layered Architecture Examples

Detailed implementation examples for Node.js layered architecture pattern.

---

## Project Structure

### Complete Directory Layout
```
src/
├── config/                    # Configuration
│   ├── database.ts
│   ├── env.ts
│   └── index.ts
├── controllers/               # Request handlers
│   ├── userController.ts
│   └── orderController.ts
├── services/                  # Business logic
│   ├── userService.ts
│   └── orderService.ts
├── repositories/              # Data access
│   ├── userRepository.ts
│   └── orderRepository.ts
├── middleware/                # Express middleware
│   ├── auth.ts
│   ├── errorHandler.ts
│   └── validation.ts
├── routes/                    # Route definitions
│   ├── userRoutes.ts
│   └── index.ts
├── models/                    # Data models/types
│   └── user.ts
├── utils/                     # Utility functions
│   ├── logger.ts
│   └── helpers.ts
├── app.ts                     # Express app setup
└── server.ts                  # Server entry point
```

---

## Express Application Setup

### Application Factory Pattern
```typescript
// src/app.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { pinoHttp } from 'pino-http';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFound';
import routes from './routes';
import { logger } from './utils/logger';

export function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: config.server.isProduction
      ? ['https://example.com']
      : ['http://localhost:3000'],
    credentials: true,
  }));

  // Request parsing
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true }));

  // Compression
  app.use(compression());

  // Request logging
  app.use(pinoHttp({ logger }));

  // Request ID
  app.use((req, res, next) => {
    req.id = req.headers['x-request-id']?.toString() || crypto.randomUUID();
    res.setHeader('x-request-id', req.id);
    next();
  });

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api', routes);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
```

### Server Entry Point
```typescript
// src/server.ts
import { createApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { supabase } from './lib/supabase';

async function main() {
  const app = createApp();

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
  signals.forEach(signal => {
    process.on(signal, async () => {
      logger.info("Received " + signal + ", shutting down gracefully");
      // Supabase client cleanup if needed
      process.exit(0);
    });
  });

  // Start server
  app.listen(config.server.port, () => {
    logger.info("Server running on port " + config.server.port);
  });
}

main().catch(err => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
```

---

## Service Layer Pattern

### Complete Service Example
```typescript
// src/services/userService.ts
import { supabase } from '../lib/supabase';
import { NotFoundError, ConflictError } from '../utils/errors';
import { hashPassword } from '../utils/password';
import { CreateUserInput, UpdateUserInput } from '../models/user';

export class UserService {
  async findAll(options?: { page?: number; perPage?: number }) {
    const page = options?.page || 1;
    const perPage = options?.perPage || 20;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const [{ data: users, error: usersError }, { count, error: countError }] = await Promise.all([
      supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to),
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true }),
    ]);

    if (usersError) throw usersError;
    if (countError) throw countError;

    return { users: users || [], total: count || 0, page, perPage };
  }

  async findById(id: string) {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !user) {
      throw new NotFoundError('User', id);
    }
    return user;
  }

  async create(data: CreateUserInput) {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', data.email)
      .single();

    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const hashedPassword = await hashPassword(data.password);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        ...data,
        password: hashedPassword,
      })
      .select()
      .single();

    if (error) throw error;
    return user;
  }

  async update(id: string, data: UpdateUserInput) {
    await this.findById(id); // Ensure exists

    const { data: user, error } = await supabase
      .from('users')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return user;
  }

  async delete(id: string) {
    await this.findById(id);

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

export const userService = new UserService();
```

---

## Async Handler Wrapper

```typescript
// src/utils/asyncHandler.ts
import { RequestHandler, Request, Response, NextFunction } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export const asyncHandler = (fn: AsyncRequestHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Usage
router.get('/users', asyncHandler(async (req, res) => {
  const users = await userService.findAll();
  res.json({ data: users });
}));
```

---

## Validation Middleware

```typescript
// src/middleware/validation.ts
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: error.errors,
          },
        });
      }
      next(error);
    }
  };
};

// Usage
import { z } from 'zod';

const createUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    name: z.string().min(2),
    password: z.string().min(8),
  }),
});

router.post('/users', validate(createUserSchema), createUserHandler);
```

---

## Rate Limiting

```typescript
// src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../lib/redis';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.sendCommand(args),
  }),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many login attempts',
    },
  },
});

// Usage
app.use('/api', apiLimiter);
router.post('/auth/login', authLimiter, loginHandler);
```
