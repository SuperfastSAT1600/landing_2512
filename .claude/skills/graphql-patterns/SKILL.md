---
name: graphql-patterns
description: Provides essential patterns for GraphQL APIs including schema design, resolvers, DataLoader for N+1 prevention, authorization, and pagination.
---

# GraphQL Patterns

Essential patterns for GraphQL APIs: schema design, resolvers, DataLoader, authorization, and pagination.

**Sources:** GraphQL Spec, GraphQL.org Best Practices, Apollo Server Docs

---

## Schema Design Principles

### Naming (GraphQL Spec)
- Types: PascalCase (`User`, `PostConnection`)
- Fields: camelCase (`firstName`, `totalCount`)
- Enums: SCREAMING_SNAKE_CASE (`PUBLISHED`, `DRAFT`)
- Inputs: Suffix with `Input` (`CreateUserInput`)

### Nullability Strategy
- Non-nullable (`!`) when field always exists: `id: ID!`, `email: String!`
- Nullable when field may be missing or unauthorized
- Lists: `[Post!]!` = non-null list of non-null items

### Schema Example
```graphql
type User {
  id: ID!
  email: String!
  posts(first: Int, after: String): PostConnection!
}

type Mutation {
  createUser(input: CreateUserInput!): User!
}

input CreateUserInput {
  email: String!
  password: String!
}
```

**See references/schema-examples.md for:**
- Complete schema with interfaces, unions, custom scalars
- Mutation payload patterns
- Directive usage (@auth, @deprecated)
- Schema federation basics

---

## Resolver Patterns

### Signature
```typescript
(parent, args, context, info) => data | Promise<data>
```

- **parent**: Object from parent resolver
- **args**: Query/mutation arguments
- **context**: Shared per-request (user, db, loaders)
- **info**: Field metadata (rarely used)

### Implementation
```typescript
Query: {
  user: async (_parent, { id }, { db, loaders }) => {
    return loaders.userLoader.load(id);
  },
},

User: {
  posts: async (parent, _args, { db }) => {
    return db.post.findMany({ where: { authorId: parent.id } });
  },
}
```

**Rule:** Keep resolvers thin—delegate business logic to services.

**See references/resolver-patterns.md for:**
- Context setup and per-request patterns
- Parent-child resolver chains explained
- Error handling (GraphQLError, payload patterns)
- Async resolver patterns (sequential vs parallel)
- Authorization patterns (context-based, directive-based, field-level)
- Complete resolver examples

---

## DataLoader (N+1 Solution)

### Problem
```graphql
{ posts { author { name } } }  # 1 query + N queries per post
```

### Solution
```typescript
import DataLoader from 'dataloader';

const userLoader = new DataLoader(async (ids: readonly string[]) => {
  const users = await db.user.findMany({ where: { id: { in: [...ids] } } });
  const userMap = new Map(users.map(u => [u.id, u]));
  return ids.map(id => userMap.get(id) || null);
});

// Context
{ loaders: { userLoader } }
```

**Critical:** Return results in same order as requested IDs.

**See references/dataloader-usage.md for:**
- N+1 problem explained with SQL execution
- Per-request DataLoader pattern (why fresh instances matter)
- One-to-one, one-to-many, and composite key batching
- Caching strategies (in-memory, LRU, manual cache control)
- Error handling in batch functions
- Performance metrics (before/after comparisons)
- Common pitfalls and how to avoid them
- Testing DataLoader implementations

---

## Pagination (Relay Cursor)

### Schema
```graphql
type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
}

type UserEdge {
  node: User!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  endCursor: String
}

type Query {
  users(first: Int, after: String): UserConnection!
}
```

### Why Cursor Over Offset
- Handles inserts/deletes during pagination
- Cursor = opaque token (often base64-encoded ID)

---

## Error Handling

### Typed Errors
```typescript
import { GraphQLError } from 'graphql';

throw new GraphQLError('User not found', {
  extensions: {
    code: 'NOT_FOUND',
    http: { status: 404 },
  },
});
```

### Response Format
```json
{
  "data": { "user": null },
  "errors": [{
    "message": "User not found",
    "path": ["user"],
    "extensions": { "code": "NOT_FOUND" }
  }]
}
```

**Rule:** Return partial data when possible + errors array.

---

## Authorization

### Context-Based
```typescript
Mutation: {
  deletePost: async (_parent, { id }, { user, db }) => {
    if (!user) throw new GraphQLError('Unauthenticated');

    const post = await db.post.findUnique({ where: { id } });
    if (post.authorId !== user.id) throw new GraphQLError('Forbidden');

    return db.post.delete({ where: { id } });
  },
}
```

### Field-Level
```typescript
User: {
  email: (parent, _args, { user }) => {
    return user?.id === parent.id ? parent.email : null;
  },
}
```

---

## Subscriptions

### Schema
```graphql
type Subscription {
  postAdded: Post!
}
```

### Implementation
```typescript
import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();

Subscription: {
  postAdded: {
    subscribe: () => pubsub.asyncIterator(['POST_ADDED']),
  },
}

Mutation: {
  createPost: async (_parent, { input }, { db }) => {
    const post = await db.post.create({ data: input });
    pubsub.publish('POST_ADDED', { postAdded: post });
    return post;
  },
}
```

---

## Resources

- **GraphQL Spec**: https://spec.graphql.org/
- **Best Practices**: https://graphql.org/learn/best-practices/
- **Apollo Server**: https://www.apollographql.com/docs/apollo-server/
- **DataLoader**: https://github.com/graphql/dataloader
- **Relay Cursor Spec**: https://relay.dev/graphql/connections.htm
