# GraphQL Resolver Patterns

Complete reference for resolver implementation patterns based on Apollo Server and production best practices.

---

## Resolver Function Signature

```typescript
type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;
```

**Parameters:**
- **parent**: Result from parent resolver (or root value for top-level resolvers)
- **args**: Arguments passed to the field in the query
- **context**: Shared object across all resolvers in a request (user, db, loaders)
- **info**: Field metadata (AST, field name, path) - rarely used

---

## Basic Resolver Structure

```typescript
import { GraphQLResolveInfo } from 'graphql';

interface Context {
  user: User | null;
  db: PrismaClient;
  loaders: {
    userLoader: DataLoader<string, User>;
    postLoader: DataLoader<string, Post>;
  };
}

const resolvers = {
  // Query resolvers (root)
  Query: {
    user: async (
      _parent: unknown,
      { id }: { id: string },
      { loaders }: Context
    ): Promise<User | null> => {
      return loaders.userLoader.load(id);
    },

    me: async (
      _parent: unknown,
      _args: {},
      { user }: Context
    ): Promise<User | null> => {
      return user;
    },

    posts: async (
      _parent: unknown,
      { first = 10, after }: { first?: number; after?: string },
      { db }: Context
    ): Promise<PostConnection> => {
      return getPaginatedPosts(db, { first, after });
    },
  },

  // Mutation resolvers
  Mutation: {
    createPost: async (
      _parent: unknown,
      { input }: { input: CreatePostInput },
      { user, db }: Context
    ): Promise<PostPayload> => {
      if (!user) {
        return {
          post: null,
          errors: [{ message: 'Unauthenticated', code: 'UNAUTHORIZED' }],
        };
      }

      const post = await db.post.create({
        data: {
          ...input,
          authorId: user.id,
        },
      });

      return { post, errors: [] };
    },
  },

  // Field resolvers (for User type)
  User: {
    // Resolver for computed/relational field
    posts: async (
      parent: User,
      { first = 10, after }: { first?: number; after?: string },
      { db }: Context
    ): Promise<PostConnection> => {
      return getPaginatedPosts(db, { first, after, authorId: parent.id });
    },

    // Resolver for field-level authorization
    email: (parent: User, _args: {}, { user }: Context): string | null => {
      // Only return email if viewing own profile
      return user?.id === parent.id ? parent.email : null;
    },
  },

  // Field resolvers (for Post type)
  Post: {
    author: async (
      parent: Post,
      _args: {},
      { loaders }: Context
    ): Promise<User> => {
      return loaders.userLoader.load(parent.authorId);
    },

    likeCount: async (
      parent: Post,
      _args: {},
      { db }: Context
    ): Promise<number> => {
      return db.like.count({ where: { postId: parent.id } });
    },
  },

  // Subscription resolvers
  Subscription: {
    postAdded: {
      subscribe: (
        _parent: unknown,
        { authorId }: { authorId?: string },
        { pubsub }: Context
      ) => {
        const topic = authorId ? "POST_ADDED_" + authorId : 'POST_ADDED';
        return pubsub.asyncIterator([topic]);
      },
    },
  },
};
```

---

## Context Setup

```typescript
import { PrismaClient } from '@prisma/client';
import DataLoader from 'dataloader';
import { PubSub } from 'graphql-subscriptions';

const db = new PrismaClient();
const pubsub = new PubSub();

interface Context {
  user: User | null;
  db: PrismaClient;
  loaders: {
    userLoader: DataLoader<string, User>;
    postLoader: DataLoader<string, Post>;
  };
  pubsub: PubSub;
}

// Apollo Server context function
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }): Promise<Context> => {
    // Extract user from JWT token
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = token ? await verifyToken(token) : null;

    // Create per-request DataLoaders
    const loaders = {
      userLoader: createUserLoader(db),
      postLoader: createPostLoader(db),
    };

    return { user, db, loaders, pubsub };
  },
});
```

---

## Parent-Child Resolver Chain

