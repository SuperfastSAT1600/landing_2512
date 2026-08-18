# DataLoader N+1 Query Prevention

Complete reference for using DataLoader to solve the N+1 query problem in GraphQL based on the official DataLoader library.

---

## The N+1 Query Problem

### Problem: Naive Resolver

```typescript
// Schema
type Query {
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  author: User!
}

type User {
  id: ID!
  username: String!
}

// Resolvers (INEFFICIENT)
const resolvers = {
  Query: {
    posts: async (_parent, _args, { db }) => {
      return db.post.findMany({ take: 10 });  // 1 query
    },
  },

  Post: {
    author: async (parent: Post, _args, { db }) => {
      // This runs for EVERY post returned by Query.posts
      return db.user.findUnique({ where: { id: parent.authorId } });  // N queries
    },
  },
};

// Client query
query {
  posts {        # 1 query for posts
    title
    author {     # N queries for users (1 per post)
      username
    }
  }
}

// SQL executed: 1 + 10 = 11 queries
// SELECT * FROM posts LIMIT 10;
// SELECT * FROM users WHERE id = '1';
// SELECT * FROM users WHERE id = '2';
// ...
// SELECT * FROM users WHERE id = '10';
```

**Problem**: For 10 posts, we execute 11 database queries.

---

## Solution: DataLoader

### 1. Basic DataLoader Implementation

```typescript
import DataLoader from 'dataloader';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// Create a DataLoader for users
const userLoader = new DataLoader<string, User>(async (userIds: readonly string[]) => {
  console.log('Batching user IDs:', userIds);

  // Single query for all user IDs
  const users = await db.user.findMany({
    where: { id: { in: [...userIds] } },
  });

  // CRITICAL: Return users in same order as userIds
  const userMap = new Map(users.map(user => [user.id, user]));
  return userIds.map(id => userMap.get(id) || new Error("User " + id + " not found"));
});

// Use in resolver
Post: {
  author: async (parent: Post, _args, { loaders }) => {
    return loaders.userLoader.load(parent.authorId);  // Batched!
  },
},

// SQL executed: 1 + 1 = 2 queries
// SELECT * FROM posts LIMIT 10;
// SELECT * FROM users WHERE id IN ('1', '2', '3', ..., '10');
```

**Key Points:**
- DataLoader batches all `.load()` calls within a single event loop tick
- Must return results in same order as requested keys
- Use `Map` to ensure correct ordering

---

## Per-Request DataLoader Pattern

```typescript
import { ApolloServer } from '@apollo/server';
import DataLoader from 'dataloader';

interface Context {
  user: User | null;
  db: PrismaClient;
  loaders: {
    userLoader: DataLoader<string, User>;
    postLoader: DataLoader<string, Post>;
    commentLoader: DataLoader<string, Comment>;
  };
}

// Factory functions
function createUserLoader(db: PrismaClient) {
  return new DataLoader<string, User>(async (ids) => {
    const users = await db.user.findMany({
      where: { id: { in: [...ids] } },
    });
    const userMap = new Map(users.map(u => [u.id, u]));
    return ids.map(id => userMap.get(id) || new Error("User " + id + " not found"));
  });
}

function createPostLoader(db: PrismaClient) {
  return new DataLoader<string, Post>(async (ids) => {
    const posts = await db.post.findMany({
      where: { id: { in: [...ids] } },
    });
    const postMap = new Map(posts.map(p => [p.id, p]));
    return ids.map(id => postMap.get(id) || new Error("Post " + id + " not found"));
  });
}

// Apollo Server context (creates new loaders per request)
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }): Promise<Context> => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = token ? await verifyToken(token) : null;

    // CRITICAL: Create new DataLoaders for each request
    const loaders = {
      userLoader: createUserLoader(db),
      postLoader: createPostLoader(db),
      commentLoader: createCommentLoader(db),
    };

    return { user, db, loaders };
  },
});
```

**Why per-request?**
- DataLoader caches results within its lifetime
- Sharing loaders across requests would return stale data
- Each request needs fresh DataLoaders with empty cache

---

## DataLoader Batching Implementation

### 1. One-to-One (User by ID)

```typescript
const userLoader = new DataLoader<string, User>(async (userIds) => {
  const users = await db.user.findMany({
    where: { id: { in: [...userIds] } },
  });

  const userMap = new Map(users.map(u => [u.id, u]));
  return userIds.map(id => userMap.get(id) || new Error("User " + id + " not found"));
});

// Usage
const user = await userLoader.load('user-123');
```

### 2. One-to-Many (Posts by Author ID)

