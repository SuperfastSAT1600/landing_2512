# Commands Directory

This directory contains **user-invoked workflows** that orchestrate agents and automate common development tasks. Commands are triggered using `/command-name` syntax.

---

## What Are Commands?

Commands are markdown files that define:
- 🚀 **Workflows**: Multi-step automated processes
- 🔧 **Orchestration**: Coordination of multiple agents
- ⚡ **Shortcuts**: Quick access to common operations

Commands differ from agents:
- **Agents** = Specialized workers with domain expertise
- **Commands** = Workflow orchestrators that coordinate agents

---

## Available Commands (22 Total)

### Workflow Orchestration

#### [`full-feature.md`](full-feature.md)
**Usage**: `/full-feature <feature-description>`

**Purpose**: Complete feature development from planning through PR

**Steps**:
1. Planning with planner agent
2. Implementation following the plan
3. Testing with TDD approach
4. Security and code review
5. Documentation update
6. PR creation

**Duration**: Hours (varies by feature size)

**Example**:
```
/full-feature user authentication with OAuth
/full-feature add dark mode support
```

---

#### [`quick-fix.md`](quick-fix.md)
**Usage**: `/quick-fix <issue-description>`

**Purpose**: Fast bug fix workflow for simple issues

**Steps**:
1. Locate the bug
2. Root cause analysis
3. Implement minimal fix
4. Add regression test
5. Commit the fix

**Duration**: Minutes

**Example**:
```
/quick-fix button click handler not working on mobile
/quick-fix login redirect goes to wrong page
```

---

#### [`spike.md`](spike.md)
**Usage**: `/spike <research-topic>`

**Purpose**: Time-boxed technical research and exploration

**Steps**:
1. Define research scope
2. Investigate options
3. Build proof of concept
4. Document findings
5. Make recommendation

**Duration**: 30min - 2 hours

**Example**:
```
/spike evaluate state management options for React
/spike research payment gateway integration approaches
```

---

### Quality & Maintenance

#### [`lint-fix.md`](lint-fix.md)
**Usage**: `/lint-fix`

**Purpose**: Run ESLint, Prettier, and TypeScript with auto-fix

**What It Does**:
- Runs ESLint with --fix flag
- Runs Prettier formatting
- Runs TypeScript compiler check
- Reports remaining issues

**Duration**: < 1 minute

---

#### [`type-check.md`](type-check.md)
**Usage**: `/type-check`

**Purpose**: Strict TypeScript checking, eliminate `any` types

**What It Does**:
- Runs TypeScript in strict mode
- Identifies `any` types
- Suggests proper type annotations
- Enforces type safety

**Duration**: < 2 minutes

---

#### [`audit-deps.md`](audit-deps.md)
**Usage**: `/audit-deps`

**Purpose**: Security audit + outdated check + license compliance

**What It Does**:
- Runs npm audit for vulnerabilities
- Checks for outdated packages
- Validates license compatibility
- Reports security issues by severity

**Duration**: < 1 minute

---

#### [`dead-code.md`](dead-code.md)
**Usage**: `/dead-code`

**Purpose**: Find and remove unused code, exports, and dependencies

**What It Does**:
- Identifies unused exports
- Finds dead code paths
- Detects unused dependencies
- Removes safely with verification

**Duration**: 5-10 minutes

---

### Development Tools

#### [`new-component.md`](new-component.md)
**Usage**: `/new-component <ComponentName>`

**Purpose**: Scaffold a React component with tests and stories

**Creates**:
- Component file with TypeScript
- Test file with basic tests
- Storybook story (if using Storybook)
- Proper exports

**Duration**: < 1 minute

**Example**:
```
/new-component UserProfile
/new-component PaymentForm
```

---

#### [`create-migration.md`](create-migration.md)
**Usage**: `/create-migration "<description>"`

**Purpose**: Generate database migration with rollback

**Creates**:
- Migration file with timestamp
- Up migration (apply changes)
- Down migration (rollback)
- Validation queries

**Duration**: 5 minutes

**Example**:
```
/create-migration "add user preferences table"
/create-migration "add index on orders.created_at"
```

