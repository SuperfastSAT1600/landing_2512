# GraphQL Schema Examples

Complete reference for GraphQL schema design patterns based on the GraphQL Spec and Apollo best practices.

---

## Complete Schema Structure

```graphql
# Scalar types (custom)
scalar DateTime
scalar JSON
scalar Upload

# Enums
enum UserRole {
  ADMIN
  MODERATOR
  USER
  GUEST
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

# Interfaces
interface Node {
  id: ID!
  createdAt: DateTime!
  updatedAt: DateTime!
}

interface Timestamped {
  createdAt: DateTime!
  updatedAt: DateTime!
}

# Types implementing interfaces
type User implements Node & Timestamped {
  id: ID!
  email: String!
  username: String!
  role: UserRole!
  profile: UserProfile
  posts(
    first: Int = 10
    after: String
    status: PostStatus
  ): PostConnection!
  followers: [User!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type UserProfile {
  bio: String
  avatar: String
  website: String
  location: String
}

type Post implements Node & Timestamped {
  id: ID!
  title: String!
  content: String!
  status: PostStatus!
  author: User!
  tags: [Tag!]!
  comments(first: Int, after: String): CommentConnection!
  likeCount: Int!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Tag {
  id: ID!
  name: String!
  posts: [Post!]!
}

type Comment implements Node & Timestamped {
  id: ID!
  content: String!
  author: User!
  post: Post!
  parent: Comment
  replies: [Comment!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

# Union types
union SearchResult = User | Post | Tag

# Pagination types (Relay Connection spec)
type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type PostEdge {
  node: Post!
  cursor: String!
}

type CommentConnection {
  edges: [CommentEdge!]!
  pageInfo: PageInfo!
}

type CommentEdge {
  node: Comment!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

# Input types
input CreateUserInput {
  email: String!
  username: String!
  password: String!
  profile: UserProfileInput
}

input UserProfileInput {
  bio: String
  avatar: Upload
  website: String
  location: String
}

input UpdateUserInput {
  email: String
  username: String
  profile: UserProfileInput
}

input CreatePostInput {
  title: String!
  content: String!
  status: PostStatus = DRAFT
  tagIds: [ID!]
}

input UpdatePostInput {
  title: String
  content: String
  status: PostStatus
  tagIds: [ID!]
}

input CreateCommentInput {
  postId: ID!
  parentId: ID
  content: String!
}

# Queries
type Query {
  # Single resources
  user(id: ID!): User
  post(id: ID!): Post
  me: User

  # Collections with pagination
  users(
    first: Int
    after: String
    role: UserRole
  ): UserConnection!

  posts(
    first: Int
    after: String
    authorId: ID
    status: PostStatus
  ): PostConnection!

  # Search
  search(
    query: String!
    first: Int = 10
    after: String
  ): SearchResultConnection!

  # Aggregations
  postStats(authorId: ID): PostStats!
}

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type UserEdge {
  node: User!
  cursor: String!
}

type SearchResultConnection {
  edges: [SearchResultEdge!]!
  pageInfo: PageInfo!
}

type SearchResultEdge {
  node: SearchResult!
  cursor: String!
}

type PostStats {
  totalPosts: Int!
  publishedPosts: Int!
  draftPosts: Int!
  totalLikes: Int!
  totalComments: Int!
}

# Mutations
type Mutation {
  # User mutations
  createUser(input: CreateUserInput!): UserPayload!
  updateUser(id: ID!, input: UpdateUserInput!): UserPayload!
  deleteUser(id: ID!): DeletePayload!

  # Post mutations
  createPost(input: CreatePostInput!): PostPayload!
  updatePost(id: ID!, input: UpdatePostInput!): PostPayload!
  deletePost(id: ID!): DeletePayload!
  publishPost(id: ID!): PostPayload!

  # Comment mutations
  createComment(input: CreateCommentInput!): CommentPayload!
  deleteComment(id: ID!): DeletePayload!

  # Social actions
  likePost(postId: ID!): Post!
  unlikePost(postId: ID!): Post!
  followUser(userId: ID!): User!
  unfollowUser(userId: ID!): User!
}

# Mutation payloads
type UserPayload {
  user: User
  errors: [UserError!]
}

type PostPayload {
  post: Post
  errors: [UserError!]
}

type CommentPayload {
  comment: Comment
  errors: [UserError!]
}

type DeletePayload {
  success: Boolean!
  errors: [UserError!]
}

type UserError {
  message: String!
  field: String
  code: ErrorCode!
}

enum ErrorCode {
  VALIDATION_ERROR
  NOT_FOUND
  UNAUTHORIZED
  FORBIDDEN
  INTERNAL_ERROR
}

# Subscriptions
type Subscription {
  postAdded(authorId: ID): Post!
  postUpdated(id: ID!): Post!
  commentAdded(postId: ID!): Comment!
  userStatusChanged(userId: ID!): UserStatus!
}

type UserStatus {
  userId: ID!
  isOnline: Boolean!
  lastSeen: DateTime
}

# Directives
directive @auth(requires: UserRole = USER) on FIELD_DEFINITION | OBJECT
directive @rateLimit(limit: Int!, duration: Int!) on FIELD_DEFINITION
directive @deprecated(reason: String) on FIELD_DEFINITION | ENUM_VALUE
```

---

## Schema Design Patterns

### 1. Nullability Strategy

