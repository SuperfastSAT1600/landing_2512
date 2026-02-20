# Workflows Directory

Orchestrated agent sequences for complex, multi-step development tasks.

---

## What Are Workflows?

Workflows are predefined sequences of agent invocations that automate common development patterns. Each workflow defines:

- **Steps**: Ordered sequence of operations
- **Agents**: Which agents to use at each step
- **Gates**: Checkpoints for user approval
- **Outputs**: Expected deliverables

---

## Available Workflows

| Workflow | Purpose | Steps | Agents |
|----------|---------|-------|--------|
| `full-feature.md` | Complete feature development | 6 | planner, tdd-guide, code-reviewer, security-reviewer, doc-updater |
| `bug-fix.md` | Bug fix cycle | 4 | code-reviewer, unit-test-writer |
| `refactor.md` | Code refactoring | 5 | tech-debt-analyzer, code-reviewer, unit-test-writer |
| `release.md` | Release preparation | 6 | security-reviewer, dependency-manager, doc-updater |
| `security-audit.md` | Security assessment | 5 | security-reviewer |

---

## How to Use

### Command-Based
```
/full-feature implement user authentication
/refactor UserService module
```

### Manual Invocation
Follow the steps in each workflow file, invoking agents as directed.

---

## Workflow Structure

Each workflow file follows this format:

```markdown
# Workflow Name

Brief description.

## Prerequisites
- What's needed before starting

## Steps

### Step 1: [Step Name]
**Agent**: agent-name
**Action**: What to do
**Output**: Expected result
**Gate**: [Optional] User approval required

### Step 2: ...

## Completion Criteria
- Definition of done
```

---

## Creating Custom Workflows

1. Identify the pattern you want to automate
2. Break it into discrete steps
3. Map agents to each step
4. Define gates for approval points
5. Document expected outputs

---

## Best Practices

1. **Clear Gates**: Always pause for approval before destructive operations
2. **Agent Selection**: Use the right agent for each step
3. **Incremental Progress**: Each step should produce tangible output
4. **Rollback Points**: Define how to recover from failures
5. **Documentation**: Update workflow if process changes
