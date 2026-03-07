#!/bin/bash
# =============================================================================
# Audit Spec
# Description: Validate spec quality — requirement IDs, verification tags,
#              traceability, duplicates, gaps, and priority coverage
# Usage: ./.claude/scripts/audit-spec.sh [path-to-spec]
# Exit Codes: 0 = all verified, 1 = warnings, 2 = unverified requirements
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
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    NC=''
fi

# =============================================================================
# Helper Functions
# =============================================================================

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*" >&2
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $*" >&2
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

# =============================================================================
# Find Spec File
# =============================================================================

find_spec_file() {
    local spec_path="${1:-}"

    # If path argument provided, use it
    if [[ -n "$spec_path" ]]; then
        if [[ -f "$spec_path" ]]; then
            echo "$spec_path"
            return 0
        else
            log_fail "Spec file not found: $spec_path"
            return 1
        fi
    fi

    # Otherwise, find most recent plan in .claude/plans/
    if [[ ! -d "$PLANS_DIR" ]]; then
        log_fail "Plans directory not found: $PLANS_DIR"
        log_info "Create a plan first with /plan or save a spec to .claude/plans/"
        return 1
    fi

    local latest
    latest=$(find "$PLANS_DIR" -name "*.md" -type f -print0 2>/dev/null | xargs -0 ls -t 2>/dev/null | head -n 1)

    if [[ -z "$latest" ]]; then
        log_fail "No spec files found in $PLANS_DIR"
        log_info "Create a plan first with /plan or save a spec to .claude/plans/"
        return 1
    fi

    echo "$latest"
}

# =============================================================================
# Audit Functions
# =============================================================================

audit_requirement_ids() {
    local spec_file="$1"

    # Find unique requirement IDs
    local unique_reqs
    unique_reqs=$(grep -oE 'REQ-[0-9]{3}' "$spec_file" 2>/dev/null | sort -u | wc -l | tr -d ' ')

    echo "$unique_reqs"
}

audit_duplicate_reqs() {
    local spec_file="$1"
    local duplicates=""

    # Find REQ IDs that appear as definitions (### REQ-XXX or REQ-XXX:) more than once
    local req_ids
    req_ids=$(grep -oE 'REQ-[0-9]{3}' "$spec_file" 2>/dev/null | sort | uniq -d)

    # Check if any REQ ID is defined multiple times as a heading
    while IFS= read -r req_id; do
        [[ -z "$req_id" ]] && continue
        local def_count
        def_count=$(grep -cE "^###.*${req_id}" "$spec_file" 2>/dev/null || echo 0)
        if [[ "$def_count" -gt 1 ]]; then
            duplicates="${duplicates}${req_id} (defined ${def_count} times), "
        fi
    done <<< "$(grep -oE 'REQ-[0-9]{3}' "$spec_file" 2>/dev/null | sort -u)"

    echo "${duplicates%, }"
}

