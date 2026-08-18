#!/bin/bash
# =============================================================================
# Clear Needs-Verification Flag
# Description: After running tests, Playwright checks, or other verification
#              commands, clear the needs-verification flag.
# Called by: PostToolUse hook on Bash with test/verification commands
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FLAG_FILE="$PROJECT_ROOT/.claude/.needs-verification"

# Read hook input from stdin
INPUT=$(cat)

COMMAND=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('command',''))" 2>/dev/null || echo "")

# Check if command is a verification/test command
is_verification_command() {
    local cmd="$1"
    # Test runners
    echo "$cmd" | grep -qE '(npm test|npx (vitest|jest|playwright|mocha)|yarn test|pnpm test|pytest|cargo test|go test|ruby -e|rspec|mix test)' && return 0
    # Playwright MCP-related (browser checks)
    echo "$cmd" | grep -qE '(playwright|cypress)' && return 0
    # Manual verification (curl, httpie, wget for API checks)
    echo "$cmd" | grep -qE '^(curl |http |wget )' && return 0
    # Build verification
    echo "$cmd" | grep -qE '(npm run build|npx tsc|yarn build|pnpm build)' && return 0
    # Lint/type check
    echo "$cmd" | grep -qE '(npx tsc --noEmit|eslint|biome check)' && return 0
    return 1
}

if is_verification_command "$COMMAND"; then
    rm -f "$FLAG_FILE" 2>/dev/null
fi

exit 0
