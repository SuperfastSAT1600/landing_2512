# Comprehensive Claude Code Workflow Guide

Your complete guide to maximizing productivity with Claude Code.

**What is this?** This document is your single source of truth for using Claude Code effectively. It combines the best practices from Boris Cherny and Everything-Claude-Code, enhanced with production-proven patterns, security-first workflows, and team collaboration strategies.

**Who is this for?** Developers adopting Claude Code, whether solo or in teams, from quickstart to power user.

**Quick Navigation:**
- 📋 **[.claude/agents/INDEX.md](.claude/agents/INDEX.md)** - Agent directory and usage guide
- 📚 **[.claude/skills/INDEX.md](.claude/skills/INDEX.md)** - Skills directory and selection guide
- ⚡ **[README.md](README.md)** - Project overview

---

## Table of Contents

1. [Philosophy & Core Concepts](#1-philosophy--core-concepts)
2. [Quick Decision Trees](#2-quick-decision-trees)
3. [Complete Workflow Patterns](#3-complete-workflow-patterns)
4. [Agent Orchestration](#4-agent-orchestration)
5. [MCP Server Integration](#5-mcp-server-integration)
6. [Performance & Optimization](#6-performance--optimization)
7. [Customization Roadmap](#7-customization-roadmap)
8. [Team Collaboration](#8-team-collaboration)
9. [Troubleshooting](#9-troubleshooting)
10. [Advanced Topics](#10-advanced-topics)

---

## 1. Philosophy & Core Concepts

### 1.1 The Enhanced Philosophy

This template integrates three powerful approaches:

**From Boris Cherny:**
- **Compounding Engineering**: CLAUDE.md grows with every mistake, creating a team knowledge base
- **Verification Loops**: 2-3x quality improvement through continuous verification
- **Plan Mode First**: Always plan complex work before implementing
- **Parallel Sessions**: Run multiple Claude sessions simultaneously
- **Model Selection**: Match model to task complexity (Haiku/Sonnet/Opus)

**From Everything-Claude-Code:**
- **Rules as Guardrails**: Always-active quality enforcement prevents mistakes automatically
- **Skills as Knowledge**: Reusable patterns reduce repetition and ensure consistency
- **Context Management**: Battle-tested awareness of the 200k → 70k degradation problem
- **Agent Delegation**: Specialized tasks to focused agents with isolated context
- **Community Extensibility**: Plugin ecosystem for domain-specific knowledge

**Our Unique Integration:**
- **Security-First**: Dedicated security rule + agent + command make security automatic
- **Multi-Environment**: Dev/prod configs ensure production safety
- **Progressive Adoption**: From quickstart to full power user in weeks
- **Team-Ready**: Designed for collaborative development with shared CLAUDE.md
- **Production-Proven**: Real-world context thresholds and performance patterns

### 1.2 Key Principles

**Principle 1: Main Agent Codes First**
Main agent handles standard development directly (CRUD, simple features, bug fixes). Delegate to specialists for complex domains (auth, database schema, security, performance).

**Principle 2: Plan Complex Work**
Use Plan Mode (`Shift+Tab` twice) for complex features touching 5+ files or requiring architectural decisions. Most simple features don't need planning.

**Principle 3: Verify Continuously**
Run `/test-and-build` and `/security-review` before every commit. Verification loops improve quality 2-3x.

**Principle 4: Delegate to Specialists**
Use specialized agents for domain expertise (auth-specialist, security-reviewer, performance-optimizer, etc.). They have isolated context and focused expertise.

**Principle 5: Compound Knowledge**
Update CLAUDE.md after every mistake. Your team's shared knowledge grows with the project.

**Principle 6: Manage Context**
Keep context under 80k tokens. Disable unused MCPs, delegate heavy tasks to agents, start fresh sessions when needed.

### 1.3 System Overview

**Hybrid Agent Model** - Main agent codes, specialists provide expertise
- Main agent handles 70% of work directly (CRUD, simple features, bug fixes)
- 10 specialized agents available for complex domains
- Efficient workflow: code first, delegate when specialized expertise needed

**Commands** - User-triggered workflows
- Slash commands like `/full-feature`, `/commit-push-pr`, `/lint-fix`, `/type-check`
- Execute complete workflows in one command
- **20 commands available** covering workflow orchestration, development, quality, and maintenance

**Agents** - Specialized autonomous workers (10 total)
- Main agent codes directly for standard tasks
- Delegate to specialists for domain expertise
- Agents have isolated context and specific tools
- See `.claude/agents/INDEX.md` for full directory

**Rules** - Always-active guardrails
- Core guidelines: `essential-rules.md` (security, coding style, TypeScript, testing, error handling, API design)
- Workflow rules: `orchestration.md` (hybrid model delegation principles)
- Automatically enforced on every interaction

**Skills** - Reusable knowledge patterns (20 total)
- Referenced by main agent and specialist agents
- Reduce repetition, ensure consistency
- Categories: Framework patterns (React, Next.js, Node.js), API design (REST, GraphQL, WebSocket), Development practices (TDD, auth, database, documentation), Project management (guidelines, user intent, prompt engineering)

**Workflows** - Orchestrated sequences
- Multi-step automated workflows
- **5 workflows**: full-feature, bug-fix, refactor, release, security-audit

**Checklists** - Review standards
- Comprehensive checklists for quality gates
- **13 checklists**: PR review, security audit, performance audit, accessibility audit, pre-release, onboarding, deployment, database migration, dependency audit, hotfix, AI code review, build errors, E2E testing

**Templates** - Code scaffolding
- Reusable code templates for common patterns
- **16 templates**: component, API route, test, migration, PR description, form, guard, hook, service, middleware, error-handler, Dockerfile, GitHub workflow, Playwright config, API docs, README

**Scripts** - Automation helpers
- Shell scripts for common automation tasks
- **5 scripts**: pre-commit checks, test gating, security logging, auto-format, sync-deps

**MCP Servers** - External tool integrations
- **27 pre-configured servers** (most disabled by default)
- Enable only what you need (filesystem, github, database, deployment, docker, playwright, etc.)
- Keep enabled count <10 for optimal performance

---

## 2. Quick Decision Trees

### 2.1 "I Need To..." Decision Tree

```
I need to...

├─ Add a new feature
│  ├─ Simple (<3 files) → Implement directly
│  ├─ Medium (3-10 files) → /plan first, then implement
│  └─ Complex (>10 files) → Plan Mode + planner agent
│
├─ Fix a bug
│  ├─ Known fix → Implement directly
│  ├─ Investigation needed → Implement, then verify-app agent
│  └─ Complex root cause → Plan Mode + investigation
│
├─ Refactor code
│  ├─ Small refactor (<5 files) → Implement directly
│  ├─ Module refactor → /refactor-clean command
│  └─ Architecture change → Plan Mode + architect agent
│
├─ Handle errors
│  ├─ Build errors → /build-fix command
│  ├─ Test failures → /test-and-build (auto-fix)
│  └─ Security issues → /security-review command
│
├─ Write tests
│  ├─ Unit tests → /tdd for TDD approach
│  ├─ E2E tests → /e2e command
│  └─ Check coverage → /test-coverage command
│
└─ Deploy/Release
   ├─ Regular release → /commit-push-pr
   ├─ Critical release → Full verification workflow
   └─ Hotfix → Fast-track with mandatory verification
```

### 2.2 Command Selection Matrix

| Situation | Command | Why Use It |
|-----------|---------|------------|
| Adding feature | `/plan` then implement | Plan first for quality |
| Writing tests | `/tdd` | Test-driven development approach |
| Fixing build | `/build-fix` | Automated systematic error resolution |
| Refactoring | `/refactor-clean` | Systematic cleanup and modernization |
| Before commit | `/security-review` + `/review-changes` | Quality gates |
| Creating PR | `/commit-push-pr` | Full workflow automation |
| Testing app | `/e2e` | User workflow verification |
| Check coverage | `/test-coverage` | Identify gaps and prioritize |
| Quality check | `/test-and-build` | Comprehensive validation |
| Update docs | `/update-docs` | Keep documentation in sync |

### 2.3 Agent Selection Matrix

| Task Type | Agent | When to Use |
|-----------|-------|-------------|
| Planning | `planner` | Complex feature with unclear scope |
| Architecture | `architect` | Design decisions and trade-offs |
| Simplification | `code-simplifier` | Over-engineered code |
| Modernization | `refactor-cleaner` | Legacy code updates |
| Testing | `tdd-guide` | Learning TDD or test-first approach |
| E2E Tests | `e2e-runner` | User workflow testing |
| Verification | `verify-app` | End-to-end validation |
| Build Errors | `build-error-resolver` | Systematic error fixing |
| Documentation | `doc-updater` | Keep docs synchronized with code |
| Security | `security-reviewer` | Vulnerability scanning and audits |

### 2.4 Model Selection Guide

| Task Complexity | Model | Cost | Speed | Best For |
|-----------------|-------|------|-------|----------|
| Simple | Haiku | $ | Fast | Formatting, simple fixes, quick checks |
| Standard | Sonnet | $$ | Medium | Most development, refactoring, testing (DEFAULT) |
| Complex | Opus | $$$ | Slow | Architecture, critical decisions, security |

**Default Configuration**: Sonnet (balanced for most work)

**When to Switch to Haiku**:
- Formatting code with Prettier/ESLint
- Simple one-line fixes
- Running tests repeatedly
- Quick refactoring (<10 lines)

**When to Switch to Opus**:
- Designing system architecture
- Security-critical code
- Production incidents
- Complex algorithms
- Large-scale refactoring

---

## 3. Complete Workflow Patterns

### 3.1 New Feature Development (Full Cycle)

**Step 1: Planning Phase** (optional - for complex features only)

```
For simple features (CRUD, components, basic routes):
→ Skip planning, main agent implements directly

For complex features (5+ files, architectural decisions):
[Shift+Tab twice] or /plan

→ planner agent creates implementation plan
→ Review plan carefully
→ Ask questions to clarify
→ Request changes if needed
→ Approve when plan is complete
```

**Step 2: Implementation Phase**

Option A - Main Agent Direct Implementation (most common):
```
Main agent implements feature
→ Reads relevant files for context
→ Writes code following project patterns
→ Creates tests alongside implementation
→ Uses templates from .claude/templates/
→ Handles errors and edge cases
```

Option B - TDD Approach (recommended for complex logic):
```
/tdd "feature name"
→ tdd-guide agent walks through Red-Green-Refactor
→ Write failing test first
→ Main agent implements minimum code to pass
→ Refactor with test safety net
```

Option C - Specialist Implementation (for complex domains):
```
Delegate to appropriate specialist:
→ auth-specialist for OAuth, JWT, MFA
→ database-architect for schema design
→ api-designer for complex REST/GraphQL APIs
→ graphql-specialist for GraphQL schemas
→ websocket-specialist for real-time features
```

**Step 3: Verification Phase**

```
/e2e "user workflow to test"
→ e2e-runner generates Playwright/Cypress tests
→ Tests critical user flows

verify-app agent
→ End-to-end application testing
→ Integration validation
```

**Step 4: Quality Gates** (BEFORE commit)

```
/security-review
→ security-reviewer scans for vulnerabilities
→ OWASP Top 10 checks, secret detection

/review-changes
→ Comprehensive code review
→ Quality checks, best practices

/test-and-build
→ Run all tests + build
→ Auto-fix issues until passing
```

**Step 5: Release Phase**

```
/commit-push-pr
→ Commits with Conventional Commits format
→ Pushes to remote branch
→ Creates pull request with:
   - Summary of changes
   - Test plan checklist
   - Generated with Claude Code footer
```

### 3.2 Real-World Example: Adding User Authentication

**Complete walkthrough of implementing authentication with JWT tokens:**

```markdown
User: "I need to add email/password authentication with JWT tokens"

Claude (Plan Mode): [Creates detailed plan]
─────────────────────────────────────────────────────────
Implementation Plan: User Authentication

1. Database Schema
   - Create users table (id, email, password_hash, created_at)
   - Add unique constraint on email
   - Create migration file

2. API Routes
   - POST /api/auth/register (create account)
   - POST /api/auth/login (get JWT token)
   - GET /api/auth/me (get current user)
   - Add validation with Zod schemas

3. Authentication Middleware
   - Verify JWT tokens
   - Attach user to request
   - Handle token expiration

4. Frontend Components
   - LoginForm component (email + password)
   - RegisterForm component (email + password + confirm)
   - Protected route wrapper

5. Security Considerations
   - Use bcrypt for password hashing (10 rounds)
   - Store JWT in httpOnly cookies
   - Short expiration (15 min access, 7 day refresh)
   - Add rate limiting on login endpoint
   - CSRF protection for state-changing requests

Dependencies to install:
- jsonwebtoken
- bcrypt
- zod (for validation)
─────────────────────────────────────────────────────────

User: "Approved, proceed"

Main Agent: "This is complex auth work, delegating to auth-specialist"

auth-specialist agent: [Implements according to plan]
→ Creates database migration
→ Implements API routes with validation
→ Creates authentication middleware with JWT
→ Builds frontend components
→ Adds proper error handling and rate limiting

User: "Run code-simplifier agent on the auth service"

Claude (code-simplifier agent): [Analyzes auth service]
─────────────────────────────────────────────────────────
Simplification Report:

✅ Improvements Made:
1. Removed duplicate validation logic
   - Extracted to shared validateEmail() function
   - Used in both register and login

2. Simplified JWT handling
   - Created generateToken() utility
   - Created verifyToken() utility
   - Reduced auth middleware from 30 lines to 12

3. Improved error handling
   - Unified error response format
   - Extracted to createError() helper
   - Clearer error messages for users
─────────────────────────────────────────────────────────

User: "/e2e login and registration flow"

Claude (/e2e command): [Generates Playwright tests]
─────────────────────────────────────────────────────────
Generated E2E Tests:

test/e2e/auth.spec.ts:
- ✅ User registration with valid data
- ✅ Email validation (rejects invalid formats)
- ✅ Password validation (min 8 chars)
- ✅ Login with correct credentials
- ✅ Login with wrong password (shows error)
- ✅ JWT token persistence across page reloads
- ✅ Protected route access control

Running tests... All 7 tests passed ✅
─────────────────────────────────────────────────────────

User: "/security-review"

Claude (/security-review command): [Security audit]
─────────────────────────────────────────────────────────
Security Audit Results:

✅ PASSED:
- Password hashing with bcrypt (10 rounds)
- JWT stored in httpOnly cookies
- Input validation with Zod
- No hardcoded secrets (using env vars)
- SQL injection protection (parameterized queries)
- XSS protection (output escaping)

⚠️ WARNINGS:
1. Rate limiting on login endpoint
   → Add: 5 attempts per 15 minutes per IP
   → Prevents brute force attacks

2. CSRF protection for state-changing requests
   → Add: CSRF tokens for login/register
   → Prevents cross-site request forgery

3. Consider adding 2FA for high-value accounts
   → Optional: TOTP-based 2FA
   → Increases security for admin accounts
─────────────────────────────────────────────────────────

User: "Fix the warnings, then /test-and-build"

Claude: [Adds rate limiting and CSRF protection]
→ Installed express-rate-limit
→ Added rate limiting middleware (5 attempts / 15 min)
→ Installed csurf
→ Added CSRF tokens to forms

[Runs /test-and-build]
→ All tests pass ✅
→ Build successful ✅
→ No type errors ✅
→ ESLint passed ✅

User: "/commit-push-pr"

Claude: [Creates commit and PR]
─────────────────────────────────────────────────────────
✅ Commit created:
   feat: add user authentication with JWT tokens

✅ Pushed to: feature/user-authentication

✅ Pull Request created: #42
   Title: feat: add user authentication with JWT tokens

   ## Summary
   - Implements email/password authentication
   - JWT token-based session management
   - Rate limiting and CSRF protection
   - Comprehensive E2E test coverage

   ## Test Plan
   - [x] User registration with valid data
   - [x] Email/password validation
   - [x] Login/logout flows
   - [x] Protected route access control
   - [x] Security audit passed
   - [x] All tests passing
   - [x] Build successful

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
─────────────────────────────────────────────────────────

Total time: ~30 minutes
Quality: Production-ready with security built-in
Coverage: 95% test coverage, all edge cases handled
```

### 3.3 Bug Fix Workflow

**Simple Bug** (known fix):

```
1. Identify issue
2. Implement fix
3. /test-and-build (verify no regressions)
4. /commit-push-pr
```

**Complex Bug** (investigation needed):

```
1. Main agent reproduces bug
2. Main agent investigates root cause
3. For simple fix: main agent implements directly
   For complex fix: [Shift+Tab twice] Create fix plan
4. Main agent implements fix
5. Optional: Delegate to verify-app agent (ensure bug is actually fixed)
6. /test-and-build
7. /commit-push-pr
```

**Example - Fixing Timezone Bug:**

```
User: "Date picker shows wrong dates when user is in different timezone"

Main Agent: [Investigates directly]
→ Reads DatePicker.tsx component
→ Finds issue: using new Date() instead of UTC
→ Root cause: Not respecting user timezone preference

Main Agent: "This is a straightforward fix, implementing directly"
→ Stores dates in UTC in database
→ Converts to user timezone in frontend
→ Updates date picker to use user timezone
→ Adds tests for multiple timezones (US/Pacific, US/Eastern, Europe/London, Asia/Tokyo)
→ Implements fix in 3 files: DatePicker.tsx, formatDate.ts, date.test.ts

/test-and-build
→ All tests pass ✅

/commit-push-pr
→ fix: respect user timezone in date picker
```

### 3.4 Refactoring Legacy Code

**Small Refactor (<5 files)**:
```
Step 1: Ensure Tests Exist
/test-coverage [path]
→ If coverage <80%, main agent writes tests FIRST
→ Tests are your safety net

Step 2: Main agent refactors directly
→ Extract functions, rename for clarity
→ Remove duplication, simplify conditionals
→ Run tests after each change

Step 3: Verify No Breakage
/test-and-build
→ All tests still pass

Step 4: Commit
/commit-push-pr
→ refactor: simplify [module name]
```

**Large Refactor (>5 files)**:
```
Step 1: Ensure Tests Exist
/test-coverage [path]
→ If coverage <80%, write tests FIRST

Step 2: Create Refactoring Strategy (optional)
/plan "refactor [module name]"
→ planner agent creates strategy
→ Plans incremental steps

Step 3: Modernize Code
Delegate to refactor-cleaner agent
→ Systematic modernization
→ Removes dead code
→ Updates to modern patterns

Step 4: Simplify Logic (if needed)
Delegate to code-simplifier agent
→ Removes over-engineering
→ Reduces complexity

Step 5: Verify No Breakage
/test-and-build
→ All tests still pass

Step 6: Code Review
/review-changes
→ Verify improvements

Step 7: Commit
/commit-push-pr
→ refactor: modernize [module name]
```

### 3.5 Production Incident Response

```
Step 1: Understand Incident
→ Review error logs
→ Identify impact and severity
→ Reproduce if possible

Step 2: Create Response Plan
[Shift+Tab twice]
→ planner agent creates incident response plan
→ Prioritizes fixes by impact
→ Identifies quick wins vs long-term fixes

Step 3: Implement Hotfix
→ For critical issues, bypass normal workflow if needed
→ Focus on stopping the bleeding first

Step 4: Verify Fix
Delegate to verify-app agent
→ Test fix immediately in staging
→ Ensure incident is resolved

Step 5: Quality Check
/test-and-build
→ Even for hotfixes, ensure tests pass
→ No regressions introduced

Step 6: Deploy
/commit-push-pr
→ Use "hotfix:" prefix in commit
→ Deploy to production immediately

Step 7: Post-Mortem
→ Update CLAUDE.md with lessons learned
→ Document what went wrong
→ Add prevention measures
→ Improve monitoring/alerting
```

### 3.6 Code Review & Pre-Release Workflow

**Before Every PR** (required):

```
1. /security-review
   → Security audit
   → OWASP checks
   → Secret detection

2. /review-changes
   → Code quality review
   → Best practices check
   → Pattern compliance

3. /test-coverage
   → Ensure adequate tests
   → 80% minimum coverage
   → Critical paths tested

4. /test-and-build
   → All tests passing
   → Build successful
   → No linter errors

5. Delegate to verify-app agent
   → End-to-end validation
   → Integration testing
   → User workflow verification

Then:
6. /commit-push-pr
   → Create pull request
   → Include test plan
   → Tag reviewers
```

---

## 4. Agent Orchestration

### 4.1 Hybrid Agent Model

**Core Philosophy**: Main agent codes directly for standard tasks, delegates to specialists for expertise.

**Main Agent Handles Directly**:
- Standard CRUD operations
- Simple bug fixes (< 3 files)
- Basic refactoring
- Documentation updates
- Simple feature implementation (components, routes, services)
- Git operations (commit, push, PR)
- Template usage and pattern following

**Delegate to Specialists When**:
- Complex architecture needed → `architect`, `planner`
- Specialized domains → `auth-specialist`, `database-architect`, `api-designer`, `graphql-specialist`, `websocket-specialist`
- Security-critical work → `security-reviewer`
- Testing strategies → `tdd-guide`, `unit-test-writer`, `e2e-runner`
- Performance optimization → `performance-optimizer`
- Operations work → `ci-cd-specialist`, `docker-specialist`, `migration-specialist`
- Code quality reviews → `code-reviewer`, `security-reviewer`
- Accessibility compliance → `accessibility-auditor`
- Large refactors (>5 files) → `refactor-cleaner`

### 4.2 Sequential Patterns

**Pattern 1: Simple Feature (Main Agent Only)**

```
1. Main agent analyzes requirements
   → Understands context
   → Identifies files to change

2. Main agent implements directly
   → Writes code + tests
   → Follows project patterns
   → Uses templates

3. Main agent self-verifies
   → Runs tests
   → Checks lint/build
   → Optional: delegate to code-reviewer if complex

4. Main agent commits
   → /commit-push-pr
```

**Pattern 2: Complex Feature (With Specialists)**

```
1. Optional: delegate to planner agent (if complex)
   → Creates detailed implementation plan
   → Identifies dependencies
   → Suggests testing strategy

2. Main agent OR specialist implements
   → If standard: main agent codes directly
   → If specialized: delegate to domain expert
   → Follow plan step-by-step

3. Delegate to code-simplifier agent (optional)
   → Removes over-engineering
   → Simplifies complex logic
   → Improves readability

4. Delegate to verify-app agent (optional)
   → End-to-end validation
   → Integration testing
   → User workflow verification
```

**Pattern 3: Refactor → Test → Document**

```
1. For small refactors: main agent handles directly
   For large refactors (>5 files): delegate to refactor-cleaner agent
   → Modernizes legacy code
   → Removes dead code
   → Updates patterns

2. Delegate to tdd-guide OR unit-test-writer agent
   → Adds missing tests
   → Ensures coverage
   → Tests edge cases

3. For simple docs: main agent updates directly
   For comprehensive docs: delegate to doc-updater agent
   → Syncs documentation with code
   → Updates API docs
   → Refreshes examples
```

**Pattern 4: Build → Fix → Verify**

```
1. Main agent runs /build-fix command
   → Auto-fixes build errors
   → Handles type errors
   → Fixes imports

2. (If complex build issues)
   Delegate to build-error-resolver agent
   → Systematic error fixing
   → Prioritizes by impact

3. Main agent runs /test-and-build
   → Comprehensive verification
   → Ensures everything works
```

### 4.3 Parallel Agent Patterns

**Within Single Session** (preferred for most work):
Main agent can delegate multiple specialists in parallel using single message with multiple Task tool calls:

```
Main agent delegates in parallel:
- security-reviewer agent (background audit)
- code-reviewer agent (code quality)
- doc-updater agent (update docs)

All results come back to main agent for review
```

**Multiple Sessions** (for large independent work):
Run parallel Claude Code sessions when needed:

```
Terminal 1 (Main): Main agent implements feature A
Terminal 2: Main agent implements feature B
Terminal 3: Delegate to security-reviewer agent (comprehensive audit)
Terminal 4: Delegate to e2e-runner agent (generate full test suite)
Terminal 5: Run /test-and-build (continuous testing)
```

**Benefits of Parallel Execution**:
- ✅ Faster overall completion (work happens simultaneously)
- ✅ Independent contexts (no context pollution between tasks)
- ✅ Specialized focus per agent (agents work in their domain)
- ✅ Better resource utilization (maximize Claude usage)

**When to Use Parallel Execution**:
- Large features with independent aspects
- Multiple reviews needed (security, code quality, performance) - use single session parallel
- Background documentation updates
- Continuous test generation
- Completely separate features - use multiple sessions

**Limits**:
- Recommended: 3-5 parallel sessions (if using multiple terminals)
- Maximum: 5 sessions (diminishing returns beyond this)
- Prefer single-session parallel delegation for review tasks

### 4.4 Agent Context Management

**Key Principle**: Agents have isolated context separate from main session

**Delegation Decision Matrix**:

| Task Type | Handler | Reason |
|-----------|---------|--------|
| Create component | Main agent | Standard React work |
| Add CRUD endpoint | Main agent | Standard REST pattern |
| Fix typo/bug | Main agent | Trivial change |
| OAuth integration | auth-specialist | Complex auth protocol |
| GraphQL schema | graphql-specialist | Specialized knowledge |
| DB migration | migration-specialist | Risk mitigation needed |
| Security audit | security-reviewer | Expert verification required |
| Performance tune | performance-optimizer | Requires profiling expertise |
| Large refactor (>5 files) | refactor-cleaner | Systematic approach needed |

**Best Practices**:

1. **Provide Clear Goals**
   ```
   ❌ Bad: "Look at the auth code"
   ✅ Good: "Review src/auth/ for security vulnerabilities in JWT handling"
   ```

2. **Specify Files to Focus On**
   ```
   ❌ Bad: "Refactor the codebase"
   ✅ Good: "Refactor src/services/UserService.ts to use repository pattern"
   ```

3. **Don't Overload Agent Context**
   ```
   ❌ Bad: "Read all 50 files in src/ and analyze"
   ✅ Good: "Analyze the 3 authentication files: auth.ts, jwt.ts, middleware.ts"
   ```

4. **Main Agent Handles Standard Work**
   ```
   → For CRUD, components, simple routes: main agent codes directly
   → For specialized domains: delegate to appropriate specialist
   → For reviews: delegate in parallel (security, code quality)
   ```

**Context Size Guidelines**:
- <3 files & standard work: Main agent handles directly
- 3-10 files & specialized: Consider delegating to specialist
- >10 files OR complex domain: Delegate to appropriate specialist

---

## 5. MCP Server Integration

### 5.1 What Are MCP Servers?

Model Context Protocol (MCP) servers provide external tool integrations:

**Available Integrations:**
- **filesystem**: File operations (always enabled, REQUIRED)
- **slack**: Team communication and PR notifications (**REQUIRED** - auto-notifies commit-업데이트 channel)
- **github**: GitHub API operations (issues, PRs, commits)
- **postgres/sqlite**: Database queries and migrations
- **vercel/railway**: Deployment to hosting platforms
- **memory**: Persistent memory across Claude sessions
- **sequential-thinking**: Enhanced reasoning for complex problems
- **brave-search**: Web search capabilities
- **google-maps**: Location and mapping services
- **firecrawl**: Web scraping and crawling
- **cloudflare**: CDN, workers, observability
- **clickhouse**: Analytics database queries
- **context7**: Context management tools
- **magic**: Additional utilities

**Current Configuration**: 27 pre-configured servers in `.claude/templates/mcp.template.json`, most disabled by default for performance. Enable only what you need.

**Required MCP Servers:**
- **filesystem**: Always enabled (required for file operations)
- **slack**: Required during setup (auto-sends PR notifications to commit-업데이트 channel)

The setup wizard (`node setup.cjs`) will automatically prompt for Slack MCP credentials:
- Slack Bot Token (from https://api.slack.com/apps)
- Slack Team ID (starts with T)

### 5.2 Enabling MCP Servers

**Step 1: Check Current Configuration**

```bash
# See which MCPs are enabled
grep '"disabled": false' .mcp.json
```

**Step 2: Add API Credentials** (if required)

```bash
# In .env file or environment variables
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_xxxxx"
export POSTGRES_URL="postgresql://localhost/mydb"
export VERCEL_API_TOKEN="your_token_here"
```

**Step 3: Enable in .mcp.json**

```json
// Find the server you want to enable
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "YOUR_GITHUB_TOKEN_HERE"
      },
      "disabled": false  // ← Change from true to false
    }
  }
}
```

**Step 4: Restart Claude Code Session**

MCPs are loaded when Claude Code starts. Restart your session to pick up changes.

### 5.3 MCP Server Usage Patterns

**GitHub Integration**:
```
Enable: github MCP server
Use for:
→ Creating issues from code TODOs
→ Commenting on pull requests
→ Searching repositories
→ Getting commit history
→ Managing project boards
```

**Database Integration**:
```
Enable: postgres or sqlite MCP server
Use for:
→ Querying database directly
→ Inspecting schema
→ Generating migrations
→ Setting up test data
→ Performance analysis
```

**Deployment Integration**:
```
Enable: vercel or railway MCP server
Use for:
→ Deploying to production
→ Checking deployment status
→ Viewing deployment logs
→ Rolling back bad deploys
→ Managing environment variables
```

**Slack Integration** (REQUIRED):
```
Enable: slack MCP server (required)
Use for:
→ Auto-notify commit-업데이트 channel on PR creation
→ Auto-notify commit-업데이트 channel on code push
→ Full PR title, description, and link included in notifications
→ Team members see all details without opening GitHub
→ Messages in natural, professional Korean for non-technical team members
→ Team communication and notifications

Important: This template auto-sends Slack messages with full PR descriptions
to the commit-업데이트 channel when using the `/commit-push-pr` command.
All messages are translated to natural Korean that's easily understandable
by vibe coders and non-technical team members.
```

**Search Integration**:
```
Enable: brave-search MCP server
Use for:
→ Researching documentation
→ Finding code examples
→ Checking API references
→ Learning new libraries
```

### 5.4 Context Management with MCPs

**CRITICAL WARNING**: Too many enabled MCPs degrade performance severely.

**The 200k → 70k Problem**:
- Starting context window: 200k tokens
- With 10 MCPs + 20 tools enabled: Drops to ~70k usable
- Result: Slow responses (>10 seconds), incomplete answers, session crashes

**Performance Guidelines**:

```bash
# Check enabled MCP count
grep '"disabled": false' .mcp.json | wc -l

# Should be <10 for optimal performance
```

**Per-Project Disabling**:

```json
// .claude/settings.local.json
{
  "disabledMcpServers": [
    "slack",           // Not using Slack in this project
    "google-maps",     // Not using maps
    "cloudflare-docs"  // Not deploying to Cloudflare
  ]
}
```

**Best Practices**:
- Enable only MCPs you actively use
- Disable MCPs when done with that integration
- Keep total enabled count under 10
- Monitor response times (>5 seconds = too many MCPs)

---

## 6. Performance & Optimization

### 6.1 Context Window Management

See `.claude/rules/essential-rules.md` for complete details.

**Hard Limits** (battle-tested thresholds):
- **MCPs enabled**: <10 per project
- **Active tools**: <80 tools total
- **Files read per session**: <50 files
- **Target context usage**: 60-80k tokens (not >120k)

**Performance Warning Signs**:
- ⚠️ Response time >10 seconds
- ⚠️ Incomplete responses or cutting off mid-sentence
- ⚠️ Claude says "I need to be brief"
- ⚠️ Session crashes or timeouts

**Optimization Strategies**:

1. **Disable Unused MCPs**
   ```bash
   # Check count
   grep '"disabled": false' .mcp.json | wc -l

   # Disable if not using
   # Edit .mcp.json and set "disabled": true
   ```

2. **Delegate Heavy Tasks to Agents**
   ```
   ❌ Bad: Read 50 files in main context
   ✅ Good: Delegate to agent with isolated context
   ```

3. **Keep Rules/Skills Concise**
   ```
   Rules: <500 lines each
   Skills: <800 lines each
   Remove outdated content
   ```

4. **Start Fresh Sessions Periodically**
   ```
   When context gets heavy (slow responses):
   → Save your work
   → Start new Claude Code session
   → Continue with fresh context
   ```

### 6.2 Model Selection Strategy

**Haiku** ($) - Fast and cheap:
- Formatting code (Prettier, ESLint)
- Simple one-line fixes
- Running tests
- Quick refactoring (<10 lines)
- Repetitive tasks

**Sonnet** ($$) - Balanced (DEFAULT):
- Feature implementation
- Bug fixes
- Code reviews
- Test writing
- Most development work
- General refactoring

**Opus** ($$$) - Powerful and expensive:
- Complex architecture design
- Critical security decisions
- Production incident response
- Large-scale refactoring (>500 lines)
- System design discussions

**Switching Models**:

```json
// In .claude/settings.json
{
  "model": "haiku"   // or "sonnet" or "opus"
}
```

**Cost-Benefit Analysis**:
- Haiku: Fast but may require more rounds of back-and-forth
- Sonnet: Balanced, good for 90% of work
- Opus: Slower but gets it right the first time for complex tasks

### 6.3 Parallel Sessions

Run multiple Claude Code sessions simultaneously for faster completion:

**Setup**:
```
Terminal/VSCode Window 1: Main development work
Terminal/VSCode Window 2: Security audit (security-reviewer agent)
Terminal/VSCode Window 3: Test generation (e2e-runner agent)
Terminal/VSCode Window 4: Documentation (doc-updater agent)
Terminal/VSCode Window 5: Code review (/review-changes)
```

**Benefits**:
- ✅ Each session has full 200k context window
- ✅ No context contamination between sessions
- ✅ Faster overall completion (parallel work)
- ✅ Better focus (each session has one job)

**Recommended Limits**:
- Start with 2-3 sessions
- Scale up to 5 sessions for large features
- Beyond 5 sessions: diminishing returns

---

## 7. Customization Roadmap

### 7.1 Week 1: Essential Setup

**Day 1-2: Initial Configuration**

```
Day 1:
- [ ] Read README.md and CLAUDE.md
- [ ] Initialize git repository
- [ ] Run first command: /test-and-build
- [ ] Explore available commands (/help)

Day 2:
- [ ] Try Plan Mode (Shift+Tab twice)
- [ ] Test /commit-push-pr workflow
- [ ] Enable github MCP if using GitHub
```

**Day 3-4: Customize CLAUDE.md**

```
Day 3:
- [ ] Document your tech stack in CLAUDE.md
- [ ] Add team naming conventions
- [ ] List your project dependencies

Day 4:
- [ ] Document first common mistake in CLAUDE.md
- [ ] Add project-specific patterns
- [ ] Set up code review checklist
```

**Day 5-7: Enable Essential MCPs**

```
Day 5:
- [ ] Enable database MCP (postgres or sqlite)
- [ ] Test database queries

Day 6:
- [ ] Enable deployment MCP (vercel or railway)
- [ ] Test deployment workflow

Day 7:
- [ ] Review enabled MCPs (should be <10)
- [ ] Test integrations work correctly
```

### 7.2 Month 1: Power User

**Week 2: Master Commands**

```
- [ ] Use all 10 commands at least once
- [ ] Create workflow combining multiple commands
- [ ] Set up pre-approved operations for your project
- [ ] Customize hooks for your workflow
```

**Week 3: Agent Mastery**

```
- [ ] Delegate to each agent type
- [ ] Create sequential agent workflow (plan → implement → simplify → verify)
- [ ] Try parallel agent sessions (2-3 terminals)
- [ ] Understand when to use agents vs direct implementation
```

**Week 4: Quality Automation**

```
- [ ] Set up pre-commit hooks
- [ ] Configure environment-specific settings (dev/prod)
- [ ] Integrate with CI/CD pipeline
- [ ] Establish team code review workflow
```

### 7.3 Ongoing: Compounding Improvements

**Monthly Tasks**:
```
- [ ] Review and update CLAUDE.md
- [ ] Add newly discovered mistakes
- [ ] Update patterns as codebase evolves
- [ ] Share improvements with team
- [ ] Review and optimize enabled MCPs
```

**Quarterly Tasks**:
```
- [ ] Create custom agents for repeated tasks
- [ ] Build custom commands for team workflows
- [ ] Evaluate new MCPs to add
- [ ] Contribute useful patterns to community (optional)
```

### 7.4 Creating Custom Commands

**Template**:

```markdown
# My Custom Command

[One-line description of what this command does]

## Usage

When to use this command and what it accomplishes.

## Instructions

1. Step-by-step instructions for Claude to follow
2. Be specific and actionable
3. Include error handling
4. Reference skills/rules as needed

## Example

Concrete usage example showing input and expected output.
```

**Save to**: `.claude/commands/my-command.md`

### 7.5 Creating Custom Agents

**Template**:

```markdown
# My Custom Agent

[One-line description of agent's specialty]

## Prerequisites

- [Tool or setup required]
- [Dependencies needed]

## Instructions

Detailed step-by-step instructions for this specialized task.
Include:
- What to analyze
- What to look for
- What to report
- What format to use

## Example Usage

"Delegate to my-agent agent to [specific task]"

Expected output format and results.
```

**Save to**: `.claude/agents/my-agent.md`

---

## 8. Team Collaboration

### 8.1 Shared CLAUDE.md

**Best Practice**: One CLAUDE.md per project, committed to version control

**Structure**:

```markdown
## Purpose
Why this file exists and how to use it

## Tech Stack
Complete technology stack with versions

## Common Mistakes
Team-specific gotchas discovered over time
- Add to this section whenever a mistake is made
- Include what went wrong and the correct approach

## Project-Specific Patterns
Patterns specific to THIS project
- API response format
- Error handling approach
- Database access patterns
- Authentication flow
```

**Update Frequency**: After every mistake or lesson learned

**Team Workflow**:
```
1. Developer makes mistake
2. Fix the mistake
3. Document in CLAUDE.md
4. Commit CLAUDE.md update
5. Team benefits from shared knowledge
```

### 8.2 Code Review Integration

**Reviewer's Workflow with Claude Code**:

```
1. Pull branch being reviewed
2. Ask Claude: "Review this PR: [PR URL or description]"
3. Claude analyzes:
   → All changed files
   → Checks against project rules
   → Verifies test coverage
   → Identifies potential issues
4. Review Claude's findings
5. Add your own observations
6. Provide feedback to PR author
```

**Before Submitting PR** (Author):

```
/security-review      # Security audit
/review-changes       # Code quality review
/test-and-build       # Run tests and build

Then:
/commit-push-pr       # Create PR
```

### 8.3 Async Collaboration with TODO Comments

**Pattern**: Leave TODO comments for teammates (or future you)

```typescript
// TODO(@teammate): This needs error handling for edge case X
// See CLAUDE.md section on error patterns for our standard approach

// TODO(@me): Refactor this once the API stabilizes
// Currently handling 3 different response formats

// TODO: Add rate limiting here
// See security.md rule for our rate limiting pattern
```

Claude Code will:
- Detect TODO comments
- Remind you about them
- Help resolve them when asked
- Suggest implementations based on CLAUDE.md patterns

---

## 9. Troubleshooting

### 9.1 Common Issues

**Issue: "Responses are slow (>10 seconds)"**

**Diagnosis**: Too many enabled MCPs or bloated context

**Solution**:
```bash
# Check enabled MCPs
grep '"disabled": false' .mcp.json | wc -l

# Should be <10
# If more, disable unused ones by editing .mcp.json
```

**Issue: "Agent doesn't work as expected"**

**Diagnosis**: Unclear delegation or wrong agent choice

**Solution**:
```
❌ Bad: "Use refactor-cleaner"
✅ Good: "Delegate to refactor-cleaner agent to modernize the src/auth/ directory"

❌ Bad: "Have an agent look at this"
✅ Good: "Delegate to security-reviewer agent to scan for OWASP Top 10 vulnerabilities in the authentication flow"
```

**Issue: "Command not found"**

**Diagnosis**: Command file missing or misnamed

**Solution**:
```bash
# Check command exists
ls .claude/commands/

# Verify naming convention:
# Command: /test-and-build
# File: test-and-build.md (exact match)
```

**Issue: "Hooks blocking operations"**

**Diagnosis**: Hook taking too long or failing

**Solution**:
```bash
# Temporarily disable hooks
# Edit .claude/settings.json
{
  "hooks": []  // Empty array disables all hooks
}

# Or fix specific hook:
# Hooks must complete in <100ms
# Add || true to prevent blocking:
"command": "your-command || true"
```

**Issue: "MCP server not connecting"**

**Diagnosis**: Disabled, missing credentials, or network issue

**Solution**:
```bash
# 1. Check if enabled
# In .mcp.json: "disabled": false

# 2. Verify credentials
# Check environment variables are set correctly

# 3. Test MCP directly
npx @modelcontextprotocol/server-github

# 4. Check network
# Some MCPs require internet access

# 5. Restart Claude Code
# MCPs are loaded on session start
```

### 9.2 Getting Help

**Self-Service**:
1. Check this guide
2. Review [README.md](README.md)
3. Read relevant rule files in `.claude/rules/`
4. Search CLAUDE.md for project-specific guidance
5. Check skill files in `.claude/skills/`
6. Check agent index in `.claude/agents/INDEX.md`

**Community Support**:
1. Search existing GitHub issues
2. Open new issue with:
   - Clear description of problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Claude Code version)

---

## 10. Advanced Topics

### 10.1 Hook Customization

Configure hooks in `.claude/settings.json` - see `hooks` section.

**Pre-Tool Hooks** (warnings before action):

```json
{
  "when": "PreToolUse",
  "matcher": "tool == \"Write\" && tool_input.file_path matches \"\\\\.tsx?$\"",
  "hooks": [{
    "type": "command",
    "command": "grep -n 'console\\.log' \"$file_path\" 2>/dev/null && echo '[Hook] Warning: console.log detected' >&2 || true"
  }]
}
```

**Post-Tool Hooks** (auto-formatting after action):

```json
{
  "when": "PostToolUse",
  "matcher": "tool in [\"Edit\", \"Write\"] && tool_input.file_path matches \"\\\\.tsx?$\"",
  "hooks": [{
    "type": "command",
    "command": "npx prettier --write \"$file_path\" 2>&1 | head -1"
  }]
}
```

**Performance Requirement**: Hooks must complete in <100ms

### 10.2 Environment-Specific Workflows

**Development** (`settings.dev.json`):
- Sonnet model (faster, cheaper)
- Auto-accept enabled (speed over safety)
- All operations allowed (maximum freedom)
- Permissive hooks

**Production** (`settings.prod.json`):
- Opus model (highest quality)
- Auto-accept disabled (safety first)
- Read-only operations only (no accidental changes)
- Strict hooks

**Switching Environments**:

```bash
# Switch to development
cp .claude/settings.dev.json .claude/settings.json

# Switch to production
cp .claude/settings.prod.json .claude/settings.json
```

### 10.3 Pre-Approved Operations

Configure operations that don't require user confirmation:

```json
{
  "allowedPrompts": [
    {"tool": "Bash", "prompt": "run tests"},
    {"tool": "Bash", "prompt": "run build"},
    {"tool": "Bash", "prompt": "format code"},
    {"tool": "Bash", "prompt": "run linter"},
    {"tool": "Bash", "prompt": "install dependencies"}
  ]
}
```

**Benefits**:
- ✅ Faster workflows (no permission prompts)
- ✅ Fewer interruptions (automated approval)
- ✅ Better automation (continuous operation)

**Security Considerations**:
- ⚠️ Only pre-approve read-only and safe operations
- ⚠️ Don't pre-approve: destructive operations, deployments, database writes
- ⚠️ Review regularly as codebase evolves

---

## Quick Reference

### Most Used Commands (Daily)

```bash
/commit-push-pr      # Create commit, push, and PR
/test-and-build      # Run tests and build, fix errors
/review-changes      # Code review before committing
/security-review     # Security audit
/open-localhost      # Open dev server in browser (auto-detects port)
```

### Most Used Agents (Weekly)

```bash
planner              # Plan complex features
security-reviewer    # Security audits
verify-app          # End-to-end validation
code-simplifier     # Remove complexity
```

### Most Important Rules

```bash
essential-rules.md   # Security, testing, coding standards (all consolidated)
orchestration.md     # Delegation, workflows, git standards
```

### Critical Performance Thresholds

```
Enabled MCPs: <10
Active tools: <80
Files read: <50 per session
Response time: <5 seconds (warning if >5s)
Context usage: 60-80k target (warning if >120k)
```

---

## Next Steps

**New Users**: Start with [README.md](README.md) for project overview

**Getting Started**: Follow [Week 1: Essential Setup](#71-week-1-essential-setup)

**Team Leads**: Read [Team Collaboration](#8-team-collaboration) section

**Power Users**: Explore [Advanced Topics](#10-advanced-topics) and create custom commands/agents

**Need Help?**: Check [Troubleshooting](#9-troubleshooting) or open an issue

---

## Additional Resources

- **Project Overview**: [README.md](README.md)
- **Team Guidelines**: [CLAUDE.md](CLAUDE.md)
- **Agent Directory**: [.claude/agents/INDEX.md](.claude/agents/INDEX.md)
- **Skills Directory**: [.claude/skills/INDEX.md](.claude/skills/INDEX.md)
- **Commands Guide**: [.claude/commands/README.md](.claude/commands/README.md)
- **Checklists**: [.claude/checklists/README.md](.claude/checklists/README.md)
- **Templates**: [.claude/templates/README.md](.claude/templates/README.md)
- **Workflows**: [.claude/workflows/README.md](.claude/workflows/README.md)

---

**Remember**: This is a compounding system. Every mistake you document in CLAUDE.md, every pattern you add, every command you create - they all make your team faster and your code better. Start small, grow steadily, and watch productivity multiply.

**Questions?** Update CLAUDE.md with the answer so your team benefits too.
