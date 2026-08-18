#!/bin/bash
# =============================================================================
# REQ Status Dashboard
# Description: Show per-REQ lifecycle status: spec → test → passing
# Usage: ./.claude/scripts/req-status.sh [spec-file]
# Exit Codes: 0 = all green, 1 = incomplete
# =============================================================================

set -euo pipefail

# Constants
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly PLANS_DIR="$PROJECT_ROOT/.claude/plans"

# Colors
if [[ -t 1 ]]; then
    RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'
    BLUE='\033[0;34m'; DIM='\033[0;90m'; NC='\033[0m'
else
    RED=''; GREEN=''; YELLOW=''; BLUE=''; DIM=''; NC=''
fi

# Find spec file
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
    local spec_file
    spec_file=$(find_spec_file "${1:-}") || exit 1

    local relpath="${spec_file#$PROJECT_ROOT/}"
    echo "=============================================="
    echo "REQ Status Dashboard"
    echo "=============================================="
    echo ""
    echo "  Spec: $relpath"
    echo ""

    cd "$PROJECT_ROOT"

    # Build test search directories
    local -a search_dirs=()
    for dir in src tests test e2e __tests__ spec; do
        [[ -d "$PROJECT_ROOT/$dir" ]] && search_dirs+=("$PROJECT_ROOT/$dir")
    done

    # Parse REQs from spec
    local -a req_ids=()
    while IFS= read -r req_id; do
        [[ -n "$req_id" ]] && req_ids+=("$req_id")
    done < <(grep -oE 'REQ-[0-9]{3}' "$spec_file" | sort -u)

    if [[ ${#req_ids[@]} -eq 0 ]]; then
        echo "  No REQ-XXX IDs found in spec."
        exit 1
    fi

    # Parse verification tags
    declare -A req_tags=()
    while IFS= read -r line; do
        if [[ "$line" =~ (REQ-[0-9]{3}) ]]; then
            local rid="${BASH_REMATCH[1]}"
            if [[ "$line" =~ \(MANUAL\) ]]; then req_tags["$rid"]="MANUAL"
            elif [[ "$line" =~ \(BROWSER\) ]]; then req_tags["$rid"]="BROWSER"
            elif [[ "$line" =~ \(TEST\) ]]; then req_tags["$rid"]="TEST"
            fi
        fi
    done < "$spec_file"

    # Parse descriptions from headings
    declare -A req_descs=()
    while IFS= read -r line; do
        if [[ "$line" =~ ^###.*REQ-([0-9]{3}):?[[:space:]]*(.*) ]]; then
            req_descs["REQ-${BASH_REMATCH[1]}"]="${BASH_REMATCH[2]}"
        fi
    done < "$spec_file"

    # Header
    printf "  %-9s %-7s  %-6s  %-7s  %s\n" "REQ" "TAG" "SPEC" "TEST" "DESCRIPTION"
    printf "  %-9s %-7s  %-6s  %-7s  %s\n" "--------" "-------" "------" "-------" "-----------"

    local total=0
    local fully_done=0

    for req_id in "${req_ids[@]}"; do
        total=$((total + 1))
        local tag="${req_tags[$req_id]:-TEST}"
        local desc="${req_descs[$req_id]:-}"
        [[ ${#desc} -gt 40 ]] && desc="${desc:0:37}..."

        # Spec status: always done if we're reading it
        local spec_icon="${GREEN}done${NC}"

        # Test status
        local test_icon=""
        if [[ "$tag" == "MANUAL" ]]; then
            test_icon="${DIM}n/a${NC} "
            fully_done=$((fully_done + 1))
        else
            local test_count=0
            if [[ ${#search_dirs[@]} -gt 0 ]]; then
                test_count=$(grep -rl "$req_id" \
                    --include="*.test.*" --include="*.spec.*" \
                    --include="*_test.*" --include="*_spec.*" \
                    "${search_dirs[@]}" 2>/dev/null | wc -l | tr -d ' ')
            fi

            if [[ "$test_count" -gt 0 ]]; then
                test_icon="${GREEN}yes${NC}(${test_count})"
                fully_done=$((fully_done + 1))
            else
                test_icon="${RED}no${NC}   "
            fi
        fi

        printf "  %-9s %-7s  ${spec_icon}    ${test_icon}   %s\n" \
            "$req_id" "($tag)" "$desc"
    done

    # Summary
    echo ""
    local pct=0
    [[ $total -gt 0 ]] && pct=$(( (fully_done * 100) / total ))

    echo "=============================================="
    echo "  Progress: $fully_done/$total REQs complete ($pct%)"
    echo "=============================================="

    if [[ $fully_done -eq $total ]]; then
        echo -e "  ${GREEN}All requirements satisfied${NC}"
        exit 0
    else
        echo -e "  ${YELLOW}$((total - fully_done)) requirements need test coverage${NC}"
        exit 1
    fi
}

main "$@"