```typescript
const postsByAuthorLoader = new DataLoader<string, Post[]>(async (authorIds) => {
  const posts = await db.post.findMany({
    where: { authorId: { in: [...authorIds] } },
  });

  // Group posts by authorId
  const postsByAuthor = new Map<string, Post[]>();
  for (const post of posts) {
    const authorPosts = postsByAuthor.get(post.authorId) || [];
    authorPosts.push(post);
    postsByAuthor.set(post.authorId, authorPosts);
  }

  // Return empty array if author has no posts
  return authorIds.map(authorId => postsByAuthor.get(authorId) || []);
});

// Usage
User: {
  posts: async (parent: User, _args, { loaders }) => {
    return loaders.postsByAuthorLoader.load(parent.id);
  },
},
```

### 3. Composite Keys (Likes by User + Post)

```typescript
interface LikeKey {
  userId: string;
  postId: string;
}

const likeLoader = new DataLoader<LikeKey, Like | null>(
  async (keys) => {
    const likes = await db.like.findMany({
      where: {
        OR: keys.map(({ userId, postId }) => ({ userId, postId })),
      },
    });

    // Use composite key as string for Map
    const likeMap = new Map(
      likes.map(like => [like.userId + ":" + like.postId, like])
    );

    return keys.map(({ userId, postId }) =>
      likeMap.get(userId + ":" + postId) || null
    );
  },
  {
    // Custom cache key function
    cacheKeyFn: ({ userId, postId }) => userId + ":" + postId,
  }
);

// Usage
Post: {
  hasLiked: async (parent: Post, _args, { user, loaders }) => {
    if (!user) return false;
    const like = await loaders.likeLoader.load({
      userId: user.id,
      postId: parent.id,
    });
    return !!like;
  },
},
```

---

## Caching Strategies

### 1. Default In-Memory Cache (Per Request)

```typescript
// Automatic caching within a request
const userLoader = new DataLoader<string, User>(batchFn);

await userLoader.load('1');  // Database query
await userLoader.load('1');  // Cached (no query)
await userLoader.load('2');  // Database query
```

### 2. Disable Caching

```typescript
const userLoader = new DataLoader<string, User>(batchFn, {
  cache: false,  // Disable caching
});
```

### 3. Custom Cache

```typescript
import { LRUCache } from 'lru-cache';

const cache = new LRUCache<string, User>({
  max: 500,
  ttl: 1000 * 60 * 5,  // 5 minutes
});

const userLoader = new DataLoader<string, User>(batchFn, {
  cacheMap: cache,
});
```

### 4. Manual Cache Manipulation

```typescript
// Prime cache
userLoader.prime('user-123', existingUser);

// Clear single key
userLoader.clear('user-123');

// Clear all
userLoader.clearAll();
```

---

## Error Handling

### 1. Partial Failures

```typescript
const userLoader = new DataLoader<string, User>(async (userIds) => {
  const users = await db.user.findMany({
    where: { id: { in: [...userIds] } },
  });

  const userMap = new Map(users.map(u => [u.id, u]));

  return userIds.map(id => {
    const user = userMap.get(id);
    // Return Error for missing users
    return user || new Error("User " + id + " not found");
  });
});

// Usage
try {
  const user = await userLoader.load('invalid-id');
} catch (error) {
  console.error('User not found:', error.message);
}
```

### 2. Throw on Missing

```typescript
const userLoader = new DataLoader<string, User>(async (userIds) => {
  const users = await db.user.findMany({
    where: { id: { in: [...userIds] } },
  });

  if (users.length !== userIds.length) {
    const foundIds = new Set(users.map(u => u.id));
    const missingIds = userIds.filter(id => !foundIds.has(id));
    throw new Error("Users not found: " + missingIds.join(', '));
  }

  const userMap = new Map(users.map(u => [u.id, u]));
  return userIds.map(id => userMap.get(id)!);
});
```

---

## Advanced Patterns

### 1. Filtering with DataLoader

```typescript
// Load all posts, filter in resolver
const postsByAuthorLoader = new DataLoader<string, Post[]>(async (authorIds) => {
  const posts = await db.post.findMany({
    where: { authorId: { in: [...authorIds] } },
  });

  const postsByAuthor = new Map<string, Post[]>();
  for (const post of posts) {
    const authorPosts = postsByAuthor.get(post.authorId) || [];
    authorPosts.push(post);
    postsByAuthor.set(post.authorId, authorPosts);
  }

  return authorIds.map(authorId => postsByAuthor.get(authorId) || []);
});

// Filter in resolver
User: {
  publishedPosts: async (parent: User, _args, { loaders }) => {
    const allPosts = await loaders.postsByAuthorLoader.load(parent.id);
    return allPosts.filter(post => post.status === 'PUBLISHED');
  },

  draftPosts: async (parent: User, _args, { loaders }) => {
    const allPosts = await loaders.postsByAuthorLoader.load(parent.id);
    return allPosts.filter(post => post.status === 'DRAFT');
  },
},
```

### 2. Nested DataLoaders

```typescript
// Load users with their posts
const userWithPostsLoader = new DataLoader<string, UserWithPosts>(
  async (userIds) => {
    const users = await db.user.findMany({
      where: { id: { in: [...userIds] } },
      include: { posts: true },
    });

    const userMap = new Map(users.map(u => [u.id, u]));
    return userIds.map(id => userMap.get(id) || new Error("User " + id + " not found"));
  }
);
```