---

#### [`update-docs.md`](update-docs.md)
**Usage**: `/update-docs`

**Purpose**: Sync documentation with code changes

**What It Does**:
- Detects code changes since last docs update
- Updates relevant documentation
- Syncs API docs with endpoints
- Updates README if needed

**Duration**: 5-10 minutes

---

#### [`open-localhost.md`](open-localhost.md)
**Usage**: `/open-localhost [port]`

**Purpose**: Automatically detect and open localhost in browser

**What It Does**:
- Auto-detects running dev server port
- Validates server is responding
- Opens browser using platform-specific command
- Provides helpful error messages

**Duration**: < 5 seconds

**Example**:
```
/open-localhost              # Auto-detect port
/open-localhost 3000         # Open specific port
/open-localhost 5173         # Open Vite default
```

---

### System Maintenance

#### [`health-check.md`](health-check.md)
**Usage**: `/health-check`

**Purpose**: Run comprehensive audit of .claude/ system configuration

**What It Does**:
- Executes static checks on system files
- Validates file references and structure
- Checks for contradictions and staleness
- Reports findings with proposed fixes

**Duration**: 2-5 minutes

---

#### [`update-system.md`](update-system.md)
**Usage**: `/update-system`

**Purpose**: Update .claude/ system files from upstream repository

**What It Does**:
- Validates upstream source exists
- Creates timestamped backup
- Updates agents, skills, rules, commands, workflows, templates
- Preserves all user data and local settings
- Handles structural migrations automatically
- Verifies update success

**Duration**: 30 seconds - 2 minutes

**Example**:
```
/update-system    # Update system from ../claude-code-setup
```

---

### Testing & Verification

#### [`tdd.md`](tdd.md)
**Usage**: `/tdd <feature-or-function>`

**Purpose**: Guide through Test-Driven Development workflow

**Workflow**:
1. **Red**: Write failing test first
2. **Green**: Write minimal code to pass
3. **Refactor**: Improve code, keep tests green

**Duration**: Varies by scope

---

#### [`test-and-build.md`](test-and-build.md)
**Usage**: `/test-and-build`

**Purpose**: Run tests and build, fixing any errors that occur

**What It Does**:
- Runs test suite
- Runs production build
- Fixes errors iteratively
- Reports final status

**Duration**: Varies

---

#### [`test-coverage.md`](test-coverage.md)
**Usage**: `/test-coverage`

**Purpose**: Analyze test coverage and improve untested code

**What It Does**:
- Runs coverage report
- Identifies untested code
- Suggests tests for critical paths
- Helps reach coverage targets

**Duration**: 5-15 minutes

---

#### [`e2e.md`](e2e.md)
**Usage**: `/e2e <user-workflow>`

**Purpose**: Generate and run end-to-end tests

**What It Does**:
- Generates Playwright/Cypress tests
- Tests user workflows
- Captures screenshots on failure
- Reports test results

**Duration**: 10-30 minutes

---

### Code Review & Security

#### [`review-changes.md`](review-changes.md)
**Usage**: `/review-changes`

**Purpose**: Comprehensive code review of uncommitted changes

**What It Does**:
- Reviews all staged/unstaged changes
- Checks for code quality issues
- Identifies potential bugs
- Suggests improvements

**Duration**: 5-10 minutes

---

#### [`security-review.md`](security-review.md)
**Usage**: `/security-review`

**Purpose**: Comprehensive security audit

**What It Does**:
- Scans for OWASP Top 10 vulnerabilities
- Checks dependencies for CVEs
- Reviews authentication/authorization
- Creates prioritized fix list

**Duration**: 15-30 minutes

---

### Git & CI/CD

#### [`build-fix.md`](build-fix.md)
**Usage**: `/build-fix`

**Purpose**: Fix build errors systematically

**What It Does**:
- Identifies build errors
- Fixes errors iteratively
- Verifies each fix
- Reports final status

**Duration**: Varies by error count

---

#### [`commit-push-pr.md`](commit-push-pr.md)
**Usage**: `/commit-push-pr`

**Purpose**: Commit changes, push to remote, and create PR

