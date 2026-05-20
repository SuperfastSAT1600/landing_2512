# Configuration Management Examples

Complete implementation examples for environment variable validation and configuration management.

---

## Environment Variable Validation

### Using Zod for Type-Safe Environment Variables
```typescript
// src/config/env.ts
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('3000'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REDIS_URL: z.string().url().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
```

---

## Configuration Object

### Structured Configuration Export
```typescript
// src/config/index.ts
import { env } from './env';

export const config = {
  server: {
    port: env.PORT,
    env: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
  },
  database: {
    url: env.DATABASE_URL,
  },
  auth: {
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
  },
  logging: {
    level: env.LOG_LEVEL,
  },
} as const;
```

---

## Best Practices

1. **Validate at startup**: Use Zod to validate all environment variables when the application starts
2. **Type-safe access**: Export typed config object for compile-time safety
3. **Fail fast**: Exit with error message if required variables are missing
4. **Default values**: Provide sensible defaults for non-critical variables
5. **Transform values**: Convert string env vars to appropriate types (numbers, booleans)
6. **Document requirements**: List all required environment variables in `.env.example`