### 3. DataLoader with Authorization

```typescript
const postLoader = new DataLoader<string, Post>(async (postIds) => {
  const posts = await db.post.findMany({
    where: { id: { in: [...postIds] } },
  });

  const postMap = new Map(posts.map(p => [p.id, p]));
  return postIds.map(id => postMap.get(id) || new Error("Post " + id + " not found"));
});

// Authorization in resolver
Query: {
  post: async (_parent, { id }, { user, loaders }) => {
    const post = await loaders.postLoader.load(id);

    if (post.status === 'DRAFT' && post.authorId !== user?.id) {
      throw new GraphQLError('Forbidden', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    return post;
  },
},
```

---

## Performance Metrics

### Before DataLoader (N+1 Problem)

```
Query: 10 posts with authors
Queries executed: 1 (posts) + 10 (users) = 11
Time: ~110ms (10ms per query)
```

### After DataLoader (Batched)

```
Query: 10 posts with authors
Queries executed: 1 (posts) + 1 (batched users) = 2
Time: ~20ms (10ms per query)
Improvement: 81.8% faster
```

### Real-World Example

```typescript
// Query for 100 posts with author and comments
query {
  posts(first: 100) {
    title
    author { username }        # Without: 100 queries, With: 1 query
    comments(first: 10) {      # Without: 100 queries, With: 1 query
      content
      author { username }      # Without: 1000 queries, With: 1 query
    }
  }
}

// Without DataLoader: 1 + 100 + 100 + 1000 = 1201 queries
// With DataLoader: 1 + 1 + 1 + 1 = 4 queries
// Improvement: 99.67% fewer queries
```

---

## Common Pitfalls

### 1. Wrong Order in Batch Function

```typescript
// BAD: Doesn't preserve order
const userLoader = new DataLoader<string, User>(async (userIds) => {
  const users = await db.user.findMany({
    where: { id: { in: [...userIds] } },
  });
  return users;  // Wrong! Order doesn't match userIds
});

// GOOD: Preserves order with Map
const userLoader = new DataLoader<string, User>(async (userIds) => {
  const users = await db.user.findMany({
    where: { id: { in: [...userIds] } },
  });
  const userMap = new Map(users.map(u => [u.id, u]));
  return userIds.map(id => userMap.get(id) || new Error('Not found'));
});
```

### 2. Sharing DataLoader Across Requests

```typescript
// BAD: Global loader (stale cache across requests)
const userLoader = new DataLoader(batchFn);

const server = new ApolloServer({
  context: () => ({ loaders: { userLoader } }),  // Same instance!
});

// GOOD: Per-request loader
const server = new ApolloServer({
  context: () => ({
    loaders: {
      userLoader: new DataLoader(batchFn),  // Fresh instance
    },
  }),
});
```

### 3. Not Using DataLoader for N+1

```typescript
// BAD: Direct database call in resolver
Post: {
  author: async (parent: Post, _args, { db }) => {
    return db.user.findUnique({ where: { id: parent.authorId } });  // N+1!
  },
},

// GOOD: Use DataLoader
Post: {
  author: async (parent: Post, _args, { loaders }) => {
    return loaders.userLoader.load(parent.authorId);  // Batched!
  },
},
```

---

## Testing DataLoader

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('userLoader', () => {
  it('batches multiple load calls into single query', async () => {
    const batchFn = vi.fn(async (ids: readonly string[]) => {
      return ids.map(id => ({ id, username: "user-" + id }));
    });

    const loader = new DataLoader(batchFn);

    // Multiple loads
    const [user1, user2, user3] = await Promise.all([
      loader.load('1'),
      loader.load('2'),
      loader.load('3'),
    ]);

    // Batch function called once with all IDs
    expect(batchFn).toHaveBeenCalledTimes(1);
    expect(batchFn).toHaveBeenCalledWith(['1', '2', '3']);

    expect(user1.username).toBe('user-1');
    expect(user2.username).toBe('user-2');
    expect(user3.username).toBe('user-3');
  });

  it('caches repeated loads', async () => {
    const batchFn = vi.fn(async (ids: readonly string[]) => {
      return ids.map(id => ({ id, username: "user-" + id }));
    });

    const loader = new DataLoader(batchFn);

    await loader.load('1');
    await loader.load('1');  // Cached

    expect(batchFn).toHaveBeenCalledTimes(1);
  });
});
```

---

## Resources

- **DataLoader GitHub**: https://github.com/graphql/dataloader
- **Apollo DataLoader Guide**: https://www.apollographql.com/docs/apollo-server/data/fetching-data/#dataloader
- **N+1 Problem Explained**: https://www.apollographql.com/blog/graphql/basics/the-n-1-problem/
- **Performance Best Practices**: https://www.apollographql.com/docs/apollo-server/performance/query-batching/
