#!/bin/bash
# =============================================================================
# Require Tests Pass
# Description: Gate PR creation on passing tests
# Usage: ./.claude/scripts/require-tests-pass.sh
# Exit Codes: 0 = tests pass, 2 = tests fail (blocks PR)
# =============================================================================

set -euo pipefail

# Constants
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly TIMEOUT_SECONDS=300  # 5 minutes max

# Colors
if [[ -t 1 ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[0;33m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    NC=''
fi

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${GREEN}[INFO]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

detect_test_command() {
    cd "$PROJECT_ROOT"

    # Check package.json for test script
    if [[ -f "package.json" ]]; then
        if grep -q '"test"' package.json; then
            echo "npm test"
            return 0
        fi
    fi

    # Check for specific test frameworks
    if [[ -f "vitest.config.ts" ]] || [[ -f "vitest.config.js" ]]; then
        echo "npx vitest run"
        return 0
    fi

    if [[ -f "jest.config.ts" ]] || [[ -f "jest.config.js" ]]; then
        echo "npx jest"
        return 0
    fi

    if [[ -f "playwright.config.ts" ]]; then
        echo "npx playwright test"
        return 0
    fi

    # Python
    if [[ -f "pytest.ini" ]] || [[ -f "pyproject.toml" ]]; then
        echo "pytest"
        return 0
    fi

    # Go
    if [[ -f "go.mod" ]]; then
        echo "go test ./..."
        return 0
    fi

    # Rust
    if [[ -f "Cargo.toml" ]]; then
        echo "cargo test"
        return 0
    fi

    # No test framework detected
    echo ""
}

run_tests() {
    local test_cmd="$1"
    local start_time
    local end_time
    local duration

    log_info "Running tests: $test_cmd"
    start_time=$(date +%s)

    # Run tests with timeout
    if timeout "$TIMEOUT_SECONDS" bash -c "$test_cmd" 2>&1; then
        end_time=$(date +%s)
        duration=$((end_time - start_time))
        log_info "Tests passed in ${duration}s"
        return 0
    else
        local exit_code=$?
        end_time=$(date +%s)
        duration=$((end_time - start_time))

        if [[ $exit_code -eq 124 ]]; then
            log_error "Tests timed out after ${TIMEOUT_SECONDS}s"
        else
            log_error "Tests failed after ${duration}s (exit code: $exit_code)"
        fi
        return 1
    fi
}

check_test_files_exist() {
    cd "$PROJECT_ROOT"

    # Look for test files
    local test_patterns=(
        "**/*.test.ts"
        "**/*.test.tsx"
        "**/*.test.js"
        "**/*.spec.ts"
        "**/*.spec.tsx"
        "**/*.spec.js"
        "**/test_*.py"
        "**/*_test.py"
        "**/*_test.go"
    )

    for pattern in "${test_patterns[@]}"; do
        if compgen -G "$pattern" > /dev/null 2>&1; then
            return 0
        fi
    done

    # Check common test directories
    local test_dirs=("test" "tests" "__tests__" "spec")
    for dir in "${test_dirs[@]}"; do
        if [[ -d "$dir" ]] && [[ -n "$(ls -A "$dir" 2>/dev/null)" ]]; then
            return 0
        fi
    done

    return 1
}

# =============================================================================
# Main
# =============================================================================

main() {
    echo "=============================================="
    echo "Verifying Tests Pass"
    echo "=============================================="
    echo ""

    cd "$PROJECT_ROOT"

    # Check if test files exist
    if ! check_test_files_exist; then
        log_warn "No test files found in project"
        log_warn "Consider adding tests before creating PR"
        echo ""
        echo "=============================================="
        echo -e "${YELLOW}SKIPPED: No tests to run${NC}"
        exit 0
    fi

    # Detect test command
    local test_cmd
    test_cmd=$(detect_test_command)

    if [[ -z "$test_cmd" ]]; then
        log_warn "Could not detect test framework"
        log_warn "Supported: npm test, vitest, jest, pytest, go test, cargo test"
        echo ""
        echo "=============================================="
        echo -e "${YELLOW}SKIPPED: Unknown test framework${NC}"
        exit 0
    fi

    # Run tests
    if run_tests "$test_cmd"; then
        echo ""
        echo "=============================================="
        echo -e "${GREEN}PASSED: All tests pass${NC}"
        echo "Ready to create PR"
        exit 0
    else
        echo ""
        echo "=============================================="
        echo -e "${RED}BLOCKED: Tests must pass before creating PR${NC}"
        echo ""
        echo "To fix:"
        echo "  1. Run tests locally: $test_cmd"
        echo "  2. Fix failing tests"
        echo "  3. Try creating PR again"
        exit 2  # Block PR creation
    fi
}

main "$@"
