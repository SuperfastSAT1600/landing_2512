#!/bin/bash
# =============================================================================
# Enforce Spec Before Coding
# Description: Block Edit/Write/Task/Bash (coding tools) if plan mode was active
#              but no spec has been written to .claude/plans/ yet.
# Called by: PreToolUse hook on Edit, Write, Task, Bash
#
# How it works:
#   1. SessionStart hook creates .claude/.plan-active flag (since defaultMode=plan)
#   2. This script checks: if flag exists → BLOCK (with exceptions for spec-writing and read-only)
#   3. Flag is ONLY cleared by PostToolUse hook (clear-plan-flag.sh) after spec passes audit
#
# Exit codes:
#   0 = allow (no flag, or allowed tool/path)
#   2 = BLOCK (flag set, coding tool not targeting spec)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FLAG_FILE="$PROJECT_ROOT/.claude/.plan-active"
PLANS_DIR="$PROJECT_ROOT/.claude/plans"

# Read hook input from stdin
INPUT=$(cat)

# No flag = not in plan-needs-spec state → allow
if [[ ! -f "$FLAG_FILE" ]]; then
    exit 0
fi

# Flag exists — spec gate is active, only cleared by PostToolUse hook (clear-plan-flag.sh)

# --- BLOCK ---
# Allow some tools through (reading, exploring are OK)
TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_name',''))" 2>/dev/null || echo "")

# Allow Write ONLY to .claude/plans/ (that's writing the spec itself)
if [[ "$TOOL_NAME" == "Write" ]]; then
    FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))" 2>/dev/null || echo "")
    if [[ "$FILE_PATH" == *".claude/plans/"* ]]; then
        exit 0
    fi
fi

# Allow Edit to .claude/plans/ too
if [[ "$TOOL_NAME" == "Edit" ]]; then
    FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))" 2>/dev/null || echo "")
    if [[ "$FILE_PATH" == *".claude/plans/"* ]]; then
        exit 0
    fi
fi

# Allow Bash commands that are read-only (git status, ls, cat, etc.)
if [[ "$TOOL_NAME" == "Bash" ]]; then
    COMMAND=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('command',''))" 2>/dev/null || echo "")
    # Allow read-only commands
    if echo "$COMMAND" | grep -qE '^(git (status|log|diff|branch)|ls|cat |head |tail |wc |find |grep |echo |pwd|mkdir -p .claude/plans)'; then
        exit 0
    fi
fi

# Block everything else
echo "[Hook] BLOCKED — You are in plan mode but haven't written a spec yet." >&2
echo "" >&2
echo "[Hook] CLAUDE ACTION REQUIRED:" >&2
echo "[Hook]   1. Create .claude/plans/[feature-name].md using .claude/templates/spec.md.template" >&2
echo "[Hook]   2. Include REQ-XXX IDs, (TEST)/(BROWSER)/(MANUAL) tags, and a traceability matrix" >&2
echo "[Hook]   3. After writing the spec, your coding tools will be unblocked automatically" >&2
echo "[Hook]" >&2
echo "[Hook] The spec file MUST be written before any implementation can begin." >&2
exit 2
