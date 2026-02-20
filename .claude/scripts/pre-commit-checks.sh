#!/bin/bash
# =============================================================================
# Pre-Commit Checks
# Description: Run quality checks before git commits
# Usage: ./.claude/scripts/pre-commit-checks.sh
# Exit Codes: 0 = pass, 1 = warn, 2 = block
# =============================================================================

set -euo pipefail

# Constants
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors (if terminal supports it)
if [[ -t 1 ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[0;33m'
    NC='\033[0m' # No Color
else
    RED=''
    GREEN=''
    YELLOW=''
    NC=''
fi

# Counters
ERRORS=0
WARNINGS=0

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${GREEN}[PASS]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*" >&2
    ((WARNINGS++)) || true
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $*" >&2
    ((ERRORS++)) || true
}

# =============================================================================
# Check Functions
# =============================================================================

check_no_console_logs() {
    echo "Checking for console.log statements..."

    # Get staged TypeScript/JavaScript files
    local files
    files=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(ts|tsx|js|jsx)$' || true)

    if [[ -z "$files" ]]; then
        log_info "No JS/TS files staged"
        return 0
    fi

    local found=0
    for file in $files; do
        if [[ -f "$file" ]]; then
            # Check for console.log (ignore console.error, console.warn)
            if grep -n 'console\.log' "$file" 2>/dev/null; then
                log_warn "console.log found in $file"
                found=1
            fi
        fi
    done

    if [[ $found -eq 0 ]]; then
        log_info "No console.log statements found"
    fi
}

check_no_debugger() {
    echo "Checking for debugger statements..."

    local files
    files=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(ts|tsx|js|jsx)$' || true)

    if [[ -z "$files" ]]; then
        return 0
    fi

    local found=0
    for file in $files; do
        if [[ -f "$file" ]]; then
            if grep -n '^\s*debugger' "$file" 2>/dev/null; then
                log_error "debugger statement found in $file"
                found=1
            fi
        fi
    done

    if [[ $found -eq 0 ]]; then
        log_info "No debugger statements found"
    fi
}

check_no_secrets() {
    echo "Checking for potential secrets..."

    local files
    files=$(git diff --cached --name-only --diff-filter=ACMR || true)

    if [[ -z "$files" ]]; then
        return 0
    fi

    # Patterns that might indicate secrets
    local patterns=(
        'api[_-]?key\s*[:=]\s*["\047][a-zA-Z0-9]'
        'secret[_-]?key\s*[:=]\s*["\047][a-zA-Z0-9]'
        'password\s*[:=]\s*["\047][^"\047]'
        'private[_-]?key'
        'sk_live_'
        'sk_test_'
        'AKIA[0-9A-Z]{16}'
    )

    local found=0
    for file in $files; do
        if [[ -f "$file" && ! "$file" =~ \.(md|txt|template)$ ]]; then
            for pattern in "${patterns[@]}"; do
                if grep -iE "$pattern" "$file" 2>/dev/null; then
                    log_error "Potential secret found in $file"
                    found=1
                fi
            done
        fi
    done

    if [[ $found -eq 0 ]]; then
        log_info "No potential secrets detected"
    fi
}

check_no_merge_conflicts() {
    echo "Checking for merge conflict markers..."

    local files
    files=$(git diff --cached --name-only --diff-filter=ACMR || true)

    if [[ -z "$files" ]]; then
        return 0
    fi

    local found=0
    for file in $files; do
        if [[ -f "$file" ]]; then
            if grep -E '^(<<<<<<<|=======|>>>>>>>)' "$file" 2>/dev/null; then
                log_error "Merge conflict markers in $file"
                found=1
            fi
        fi
    done

    if [[ $found -eq 0 ]]; then
        log_info "No merge conflict markers found"
    fi
}

check_large_files() {
    echo "Checking for large files..."

    local max_size=1048576  # 1MB in bytes
    local files
    files=$(git diff --cached --name-only --diff-filter=ACMR || true)

    if [[ -z "$files" ]]; then
        return 0
    fi

    local found=0
    for file in $files; do
        if [[ -f "$file" ]]; then
            local size
            size=$(wc -c < "$file" 2>/dev/null || echo 0)
            if [[ $size -gt $max_size ]]; then
                log_warn "Large file ($(( size / 1024 ))KB): $file"
                found=1
            fi
        fi
    done

    if [[ $found -eq 0 ]]; then
        log_info "No large files detected"
    fi
}

check_file_naming() {
    echo "Checking file naming conventions..."

    local files
    files=$(git diff --cached --name-only --diff-filter=A | grep -E '\.(ts|tsx|js|jsx)$' || true)

    if [[ -z "$files" ]]; then
        return 0
    fi

    local found=0
    for file in $files; do
        local basename
        basename=$(basename "$file")

        # Check for spaces in filenames
        if [[ "$basename" =~ [[:space:]] ]]; then
            log_error "Filename contains spaces: $file"
            found=1
        fi

        # Check for PascalCase components
        if [[ "$file" =~ /components/ && ! "$basename" =~ ^[A-Z] ]]; then
            log_warn "Component should be PascalCase: $file"
            found=1
        fi
    done

    if [[ $found -eq 0 ]]; then
        log_info "File naming conventions followed"
    fi
}

check_todo_fixme() {
    echo "Checking for TODO/FIXME comments..."

    local files
    files=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(ts|tsx|js|jsx)$' || true)

    if [[ -z "$files" ]]; then
        return 0
    fi

    local count=0
    for file in $files; do
        if [[ -f "$file" ]]; then
            local matches
            matches=$(grep -c -E '(TODO|FIXME):' "$file" 2>/dev/null || echo 0)
            count=$((count + matches))
        fi
    done

    if [[ $count -gt 0 ]]; then
        log_warn "$count TODO/FIXME comments found (remember to address them)"
    else
        log_info "No TODO/FIXME comments found"
    fi
}

# =============================================================================
# Main
# =============================================================================

main() {
    echo "=============================================="
    echo "Running Pre-Commit Checks"
    echo "=============================================="
    echo ""

    cd "$PROJECT_ROOT"

    # Run all checks
    check_no_console_logs
    check_no_debugger
    check_no_secrets
    check_no_merge_conflicts
    check_large_files
    check_file_naming
    check_todo_fixme

    echo ""
    echo "=============================================="

    # Summary
    if [[ $ERRORS -gt 0 ]]; then
        echo -e "${RED}FAILED: $ERRORS error(s), $WARNINGS warning(s)${NC}"
        echo "Fix errors before committing."
        exit 2  # Block the commit
    elif [[ $WARNINGS -gt 0 ]]; then
        echo -e "${YELLOW}PASSED with $WARNINGS warning(s)${NC}"
        exit 0  # Allow but warn
    else
        echo -e "${GREEN}PASSED: All checks passed${NC}"
        exit 0
    fi
}

main "$@"
