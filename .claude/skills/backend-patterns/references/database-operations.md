# Database Operations - Detailed Examples

Comprehensive database patterns and implementation examples.

---

## Repository Pattern

```typescript
class UserRepository {
  constructor(private db: Database) {}

  async findById(id: string): Promise<User | null> {
    return this.db.query('SELECT * FROM users WHERE id = $1', [id]);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.db.query('SELECT * FROM users WHERE email = $1', [email]);
  }

  async create(user: CreateUserInput): Promise<User> {
    const result = await this.db.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [user.name, user.email]
    );
    return result.rows[0];
  }
}
```

## Unit of Work Pattern

```typescript
class UnitOfWork {
  private transactions: Transaction[] = [];

  async execute<T>(work: () => Promise<T>): Promise<T> {
    const transaction = await this.db.beginTransaction();
    try {
      const result = await work();
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
```

## Query Builder

```typescript
const users = await db
  .select('id', 'name', 'email')
  .from('users')
  .where('status', '=', 'active')
  .orderBy('createdAt', 'desc')
  .limit(20)
  .execute();
```

## Database Optimization

### Indexing Strategy

```sql
-- Single column index
CREATE INDEX idx_users_email ON users(email);

-- Composite index (order matters)
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at DESC);

-- Partial index
CREATE INDEX idx_active_users ON users(email) WHERE status = 'active';

-- Covering index (includes extra columns)
CREATE INDEX idx_users_lookup ON users(email) INCLUDE (name, created_at);
```

### Query Optimization

```typescript
// ❌ N+1 Query Problem
const users = await db.users.findAll();
for (const user of users) {
  user.posts = await db.posts.findByUserId(user.id);
}

// ✅ Use JOIN or batch query
const users = await db.query(`
  SELECT u.*, json_agg(p.*) as posts
  FROM users u
  LEFT JOIN posts p ON p.user_id = u.id
  GROUP BY u.id
`);
```

---

## Resources

- Database Patterns: Martin Fowler's PoEAA
- PostgreSQL Documentation: https://www.postgresql.org/docs/