```graphql
# Always present fields: non-nullable
type User {
  id: ID!              # Primary key: always present
  email: String!       # Required field: always present
  role: UserRole!      # Enum with default: always present
}

# Optional/conditional fields: nullable
type User {
  bio: String          # User may not have bio
  avatar: String       # User may not have avatar
  lastSeen: DateTime   # User may never have logged in
}

# Lists: choose based on guarantee
type User {
  posts: [Post!]!      # Always returns array (may be empty), items never null
  followers: [User!]   # May return null (e.g., permission denied), items never null
  tags: [String!]      # Always returns array, items never null
}
```

### 2. Input vs Type

```graphql
# Output type (returned by queries/mutations)
type User {
  id: ID!
  email: String!
  createdAt: DateTime!
  posts: [Post!]!      # Can have computed fields
}

# Input type (passed to mutations)
input CreateUserInput {
  email: String!
  password: String!    # Fields specific to creation
  # No id, createdAt, or posts
}

input UpdateUserInput {
  email: String        # All fields optional for updates
  password: String
}
```

**Rule:** Never use output types as mutation inputs—create dedicated input types.

### 3. Mutation Payloads

```graphql
# Good: Payload wrapper with errors
type CreateUserPayload {
  user: User           # Nullable: null if errors
  errors: [UserError!] # Empty array if success
}

type UserError {
  message: String!
  field: String        # Which input field caused error
  code: ErrorCode!
}

mutation {
  createUser(input: CreateUserInput!): CreateUserPayload!
}

# Bad: Returning User directly (no error handling)
mutation {
  createUser(input: CreateUserInput!): User!  # Throws on error
}
```

**Rule:** Use payload types for mutations to handle partial failures gracefully.

### 4. Interfaces for Shared Fields

```graphql
interface Node {
  id: ID!
}

interface Timestamped {
  createdAt: DateTime!
  updatedAt: DateTime!
}

# Types implement multiple interfaces
type User implements Node & Timestamped {
  id: ID!
  createdAt: DateTime!
  updatedAt: DateTime!
  email: String!
}

type Post implements Node & Timestamped {
  id: ID!
  createdAt: DateTime!
  updatedAt: DateTime!
  title: String!
}

# Query returns interface
type Query {
  node(id: ID!): Node  # Can return User or Post
}
```

### 5. Union Types for Heterogeneous Results

```graphql
union SearchResult = User | Post | Comment

type Query {
  search(query: String!): [SearchResult!]!
}

# Client uses fragments to handle types
query {
  search(query: "graphql") {
    ... on User {
      username
      email
    }
    ... on Post {
      title
      content
    }
    ... on Comment {
      content
      author { username }
    }
  }
}
```

### 6. Fragments for Reusable Selections

```graphql
# Define fragment
fragment UserBasicInfo on User {
  id
  username
  avatar
}

fragment PostPreview on Post {
  id
  title
  createdAt
  author {
    ...UserBasicInfo
  }
}

# Use in query
query {
  posts {
    ...PostPreview
    likeCount
  }

  me {
    ...UserBasicInfo
    email
  }
}
```

### 7. Directive Usage

```graphql
# Built-in directives
type User {
  username: String!
  legacyUsername: String @deprecated(reason: "Use 'username' instead")
}

query GetUser($includeProfile: Boolean!) {
  user(id: "1") {
    username
    profile @include(if: $includeProfile) {
      bio
    }
  }
}

# Custom directives
directive @auth(requires: UserRole = USER) on FIELD_DEFINITION

type Mutation {
  deleteUser(id: ID!): User @auth(requires: ADMIN)
  updatePost(id: ID!, input: UpdatePostInput!): Post @auth
}

directive @rateLimit(limit: Int!, duration: Int!) on FIELD_DEFINITION

type Query {
  search(query: String!): [SearchResult!]! @rateLimit(limit: 100, duration: 60)
}
```

---

## Custom Scalar Types

```typescript
// DateTime scalar
import { GraphQLScalarType, Kind } from 'graphql';

export const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'ISO-8601 date-time string',

  // Server -> Client
  serialize(value: Date): string {
    return value.toISOString();
  },

  // Client -> Server (variable)
  parseValue(value: string): Date {
    return new Date(value);
  },

  // Client -> Server (inline)
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

// JSON scalar
export const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON object',

  serialize(value: any): any {
    return value;
  },

  parseValue(value: any): any {
    return value;
  },

  parseLiteral(ast) {
    if (ast.kind === Kind.OBJECT) {
      return parseObject(ast);
    }
    return null;
  },
});

// Register in resolvers
const resolvers = {
  DateTime: DateTimeScalar,
  JSON: JSONScalar,
  // ... other resolvers
};
```

---

## Schema Federation Basics

```graphql
# User service
extend schema
  @link(url: "https://specs.apollo.dev/federation/v2.0",
        import: ["@key", "@shareable"])

type User @key(fields: "id") {
  id: ID!
  email: String!
  username: String!
}

# Post service (references User)
extend schema
  @link(url: "https://specs.apollo.dev/federation/v2.0",
        import: ["@key", "@external"])

type User @key(fields: "id") {
  id: ID! @external
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  authorId: ID!
  author: User!  # Resolved by reference
}
```

---

## Resources

- **GraphQL Spec**: https://spec.graphql.org/
- **Schema Design Guide**: https://www.apollographql.com/docs/apollo-server/schema/schema/
- **Relay Spec**: https://relay.dev/docs/guides/graphql-server-specification/
- **Custom Scalars**: https://www.graphql-scalars.dev/
- **Federation**: https://www.apollographql.com/docs/federation/
