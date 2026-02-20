# Template-to-Agent Mapping

This document shows which agents use which templates for standardized code generation.

**Last Updated**: 2026-01-28

---

## React Templates

### `variants/react/component.tsx.template`
**Purpose**: Standard React component with TypeScript, forwardRef, and variants

**Used By**:
- **Main Agent** - General component creation
- All agents when creating React UI components

**Common Use Cases**:
- UI components (Button, Card, Dialog, etc.)
- Layout components (Header, Sidebar, Container)
- Feature components (UserProfile, Dashboard)

---

### `variants/react/form.tsx.template`
**Purpose**: Form component with React Hook Form + Zod validation

**Used By**:
- **Main Agent** - Form creation
- All agents when creating forms with validation

**Common Use Cases**:
- Login/signup forms
- Settings/configuration forms
- Data entry forms
- Search forms

---

### `variants/react/hook.ts.template`
**Purpose**: Custom React hook with cleanup, error handling, and TypeScript

**Used By**:
- **Main Agent** - Custom hook creation
- **code-simplifier** - Extracting component logic into hooks
- **refactor-cleaner** - Modernizing class components to hooks
- **performance-optimizer** - Creating performance hooks (useMemo, useCallback patterns)

**Common Use Cases**:
- Data fetching hooks (`useUser`, `useProducts`)
- UI state hooks (`useToggle`, `useModal`, `useDebounce`)
- Browser API hooks (`useLocalStorage`, `useMediaQuery`, `useWindowSize`)
- Form hooks (`useFormValidation`, `useFieldArray`)
- Performance hooks (`useIntersectionObserver`, `useVirtualScroll`)

---

### `variants/react/context.tsx.template`
**Purpose**: React Context provider with type-safe state and actions

**Used By**:
- **Main Agent** - Global state management
- **auth-specialist** - Auth context (`AuthProvider`, `useAuth`)
- **i18n-specialist** - Translation context (`I18nProvider`, `useTranslation`)
- **code-simplifier** - Consolidating prop drilling into context
- **refactor-cleaner** - Modernizing state management patterns

**Common Use Cases**:
- Authentication context (`AuthContext`, `useAuth`)
- Theme context (`ThemeContext`, `useTheme`)
- User context (`UserContext`, `useUser`)
- Settings context (`SettingsContext`, `useSettings`)
- i18n context (`I18nContext`, `useTranslation`)
- Cart/shopping context (`CartContext`, `useCart`)

---

### `variants/react/hoc.tsx.template`
**Purpose**: Higher-Order Component with ref forwarding and options

**Used By**:
- **Main Agent** - Cross-cutting concerns
- **auth-specialist** - Auth HOCs (`withAuth`, `withRole`, `withPermission`)
- **refactor-cleaner** - Refactoring shared logic into HOCs
- **code-reviewer** - Reviewing HOC patterns

**Common Use Cases**:
- Auth guards (`withAuth`, `withRole`, `withPermission`)
- Loading states (`withLoading`, `withSuspense`)
- Error boundaries (`withErrorBoundary`)
- Analytics (`withTracking`, `withAnalytics`)
- Feature flags (`withFeatureFlag`)
- Accessibility (`withA11y`, `withKeyboard`)

---

## Backend Templates

### `guard.ts.template`
**Purpose**: Route protection and authorization guards

**Used By**:
- **auth-specialist** - Creating auth guards and middleware
- **security-reviewer** - Reviewing security patterns

**Common Use Cases**:
- Auth guards (`requireAuth`, `requireRole`)
- Permission guards (`requirePermission`, `requireScope`)
- Rate limiting guards

---

### `middleware.ts.template`
**Purpose**: Express/Next.js middleware functions

**Used By**:
- **auth-specialist** - Auth middleware
- **api-designer** - API middleware (CORS, rate limiting)
- **security-reviewer** - Security middleware

**Common Use Cases**:
- Authentication middleware
- Authorization middleware
- Request validation
- Rate limiting
- CORS handling
- Request logging

---

### `service.ts.template`
**Purpose**: Business logic service classes

**Used By**:
- **Main Agent** - Service layer creation
- **auth-specialist** - Auth services (JWT, OAuth)
- **api-designer** - Business logic services
- **code-simplifier** - Extracting business logic

**Common Use Cases**:
- Auth services (`AuthService`, `JWTService`, `OAuthService`)
- Data services (`UserService`, `ProductService`)
- External API services (`PaymentService`, `EmailService`)
- Utility services (`CacheService`, `LoggerService`)

---