```typescript
// Query: posts -> Post[] -> Post.author -> User

// 1. Root query returns array of posts
Query: {
  posts: async (_parent, _args, { db }): Promise<Post[]> => {
    console.log('Query.posts called once');
    return db.post.findMany({ take: 10 });
  },
},

// 2. For EACH post, Post.author is called
Post: {
  author: async (parent: Post, _args, { loaders }): Promise<User> => {
    console.log("Post.author called for post " + parent.id);
    // Without DataLoader: N queries (1 per post)
    // With DataLoader: 1 batched query
    return loaders.userLoader.load(parent.authorId);
  },
},

// Client query
query {
  posts {           # Calls Query.posts
    id
    title
    author {        # Calls Post.author for each post
      id
      username
    }
  }
}
```

**Output without DataLoader:**
```
Query.posts called once
Post.author called for post 1
SELECT * FROM users WHERE id = '1'
Post.author called for post 2
SELECT * FROM users WHERE id = '2'
...
Total: 1 + N queries
```

**Output with DataLoader:**
```
Query.posts called once
Post.author called for post 1
Post.author called for post 2
...
DataLoader batches IDs ['1', '2', ...]
SELECT * FROM users WHERE id IN ('1', '2', ...)
Total: 2 queries
```

---

## Error Handling in Resolvers

### 1. GraphQLError (Recommended)

```typescript
import { GraphQLError } from 'graphql';

Query: {
  user: async (_parent, { id }, { db }) => {
    const user = await db.user.findUnique({ where: { id } });

    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: {
          code: 'NOT_FOUND',
          http: { status: 404 },
          userId: id,
        },
      });
    }

    return user;
  },
},

Mutation: {
  createPost: async (_parent, { input }, { user, db }) => {
    if (!user) {
      throw new GraphQLError('Authentication required', {
        extensions: {
          code: 'UNAUTHENTICATED',
          http: { status: 401 },
        },
      });
    }

    const post = await db.post.findUnique({ where: { id: input.id } });
    if (post && post.authorId !== user.id) {
      throw new GraphQLError('Not authorized to edit this post', {
        extensions: {
          code: 'FORBIDDEN',
          http: { status: 403 },
        },
      });
    }

    return db.post.create({ data: { ...input, authorId: user.id } });
  },
},
```

**Response:**
```json
{
  "data": { "user": null },
  "errors": [
    {
      "message": "User not found",
      "path": ["user"],
      "extensions": {
        "code": "NOT_FOUND",
        "http": { "status": 404 },
        "userId": "123"
      }
    }
  ]
}
```

### 2. Payload Pattern (Partial Success)

```typescript
type CreatePostPayload {
  post: Post
  errors: [UserError!]
}

type UserError {
  message: String!
  field: String
  code: ErrorCode!
}

Mutation: {
  createPost: async (
    _parent,
    { input },
    { user, db }
  ): Promise<CreatePostPayload> => {
    // Validation errors
    if (!input.title || input.title.length < 3) {
      return {
        post: null,
        errors: [
          {
            message: 'Title must be at least 3 characters',
            field: 'title',
            code: 'VALIDATION_ERROR',
          },
        ],
      };
    }

    // Auth error
    if (!user) {
      return {
        post: null,
        errors: [
          {
            message: 'Authentication required',
            code: 'UNAUTHENTICATED',
          },
        ],
      };
    }

    // Success
    const post = await db.post.create({
      data: { ...input, authorId: user.id },
    });

    return { post, errors: [] };
  },
},
```

---

## Async Resolver Patterns

### 1. Sequential Async Operations

```typescript
User: {
  stats: async (parent: User, _args, { db }) => {
    // Bad: Sequential awaits
    const postCount = await db.post.count({ where: { authorId: parent.id } });
    const followerCount = await db.follow.count({ where: { followingId: parent.id } });
    const likeCount = await db.like.count({
      where: { post: { authorId: parent.id } },
    });

    return { postCount, followerCount, likeCount };
  },
},
```

### 2. Parallel Async Operations (Better)

```typescript
User: {
  stats: async (parent: User, _args, { db }) => {
    // Good: Parallel execution
    const [postCount, followerCount, likeCount] = await Promise.all([
      db.post.count({ where: { authorId: parent.id } }),
      db.follow.count({ where: { followingId: parent.id } }),
      db.like.count({ where: { post: { authorId: parent.id } } }),
    ]);

    return { postCount, followerCount, likeCount };
  },
},
```