**What It Does**:
- Creates conventional commit
- Pushes to feature branch
- Creates PR with description
- Links to related issues

**Duration**: 2-5 minutes

---

### Refactoring

#### [`refactor-clean.md`](refactor-clean.md)
**Usage**: `/refactor-clean`

**Purpose**: Remove dead code and modernize legacy patterns

**What It Does**:
- Identifies dead code
- Modernizes legacy patterns
- Improves code organization
- Maintains test coverage

**Duration**: 15-30 minutes

---

#### [`plan.md`](plan.md)
**Usage**: `/plan <feature-description>`

**Purpose**: Create detailed implementation plans

**What It Does**:
- Analyzes requirements
- Breaks down into tasks
- Identifies dependencies
- Estimates complexity

**Duration**: 10-20 minutes

---

## How Commands Work

### Invocation

Commands are triggered with `/command-name`:
```
/full-feature add user notifications
/quick-fix login button not responding
/lint-fix
```

### With Arguments

Some commands accept arguments:
```
/new-component UserAvatar          # Component name
/create-migration "add index"      # Description in quotes
/spike evaluate caching options    # Research topic
```

### Command vs Agent Decision

| Need | Use |
|------|-----|
| Complete workflow (plan → implement → test → PR) | **Command** (`/full-feature`) |
| Specific expertise (security audit) | **Command** (`/security-review`) |
| One-off specialized task | **Agent** (direct delegation) |
| Simple code change | Neither (do it directly) |

---

## Command Categories

### By Duration

| Duration | Commands |
|----------|----------|
| **Fast** (<1 min) | `/lint-fix`, `/audit-deps`, `/new-component`, `/open-localhost`, `/update-system` |
| **Medium** (5-15 min) | `/quick-fix`, `/create-migration`, `/update-docs`, `/test-coverage`, `/health-check` |
| **Long** (30+ min) | `/full-feature`, `/security-review`, `/e2e` |

### By Purpose

| Purpose | Commands |
|---------|----------|
| **Feature Development** | `/full-feature`, `/plan`, `/tdd` |
| **Bug Fixing** | `/quick-fix`, `/build-fix` |
| **Code Quality** | `/lint-fix`, `/type-check`, `/dead-code`, `/refactor-clean` |
| **Testing** | `/tdd`, `/test-coverage`, `/e2e`, `/test-and-build` |
| **Security** | `/security-review`, `/audit-deps` |
| **Documentation** | `/update-docs` |
| **Development Tools** | `/new-component`, `/create-migration`, `/open-localhost` |
| **Git/CI** | `/commit-push-pr`, `/build-fix` |
| **System Maintenance** | `/health-check`, `/update-system` |

---

## Creating a New Command

### Template

```markdown
# Command Name

One-line description.

---

## Usage

\`\`\`
/command-name <arguments>
\`\`\`

---

## What This Command Does

Numbered list of steps...

---

## Workflow Steps

### Step 1: Name
Details...

### Step 2: Name
Details...

---

## Success Criteria

- Criterion 1
- Criterion 2

---

## Related

- Related command
- Related agent
```

### Best Practices

1. **Clear purpose**: One-line description of what it does
2. **Usage examples**: Show common invocations
3. **Defined steps**: Clear workflow with phases
4. **Success criteria**: How to know it completed successfully
5. **Duration estimate**: Help users plan their time

---

## Troubleshooting

### "Command not recognized"
- Check spelling of command name
- Ensure command file exists in `.claude/commands/`
- Verify file is valid markdown

### "Command failed partway through"
- Check error messages in output
- Verify prerequisites are met
- Try running failed step manually

### "Command taking too long"
- Some commands (like `/full-feature`) are designed for long tasks
- Check progress updates for status
- Can interrupt and resume later

---

## Resources

- [Agents Index](../agents/INDEX.md) - Agent directory and usage guide
- [Skills Index](../skills/INDEX.md) - Skills directory and selection guide
- [Workflows](../workflows/) - Detailed workflow definitions
- [Checklists](../checklists/) - Quality gate checklists

---

**Last Updated**: 2026-02-11
