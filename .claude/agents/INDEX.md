# Agent Index

Lightweight directory of all 34 specialized agents. Main agent handles standard development; use these agents for specialized expertise.

**Refactored Structure** (2026-01-26):
- Main agent now codes directly for standard tasks (CRUD, simple features, bug fixes)
- 34 specialized agents for domain expertise
- All agents use valid YAML frontmatter (`tools`, `description`, `customInstructions`)
- Each agent has curated skill knowledge via `skills` parameter
- Simplified to <70 lines per agent on average

## Planning & Architecture

| Agent | Purpose | Load When |
|-------|---------|-----------|
| **planner** | Implementation plans, task breakdown | Planning new features |
| **architect** | System design, technical decisions | Architectural reviews |

## Code Quality

| Agent | Purpose | Load When |
|-------|---------|-----------|
| **code-reviewer** | PR reviews, code quality checks | Before merge |
| **security-reviewer** | Security audits, vulnerability detection | Security-critical changes |
| **code-simplifier** | Remove over-engineering | Simplifying complex code |
| **refactor-cleaner** | Modernize legacy code, remove dead code | Refactoring work |
| **tech-debt-analyzer** | Identify and prioritize technical debt | Debt assessment |
| **type-safety-enforcer** | Eliminate `any`, enforce TypeScript strict | Type safety issues |

## Testing

| Agent | Purpose | Load When |
|-------|---------|-----------|
| **tdd-guide** | Red-Green-Refactor workflow | TDD implementation |
| **unit-test-writer** | Generate unit tests with AAA pattern | Adding unit tests |
| **integration-test-writer** | API/database integration tests | Integration testing |
| **e2e-runner** | Playwright/Cypress E2E tests | User workflow testing |
| **load-test-specialist** | k6/Artillery load tests | Performance testing |
| **verify-app** | End-to-end verification | Pre-deployment checks |

## Development (Specialized)

| Agent | Purpose | Load When |
|-------|---------|-----------|
| **api-designer** | REST/GraphQL API design + OpenAPI specs | Complex API architecture |
| **database-architect** | Schema design, migrations, optimization | Complex DB work |
| **auth-specialist** | OAuth, JWT, MFA, session management | Auth implementation |
| **graphql-specialist** | GraphQL schemas, resolvers, subscriptions | GraphQL work |
| **websocket-specialist** | Socket.io, real-time bidirectional features | Real-time features |

**Note**: Main agent handles simple CRUD, basic routes, and standard implementations.

## Operations

| Agent | Purpose | Load When |
|-------|---------|-----------|
| **build-error-resolver** | Iterative build error fixing | Build failures |
| **ci-cd-specialist** | Pipeline setup, GitHub Actions | CI/CD work |
| **docker-specialist** | Containerization | Docker work |
| **migration-specialist** | Safe database migrations | DB migrations |
| **dependency-manager** | Dependency audits, updates | Dependency work |
| **monitoring-architect** | Logging, metrics, alerting, APM | Observability setup |

## Accessibility & i18n

| Agent | Purpose | Load When |
|-------|---------|-----------|
| **accessibility-auditor** | WCAG 2.1 AA compliance | Accessibility audits |
| **i18n-specialist** | Internationalization | Multi-language support |

## Documentation

| Agent | Purpose | Load When |
|-------|---------|-----------|
| **doc-updater** | Sync docs with code | After implementation |
| **runbook-writer** | Operational procedures | Creating runbooks |

## Performance

| Agent | Purpose | Load When |
|-------|---------|-----------|
| **performance-optimizer** | Profile and optimize | Performance issues |

## Specialized Domains

| Agent | Purpose | Load When |
|-------|---------|-----------|
| **mobile-specialist** | React Native, Flutter | Mobile development |
| **ai-integration-specialist** | LLM APIs, RAG systems | AI/ML features |
| **iac-specialist** | Terraform, CloudFormation | Infrastructure as Code |

## System Health

| Agent | Purpose | Load When |
|-------|---------|-----------|
| **system-health** | .claude/ config analysis, contradiction detection, coverage gaps | /health-check command |

## Model Tier Guidelines

When delegating to Task tool, use appropriate model tier:

| Tier | Use For | Agents |
|------|---------|--------|
| **haiku** | Documentation, exploration, deps | doc-updater, dependency-manager (2 agents) |
| **sonnet** | Most specialized work (DEFAULT) | code-reviewer, auth-specialist, api-designer, system-health, etc. (30 agents) |
| **opus** | Critical architecture, security | architect, security-reviewer (2 agents) |

**Default**: Omit model parameter (uses sonnet). Only specify for haiku or opus agents.

## Usage Philosophy

**Main agent codes first, delegates when specialized expertise needed.**

**When Main Agent Handles**:
```
User request: "Add a user profile page"
→ Main agent: Standard CRUD, no special expertise needed
→ Main agent: Implements directly
```

**When to Delegate**:
```
User request: "Add OAuth2 authentication with Google"
→ Identify need: Complex auth with external provider
→ Select agent: auth-specialist
→ Load: .claude/agents/auth-specialist.md
→ Delegate with Task tool
```

## Benefits

- **Efficient**: No delegation overhead for standard tasks
- **Specialized**: Expert agents for complex domains
- **Flexible**: Main agent can handle 70% of work
- **Cost-effective**: Fewer agent invocations
- **Optimized structure**: <70 lines per agent, valid YAML frontmatter
- **On-demand loading**: Load only specialized agents when needed
