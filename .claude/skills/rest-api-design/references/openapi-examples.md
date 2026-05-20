# OpenAPI 3.1 Examples

Complete OpenAPI specification examples following OpenAPI 3.1 standards.

**Sources:** OpenAPI 3.1.0 Specification, Swagger Best Practices

---

## Complete API Specification

```yaml
openapi: 3.1.0
info:
  title: User Management API
  version: 1.0.0
  description: RESTful API for user management with authentication
  contact:
    name: API Support
    email: support@example.com
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: https://api.example.com/v1
    description: Production server
  - url: https://staging-api.example.com/v1
    description: Staging server
  - url: http://localhost:3000/v1
    description: Local development

tags:
  - name: users
    description: User management operations
  - name: posts
    description: Blog post operations

paths:
  /users:
    get:
      summary: List users
      description: Retrieve a paginated list of users with optional filtering
      operationId: listUsers
      tags:
        - users
      security:
        - bearerAuth: []
      parameters:
        - name: page
          in: query
          description: Page number (1-indexed)
          required: false
          schema:
            type: integer
            minimum: 1
            default: 1
        - name: perPage
          in: query
          description: Items per page
          required: false
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
        - name: role
          in: query
          description: Filter by user role
          required: false
          schema:
            type: string
            enum: [admin, user, guest]
        - name: status
          in: query
          description: Filter by account status
          required: false
          schema:
            type: string
            enum: [active, inactive, suspended]
        - name: sort
          in: query
          description: Sort fields (prefix with - for descending)
          required: false
          schema:
            type: string
            example: "-createdAt,name"
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserListResponse'
              examples:
                success:
                  value:
                    data:
                      - id: "123"
                        name: "John Doe"
                        email: "john@example.com"
                        role: "admin"
                        createdAt: "2026-01-15T10:30:00Z"
                      - id: "124"
                        name: "Jane Smith"
                        email: "jane@example.com"
                        role: "user"
                        createdAt: "2026-01-16T14:20:00Z"
                    meta:
                      page: 1
                      perPage: 20
                      total: 42
                      totalPages: 3
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '429':
          $ref: '#/components/responses/TooManyRequestsError'
        '500':
          $ref: '#/components/responses/InternalServerError'

    post:
      summary: Create user
      description: Create a new user account
      operationId: createUser
      tags:
        - users
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
            examples:
              admin:
                value:
                  name: "Admin User"
                  email: "admin@example.com"
                  password: "SecureP@ss123"
                  role: "admin"
              regular:
                value:
                  name: "Regular User"
                  email: "user@example.com"
                  password: "SecureP@ss456"
                  role: "user"
      responses:
        '201':
          description: User created successfully
          headers:
            Location:
              description: URL of the created user
              schema:
                type: string
                example: /v1/users/125
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserResponse'
              examples:
                success:
                  value:
                    data:
                      id: "125"
                      name: "Admin User"
                      email: "admin@example.com"
                      role: "admin"
                      createdAt: "2026-01-28T12:00:00Z"
                    meta:
                      timestamp: "2026-01-28T12:00:00Z"
        '400':
          $ref: '#/components/responses/BadRequestError'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '422':
          $ref: '#/components/responses/ValidationError'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /users/{userId}:
    get:
      summary: Get user by ID
      description: Retrieve a single user by their unique identifier
      operationId: getUser
      tags:
        - users
      security:
        - bearerAuth: []
      parameters:
        - name: userId
          in: path
          description: User unique identifier
          required: true
          schema:
            type: string
            pattern: '^[0-9]+$'
            example: "123"
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserResponse'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '404':
          $ref: '#/components/responses/NotFoundError'
        '500':
          $ref: '#/components/responses/InternalServerError'

    patch:
      summary: Update user
      description: Partially update a user's information
      operationId: updateUser
      tags:
        - users
      security:
        - bearerAuth: []
      parameters:
        - name: userId
          in: path
          description: User unique identifier
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateUserRequest'
            examples:
              nameUpdate:
                value:
                  name: "John Updated"
              roleUpdate:
                value:
                  role: "admin"
      responses:
        '200':
          description: User updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserResponse'
        '400':
          $ref: '#/components/responses/BadRequestError'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '404':
          $ref: '#/components/responses/NotFoundError'
        '422':
          $ref: '#/components/responses/ValidationError'
        '500':
          $ref: '#/components/responses/InternalServerError'

    delete:
      summary: Delete user
      description: Permanently delete a user account
      operationId: deleteUser
      tags:
        - users
      security:
        - bearerAuth: []
      parameters:
        - name: userId
          in: path
          description: User unique identifier
          required: true
          schema:
            type: string
      responses:
        '204':
          description: User deleted successfully (no content)
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '404':
          $ref: '#/components/responses/NotFoundError'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /users/{userId}/posts:
    get:
      summary: List user's posts
      description: Retrieve all posts created by a specific user
      operationId: listUserPosts
      tags:
        - posts
      security:
        - bearerAuth: []
      parameters:
        - name: userId
          in: path
          description: User unique identifier
          required: true
          schema:
            type: string
        - name: cursor
          in: query
          description: Cursor for pagination
          required: false
          schema:
            type: string
        - name: limit
          in: query
          description: Maximum items to return
          required: false
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PostListResponse'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '404':
          $ref: '#/components/responses/NotFoundError'
        '500':
          $ref: '#/components/responses/InternalServerError'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: JWT token obtained from /auth/login endpoint

    oauth2:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://auth.example.com/oauth/authorize
          tokenUrl: https://auth.example.com/oauth/token
          scopes:
            read:users: Read user information
            write:users: Modify user information
            delete:users: Delete users
            read:posts: Read posts
            write:posts: Create and modify posts

  schemas:
    User:
      type: object
      required:
        - id
        - name
        - email
        - role
        - createdAt
      properties:
        id:
          type: string
          description: Unique user identifier
          example: "123"
        name:
          type: string
          minLength: 1
          maxLength: 100
          description: User's full name
          example: "John Doe"
        email:
          type: string
          format: email
          description: User's email address
          example: "john@example.com"
        role:
          type: string
          enum: [admin, user, guest]
          description: User's role in the system
          example: "user"
        status:
          type: string
          enum: [active, inactive, suspended]
          default: active
          description: Account status
        createdAt:
          type: string
          format: date-time
          description: ISO 8601 timestamp of account creation
          example: "2026-01-15T10:30:00Z"
        updatedAt:
          type: string
          format: date-time
          description: ISO 8601 timestamp of last update
          example: "2026-01-20T14:45:00Z"

    CreateUserRequest:
      type: object
      required:
        - name
        - email
        - password
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 100
          example: "John Doe"
        email:
          type: string
          format: email
          example: "john@example.com"
        password:
          type: string
          minLength: 8
          maxLength: 72
          pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'
          description: Must contain uppercase, lowercase, number, and special character
          example: "SecureP@ss123"
        role:
          type: string
          enum: [admin, user, guest]
          default: user
          example: "user"

    UpdateUserRequest:
      type: object
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 100
        email:
          type: string
          format: email
        role:
          type: string
          enum: [admin, user, guest]
        status:
          type: string
          enum: [active, inactive, suspended]

    Post:
      type: object
      required:
        - id
        - title
        - content
        - authorId
        - createdAt
      properties:
        id:
          type: string
          example: "456"
        title:
          type: string
          minLength: 1
          maxLength: 200
          example: "Getting Started with OpenAPI"
        content:
          type: string
          minLength: 1
          example: "This is a comprehensive guide..."
        authorId:
          type: string
          example: "123"
        createdAt:
          type: string
          format: date-time
          example: "2026-01-28T10:00:00Z"
        updatedAt:
          type: string
          format: date-time
          example: "2026-01-28T15:30:00Z"

    UserResponse:
      type: object
      required:
        - data
        - meta
      properties:
        data:
          $ref: '#/components/schemas/User'
        meta:
          type: object
          properties:
            timestamp:
              type: string
              format: date-time
              example: "2026-01-28T12:00:00Z"

    UserListResponse:
      type: object
      required:
        - data
        - meta
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/User'
        meta:
          type: object
          required:
            - page
            - perPage
            - total
            - totalPages
          properties:
            page:
              type: integer
              minimum: 1
              example: 1
            perPage:
              type: integer
              minimum: 1
              maximum: 100
              example: 20
            total:
              type: integer
              minimum: 0
              example: 42
            totalPages:
              type: integer
              minimum: 0
              example: 3

    PostListResponse:
      type: object
      required:
        - data
        - meta
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/Post'
        meta:
          type: object
          required:
            - hasMore
          properties:
            nextCursor:
              type: string
              description: Cursor for fetching next page
              example: "eyJpZCI6IjQ1NiIsImNyZWF0ZWRBdCI6IjIwMjYtMDEtMjhUMTA6MDA6MDBaIn0="
            hasMore:
              type: boolean
              description: Whether more results are available
              example: true
            limit:
              type: integer
              example: 20

    Error:
      type: object
      required:
        - error
      properties:
        error:
          type: object
          required:
            - code
            - message
          properties:
            code:
              type: string
              description: Machine-readable error code
              example: "VALIDATION_ERROR"
            message:
              type: string
              description: Human-readable error message
              example: "Invalid input provided"
            details:
              type: array
              description: Detailed validation errors
              items:
                type: object
                properties:
                  field:
                    type: string
                    example: "email"
                  message:
                    type: string
                    example: "Invalid email format"
            requestId:
              type: string
              description: Unique request identifier for debugging
              example: "req_abc123xyz"

  responses:
    BadRequestError:
      description: Bad request - invalid syntax
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error:
              code: "BAD_REQUEST"
              message: "Invalid request syntax"
              requestId: "req_abc123"

    UnauthorizedError:
      description: Authentication required
      headers:
        WWW-Authenticate:
          schema:
            type: string
            example: Bearer realm="API"
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error:
              code: "UNAUTHORIZED"
              message: "Authentication required"
              requestId: "req_def456"

    NotFoundError:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error:
              code: "NOT_FOUND"
              message: "User not found"
              requestId: "req_ghi789"

    ValidationError:
      description: Validation error - semantic issues
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error:
              code: "VALIDATION_ERROR"
              message: "Invalid input provided"
              details:
                - field: "email"
                  message: "Email already exists"
                - field: "password"
                  message: "Password must contain special character"
              requestId: "req_jkl012"

    TooManyRequestsError:
      description: Rate limit exceeded
      headers:
        X-RateLimit-Limit:
          schema:
            type: integer
            example: 100
        X-RateLimit-Remaining:
          schema:
            type: integer
            example: 0
        X-RateLimit-Reset:
          schema:
            type: integer
            example: 1706443200
        Retry-After:
          schema:
            type: integer
            example: 60
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error:
              code: "RATE_LIMIT_EXCEEDED"
              message: "Too many requests. Please retry after 60 seconds."
              requestId: "req_mno345"

    InternalServerError:
      description: Internal server error
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error:
              code: "INTERNAL_ERROR"
              message: "An unexpected error occurred"
              requestId: "req_pqr678"
```

