# Scripts Directory

Automation scripts for hooks, CI/CD, and development workflows.

---

## Script Catalog (23 scripts)

### TDD Flow

| Script | Purpose | Trigger |
|--------|---------|---------|
| `audit-spec.sh` | Validate spec quality (REQ IDs, tags, matrix) | PostToolUse hook (Write to .claude/plans/) |
| `launch-parallel-tdd.sh` | Detect spec write and launch parallel TDD | PostToolUse hook (Write to .claude/plans/) |
| `create-tdd-team.sh` | Parse spec, create worktrees, output Agent Teams task data | Called by launch-parallel-tdd.sh |
| `hooks/task-completed-tdd.sh` | Enforce TDD on task completion (test must reference REQ ID) | TaskCompleted hook |
| `hooks/teammate-idle-tdd.sh` | Quality gate on teammate idle (clean state, tests pass) | TeammateIdle hook |
| `req-coverage.sh` | Scan test files for REQ-XXX coverage | Manual (`/req-coverage`) |
| `verify-merge.sh` | Post-merge test suite + REQ coverage | Manual (after parallel TDD merge) |

### Quality Gates

| Script | Purpose | Trigger |
|--------|---------|---------|
| `checkpoint.sh` | Unified verification gate (types, lint, tests, build, security) | PreToolUse hook (gh pr create) / Manual (`/checkpoint`) |
| `pre-commit-checks.sh` | Quality checks before git commits | PreToolUse hook (git commit) |
| `require-tests-pass.sh` | Gate PR creation on passing tests | Fallback for checkpoint.sh |

### Session Tracking

| Script | Purpose | Trigger |
|--------|---------|---------|
| `verify-errors-read.sh` | Ensure errors.md was read before coding | PreToolUse hook (Edit/Write/Task/Bash) |
| `mark-errors-read.sh` | Record that errors.md was read | PostToolUse hook (Read errors.md) |
| `detect-error-patterns.sh` | Detect 2+ similar errors for auto-heal | PostToolUse hook (Read errors.md) |
| `log-session-event.sh` | Append JSON event to session-log.jsonl | SubagentStop hook |
| `log-security-review.sh` | Log security review completion | SubagentStop hook (code-reviewer) |

### Formatting & Linting

| Script | Purpose | Trigger |
|--------|---------|---------|
| `auto-format.sh` | Format code files on save | PostToolUse hook (Edit/Write) |
| `fix-template-literals.sh` | Fix template literals in skill references | Manual |

### Security

| Script | Purpose | Trigger |
|--------|---------|---------|
| `block-dangerous-commands.sh` | Block destructive Bash commands (rm -rf, etc.) | PreToolUse hook (Bash) |

### Notifications

| Script | Purpose | Trigger |
|--------|---------|---------|
| `notify-slack-pr.sh` | Slack notification for PR creation/push | Manual |
| `send-slack-notification.sh` | Send pending Slack notifications via MCP | Manual |

### System

| Script | Purpose | Trigger |
|--------|---------|---------|
| `health-check.sh` | Validate .claude/ configuration integrity | Manual (`/health-check`) |
| `sync-deps.sh` | Synchronize and verify dependencies | PostToolUse hook (npm install) |
| `update-system.sh` | Update .claude/ system files from upstream | Manual (`/update-system`) |

---

## Usage

### With Claude Code Hooks

Scripts are called automatically by hooks defined in `.claude/settings.json`. See hook configuration for trigger details.

### Manual Execution

```bash
# Run health check
bash ./.claude/scripts/health-check.sh

# Run checkpoint (verification gate)
bash ./.claude/scripts/checkpoint.sh

# Check REQ coverage
bash ./.claude/scripts/req-coverage.sh

# Validate a spec
bash ./.claude/scripts/audit-spec.sh .claude/plans/my-feature.md
```

---

## Exit Codes

- `0`: Success — allow operation to proceed
- `1`: Failure — operation continues with warning
- `2`: Block — operation is blocked (for PreToolUse hooks)

---

## Adding New Scripts

1. Create script in this directory
2. Add shebang: `#!/bin/bash`
3. Use `set -euo pipefail` for strict mode
4. Make executable: `chmod +x script.sh`
5. Add hook configuration to `.claude/settings.json` if needed
6. Update this README