audit_req_gaps() {
    local spec_file="$1"
    local gaps=""

    # Get all REQ numbers
    local numbers
    numbers=$(grep -oE 'REQ-([0-9]{3})' "$spec_file" 2>/dev/null | sed 's/REQ-//' | sort -un)

    if [[ -z "$numbers" ]]; then
        echo ""
        return
    fi

    local prev=0
    while IFS= read -r num; do
        # Strip leading zeros for arithmetic
        local n=$((10#$num))
        if [[ $prev -gt 0 ]] && [[ $((n - prev)) -gt 1 ]]; then
            local i
            for ((i=prev+1; i<n; i++)); do
                gaps="${gaps}REQ-$(printf '%03d' $i), "
            done
        fi
        prev=$n
    done <<< "$numbers"

    echo "${gaps%, }"
}

audit_verification_tags() {
    local spec_file="$1"
    local verified=0
    local unverified=0
    local req_ids

    # Get all unique REQ IDs
    req_ids=$(grep -oE 'REQ-[0-9]{3}' "$spec_file" 2>/dev/null | sort -u)

    if [[ -z "$req_ids" ]]; then
        echo "0 0"
        return
    fi

    while IFS= read -r req_id; do
        # Check if this REQ has a Verification line nearby (anchor to heading definition)
        if grep -A 5 "^###.*${req_id}" "$spec_file" 2>/dev/null | grep -qE '\*\*Verification\*\*.*\((TEST|BROWSER|MANUAL)\)'; then
            verified=$((verified + 1))
        else
            unverified=$((unverified + 1))
        fi
    done <<< "$req_ids"

    echo "$verified $unverified"
}

audit_test_verification() {
    local spec_file="$1"
    local has_test=0

    # Check if at least one (TEST) verification exists
    if grep -qE '\(TEST\)' "$spec_file" 2>/dev/null; then
        has_test=1
    fi

    echo "$has_test"
}

audit_traceability_matrix() {
    local spec_file="$1"
    local has_matrix=0

    # Check for traceability matrix section
    if grep -qiE '(traceability matrix|traceability|REQ ID.*Description.*Verification)' "$spec_file" 2>/dev/null; then
        has_matrix=1
    fi

    echo "$has_matrix"
}

audit_matrix_consistency() {
    local spec_file="$1"
    local missing=""

    # Get REQs from Requirements section (headings)
    local req_section_ids
    req_section_ids=$(grep -oE 'REQ-[0-9]{3}' "$spec_file" 2>/dev/null | sort -u)

    if [[ -z "$req_section_ids" ]]; then
        echo ""
        return
    fi

    # Check if traceability matrix section exists
    local matrix_start
    matrix_start=$(grep -niE 'traceability matrix' "$spec_file" 2>/dev/null | head -1 | cut -d: -f1)

    if [[ -z "$matrix_start" ]]; then
        echo ""
        return
    fi

    # Get REQs mentioned in the matrix section (after the heading)
    local matrix_reqs
    matrix_reqs=$(tail -n +"$matrix_start" "$spec_file" 2>/dev/null | grep -oE 'REQ-[0-9]{3}' | sort -u)

    # Find REQs in requirements but not in matrix
    while IFS= read -r req_id; do
        [[ -z "$req_id" ]] && continue
        if ! echo "$matrix_reqs" | grep -q "$req_id"; then
            missing="${missing}${req_id}, "
        fi
    done <<< "$req_section_ids"

    echo "${missing%, }"
}

audit_empty_descriptions() {
    local spec_file="$1"
    local empty_count=0

    # Check for placeholder descriptions
    local placeholders
    placeholders=$(grep -cE '\{\{.*\}\}' "$spec_file" 2>/dev/null) || placeholders=0

    echo "$placeholders"
}

audit_priority_coverage() {
    local spec_file="$1"
    local has_must=0

    # Check if any "Must" priority exists
    if grep -qiE '\*\*Priority\*\*.*Must' "$spec_file" 2>/dev/null; then
        has_must=1
    fi

    echo "$has_must"
}

audit_todo_markers() {
    local spec_file="$1"
    local count
    count=$(grep -ciE '\bTODO\b|\bTBD\b|\bFIXME\b|\bHACK\b' "$spec_file" 2>/dev/null) || count=0
    echo "$count"
}

audit_dependency_refs() {
    local spec_file="$1"
    local invalid=""
    local all_reqs
    all_reqs=$(grep -oE 'REQ-[0-9]{3}' "$spec_file" 2>/dev/null | sort -u)

    while IFS= read -r line; do
        [[ -z "$line" ]] && continue
        local dep_refs
        dep_refs=$(echo "$line" | grep -oE 'REQ-[0-9]{3}')
        for ref in $dep_refs; do
            if ! echo "$all_reqs" | grep -q "^${ref}$"; then
                invalid="${invalid}${ref}, "
            fi
        done
    done <<< "$(grep -iE 'depends on' "$spec_file" 2>/dev/null || true)"

    echo "${invalid%, }"
}

# =============================================================================
# Main
# =============================================================================

main() {
    echo "=============================================="
    echo "Spec Audit"
    echo "=============================================="
    echo ""

    # Find spec file
    local spec_file
    spec_file=$(find_spec_file "${1:-}") || exit 2

    local relpath="${spec_file#$PROJECT_ROOT/}"
    log_info "Auditing: $relpath"
    echo ""

    local exit_code=0
    local total_reqs=0
    local verified=0
    local unverified=0

    # 1. Check requirement IDs
    total_reqs=$(audit_requirement_ids "$spec_file")
    if [[ "$total_reqs" -eq 0 ]]; then
        log_fail "No requirement IDs (REQ-XXX) found"
        exit_code=2
    else
        log_pass "$total_reqs unique requirement IDs found"
    fi

    # 2. Check for duplicate REQ definitions
    local duplicates
    duplicates=$(audit_duplicate_reqs "$spec_file")
    if [[ -n "$duplicates" ]]; then
        log_fail "Duplicate REQ definitions: $duplicates"
        exit_code=2
    else
        log_pass "No duplicate REQ definitions"
    fi

    # 3. Check for gaps in REQ numbering
    local gaps
    gaps=$(audit_req_gaps "$spec_file")
    if [[ -n "$gaps" ]]; then
        log_warn "Gaps in REQ numbering: $gaps"
        [[ $exit_code -lt 1 ]] && exit_code=1
    else
        log_pass "No gaps in REQ numbering"
    fi

    # 4. Check verification tags
    read -r verified unverified <<< "$(audit_verification_tags "$spec_file")"
    if [[ "$unverified" -gt 0 ]]; then
        log_fail "$unverified requirements missing verification tags"
        exit_code=2
    elif [[ "$verified" -gt 0 ]]; then
        log_pass "All $verified requirements have verification tags"
    fi

    # 5. Check for at least one (TEST) verification
    local has_test
    has_test=$(audit_test_verification "$spec_file")
    if [[ "$has_test" -eq 0 ]]; then
        log_warn "No (TEST) verification found — at least one automated test recommended"
        [[ $exit_code -lt 1 ]] && exit_code=1
    else
        log_pass "At least one (TEST) verification exists"
    fi

    # 6. Check for traceability matrix
    local has_matrix
    has_matrix=$(audit_traceability_matrix "$spec_file")
    if [[ "$has_matrix" -eq 0 ]]; then
        log_warn "No traceability matrix found"
        [[ $exit_code -lt 1 ]] && exit_code=1
    else
        log_pass "Traceability matrix present"
    fi

    # 7. Check matrix consistency (all REQs in matrix)
    local matrix_missing
    matrix_missing=$(audit_matrix_consistency "$spec_file")
    if [[ -n "$matrix_missing" ]]; then
        log_warn "REQs missing from traceability matrix: $matrix_missing"
        [[ $exit_code -lt 1 ]] && exit_code=1
    elif [[ "$has_matrix" -eq 1 ]]; then
        log_pass "All REQs appear in traceability matrix"
    fi

    # 8. Check for placeholder/empty descriptions
    local empty_count
    empty_count=$(audit_empty_descriptions "$spec_file")
    if [[ "$empty_count" -gt 0 ]]; then
        log_fail "$empty_count placeholder descriptions ({{...}}) found — fill in before implementation"
        exit_code=2
    else
        log_pass "No placeholder descriptions"
    fi

    # 9. Check for TODO/TBD markers
    local todo_count
    todo_count=$(audit_todo_markers "$spec_file")
    if [[ "$todo_count" -gt 0 ]]; then
        log_fail "$todo_count TODO/TBD/FIXME markers found — resolve before implementation"
        exit_code=2
    else
        log_pass "No TODO/TBD markers"
    fi

    # 10. Check for invalid dependency references
    local invalid_deps
    invalid_deps=$(audit_dependency_refs "$spec_file")
    if [[ -n "$invalid_deps" ]]; then
        log_warn "Depends-on references to nonexistent REQs: $invalid_deps"
        [[ $exit_code -lt 1 ]] && exit_code=1
    else
        log_pass "All dependency references are valid"
    fi

    # 11. Check priority coverage
    local has_must
    has_must=$(audit_priority_coverage "$spec_file")
    if [[ "$has_must" -eq 0 ]]; then
        log_warn "No 'Must' priority requirements found — consider adding priority levels"
        [[ $exit_code -lt 1 ]] && exit_code=1
    else
        log_pass "Must-priority requirements present"
    fi

    # 12. Check for high REQ count
    if [[ "$total_reqs" -gt 10 ]]; then
        log_warn "Spec has $total_reqs requirements — consider splitting into smaller specs for focused TDD"
        [[ $exit_code -lt 1 ]] && exit_code=1
    fi

    # Summary
    echo ""
    echo "=============================================="
    echo "Summary"
    echo "=============================================="
    echo "  Requirements found: $total_reqs"
    echo "  With verification:  $verified"
    echo "  Without verification: $unverified"
    echo "  Has (TEST) tags: $([ "$has_test" -eq 1 ] && echo 'yes' || echo 'no')"
    echo "  Has traceability matrix: $([ "$has_matrix" -eq 1 ] && echo 'yes' || echo 'no')"
    echo "  Placeholder descriptions: $empty_count"
    echo "  TODO/TBD markers: $todo_count"
    echo "  Invalid dependency refs: ${invalid_deps:-none}"
    echo ""

    if [[ $exit_code -eq 0 ]]; then
        echo -e "${GREEN}PASSED: Spec is well-structured${NC}"
    elif [[ $exit_code -eq 1 ]]; then
        echo -e "${YELLOW}WARNINGS: Spec has minor issues${NC}"
    else
        echo -e "${RED}FAILED: Spec has critical issues${NC}"
        echo ""
        echo "To fix:"
        echo "  1. Add REQ-XXX IDs to all requirements"
        echo "  2. Add Verification: (TEST)|(BROWSER)|(MANUAL) to each"
        echo "  3. Add a traceability matrix mapping REQs to test files"
        echo "  4. Remove duplicate REQ definitions"
    fi

    exit $exit_code
}

main "$@"
