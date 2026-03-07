#!/bin/bash
# =============================================================================
# Verify Merge
# Description: Post-merge verification — run tests and check REQ coverage
# Usage: ./.claude/scripts/verify-merge.sh [spec-file]
# Exit Codes: 0 = all covered, 1 = warnings (missing coverage), 2 = test failure
# =============================================================================

set -euo pipefail

# Constants
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly PLANS_DIR="$PROJECT_ROOT/.claude/plans"

# Colors
if [[ -t 1 ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[0;33m'
    BLUE='\033[0;34m'
    NC='\033[0m'
else
    RED=''; GREEN=''; YELLOW=''; BLUE=''; NC=''
fi

log_pass() { echo -e "${GREEN}[PASS]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*" >&2; }
log_fail() { echo -e "${RED}[FAIL]${NC} $*" >&2; }
log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }

# =============================================================================
# Find Spec File
# =============================================================================

find_spec_file() {
    local spec_path="${1:-}"

    if [[ -n "$spec_path" && -f "$spec_path" ]]; then
        echo "$spec_path"
        return 0
    fi

    if [[ -d "$PLANS_DIR" ]]; then
        local latest
        latest=$(find "$PLANS_DIR" -name "*.md" -type f -print0 2>/dev/null | xargs -0 ls -t 2>/dev/null | head -n 1)
        if [[ -n "$latest" ]]; then
            echo "$latest"
            return 0
        fi
    fi

    log_fail "No spec file found. Usage: $0 [spec-file]"
    return 1
}

# =============================================================================
# Step 1: Run Test Suite
# =============================================================================

run_tests() {
    echo ""
    echo -e "${BLUE}[1/2] Running Test Suite${NC}"

    cd "$PROJECT_ROOT"
    local test_cmd=""

    if [[ -f "package.json" ]] && grep -q '"test"' package.json 2>/dev/null; then
        test_cmd="npm test"
    elif [[ -f "vitest.config.ts" ]] || [[ -f "vitest.config.js" ]]; then
        test_cmd="npx vitest run"
    elif [[ -f "jest.config.ts" ]] || [[ -f "jest.config.js" ]]; then
        test_cmd="npx jest"
    elif [[ -f "pytest.ini" ]] || [[ -f "pyproject.toml" ]]; then
        test_cmd="pytest"
    elif [[ -f "go.mod" ]]; then
        test_cmd="go test ./..."
    elif [[ -f "Cargo.toml" ]]; then
        test_cmd="cargo test"
    fi

    if [[ -z "$test_cmd" ]]; then
        log_warn "No test framework detected — skipping test run"
        return 0
    fi

    log_info "Running: $test_cmd"
    if eval "$test_cmd" 2>&1; then
        log_pass "All tests pass"
        return 0
    else
        log_fail "Tests failed — fix before merging"
        return 2
    fi
}

# =============================================================================
# Step 2: REQ Coverage Matrix (delegates to req-coverage.sh)
# =============================================================================

check_req_coverage() {
    local spec_file="$1"

    echo ""
    echo -e "${BLUE}[2/2] REQ Coverage Matrix${NC}"

    if [[ -f "$SCRIPT_DIR/req-coverage.sh" ]]; then
        bash "$SCRIPT_DIR/req-coverage.sh" "$spec_file"
        return $?
    fi

    log_warn "req-coverage.sh not found — skipping REQ coverage check"
    return 1
}

# =============================================================================
# Main
# =============================================================================

main() {
    echo "=============================================="
    echo "Post-Merge Verification"
    echo "=============================================="

    local spec_file
    spec_file=$(find_spec_file "${1:-}") || exit 2

    local relpath="${spec_file#$PROJECT_ROOT/}"
    log_info "Spec: $relpath"

    local exit_code=0

    # Step 1: Run tests
    run_tests || exit_code=$?

    # If tests failed, stop here
    if [[ $exit_code -eq 2 ]]; then
        echo ""
        echo -e "${RED}VERIFICATION FAILED: Tests do not pass${NC}"
        exit 2
    fi

    # Step 2: REQ coverage
    check_req_coverage "$spec_file" || {
        [[ $exit_code -lt 1 ]] && exit_code=1
    }

    # Final summary
    echo ""
    echo "=============================================="
    if [[ $exit_code -eq 0 ]]; then
        echo -e "${GREEN}VERIFIED: All tests pass, all REQs covered${NC}"
    elif [[ $exit_code -eq 1 ]]; then
        echo -e "${YELLOW}WARNINGS: Tests pass but some REQs lack coverage${NC}"
    else
        echo -e "${RED}FAILED: Test failures detected${NC}"
    fi

    exit $exit_code
}

main "$@"