---

## Validation Best Practices

### Schema Validation
```yaml
# Always specify constraints
email:
  type: string
  format: email        # Built-in format validation
  minLength: 3
  maxLength: 255

password:
  type: string
  minLength: 8
  maxLength: 72        # bcrypt limit
  pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'

age:
  type: integer
  minimum: 0
  maximum: 150

status:
  type: string
  enum: [active, inactive, suspended]  # Restrict to specific values
```

### Common Patterns

**Pagination Metadata:**
```yaml
PaginationMeta:
  type: object
  required: [page, perPage, total, totalPages]
  properties:
    page:
      type: integer
      minimum: 1
    perPage:
      type: integer
      minimum: 1
      maximum: 100
    total:
      type: integer
      minimum: 0
    totalPages:
      type: integer
      minimum: 0
```

**Cursor Pagination Metadata:**
```yaml
CursorPaginationMeta:
  type: object
  required: [hasMore]
  properties:
    nextCursor:
      type: string
      nullable: true
    hasMore:
      type: boolean
    limit:
      type: integer
```

**Error Schema:**
```yaml
Error:
  type: object
  required: [error]
  properties:
    error:
      type: object
      required: [code, message]
      properties:
        code:
          type: string
        message:
          type: string
        details:
          type: array
          items:
            type: object
        requestId:
          type: string
```

---

## References

- [OpenAPI 3.1.0 Specification](https://spec.openapis.org/oas/v3.1.0.html)
- [Swagger Editor](https://editor.swagger.io/) - Validate your specs
- [OpenAPI Generator](https://openapi-generator.tech/) - Generate client/server code
- [Redoc](https://redocly.com/) - Generate beautiful API documentation
