#!/bin/bash
# =============================================================================
# Generate Test Stubs
# Description: Read a spec, extract (TEST) REQs, and scaffold test files with
#              describe/it.todo blocks per REQ from the traceability matrix.
# Usage: ./.claude/scripts/generate-test-stubs.sh [spec-file]
# Exit Codes: 0 = stubs generated, 1 = error
# =============================================================================

set -euo pipefail

# Constants
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly PLANS_DIR="$PROJECT_ROOT/.claude/plans"

# Colors
if [[ -t 1 ]]; then
    RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'
    BLUE='\033[0;34m'; NC='\033[0m'
else
    RED=''; GREEN=''; YELLOW=''; BLUE=''; NC=''
fi

log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_ok()   { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*" >&2; }
log_err()  { echo -e "${RED}[ERR]${NC} $*" >&2; }

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
    log_err "No spec file found. Usage: $0 [spec-file]"; return 1
}

# =============================================================================
# Parse traceability matrix for test locations
# Format: | REQ-XXX | description | (TEST) | `path/to/test.ts` |
# =============================================================================

parse_test_locations() {
    local spec_file="$1"
    # Associative arrays: req_id → test_path, req_id → description
    declare -gA REQ_TEST_PATH=()
    declare -gA REQ_DESC=()
    declare -gA REQ_TAG=()

    local in_matrix=false

    while IFS= read -r line; do
        # Detect traceability matrix section
        if [[ "$line" =~ ^##.*[Tt]raceability ]]; then
            in_matrix=true
            continue
        fi
        # Stop at next section
        if [[ "$in_matrix" == true ]] && [[ "$line" =~ ^## ]] && [[ ! "$line" =~ [Tt]raceability ]]; then
            in_matrix=false
            continue
        fi
        # Parse table rows in matrix
        if [[ "$in_matrix" == true ]] && [[ "$line" =~ ^\| ]]; then
            # Skip header and separator rows
            [[ "$line" =~ ^\|[-[:space:]] ]] && continue
            [[ "$line" =~ "REQ ID" ]] && continue

            # Extract fields: | REQ-XXX | desc | (TAG) | `path` |
            local req_id desc tag test_path
            req_id=$(echo "$line" | grep -oE 'REQ-[0-9]{3}' | head -1)
            [[ -z "$req_id" ]] && continue

            tag=$(echo "$line" | grep -oE '\(TEST\)|\(BROWSER\)|\(MANUAL\)' | head -1)
            test_path=$(echo "$line" | grep -oE '`[^`]+`' | tail -1 | tr -d '`')
            desc=$(echo "$line" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $3); print $3}')

            REQ_TAG["$req_id"]="${tag:-}"
            REQ_DESC["$req_id"]="${desc:-$req_id}"
            REQ_TEST_PATH["$req_id"]="${test_path:-}"
        fi
    done < "$spec_file"

    # Fallback: also parse REQ headings for descriptions
    while IFS= read -r line; do
        if [[ "$line" =~ ^###.*REQ-([0-9]{3}):?[[:space:]]*(.*) ]]; then
            local rid="REQ-${BASH_REMATCH[1]}"
            local title="${BASH_REMATCH[2]}"
            # Only set if not already set from matrix
            [[ -z "${REQ_DESC[$rid]:-}" || "${REQ_DESC[$rid]}" == "$rid" ]] && REQ_DESC["$rid"]="$title"
        fi
    done < "$spec_file"
}

# =============================================================================
# Generate test stub file
# =============================================================================

generate_stub() {
    local test_path="$1"
    local full_path="$PROJECT_ROOT/$test_path"

    # Don't overwrite existing test files
    if [[ -f "$full_path" ]]; then
        log_warn "Skipping (exists): $test_path"
        return
    fi

    # Create directory
    mkdir -p "$(dirname "$full_path")"

    # Collect REQs targeting this file
    local -a reqs_for_file=()
    for req_id in "${!REQ_TEST_PATH[@]}"; do
        if [[ "${REQ_TEST_PATH[$req_id]}" == "$test_path" ]]; then
            reqs_for_file+=("$req_id")
        fi
    done

    # Sort REQs
    IFS=$'\n' sorted=($(sort <<<"${reqs_for_file[*]}")); unset IFS

    # Determine feature name from filename
    local feature_name
    feature_name=$(basename "$test_path" | sed 's/\.\(test\|spec\)\..*//')

    # Write stub
    {
        echo "// Test stubs generated from spec — fill in implementations"
        echo "// Generated: $(date '+%Y-%m-%d %H:%M:%S')"
        echo ""
        echo "describe('$feature_name', () => {"
        for req_id in "${sorted[@]}"; do
            local desc="${REQ_DESC[$req_id]:-$req_id}"
            echo "  describe('$req_id: $desc', () => {"
            echo "    it.todo('$req_id: should $desc');"
            echo "  });"
            echo ""
        done
        echo "});"
    } > "$full_path"

    log_ok "Generated: $test_path (${#sorted[@]} REQ stubs)"
}

# =============================================================================
# Main
# =============================================================================

main() {
    echo "=============================================="
    echo "Generate Test Stubs from Spec"
    echo "=============================================="
    echo ""

    local spec_file
    spec_file=$(find_spec_file "${1:-}") || exit 1
    log_info "Spec: ${spec_file#$PROJECT_ROOT/}"

    parse_test_locations "$spec_file"

    # Collect unique test paths (only for TEST and BROWSER tagged REQs)
    declare -A unique_paths=()
    for req_id in "${!REQ_TEST_PATH[@]}"; do
        local tag="${REQ_TAG[$req_id]:-}"
        local path="${REQ_TEST_PATH[$req_id]:-}"

        # Skip MANUAL and empty paths
        [[ "$tag" == "(MANUAL)" ]] && continue
        [[ -z "$path" || "$path" == "—" || "$path" == "-" ]] && continue

        unique_paths["$path"]=1
    done

    if [[ ${#unique_paths[@]} -eq 0 ]]; then
        log_warn "No test locations found in traceability matrix"
        log_info "Ensure your spec has a Traceability Matrix with test file paths"
        exit 1
    fi

    echo ""
    local generated=0
    local skipped=0

    for test_path in $(echo "${!unique_paths[@]}" | tr ' ' '\n' | sort); do
        if [[ -f "$PROJECT_ROOT/$test_path" ]]; then
            log_warn "Skipping (exists): $test_path"
            skipped=$((skipped + 1))
        else
            generate_stub "$test_path"
            generated=$((generated + 1))
        fi
    done

    echo ""
    echo "=============================================="
    echo "  Generated: $generated stub file(s)"
    echo "  Skipped:   $skipped (already exist)"
    echo "=============================================="

    if [[ $generated -gt 0 ]]; then
        echo ""
        echo "Next: Fill in the test implementations following TDD (Red → Green → Refactor)"
    fi
}

main "$@"
