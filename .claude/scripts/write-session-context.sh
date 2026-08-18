#!/bin/bash
# =============================================================================
# Write Session Context
# Description: Capture end-of-session state to .claude/user/session-context.md
#              for context handoff to next session.
# Usage: ./.claude/scripts/write-session-context.sh
# Called by: /session-report command
# =============================================================================

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly PLANS_DIR="$PROJECT_ROOT/.claude/plans"
readonly OUTPUT_FILE="$PROJECT_ROOT/.claude/user/session-context.md"
readonly USER_DIR="$PROJECT_ROOT/.claude/user"

# Colors (only if terminal)
if [[ -t 1 ]]; then
    GREEN='\033[0;32m'
    BLUE='\033[0;34m'
    YELLOW='\033[0;33m'
    DIM='\033[0;90m'
    NC='\033[0m'
else
    GREEN=''
    BLUE=''
    YELLOW=''
    DIM=''
    NC=''
fi

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[context]${NC} $*"
}

log_ok() {
    echo -e "${GREEN}[ok]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[warn]${NC} $*"
}

# Find the most recently modified spec in .claude/plans/
# Outputs the absolute path, or empty string if none found.
find_active_spec() {
    if [[ ! -d "$PLANS_DIR" ]]; then
        echo ""
        return 0
    fi

    local latest
    # Use -print0 + xargs + ls -t for reliable cross-platform sorting
    latest=$(find "$PLANS_DIR" -name "*.md" -type f -print0 2>/dev/null \
        | xargs -0 ls -t 2>/dev/null \
        | head -n 1)

    echo "${latest:-}"
}

# Extract REQ headings from a spec file.
# Matches lines like: ### REQ-001: Title text here
# Outputs one "REQ-001: Title text here" per line.
extract_reqs() {
    local spec_file="$1"

    if [[ ! -f "$spec_file" ]]; then
        return 0
    fi

    # Match markdown headings that contain REQ-XXX IDs
    # Pattern: optional leading hashes + whitespace + REQ-NNN: rest of title
    grep -E '^###[[:space:]].*REQ-[0-9]{3}' "$spec_file" \
        | sed -E 's/^###[[:space:]]+(.*REQ-([0-9]{3})):?[[:space:]]*(.*)/REQ-\2: \3/' \
        | sed -E 's/^REQ-([0-9]{3}):[[:space:]]*REQ-[0-9]{3}:?[[:space:]]*/REQ-\1: /' \
        || true
}

# Retrieve the list of modified files via git status --short.
# Outputs one filepath per line, or empty if git not available.
get_git_status() {
    if ! command -v git &>/dev/null; then
        echo ""
        return 0
    fi

    if ! git -C "$PROJECT_ROOT" rev-parse --is-inside-work-tree &>/dev/null 2>&1; then
        echo ""
        return 0
    fi

    git -C "$PROJECT_ROOT" status --short 2>/dev/null \
        | awk '{print $NF}' \
        || true
}

# Get the current git branch name.
# Outputs branch name, or empty string if git not available / not a repo.
get_current_branch() {
    if ! command -v git &>/dev/null; then
        echo ""
        return 0
    fi

    if ! git -C "$PROJECT_ROOT" rev-parse --is-inside-work-tree &>/dev/null 2>&1; then
        echo ""
        return 0
    fi

    git -C "$PROJECT_ROOT" branch --show-current 2>/dev/null || true
}

# Suggest a next action based on the current state.
# Arguments:
#   $1 - has_spec: "yes" or "no"
#   $2 - req_count: integer count of REQs found
suggest_next_action() {
    local has_spec="$1"
    local req_count="${2:-0}"

    if [[ "$has_spec" != "yes" ]]; then
        echo "No active spec found. Run /plan to enter plan mode and create a spec in .claude/plans/."
        return 0
    fi

    if [[ "$req_count" -eq 0 ]]; then
        echo "Spec found but no REQ-XXX requirements detected. Add requirements using the REQ-XXX format, then run /tdd."
        return 0
    fi

    echo "Resume TDD workflow: run /tdd to implement the next unfinished requirement, or /checkpoint to verify all passing."
}

# =============================================================================
# Main
# =============================================================================

main() {
    log_info "Capturing session context..."

    # Ensure output directory exists
    mkdir -p "$USER_DIR"

    # Gather state
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    local branch
    branch=$(get_current_branch)

    local active_spec
    active_spec=$(find_active_spec)

    local has_spec="no"
    local spec_basename=""
    local spec_relpath=""
    local req_lines=""
    local req_count=0

    if [[ -n "$active_spec" && -f "$active_spec" ]]; then
        has_spec="yes"
        spec_basename="$(basename "$active_spec")"
        spec_relpath="${active_spec#$PROJECT_ROOT/}"

        # Extract REQ lines; count them
        req_lines=$(extract_reqs "$active_spec")
        if [[ -n "$req_lines" ]]; then
            req_count=$(echo "$req_lines" | grep -c 'REQ-' || true)
        fi
    fi

    local git_modified
    git_modified=$(get_git_status)

    local next_action
    next_action=$(suggest_next_action "$has_spec" "$req_count")

    # =========================================================================
    # Build the output document
    # =========================================================================

    {
        echo "# Session Context"
        echo "**Captured**: ${timestamp}"

        if [[ -n "$branch" ]]; then
            echo "**Branch**: ${branch}"
        fi

        echo ""
        echo "---"
        echo ""

        # --- Active Spec section ---
        echo "## Active Spec"

        if [[ "$has_spec" == "yes" ]]; then
            echo "**File**: ${spec_relpath}"

            if [[ -n "$req_lines" ]]; then
                echo "**Requirements**:"
                while IFS= read -r req_line; do
                    [[ -z "$req_line" ]] && continue
                    echo "- ${req_line}"
                done <<< "$req_lines"
            else
                echo "**Requirements**: None found (no REQ-XXX headings detected in spec)"
            fi
        else
            echo "No spec found in .claude/plans/. Start with /plan to create one."
        fi

        echo ""
        echo "---"
        echo ""

        # --- Git Status section (only if git is available) ---
        if [[ -n "$branch" || -n "$git_modified" ]]; then
            echo "## Git Status"

            if [[ -n "$git_modified" ]]; then
                echo "Modified files:"
                while IFS= read -r filepath; do
                    [[ -z "$filepath" ]] && continue
                    echo "- ${filepath}"
                done <<< "$git_modified"
            else
                echo "Working tree clean — no modified files."
            fi

            echo ""
            echo "---"
            echo ""
        fi

        # --- Suggested Next Action ---
        echo "## Suggested Next Action"
        echo "${next_action}"
        echo ""

    } > "$OUTPUT_FILE"

    # =========================================================================
    # Stdout summary
    # =========================================================================

    log_ok "Session context written to: ${OUTPUT_FILE#$PROJECT_ROOT/}"

    if [[ "$has_spec" == "yes" ]]; then
        log_info "Active spec: ${spec_relpath} (${req_count} REQ(s))"
    else
        log_warn "No active spec found in .claude/plans/"
    fi

    if [[ -n "$branch" ]]; then
        log_info "Branch: ${branch}"
    fi

    echo -e "${DIM}Next session: read .claude/user/session-context.md to restore context.${NC}"
}

main "$@"
