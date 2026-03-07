#!/bin/bash
# =============================================================================
# Checkpoint — Unified Verification Gate
# Description: Run all automated quality checks as a single pipeline
# Usage: ./.claude/scripts/checkpoint.sh [--skip-build] [--skip-security]
# Exit Codes: 0 = all pass, 1 = warnings, 2 = any failure
# =============================================================================

set -euo pipefail

# Constants
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Options
SKIP_BUILD=false
SKIP_SECURITY=false
SKIP_REQ_COVERAGE=false
for arg in "$@"; do
    case "$arg" in
        --skip-build) SKIP_BUILD=true ;;
        --skip-security) SKIP_SECURITY=true ;;
        --skip-req-coverage) SKIP_REQ_COVERAGE=true ;;
    esac
done

# Colors
if [[ -t 1 ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[0;33m'
    BLUE='\033[0;34m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    NC=''
fi

# Counters
PASSED=0
FAILED=0
SKIPPED=0
WARNINGS=0
RESULTS=()

# Tracks the spec file used during REQ coverage check (for archiving)
ACTIVE_SPEC_FILE=""

# =============================================================================
# Helper Functions
# =============================================================================

log_pass() {
    echo -e "  ${GREEN}PASS${NC} $*"
}

log_fail() {
    echo -e "  ${RED}FAIL${NC} $*"
}

log_skip() {
    echo -e "  ${YELLOW}SKIP${NC} $*"
}

log_warn() {
    echo -e "  ${YELLOW}WARN${NC} $*"
}

run_step() {
    local name="$1"
    local cmd="$2"
    local start_time end_time duration

    start_time=$(date +%s)

    if eval "$cmd" > /dev/null 2>&1; then
        end_time=$(date +%s)
        duration=$((end_time - start_time))
        log_pass "$name (${duration}s)"
        PASSED=$((PASSED + 1))
        RESULTS+=("PASS: $name")
    else
        end_time=$(date +%s)
        duration=$((end_time - start_time))
        log_fail "$name (${duration}s)"
        FAILED=$((FAILED + 1))
        RESULTS+=("FAIL: $name")
    fi
}

skip_step() {
    local name="$1"
    local reason="$2"
    log_skip "$name — $reason"
    SKIPPED=$((SKIPPED + 1))
    RESULTS+=("SKIP: $name")
}

# =============================================================================
# Step 1: TypeScript Type Checking
# =============================================================================

check_typescript() {
    echo ""
    echo -e "${BLUE}[1/10] TypeScript${NC}"

    cd "$PROJECT_ROOT"

    if [[ -f "tsconfig.json" ]]; then
        if command -v npx > /dev/null 2>&1; then
            run_step "tsc --noEmit" "npx tsc --noEmit 2>&1"
        else
            skip_step "TypeScript" "npx not available"
        fi
    else
        skip_step "TypeScript" "no tsconfig.json found"
    fi
}

# =============================================================================
# Step 2: Linting
# =============================================================================

check_lint() {
    echo ""
    echo -e "${BLUE}[2/10] Lint${NC}"

    cd "$PROJECT_ROOT"

    local found_linter=false

    # ESLint (JS/TS)
    if [[ -f ".eslintrc" ]] || [[ -f ".eslintrc.js" ]] || [[ -f ".eslintrc.json" ]] || [[ -f ".eslintrc.yml" ]] || [[ -f "eslint.config.js" ]] || [[ -f "eslint.config.mjs" ]]; then
        run_step "ESLint" "npx eslint . --max-warnings 0 2>&1"
        found_linter=true
    elif [[ -f "package.json" ]] && grep -q '"eslint"' package.json 2>/dev/null; then
        run_step "ESLint" "npx eslint . --max-warnings 0 2>&1"
        found_linter=true
    fi

    # Ruff (Python)
    if [[ -f "ruff.toml" ]] || [[ -f "pyproject.toml" ]] && grep -q "ruff" pyproject.toml 2>/dev/null; then
        if command -v ruff > /dev/null 2>&1; then
            run_step "Ruff" "ruff check . 2>&1"
            found_linter=true
        fi
    fi

    # Go vet
    if [[ -f "go.mod" ]]; then
        if command -v go > /dev/null 2>&1; then
            run_step "go vet" "go vet ./... 2>&1"
            found_linter=true
        fi
    fi

    # Clippy (Rust)
    if [[ -f "Cargo.toml" ]]; then
        if command -v cargo > /dev/null 2>&1; then
            run_step "Clippy" "cargo clippy -- -D warnings 2>&1"
            found_linter=true
        fi
    fi

    if [[ "$found_linter" == "false" ]]; then
        skip_step "Lint" "no linter configuration found"
    fi
}

# =============================================================================
# Step 3: Format Check
# =============================================================================

check_format() {
    echo ""
    echo -e "${BLUE}[3/10] Format${NC}"

    cd "$PROJECT_ROOT"

    local found_formatter=false

    # Prettier (JS/TS)
    if [[ -f ".prettierrc" ]] || [[ -f ".prettierrc.json" ]] || [[ -f ".prettierrc.js" ]] || [[ -f "prettier.config.js" ]]; then
        run_step "Prettier" "npx prettier --check . 2>&1"
        found_formatter=true
    elif [[ -f "package.json" ]] && grep -q '"prettier"' package.json 2>/dev/null; then
        run_step "Prettier" "npx prettier --check . 2>&1"
        found_formatter=true
    fi

    # Black (Python)
    if [[ -f "pyproject.toml" ]] && grep -q "black" pyproject.toml 2>/dev/null; then
        if command -v black > /dev/null 2>&1; then
            run_step "Black" "black --check . 2>&1"
            found_formatter=true
        fi
    fi

    # gofmt (Go)
    if [[ -f "go.mod" ]]; then
        if command -v gofmt > /dev/null 2>&1; then
            run_step "gofmt" "test -z \"\$(gofmt -l . 2>&1)\" 2>&1"
            found_formatter=true
        fi
    fi

    # rustfmt (Rust)
    if [[ -f "Cargo.toml" ]]; then
        if command -v cargo > /dev/null 2>&1; then
            run_step "rustfmt" "cargo fmt -- --check 2>&1"
            found_formatter=true
        fi
    fi

    if [[ "$found_formatter" == "false" ]]; then
        skip_step "Format" "no formatter configuration found"
    fi
}

# =============================================================================
# Step 4: Tests
# =============================================================================

check_tests() {
    echo ""
    echo -e "${BLUE}[4/10] Tests${NC}"

    cd "$PROJECT_ROOT"

    # Reuse detection logic from require-tests-pass.sh
    local test_cmd=""

    # Check package.json for test script
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

    if [[ -n "$test_cmd" ]]; then
        run_step "Tests ($test_cmd)" "$test_cmd 2>&1"
    else
        skip_step "Tests" "no test framework detected"
    fi
}

# =============================================================================
# Step 5: E2E / Browser Tests
# =============================================================================

check_e2e() {
    echo ""
    echo -e "${BLUE}[5/10] E2E / Browser Tests${NC}"

    cd "$PROJECT_ROOT"

    # Check if Playwright is installed
    if [[ -f "playwright.config.ts" ]] || [[ -f "playwright.config.js" ]]; then
        run_step "Playwright E2E" "npx playwright test 2>&1"
    elif [[ -f "cypress.config.ts" ]] || [[ -f "cypress.config.js" ]]; then
        run_step "Cypress E2E" "npx cypress run 2>&1"
    elif [[ -d "e2e" ]] || [[ -d "tests/e2e" ]]; then
        # e2e directory exists but no config — warn
        log_warn "E2E test directory found but no Playwright/Cypress config"
        WARNINGS=$((WARNINGS + 1))
        RESULTS+=("WARN: E2E tests unconfigured")
    else
        skip_step "E2E Tests" "no Playwright/Cypress config found"
    fi
}

# =============================================================================
# Step 6: Build
# =============================================================================

check_build() {
    echo ""
    echo -e "${BLUE}[6/10] Build${NC}"

    cd "$PROJECT_ROOT"

    if [[ "$SKIP_BUILD" == "true" ]]; then
        skip_step "Build" "skipped via --skip-build"
        return
    fi

    local build_cmd=""

    if [[ -f "package.json" ]] && grep -q '"build"' package.json 2>/dev/null; then
        build_cmd="npm run build"
    elif [[ -f "Cargo.toml" ]]; then
        build_cmd="cargo build"
    elif [[ -f "go.mod" ]]; then
        build_cmd="go build ./..."
    fi

    if [[ -n "$build_cmd" ]]; then
        run_step "Build ($build_cmd)" "$build_cmd 2>&1"
    else
        skip_step "Build" "no build script detected"
    fi
}

# =============================================================================
# Step 7: Security Audit
# =============================================================================

check_security() {
    echo ""
    echo -e "${BLUE}[7/10] Security${NC}"

    cd "$PROJECT_ROOT"

    if [[ "$SKIP_SECURITY" == "true" ]]; then
        skip_step "Security" "skipped via --skip-security"
        return
    fi

    local found_audit=false

    # npm audit
    if [[ -f "package-lock.json" ]]; then
        run_step "npm audit" "npm audit --audit-level=moderate 2>&1"
        found_audit=true
    elif [[ -f "yarn.lock" ]]; then
        run_step "yarn audit" "yarn audit --level moderate 2>&1"
        found_audit=true
    fi

    # pip audit (Python)
    if [[ -f "requirements.txt" ]] || [[ -f "Pipfile.lock" ]]; then
        if command -v pip-audit > /dev/null 2>&1; then
            run_step "pip-audit" "pip-audit 2>&1"
            found_audit=true
        fi
    fi

    # cargo audit (Rust)
    if [[ -f "Cargo.lock" ]]; then
        if command -v cargo-audit > /dev/null 2>&1; then
            run_step "cargo audit" "cargo audit 2>&1"
            found_audit=true
        fi
    fi

    if [[ "$found_audit" == "false" ]]; then
        skip_step "Security" "no lock file or audit tool found"
    fi
}

# =============================================================================
# Step 8: Mutation Testing (Optional)
# =============================================================================

check_mutation() {
    echo ""
    echo -e "${BLUE}[8/10] Mutation Testing (optional)${NC}"

    cd "$PROJECT_ROOT"

    if [[ -f "stryker.conf.js" ]] || [[ -f "stryker.conf.mjs" ]] || [[ -f "stryker.conf.json" ]]; then
        run_step "Stryker mutation testing" "npx stryker run --reporters clear-text 2>&1"
    else
        skip_step "Mutation testing" "no Stryker config found (optional)"
    fi
}

# =============================================================================
# Step 9: Test Pyramid Check (Optional)
# =============================================================================

check_test_pyramid() {
    echo ""
    echo -e "${BLUE}[9/10] Test Pyramid (advisory)${NC}"

    cd "$PROJECT_ROOT"

    local unit=0
    local integration=0
    local e2e=0

    # Count test files by convention
    unit=$(find . -type f \( -name "*.test.ts" -o -name "*.test.js" -o -name "*.test.tsx" -o -name "*.test.jsx" -o -name "*_test.go" -o -name "*_test.py" \) ! -path "*/e2e/*" ! -path "*/integration/*" 2>/dev/null | wc -l | tr -d ' ')
    integration=$(find . -type f \( -path "*/integration/*" -o -name "*.integration.*" \) 2>/dev/null | wc -l | tr -d ' ')
    e2e=$(find . -type f \( -path "*/e2e/*" -o -name "*.e2e.*" -o -name "*.spec.ts" -o -name "*.spec.js" \) -path "*/e2e/*" 2>/dev/null | wc -l | tr -d ' ')

    if [[ $((unit + integration + e2e)) -eq 0 ]]; then
        skip_step "Test Pyramid" "no test files detected"
        return
    fi

    log_info "  Unit: $unit | Integration: $integration | E2E: $e2e"

    if [[ $e2e -gt $unit ]] && [[ $unit -gt 0 ]]; then
        log_warn "Test Pyramid — inverted: more E2E ($e2e) than unit ($unit) tests"
        WARNINGS=$((WARNINGS + 1))
        RESULTS+=("WARN: Test Pyramid inverted")
    else
        log_pass "Test Pyramid shape OK"
        PASSED=$((PASSED + 1))
        RESULTS+=("PASS: Test Pyramid")
    fi
}

# =============================================================================
# Step 10: REQ Coverage (Optional — runs when spec exists)
# =============================================================================

check_req_coverage() {
    echo ""
    echo -e "${BLUE}[10/10] REQ Coverage (optional)${NC}"

    cd "$PROJECT_ROOT"

    if [[ "$SKIP_REQ_COVERAGE" == "true" ]]; then
        skip_step "REQ Coverage" "skipped via --skip-req-coverage"
        return
    fi

    local plans_dir="$PROJECT_ROOT/.claude/plans"
    local req_script="$SCRIPT_DIR/req-coverage.sh"

    if [[ ! -f "$req_script" ]]; then
        skip_step "REQ Coverage" "req-coverage.sh not found"
        return
    fi

    if [[ ! -d "$plans_dir" ]]; then
        skip_step "REQ Coverage" "no .claude/plans/ directory"
        return
    fi

    local spec_file
    spec_file=$(find "$plans_dir" -name "*.md" -type f -print0 2>/dev/null | xargs -0 ls -t 2>/dev/null | head -n 1)

    if [[ -z "$spec_file" ]]; then
        skip_step "REQ Coverage" "no spec files in .claude/plans/"
        return
    fi

    ACTIVE_SPEC_FILE="$spec_file"
    run_step "REQ Coverage ($(basename "$spec_file"))" "bash '$req_script' '$spec_file' 2>&1"
}

# =============================================================================
# Archive Spec
# =============================================================================

archive_spec() {
    local spec_file="$1"
    local archive_dir
    archive_dir="$(dirname "$spec_file")/archive"

    # Update status to Complete
    if sed -i '' 's/^\*\*Status\*\*:.*/**Status**: Complete/' "$spec_file" 2>/dev/null; then
        echo -e "  ${GREEN}INFO${NC} Spec marked Complete: $(basename "$spec_file")"
    else
        echo -e "  ${YELLOW}WARN${NC} Could not update spec status (continuing)"
        return 0
    fi

    # Move to archive/
    mkdir -p "$archive_dir" 2>/dev/null || true
    if mv "$spec_file" "$archive_dir/" 2>/dev/null; then
        echo -e "  ${GREEN}INFO${NC} Spec archived → .claude/plans/archive/$(basename "$spec_file")"
    else
        echo -e "  ${YELLOW}WARN${NC} Could not move spec to archive/ (continuing)"
    fi
}

# =============================================================================
# Main
# =============================================================================

main() {
    echo "=============================================="
    echo "Checkpoint — Unified Verification Gate"
    echo "=============================================="
    echo "Project: $PROJECT_ROOT"
    echo "Date:    $(date '+%Y-%m-%d %H:%M:%S')"

    local total_start
    total_start=$(date +%s)

    cd "$PROJECT_ROOT"

    check_typescript
    check_lint
    check_format
    check_tests
    check_e2e
    check_build
    check_security
    check_mutation
    check_test_pyramid
    check_req_coverage

    local total_end
    total_end=$(date +%s)
    local total_duration=$((total_end - total_start))

    # Summary
    local total=$((PASSED + FAILED + SKIPPED))
    echo ""
    echo "=============================================="
    echo "Summary (${total_duration}s)"
    echo "=============================================="
    echo ""

    for result in "${RESULTS[@]}"; do
        case "$result" in
            PASS:*) echo -e "  ${GREEN}$result${NC}" ;;
            FAIL:*) echo -e "  ${RED}$result${NC}" ;;
            SKIP:*) echo -e "  ${YELLOW}$result${NC}" ;;
        esac
    done

    echo ""
    echo "  Passed:  $PASSED"
    echo "  Failed:  $FAILED"
    echo "  Skipped: $SKIPPED"
    echo ""

    if [[ $FAILED -gt 0 ]]; then
        echo -e "${RED}CHECKPOINT FAILED: $FAILED check(s) failed${NC}"
        echo ""
        echo "Fix the failures above before proceeding."
        exit 2
    elif [[ $PASSED -eq 0 ]]; then
        echo -e "${YELLOW}CHECKPOINT SKIPPED: No checks could run${NC}"
        echo ""
        echo "Ensure your project has at least one of:"
        echo "  - tsconfig.json (TypeScript)"
        echo "  - .eslintrc or eslint.config.js (Lint)"
        echo "  - package.json with test/build scripts"
        exit 1
    else
        echo -e "${GREEN}CHECKPOINT PASSED: $PASSED/$((PASSED + SKIPPED)) checks passed${NC}"

        # Archive the active spec now that all checks pass
        if [[ -n "$ACTIVE_SPEC_FILE" && -f "$ACTIVE_SPEC_FILE" ]]; then
            echo ""
            archive_spec "$ACTIVE_SPEC_FILE"
        fi

        exit 0
    fi
}

main "$@"
