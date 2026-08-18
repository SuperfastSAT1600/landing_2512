#!/bin/bash
# =============================================================================
# Block Commit if Unverified
# Description: Prevents git commit if source code was written but not verified
#              (tests not run, no Playwright check, no build verification).
# Called by: PreToolUse hook on Bash with "git commit"
#
# Exit codes:
#   0 = allow (no flag, or verification done)
#   2 = BLOCK (code written but not verified)
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FLAG_FILE="$PROJECT_ROOT/.claude/.needs-verification"

# Read hook input from stdin
cat > /dev/null

if [[ ! -f "$FLAG_FILE" ]]; then
    exit 0
fi

echo "[Hook] BLOCKED: You wrote code but haven't verified it works yet." >&2
echo "" >&2
echo "[Hook] Before committing, you MUST verify your changes:" >&2
echo "[Hook]   - Run the test suite (npm test, pytest, cargo test, etc.)" >&2
echo "[Hook]   - For UI changes: use Playwright MCP to visually check the page" >&2
echo "[Hook]   - For API changes: call the endpoint and inspect the response" >&2
echo "[Hook]   - For builds: run the build and check for errors" >&2
echo "[Hook]" >&2
echo "[Hook] If verification fails, FIX the issue and verify again." >&2
echo "[Hook] The verify-fix loop continues until everything passes." >&2
exit 2
