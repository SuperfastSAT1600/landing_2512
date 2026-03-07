#!/bin/bash
# =============================================================================
# TaskCompleted Hook: TDD Enforcement
# Fires when any task is marked as completed.
# Blocks completion if the task references a REQ-XXX and:
#   1. No test file references that REQ ID
#   2. The test suite is failing
#
# Exit 0 = allow completion
# Exit 2 = block completion (stderr fed back as feedback)
# =============================================================================

set -uo pipefail

INPUT=$(cat)
TASK_SUBJECT=$(echo "$INPUT" | jq -r '.task_subject // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

# Extract REQ ID from task subject (convention: "REQ-XXX: description")
REQ_ID=$(echo "$TASK_SUBJECT" | grep -oE 'REQ-[0-9]{3}' | head -1)

# Check verification flag — blocks ALL task completion if code was written but not verified
NEEDS_VERIFY="${WORK_DIR}/.claude/.needs-verification"
if [[ -f "$NEEDS_VERIFY" ]]; then
    echo "Verification enforcement: Code was written but not verified. Run tests or Playwright checks before completing this task." >&2
    exit 2
fi

# Not a REQ task — allow completion (verification flag already checked above)
if [[ -z "$REQ_ID" ]]; then
    exit 0
fi

# Use cwd from hook input, fall back to current directory
WORK_DIR="${CWD:-.}"

# --- Check 1: Test file referencing this REQ exists ---
TEST_FILES=$(grep -rl "$REQ_ID" "$WORK_DIR" \
    --include="*.test.*" \
    --include="*.spec.*" \
    --include="*_test.*" \
    --include="*.test.ts" \
    --include="*.test.tsx" \
    --include="*.test.js" \
    --include="*.test.jsx" \
    --include="*.spec.ts" \
    --include="*.spec.tsx" \
    --include="*.spec.js" \
    --include="*.spec.jsx" \
    --include="*_test.go" \
    --include="*_test.py" \
    --include="test_*.py" \
    2>/dev/null || true)

if [[ -z "$TEST_FILES" ]]; then
    echo "TDD enforcement: No test references $REQ_ID. Write a test named test('$REQ_ID: observable behavior', () => { ... }) before completing this task." >&2
    exit 2
fi

# --- Check 2: Test suite passes ---
# Auto-detect test runner based on project files
if [[ -f "$WORK_DIR/package.json" ]]; then
    # Node.js project — check for test script
    if grep -q '"test"' "$WORK_DIR/package.json" 2>/dev/null; then
        TEST_OUTPUT=$(cd "$WORK_DIR" && npm test -- --passWithNoTests 2>&1) || {
            echo "TDD enforcement: Tests failing for $REQ_ID. Fix tests before completing this task." >&2
            echo "Test output (last 20 lines):" >&2
            echo "$TEST_OUTPUT" | tail -20 >&2
            exit 2
        }
    fi
elif [[ -f "$WORK_DIR/Cargo.toml" ]]; then
    TEST_OUTPUT=$(cd "$WORK_DIR" && cargo test 2>&1) || {
        echo "TDD enforcement: Tests failing for $REQ_ID. Fix tests before completing." >&2
        echo "$TEST_OUTPUT" | tail -20 >&2
        exit 2
    }
elif [[ -f "$WORK_DIR/go.mod" ]]; then
    TEST_OUTPUT=$(cd "$WORK_DIR" && go test ./... 2>&1) || {
        echo "TDD enforcement: Tests failing for $REQ_ID. Fix tests before completing." >&2
        echo "$TEST_OUTPUT" | tail -20 >&2
        exit 2
    }
elif [[ -f "$WORK_DIR/pyproject.toml" ]] || [[ -f "$WORK_DIR/setup.py" ]]; then
    TEST_OUTPUT=$(cd "$WORK_DIR" && python -m pytest 2>&1) || {
        echo "TDD enforcement: Tests failing for $REQ_ID. Fix tests before completing." >&2
        echo "$TEST_OUTPUT" | tail -20 >&2
        exit 2
    }
fi

exit 0
