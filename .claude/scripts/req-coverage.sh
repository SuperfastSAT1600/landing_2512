#!/bin/bash
# =============================================================================
# REQ Coverage Matrix
# Description: Scan test files for REQ-XXX patterns and report coverage
# Usage: ./.claude/scripts/req-coverage.sh [spec-file]
# Exit Codes: 0 = all covered, 1 = missing coverage
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

log_pass() { echo -e "  ${GREEN}COVERED${NC}  $*"; }
log_miss() { echo -e "  ${RED}MISSING${NC}  $*"; }
log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }

# Find spec file (same logic as audit-spec.sh)
find_spec_file() {
    local spec_path="${1:-}"
    if [[ -n "$spec_path" && -f "$spec_path" ]]; then
        echo "$spec_path"; return 0
    fi
    if [[ -d "$PLANS_DIR" ]]; then
        local latest
        latest=$(find "$PLANS_DIR" -name "*.md" -type f -print0 2>/dev/null | xargs -0 ls -t 2>/dev/null | head -n 1)
        [[ -n "$latest" ]] && { echo "$latest"; return 0; }
    fi
    echo "No spec file found" >&2; return 1
}

# =============================================================================
# Main
# =============================================================================

main() {
    echo "=============================================="
    echo "REQ Coverage Matrix"
    echo "=============================================="
    echo ""

    local spec_file
    spec_file=$(find_spec_file "${1:-}") || exit 1

    local relpath="${spec_file#$PROJECT_ROOT/}"
    log_info "Spec: $relpath"
    echo ""

    cd "$PROJECT_ROOT"

    # Get all REQ IDs from spec
    local req_ids
    req_ids=$(grep -oE 'REQ-[0-9]{3}' "$spec_file" 2>/dev/null | sort -u)

    if [[ -z "$req_ids" ]]; then
        echo "No REQ-XXX IDs found in spec."
        exit 1
    fi

    local total=0
    local covered=0
    local manual_count=0
    local browser_count=0

    # Parse verification tags from spec: REQ-XXX → (TEST)/(BROWSER)/(MANUAL)
    declare -A req_tags=()
    while IFS= read -r line; do
        if [[ "$line" =~ (REQ-[0-9]{3}) ]]; then
            local rid="${BASH_REMATCH[1]}"
            if [[ "$line" =~ \(MANUAL\) ]]; then
                req_tags["$rid"]="MANUAL"
            elif [[ "$line" =~ \(BROWSER\) ]]; then
                req_tags["$rid"]="BROWSER"
            elif [[ "$line" =~ \(TEST\) ]]; then
                req_tags["$rid"]="TEST"
            fi
        fi
    done < "$spec_file"

    # Build test search directories (only those that exist)
    local -a search_dirs=()
    for dir in src tests test e2e __tests__ spec; do
        [[ -d "$PROJECT_ROOT/$dir" ]] && search_dirs+=("$PROJECT_ROOT/$dir")
    done

    while IFS= read -r req_id; do
        [[ -z "$req_id" ]] && continue
        total=$((total + 1))

        local tag="${req_tags[$req_id]:-TEST}"

        # (MANUAL) requirements — no automated test expected
        if [[ "$tag" == "MANUAL" ]]; then
            echo -e "  ${YELLOW}MANUAL ${NC}  $req_id  (manual verification)"
            manual_count=$((manual_count + 1))
            covered=$((covered + 1))
            continue
        fi

        # (BROWSER) requirements — look in e2e/spec files too
        if [[ "$tag" == "BROWSER" ]]; then
            local browser_files=""
            if [[ ${#search_dirs[@]} -gt 0 ]]; then
                browser_files=$(grep -rl "$req_id" \
                    --include="*.spec.*" --include="*.e2e.*" \
                    --include="*.test.*" --include="*_test.*" \
                    "${search_dirs[@]}" 2>/dev/null || true)
            fi
            local browser_file_count
            browser_file_count=$(echo "$browser_files" | grep -c . 2>/dev/null || echo 0)
            if [[ "$browser_file_count" -gt 0 ]]; then
                # Verify it's actually a Playwright/Cypress test (not just a unit test referencing the ID)
                local is_real_e2e=false
                while IFS= read -r bf; do
                    [[ -z "$bf" ]] && continue
                    if grep -qE '@playwright/test|import.*playwright|cy\.|describe\(' "$bf" 2>/dev/null; then
                        is_real_e2e=true
                        break
                    fi
                done <<< "$browser_files"
                if [[ "$is_real_e2e" == "true" ]]; then
                    log_pass "$req_id  ($browser_file_count e2e/browser file(s))"
                    covered=$((covered + 1))
                else
                    echo -e "  ${YELLOW}BROWSER${NC}  $req_id  (test file exists but doesn't use Playwright/Cypress)"
                    browser_count=$((browser_count + 1))
                fi
            else
                echo -e "  ${YELLOW}BROWSER${NC}  $req_id  (needs browser test)"
                browser_count=$((browser_count + 1))
            fi
            continue
        fi

        # (TEST) requirements — look in test files
        local test_count=0
        local test_files=""

        if [[ ${#search_dirs[@]} -gt 0 ]]; then
            test_files=$(grep -rl "$req_id" \
                --include="*.test.*" --include="*.spec.*" \
                --include="*_test.*" --include="*_spec.*" \
                "${search_dirs[@]}" 2>/dev/null || true)
            test_count=$(echo "$test_files" | grep -c . 2>/dev/null || echo 0)
        fi

        if [[ "$test_count" -gt 0 ]]; then
            log_pass "$req_id  ($test_count test file(s))"
            covered=$((covered + 1))
        else
            log_miss "$req_id"
        fi
    done <<< "$req_ids"

    # Summary
    echo ""
    local testable=$((total - manual_count))
    local pct=0
    if [[ $total -gt 0 ]]; then
        pct=$(( (covered * 100) / total ))
    fi

    echo "=============================================="
    echo "  Total:    $total REQs"
    echo "  Covered:  $covered"
    echo "  Missing:  $((total - covered))"
    [[ $manual_count -gt 0 ]] && echo "  Manual:   $manual_count (no automated test needed)"
    [[ $browser_count -gt 0 ]] && echo "  Browser:  $browser_count (needs browser/e2e test)"
    echo "  Coverage: ${pct}%"
    echo "=============================================="

    if [[ $covered -eq $total ]]; then
        echo -e "${GREEN}All requirements have test coverage${NC}"
        exit 0
    else
        echo -e "${YELLOW}Some requirements lack test coverage${NC}"
        exit 1
    fi
}

main "$@"
