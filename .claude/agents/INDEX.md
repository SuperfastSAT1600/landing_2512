# Agent Index

Consolidated directory of 11 specialized agents. Main agent handles standard development; use these for specialized expertise.

## Agent Directory

| Agent | Model | Purpose | Use When |
|-------|-------|---------|----------|
| **architect** | opus | System design, implementation planning, task breakdown, trade-off analysis | Architecture decisions, planning new features, technical reviews |
| **code-reviewer** | sonnet | Code quality, security (OWASP), TypeScript safety, tech debt, refactoring | PR reviews, security audits, type safety fixes |
| **test-writer** | sonnet | TDD coaching, unit/integration/E2E/load tests, app verification | Writing any tests, TDD workflow, pre-deployment checks |
| **backend-specialist** | sonnet | REST API design + OpenAPI specs, database schema, migrations | Complex API design, DB schema, migration scripts |
| **auth-specialist** | sonnet | OAuth, JWT, MFA, session management | Authentication/authorization implementation |
| **devops-specialist** | sonnet | CI/CD, Docker, IaC, monitoring, runbooks, build errors, dependencies | Pipeline setup, containerization, infra, build failures |
| **frontend-specialist** | sonnet | WCAG 2.1 AA accessibility, i18n/l10n, performance optimization | Accessibility audits, multi-language, Core Web Vitals |
| **realtime-specialist** | sonnet | WebSockets, GraphQL (subscriptions + DataLoader) | Real-time features, GraphQL APIs |
| **ai-specialist** | sonnet | LLM integration, RAG, prompt engineering, embeddings | AI/ML features, LLM APIs, vector search |
| **mobile-specialist** | sonnet | React Native, Flutter, cross-platform mobile | Mobile app development |
| **doc-updater** | haiku | Sync documentation with code changes | After every significant code change |

## Model Tier Guidelines

| Tier | Use For | Agents |
|------|---------|--------|
| **haiku** | Documentation, quick tasks | `doc-updater` |
| **sonnet** | Most specialized work (DEFAULT) | `code-reviewer`, `test-writer`, `backend-specialist`, `auth-specialist`, `devops-specialist`, `frontend-specialist`, `realtime-specialist`, `ai-specialist`, `mobile-specialist` |
| **opus** | Critical architecture decisions | `architect` |

**Default**: Omit model parameter (uses sonnet). Only specify for `haiku` (`doc-updater`) or `opus` (`architect`).

## Usage Philosophy

**Main agent codes first, delegates when specialized expertise needed.**

**When Main Agent Handles**:
- Standard CRUD operations
- Simple bug fixes
- Basic React components
- Routine refactoring

**When to Delegate**:
```
User: "Add OAuth2 authentication with Google"
→ Specialized auth patterns needed
→ Delegate: auth-specialist

User: "Review for security vulnerabilities"
→ Specialized audit knowledge needed
→ Delegate: code-reviewer

User: "Set up GitHub Actions CI/CD"
→ Specialized DevOps knowledge needed
→ Delegate: devops-specialist
```

## Parallel Delegation Patterns

### Quality Gate (read same codebase)
```
code-reviewer + frontend-specialist (accessibility)
```

### Feature with Backend + Auth
```
backend-specialist (API/DB) + auth-specialist (permissions) → integrate
```

### Full Test Suite
```
test-writer (unit + integration + E2E in one delegation)
```

### Infrastructure Setup
```
devops-specialist (CI/CD + Docker + monitoring)
```

### Documentation (after code)
```
doc-updater (always use haiku model)
```