### `error-handler.ts.template`
**Purpose**: Custom error classes and centralized error handling

**Used By**:
- **Main Agent** - Error handling setup
- **api-designer** - API error responses
- **security-reviewer** - Security error handling

**Common Use Cases**:
- Custom error classes (`ValidationError`, `AuthError`, `NotFoundError`)
- Error middleware
- Error logging
- Error response formatting

---

## Testing Templates

### `test.spec.ts.template`
**Purpose**: Unit/integration test with AAA pattern

**Used By**:
- **unit-test-writer** - Unit test generation
- **integration-test-writer** - Integration tests
- **tdd-guide** - TDD workflow
- **test-coverage** - Coverage improvement

**Common Use Cases**:
- Unit tests for functions/classes
- Integration tests for services
- API endpoint tests
- Component tests

---

## Database Templates

### `migration.sql.template`
**Purpose**: Database migration script with rollback

**Used By**:
- **database-architect** - Schema design
- **migration-specialist** - Migration generation

**Common Use Cases**:
- Creating tables
- Adding/removing columns
- Creating indexes
- Data migrations

---

## Infrastructure Templates

### `api-route.ts.template`
**Purpose**: Next.js API route handler

**Used By**:
- **Main Agent** - API endpoint creation
- **api-designer** - REST API design

**Common Use Cases**:
- CRUD endpoints
- Webhook handlers
- File upload handlers
- Proxy endpoints

---

### `github-workflow.yml`
**Purpose**: GitHub Actions CI/CD pipeline

**Used By**:
- **ci-cd-specialist** - CI/CD setup

**Common Use Cases**:
- Test automation
- Build automation
- Deployment automation
- Linting/formatting

---

### `Dockerfile.template`
**Purpose**: Multi-stage Docker build

**Used By**:
- **docker-specialist** - Containerization

**Common Use Cases**:
- Production containers
- Development containers
- Multi-stage builds

---

## Documentation Templates

### `pr-description.md.template`
**Purpose**: Pull request description template

**Used By**:
- **Main Agent** - PR creation
- **doc-updater** - Documentation

**Common Use Cases**:
- Feature PRs
- Bug fix PRs
- Refactoring PRs

---

### `api-documentation.md`
**Purpose**: API reference documentation

**Used By**:
- **api-designer** - API documentation
- **doc-updater** - Documentation updates

**Common Use Cases**:
- REST API documentation
- GraphQL API documentation
- Internal API documentation

---

## Quick Reference by Agent

| Agent | Templates Used |
|-------|----------------|
| **Main Agent** | All templates (context-dependent) |
| **auth-specialist** | guard.ts, middleware.ts, service.ts, context.tsx, hook.ts, hoc.tsx |
| **api-designer** | api-route.ts, service.ts, middleware.ts, error-handler.ts |
| **code-simplifier** | hook.ts, context.tsx |
| **refactor-cleaner** | hook.ts, context.tsx, hoc.tsx |
| **performance-optimizer** | hook.ts |
| **i18n-specialist** | context.tsx |
| **database-architect** | migration.sql |
| **migration-specialist** | migration.sql |
| **unit-test-writer** | test.spec.ts |
| **integration-test-writer** | test.spec.ts |
| **tdd-guide** | test.spec.ts |
| **ci-cd-specialist** | github-workflow.yml |
| **docker-specialist** | Dockerfile.template |
| **doc-updater** | pr-description.md, api-documentation.md |
| **security-reviewer** | guard.ts, middleware.ts, error-handler.ts |

---

## Template Selection Guide

### "I need to create..."

| Task | Template to Use |
|------|-----------------|
| A new UI component | `component.tsx.template` |
| A form with validation | `form.tsx.template` |
| A custom hook for data fetching | `hook.ts.template` |
| Global auth state | `context.tsx.template` (AuthProvider) |
| Auth protection for components | `hoc.tsx.template` (withAuth) |
| A new API endpoint | `api-route.ts.template` |
| A business logic service | `service.ts.template` |
| Auth middleware | `middleware.ts.template` |
| Custom error classes | `error-handler.ts.template` |
| A database migration | `migration.sql.template` |
| Unit tests | `test.spec.ts.template` |
| CI/CD pipeline | `github-workflow.yml` |

---

## Notes

- **Main Agent** implicitly uses templates based on CLAUDE.md guidelines
- Specialized agents reference specific templates in their Resources section
- Templates are located in `.claude/templates/variants/` but must be copied to `.claude/templates/` to be used
- See `.claude/templates/variants/README.md` for setup instructions
