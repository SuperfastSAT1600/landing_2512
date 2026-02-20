# Orchestration Rules

**Core principles**: Main agent is CODER + ORCHESTRATOR. Delegate to specialists. DEFAULT TO PARALLEL. Don't force-create work.

---

## Delegation Decision Tree

```
Does this task need a specialist?
├─ YES → Is there natural parallel work for main agent?
│  ├─ YES → Delegate + work in parallel (IDEAL)
│  └─ NO → Delegate + wait (CORRECT - don't force)
└─ NO → Main agent handles directly
```

**When NOT to force work**: Pure reviews, specialized setup, research/exploration, planning phase

---

## Parallel-First Orchestration

**Think**: "What can run in parallel?" + "What can I work on while they run?"

| Scenario | Action |
|----------|--------|
| Independent tasks | **PARALLEL** - one message, multiple Task calls |
| Multiple exploration/reviews | **PARALLEL** - all read-only |
| Task B needs output from Task A | **SEQUENTIAL** - wait |
| Task B modifies what Task A reads | **SEQUENTIAL** - conflict |

**How**: Send ONE message with multiple Task tool calls, NOT sequential calls.

---

## When to Delegate (MANDATORY)

**CRITICAL**: If specialist exists for domain, you MUST delegate. Do NOT do specialist work yourself.

### Mandatory Delegation Checklist

1. **Planning** (implementation plans, task breakdown) → `planner`
2. **Architecture** (system design, technical decisions) → `architect`
3. **Database** (schema, migration, seeder, query optimization) → `database-architect`, `migration-specialist`
4. **API design** (REST/GraphQL endpoints, OpenAPI) → `api-designer`, `graphql-specialist`
5. **Auth** (OAuth, JWT, MFA, sessions) → `auth-specialist`
6. **Real-time** (WebSockets, Socket.io) → `websocket-specialist`
7. **Security** (vulnerabilities, OWASP audits) → `security-reviewer`
8. **Code quality** (PR reviews, simplification, debt) → `code-reviewer`, `code-simplifier`, `tech-debt-analyzer`
9. **Refactoring** (modernize legacy, remove dead code) → `refactor-cleaner`
10. **Type safety** (eliminate `any`, strict mode) → `type-safety-enforcer`
11. **Testing** (unit, integration, e2e, load, TDD) → `unit-test-writer`, `integration-test-writer`, `e2e-runner`, `load-test-specialist`, `tdd-guide`, `verify-app`
12. **Infrastructure** (Docker, CI/CD, IaC, deployment) → `docker-specialist`, `ci-cd-specialist`, `iac-specialist`
13. **Operations** (build errors, monitoring, dependencies) → `build-error-resolver`, `monitoring-architect`, `dependency-manager`
14. **Documentation** (sync docs, runbooks) → `doc-updater`, `runbook-writer`
15. **Accessibility** (WCAG compliance) → `accessibility-auditor`
16. **i18n** (internationalization) → `i18n-specialist`
17. **Performance** (profiling, optimization) → `performance-optimizer`
18. **Mobile** (React Native, Flutter) → `mobile-specialist`
19. **AI/ML** (LLM APIs, RAG systems) → `ai-integration-specialist`
20. **System health** (.claude/ config analysis) → `system-health`

### Delegation Error

If doing specialist work: STOP → Log error → Delegate → Use output

### Simple Task Exception

ONLY do yourself if ALL true:
- <10 lines of code
- No specialized domain knowledge
- Follows existing patterns exactly
- No architecture decisions

---

## Skills-First Approach (MANDATORY)

**Before coding or delegating**: Check if relevant skills exist.

**Protocol**:
1. Identify task domain
2. Check if skill exists
3. Load skill (Skill tool or reference `.claude/skills/`)
4. Apply skill patterns
5. If pattern doesn't fit → log observation

**Common mappings**: auth-patterns, rest-api-design, react-patterns, database-patterns, docker-patterns, github-actions, websocket-patterns, tdd-workflow, documentation-patterns

**Error to log**: `[context] Error: Didn't check skills before coding | Should have loaded: [skill-name]`

---

## Common Parallel Patterns

- **Quality gates**: security-reviewer + code-reviewer + accessibility-auditor + performance-optimizer
- **Multi-domain research**: Explore(auth) + Explore(database) + Explore(api) + Explore(frontend)
- **Test pyramid**: unit-test-writer + integration-test-writer + e2e-runner
- **Feature design**: api-designer + database-architect + auth-specialist
- **Infrastructure**: docker-specialist + ci-cd-specialist + monitoring-architect
- **Documentation**: doc-updater(API) + doc-updater(README) + doc-updater(CHANGELOG)

---

## Must Be Sequential

- **Planning → Implementation**: planner → [wait] → main agent implements
- **Implementation → Testing**: [write code] → [wait] → unit-test-writer
- **Schema → Migrations**: database-architect → [wait] → migration-specialist

---

## Agent Quick Reference

**Planning**: planner (plans, task breakdown), architect (system design, decisions)
**Quality**: code-reviewer, security-reviewer, code-simplifier, refactor-cleaner
**Testing**: tdd-guide, unit-test-writer, integration-test-writer, e2e-runner, verify-app
**Specialized Dev**: api-designer, database-architect, auth-specialist, graphql-specialist, websocket-specialist
**Operations**: build-error-resolver, ci-cd-specialist, docker-specialist, doc-updater (MANDATORY after 3+ file changes)

**Model tiers**: haiku (doc-updater, dependency-manager), sonnet (default), opus (security-reviewer, architect)

---

## Deployment Protocol (MANDATORY)

**Principle**: Deploy changes automatically. Don't instruct users to deploy.

**Auto-deploy**: Database migrations, edge functions, schema changes
**Workflow**: Make changes → Test locally → Deploy automatically → Verify → Report
**Exceptions**: Production requiring approval, destructive operations, business impact, first-time setup

---

## Git Workflow

**Branch naming**: `feature/`, `fix/`, `hotfix/`, `chore/`
**Commit format**: `<type>(<scope>): <subject>` (max 72 chars, imperative)
**PR guidelines**: <400 lines, pass CI, 1 approval, delete branch after merge
**Git safety**: NEVER force push to main/master, NEVER skip hooks, use `--force-with-lease` on feature branches only

---

## Subagent Self-Correction

Subagents fix `.claude/` issues they encounter:
- Broken references in own agent definition → fix directly
- Outdated advice in loaded skill → update skill
- Report all corrections in response for main agent to log