---

## Authorization Patterns

### 1. Context-Based (Resolver Level)

```typescript
Mutation: {
  deletePost: async (_parent, { id }, { user, db }) => {
    // Check authentication
    if (!user) {
      throw new GraphQLError('Unauthenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Check authorization
    const post = await db.post.findUnique({ where: { id } });
    if (!post) {
      throw new GraphQLError('Post not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (post.authorId !== user.id && user.role !== 'ADMIN') {
      throw new GraphQLError('Forbidden', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    return db.post.delete({ where: { id } });
  },
},
```

### 2. Directive-Based (Reusable)

```typescript
import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils';
import { defaultFieldResolver } from 'graphql';

function authDirective(directiveName: string) {
  return (schema: GraphQLSchema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const authDirective = getDirective(schema, fieldConfig, directiveName)?.[0];

        if (authDirective) {
          const { requires } = authDirective;
          const { resolve = defaultFieldResolver } = fieldConfig;

          fieldConfig.resolve = async (parent, args, context, info) => {
            if (!context.user) {
              throw new GraphQLError('Unauthenticated', {
                extensions: { code: 'UNAUTHENTICATED' },
              });
            }

            if (requires && context.user.role !== requires) {
              throw new GraphQLError('Forbidden', {
                extensions: { code: 'FORBIDDEN', requires },
              });
            }

            return resolve(parent, args, context, info);
          };
        }

        return fieldConfig;
      },
    });
  };
}

// Apply to schema
let schema = makeExecutableSchema({ typeDefs, resolvers });
schema = authDirective('auth')(schema);
```

### 3. Field-Level (Selective)

```typescript
User: {
  email: (parent: User, _args, { user }) => {
    // Only show email to owner or admin
    if (user?.id === parent.id || user?.role === 'ADMIN') {
      return parent.email;
    }
    return null;
  },

  privateNotes: (parent: User, _args, { user }) => {
    // Only show to owner
    if (user?.id === parent.id) {
      return parent.privateNotes;
    }
    throw new GraphQLError('Forbidden', {
      extensions: { code: 'FORBIDDEN' },
    });
  },
},
```

---

## Batching with Context

```typescript
// Group mutations for batch processing
Mutation: {
  likePost: async (_parent, { postId }, { user, db }) => {
    if (!user) throw new GraphQLError('Unauthenticated');

    await db.like.create({
      data: { postId, userId: user.id },
    });

    // Increment like count
    return db.post.update({
      where: { id: postId },
      data: { likeCount: { increment: 1 } },
    });
  },

  // Batch mutation
  likePosts: async (_parent, { postIds }, { user, db }) => {
    if (!user) throw new GraphQLError('Unauthenticated');

    // Single transaction for multiple likes
    const results = await db.$transaction(
      postIds.map((postId: string) =>
        db.like.create({
          data: { postId, userId: user.id },
        })
      )
    );

    // Update all counts in parallel
    await Promise.all(
      postIds.map((postId: string) =>
        db.post.update({
          where: { id: postId },
          data: { likeCount: { increment: 1 } },
        })
      )
    );

    return results;
  },
},
```

---

## Resolver Best Practices

1. **Keep resolvers thin**: Delegate business logic to services
2. **Use DataLoaders**: Always for N+1 prevention (see references/dataloader-usage.md)
3. **Parallel when possible**: Use `Promise.all()` for independent operations
4. **Field-level authorization**: Return `null` or throw based on sensitivity
5. **Typed errors**: Use `GraphQLError` with extension codes
6. **Context for shared state**: User, DB, loaders—never global state
7. **Avoid info parameter**: Only use for advanced metaprogramming
8. **Return early**: Validate and authorize before expensive operations

---

## Resources

- **Apollo Resolvers**: https://www.apollographql.com/docs/apollo-server/data/resolvers/
- **DataLoader**: See references/dataloader-usage.md
- **Error Handling**: https://www.apollographql.com/docs/apollo-server/data/errors/
- **Directives**: https://www.apollographql.com/docs/apollo-server/schema/directives/
