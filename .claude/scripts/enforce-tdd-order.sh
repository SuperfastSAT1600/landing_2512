#!/bin/bash
# =============================================================================
# Enforce TDD Order
# Description: After a spec is written, the FIRST code file written must be a
#              test file. This enforces the RED phase of TDD (write failing test
#              before implementation).
# Called by: PreToolUse hook on Edit, Write (non-spec files)
#
# State file: .claude/.tdd-test-written
#   - Absent = test must come first (RED phase)
#   - Present = implementation allowed (GREEN phase)
#
# The flag is CLEARED when a new spec is written (clear-plan-flag.sh)
# The flag is SET when a test file is written (PostToolUse hook)
#
# Exit codes:
#   0 = allow
#   2 = BLOCK (must write test first)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TDD_FLAG="$PROJECT_ROOT/.claude/.tdd-test-written"
SPEC_FLAG="$PROJECT_ROOT/.claude/.plan-active"

# Read hook input from stdin
INPUT=$(cat)

# If no spec gate is active AND no tdd flag management is needed, allow
# The TDD flag only matters AFTER a spec has been written in this session
# We detect this by checking for the tdd-needs-test flag
TDD_NEEDS_TEST="$PROJECT_ROOT/.claude/.tdd-needs-test"

if [[ ! -f "$TDD_NEEDS_TEST" ]]; then
    exit 0
fi

# TDD is active — check if a test has been written yet
if [[ -f "$TDD_FLAG" ]]; then
    # Test already written in this cycle — allow implementation
    exit 0
fi

# Extract tool info
TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_name',''))" 2>/dev/null || echo "")
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))" 2>/dev/null || echo "")

# Allow writes to spec/plan files
if [[ "$FILE_PATH" == *".claude/plans/"* ]] || [[ "$FILE_PATH" == *".claude/"* ]]; then
    exit 0
fi

# Allow writes to config files (package.json, tsconfig, etc.)
case "$FILE_PATH" in
    *.json|*.config.*|*.yml|*.yaml|*.toml|*.env*|*.gitignore|*.md)
        exit 0
        ;;
esac

# Check if target is a test file
is_test_file() {
    local f="$1"
    case "$f" in
        *.test.ts|*.test.tsx|*.test.js|*.test.jsx) return 0 ;;
        *.spec.ts|*.spec.tsx|*.spec.js|*.spec.jsx) return 0 ;;
        *_test.go|*_test.py|test_*.py) return 0 ;;
        */__tests__/*|*/tests/*|*/test/*|*/e2e/*) return 0 ;;
    esac
    return 1
}

if is_test_file "$FILE_PATH"; then
    # Writing a test file — allow and mark TDD flag
    touch "$TDD_FLAG"
    exit 0
fi

# Not a test file and no test written yet — BLOCK
echo "[Hook] TDD ENFORCEMENT: Write a failing test FIRST (RED phase)." >&2
echo "" >&2
echo "[Hook] You are in the RED phase of TDD. Before writing implementation code:" >&2
echo "[Hook]   1. Create a test file (*.test.ts, *.spec.ts, etc.)" >&2
echo "[Hook]   2. Write a failing test for the current REQ" >&2
echo "[Hook]   3. Then implement the code to make it pass (GREEN phase)" >&2
echo "[Hook]" >&2
echo "[Hook] Target file blocked: ${FILE_PATH##*/}" >&2
exit 2
