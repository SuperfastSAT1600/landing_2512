---
name: coding-standards
description: Provides language-agnostic best practices and language-specific coding patterns for writing clean, maintainable code.
---

# Coding Standards

Language-agnostic best practices and language-specific patterns.

---

## General Principles

### SOLID Principles
- **S**ingle Responsibility: One class, one reason to change
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Subtypes must be substitutable for base types
- **I**nterface Segregation: Many specific interfaces > one general
- **D**ependency Inversion: Depend on abstractions, not concretions

### DRY (Don't Repeat Yourself)
- Extract repeated logic into functions
- Use loops/maps instead of copy-paste
- Share common code via modules

### KISS (Keep It Simple, Stupid)
- Simple solutions > clever solutions
- Optimize for readability first
- Premature optimization is the root of all evil

---

## TypeScript/JavaScript

### Modern JavaScript (ES6+)
```typescript
// Use const/let, never var
const config = { api: 'https://api.example.com' };
let counter = 0;

// Arrow functions for callbacks
items.map(item => item.name);

// Destructuring
const { name, email } = user;
const [first, ...rest] = items;

// Template literals (use string interpolation)
const message = "Hello, " + user.name + "!";

// Optional chaining
const street = user?.address?.street;

// Nullish coalescing
const port = process.env.PORT ?? 3000;

// Async/await > promises
async function fetchUser(id: string) {
  const response = await fetch("/api/users/" + id);
  return response.json();
}
```

### TypeScript Best Practices
```typescript
// Explicit types for public APIs
export function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Use interfaces for objects
interface User {
  id: string;
  name: string;
  email: string;
}

// Use type for unions/primitives
type Status = 'pending' | 'active' | 'completed';
type ID = string | number;

// Avoid any, use unknown
function processData(data: unknown) {
  if (typeof data === 'string') {
    return data.toUpperCase();
  }
}

// Use generics for reusable code
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}
```

---

## Python

### PEP 8 Style
```python
# Snake case for functions/variables
def calculate_total(items):
    return sum(item.price for item in items)

# Pascal case for classes
class UserService:
    pass

# UPPER_CASE for constants
MAX_RETRY_ATTEMPTS = 3

# Type hints
def greet(name: str) -> str:
    return f"Hello, {name}!"

# List comprehensions > loops
squares = [x**2 for x in range(10)]

# Context managers
with open('file.txt', 'r') as f:
    content = f.read()

# F-strings > format()
message = f"User {user.name} logged in at {timestamp}"
```

### Python Best Practices
```python
# Use dataclasses for data
from dataclasses import dataclass

@dataclass
class User:
    id: str
    name: str
    email: str

# Use pathlib > os.path
from pathlib import Path
config_file = Path('config') / 'settings.json'

# Use enumerate() for index + value
for index, item in enumerate(items):
    print(f"{index}: {item}")

# Use zip() for parallel iteration
for name, score in zip(names, scores):
    print(f"{name}: {score}")

# Exception handling
try:
    result = risky_operation()
except SpecificError as e:
    logger.error(f"Operation failed: {e}")
    raise
```

---

## Go

### Go Idioms
```go
// Error handling
result, err := doSomething()
if err != nil {
    return nil, fmt.Errorf("doSomething failed: %w", err)
}

// Defer for cleanup
func processFile(filename string) error {
    f, err := os.Open(filename)
    if err != nil {
        return err
    }
    defer f.Close()

    // Process file...
    return nil
}

// Interface satisfaction
type Reader interface {
    Read(p []byte) (n int, err error)
}

// Small interfaces
type Stringer interface {
    String() string
}

// Context for cancellation
func fetchData(ctx context.Context, url string) ([]byte, error) {
    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    // ...
}
```

---

## Rust

### Rust Patterns
```rust
// Result for error handling
fn divide(a: i32, b: i32) -> Result<i32, String> {
    if b == 0 {
        return Err("Division by zero".to_string());
    }
    Ok(a / b)
}

// Option for nullable
fn find_user(id: &str) -> Option<User> {
    // ...
}

// Pattern matching
match result {
    Ok(value) => println!("Success: {}", value),
    Err(e) => eprintln!("Error: {}", e),
}

// Ownership and borrowing
fn process(data: &str) { // Borrow
    // Use data without taking ownership
}

// Iterator chains
let sum: i32 = numbers
    .iter()
    .filter(|&&x| x > 0)
    .map(|&x| x * 2)
    .sum();
```

---

## Common Patterns

### Error Handling
```typescript
// Return Result type
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function parseJSON(text: string): Result<any> {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return { ok: false, error: error as Error };
  }
}

// Use result
const result = parseJSON(text);
if (result.ok) {
  console.log(result.value);
} else {
  console.error(result.error);
}
```

### Builder Pattern
```typescript
class QueryBuilder {
  private query: string[] = [];

  select(...fields: string[]) {
    this.query.push("SELECT " + fields.join(', '));
    return this;
  }

  from(table: string) {
    this.query.push("FROM " + table);
    return this;
  }

  where(condition: string) {
    this.query.push("WHERE " + condition);
    return this;
  }

  build() {
    return this.query.join(' ');
  }
}

// Usage
const sql = new QueryBuilder()
  .select('name', 'email')
  .from('users')
  .where('active = true')
  .build();
```

### Factory Pattern
```typescript
interface Animal {
  speak(): string;
}

class Dog implements Animal {
  speak() { return 'Woof!'; }
}

class Cat implements Animal {
  speak() { return 'Meow!'; }
}

class AnimalFactory {
  static create(type: string): Animal {
    switch (type) {
      case 'dog': return new Dog();
      case 'cat': return new Cat();
      default: throw new Error('Unknown animal type');
    }
  }
}
```

### Repository Pattern
```typescript
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: string): Promise<void>;
}

class UserRepository implements Repository<User> {
  constructor(private db: Database) {}

  async findById(id: string): Promise<User | null> {
    return this.db.query('SELECT * FROM users WHERE id = $1', [id]);
  }

  async findAll(): Promise<User[]> {
    return this.db.query('SELECT * FROM users');
  }

  async save(user: User): Promise<User> {
    // Insert or update logic
    return user;
  }

  async delete(id: string): Promise<void> {
    await this.db.query('DELETE FROM users WHERE id = $1', [id]);
  }
}
```

---

## Code Review Checklist

- [ ] Follows language-specific style guide
- [ ] Clear, descriptive names
- [ ] Functions under 50 lines
- [ ] Files under 300 lines
- [ ] No magic numbers
- [ ] Proper error handling
- [ ] No hardcoded values
- [ ] Type safety (where applicable)
- [ ] Comments explain "why", not "what"
- [ ] No code duplication
- [ ] Testable code structure

---

## Resources

- **TypeScript**: https://typescript-eslint.io/
- **Python**: https://peps.python.org/pep-0008/
- **Go**: https://go.dev/doc/effective_go
- **Rust**: https://doc.rust-lang.org/book/
- **Clean Code**: Robert C. Martin
- **Design Patterns**: Gang of Four
