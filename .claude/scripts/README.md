# Scripts Directory

Automation scripts for hooks, CI/CD, and development workflows.

---

## What Are These Scripts?

These are shell scripts designed to:
- Automate quality checks before commits/PRs
- Integrate with Claude Code hooks
- Standardize development workflows
- Enforce project standards

---

## Available Scripts

| Script | Purpose | Trigger |
|--------|---------|---------|
| `pre-commit-checks.sh` | Run quality checks before commits | PreToolUse hook (git commit) |
| `require-tests-pass.sh` | Gate PR creation on test success | PreToolUse hook (PR creation) |
| `log-security-review.sh` | Log security review results | SubagentStop hook |
| `auto-format.sh` | Format code on save | PostToolUse hook (Edit/Write) |
| `sync-deps.sh` | Synchronize dependencies | Manual or scheduled |

---

## Usage

### With Claude Code Hooks

Scripts are called automatically by hooks defined in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "tool == \"Bash\" && tool_input.command matches \"git commit\"",
        "hooks": [{
          "type": "command",
          "command": "./.claude/scripts/pre-commit-checks.sh"
        }]
      }
    ]
  }
}
```

### Manual Execution

```bash
# Run pre-commit checks
./.claude/scripts/pre-commit-checks.sh

# Check if tests pass
./.claude/scripts/require-tests-pass.sh

# Format all modified files
./.claude/scripts/auto-format.sh

# Sync dependencies
./.claude/scripts/sync-deps.sh
```

---

## Script Requirements

### Permissions
Scripts must be executable:
```bash
chmod +x .claude/scripts/*.sh
```

### Exit Codes
- `0`: Success - allow operation to proceed
- `1`: Failure - operation continues with warning
- `2`: Block - operation is blocked (for PreToolUse)

### Output
- `stdout`: Informational messages (displayed to user)
- `stderr`: Warnings and errors (highlighted to user)

---

## Environment Variables

Scripts have access to these variables from hooks:

| Variable | Description |
|----------|-------------|
| `$file_path` | Path to the file being edited |
| `$tool` | Name of the tool being used |
| `$tool_input` | JSON string of tool input |

---

## Customization

### Adding New Scripts

1. Create script in this directory
2. Add shebang: `#!/bin/bash` or `#!/usr/bin/env bash`
3. Make executable: `chmod +x script.sh`
4. Add hook configuration to `.claude/settings.json`
5. Document in this README

### Script Template

```bash
#!/bin/bash
# =============================================================================
# Script Name
# Description: What this script does
# Usage: ./script.sh [args]
# =============================================================================

set -euo pipefail

# Constants
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Functions
log_info() {
    echo "[INFO] $*"
}

log_warn() {
    echo "[WARN] $*" >&2
}

log_error() {
    echo "[ERROR] $*" >&2
}

# Main
main() {
    # Script logic here
    log_info "Running script..."
}

main "$@"
```

---

## Best Practices

### Performance
- Scripts should complete in <100ms for hooks
- Use quick checks (grep -q) over full scans
- Avoid network requests in hooks
- Cache results when possible

### Safety
- Use `set -euo pipefail` for strict mode
- Quote all variables: `"$var"`
- Use `[[` instead of `[` for conditionals
- Handle missing files/directories gracefully

### Portability
- Use `/usr/bin/env bash` shebang
- Avoid bash-specific features when possible
- Test on macOS, Linux, and Windows (Git Bash)
- Use `$()` instead of backticks

---

## Troubleshooting

### Script Not Executing
```bash
# Check permissions
ls -la .claude/scripts/

# Make executable
chmod +x .claude/scripts/*.sh
```

### Script Blocking Operations
```bash
# Check exit code
./.claude/scripts/pre-commit-checks.sh
echo $?  # Should be 0 for success
```

### Debugging
```bash
# Run with debug output
bash -x ./.claude/scripts/pre-commit-checks.sh
```

---

## Integration with CI/CD

These scripts can also be used in GitHub Actions:

```yaml
- name: Run pre-commit checks
  run: ./.claude/scripts/pre-commit-checks.sh

- name: Verify tests pass
  run: ./.claude/scripts/require-tests-pass.sh
```
