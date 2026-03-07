#!/bin/bash
# =============================================================================
# Create TDD Team (Agent Teams version)
# Parses spec for REQ-XXX IDs, creates git worktrees, outputs task data.
# Parses spec, creates worktrees, outputs structured task data for the lead.
#
# Usage: create-tdd-team.sh [--agents N] [spec-file]
#
# Output: Structured text to stdout describing:
#   - REQs with titles, descriptions, dependencies
#   - Worktree paths per teammate
#   - Instructions for team creation
#
# The lead session reads this output and uses it to:
#   1. Create tasks via TaskCreate with blockedBy dependencies
#   2. Spawn teammates with worktree assignments
# =============================================================================

set -euo pipefail

# --- Argument parsing ---------------------------------------------------------
SPEC_FILE=""
NUM_AGENTS=3

while [[ $# -gt 0 ]]; do
    case "$1" in
        --agents|-a) NUM_AGENTS="$2"; shift 2 ;;
        *)           SPEC_FILE="$1"; shift ;;
    esac
done

# --- Paths --------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
WORKTREES_DIR="$PROJECT_ROOT/.worktrees"

# --- Colors -------------------------------------------------------------------
if [[ -t 2 ]]; then
    RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'
    BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
else
    RED=''; GREEN=''; YELLOW=''; BLUE=''; BOLD=''; NC=''
fi

log_info() { echo -e "${BLUE}▸${NC} $*" >&2; }
log_ok()   { echo -e "${GREEN}✓${NC} $*" >&2; }
log_warn() { echo -e "${YELLOW}⚠${NC} $*" >&2; }
log_err()  { echo -e "${RED}✗${NC} $*" >&2; }
log_head() { echo -e "\n${BOLD}$*${NC}" >&2; }

# =============================================================================
# Validation
# =============================================================================

validate() {
    local errors=0

    if [[ -z "$SPEC_FILE" ]]; then
        log_err "Usage: $0 [--agents N] [spec-file]"
        exit 1
    fi

    [[ -f "$SPEC_FILE" ]] || { log_err "Spec file not found: $SPEC_FILE"; ((errors++)); }

    if ! git -C "$PROJECT_ROOT" rev-parse --git-dir &>/dev/null; then
        log_err "Not a git repository: $PROJECT_ROOT"
        ((errors++))
    fi

    if ! [[ "$NUM_AGENTS" =~ ^[0-9]+$ ]] || [[ "$NUM_AGENTS" -lt 1 ]] || [[ "$NUM_AGENTS" -gt 8 ]]; then
        log_err "--agents must be 1–8, got: $NUM_AGENTS"
        ((errors++))
    fi

    [[ $errors -eq 0 ]] || exit 1
}

# =============================================================================
# Parse REQs + dependencies
# =============================================================================

declare -A REQ_DEPS=()
declare -A REQ_TITLES=()

parse_reqs() {
    grep -oE 'REQ-[0-9]{3}' "$SPEC_FILE" | sort -u
}

parse_dependencies() {
    local current_req=""

    while IFS= read -r line; do
        # Track current REQ heading
        if [[ "$line" =~ (REQ-[0-9]{3}) ]] && [[ "$line" =~ ^### ]]; then
            current_req="${BASH_REMATCH[1]}"
            # Extract title: everything after "### REQ-XXX: " prefix
            local title
            title=$(echo "$line" | sed "s/^###[[:space:]]*${current_req}:[[:space:]]*//")
            REQ_TITLES["$current_req"]="$title"
        fi
        # Parse "Depends on:" lines
        if [[ -n "$current_req" ]] && [[ "$line" =~ [Dd]epends\ on ]]; then
            local deps_str=""
            local remaining="$line"
            while [[ "$remaining" =~ REQ-([0-9]{3}) ]]; do
                local dep="REQ-${BASH_REMATCH[1]}"
                if [[ -n "$deps_str" ]]; then
                    deps_str="${deps_str},${dep}"
                else
                    deps_str="$dep"
                fi
                remaining="${remaining#*${BASH_REMATCH[0]}}"
            done
            [[ -n "$deps_str" ]] && REQ_DEPS["$current_req"]="$deps_str"
        fi
    done < "$SPEC_FILE"
}

# Distribute REQs to agent buckets (dependency-aware round-robin)
distribute_reqs() {
    local -a reqs=("$@")
    local total=${#reqs[@]}

    if [[ $total -eq 0 ]]; then
        log_err "No REQ-XXX IDs found in $SPEC_FILE"
        exit 1
    fi

    if [[ $total -lt $NUM_AGENTS ]]; then
        log_warn "$total REQs — reducing agents from $NUM_AGENTS to $total"
        NUM_AGENTS=$total
    fi

    declare -gA WORKSTREAMS=()
    for ((i=0; i<NUM_AGENTS; i++)); do WORKSTREAMS[$i]=""; done

    declare -A req_bucket=()
    local next_bucket=0

    for ((i=0; i<total; i++)); do
        local req="${reqs[$i]}"
        local deps_csv="${REQ_DEPS[$req]:-}"
        local bucket=""

        if [[ -n "$deps_csv" ]]; then
            IFS=',' read -ra dep_list <<< "$deps_csv"
            for dep in "${dep_list[@]}"; do
                if [[ -n "${req_bucket[$dep]:-}" ]]; then
                    bucket="${req_bucket[$dep]}"
                    break
                fi
            done
        fi

        if [[ -z "$bucket" ]]; then
            bucket=$next_bucket
            next_bucket=$(( (next_bucket + 1) % NUM_AGENTS ))
        fi

        req_bucket["$req"]=$bucket

        if [[ -z "${WORKSTREAMS[$bucket]}" ]]; then
            WORKSTREAMS[$bucket]="$req"
        else
            WORKSTREAMS[$bucket]="${WORKSTREAMS[$bucket]},$req"
        fi
    done
}

# =============================================================================
# Create git worktrees
# =============================================================================

declare -a WORKTREE_PATHS=()
declare -a BRANCH_NAMES=()

create_worktrees() {
    local feature="$1"
    mkdir -p "$WORKTREES_DIR"

    for ((i=0; i<NUM_AGENTS; i++)); do
        local agent_n=$((i+1))
        local branch="feat/${feature}-agent-${agent_n}"
        local path="$WORKTREES_DIR/${feature}-agent-${agent_n}"

        if [[ -d "$path" ]]; then
            log_warn "Removing stale worktree: $path"
            git -C "$PROJECT_ROOT" worktree remove --force "$path" 2>/dev/null || rm -rf "$path"
            git -C "$PROJECT_ROOT" branch -D "$branch" 2>/dev/null || true
        fi

        log_info "Worktree $agent_n → $branch"
        git -C "$PROJECT_ROOT" worktree add -b "$branch" "$path" HEAD

        WORKTREE_PATHS+=("$path")
        BRANCH_NAMES+=("$branch")
    done
}

# =============================================================================
# Cleanup on error
# =============================================================================

cleanup_on_error() {
    local exit_code=$?
    [[ $exit_code -eq 0 ]] && return
    log_warn "Error — cleaning up worktrees..."
    for path in "${WORKTREE_PATHS[@]:-}"; do
        [[ -n "$path" && -d "$path" ]] || continue
        git -C "$PROJECT_ROOT" worktree remove --force "$path" 2>/dev/null || true
    done
    for branch in "${BRANCH_NAMES[@]:-}"; do
        [[ -n "$branch" ]] || continue
        git -C "$PROJECT_ROOT" branch -D "$branch" 2>/dev/null || true
    done
}

trap cleanup_on_error EXIT

# =============================================================================
# Output structured team creation data (to stdout for the lead)
# =============================================================================

output_team_data() {
    local feature="$1"
    local spec_abs="$2"

    cat <<EOF
# Agent Teams: Parallel TDD Setup

## Spec
$spec_abs

## Feature
$feature

## Team Configuration
- Agents: $NUM_AGENTS
- Display: Use Agent Teams native display (in-process or tmux split-pane)

## Tasks to Create

Create these tasks using TaskCreate. Each REQ becomes one task.
Task subjects MUST follow the format "REQ-XXX: title" (the TaskCompleted hook parses this).

EOF

    # Output each REQ as a task
    mapfile -t all_reqs < <(parse_reqs)
    for req in "${all_reqs[@]}"; do
        local title="${REQ_TITLES[$req]:-$req}"
        local deps="${REQ_DEPS[$req]:-none}"

        cat <<EOF
### Task: $req: $title
- **blockedBy**: $deps
- **Description**: Implement $req using strict TDD. Write failing test first: test('$req: $title', () => { ... }), then minimal code to pass, then refactor.

EOF
    done

    cat <<EOF
## Teammates to Spawn

Create an agent team and spawn $NUM_AGENTS teammates. Each works in its own worktree.

EOF

    for ((i=0; i<NUM_AGENTS; i++)); do
        local agent_n=$((i+1))
        local reqs_csv="${WORKSTREAMS[$i]}"
        local path="${WORKTREE_PATHS[$i]}"
        local branch="${BRANCH_NAMES[$i]}"

        cat <<EOF
### Teammate $agent_n
- **Worktree**: $path
- **Branch**: $branch
- **Initial REQs**: $reqs_csv
- **Spawn prompt**: "You are TDD agent $agent_n. Work ONLY in directory $path (branch $branch). Read the spec at $spec_abs for full context. Claim tasks from the shared task list and implement each using strict TDD: write a failing test first (test('REQ-XXX: behavior', ...)), then minimal code to pass, then refactor. Commit after each REQ. Do NOT edit files outside your worktree."

EOF
    done

    cat <<EOF
## After All Tasks Complete

Merge worktree branches back to main:
\`\`\`bash
git checkout main
EOF
    for branch in "${BRANCH_NAMES[@]}"; do
        echo "git merge --no-ff $branch"
    done
    cat <<EOF
\`\`\`

Verify:
\`\`\`bash
bash ./.claude/scripts/verify-merge.sh
\`\`\`

Clean up:
\`\`\`bash
git worktree prune
EOF
    for branch in "${BRANCH_NAMES[@]}"; do
        echo "git branch -d $branch"
    done
    echo '```'
}

# =============================================================================
# Main
# =============================================================================

main() {
    log_head "Create TDD Team (Agent Teams)"

    validate
    cd "$PROJECT_ROOT"

    local feature
    feature=$(basename "$SPEC_FILE" .md | tr '[:upper:]' '[:lower:]' | tr ' _' '-')
    local spec_abs
    spec_abs="$(cd "$(dirname "$SPEC_FILE")" && pwd)/$(basename "$SPEC_FILE")"

    log_info "Spec:    $SPEC_FILE"
    log_info "Feature: $feature"
    log_info "Agents:  $NUM_AGENTS"

    # Parse + distribute
    log_head "Parsing Requirements"
    mapfile -t req_array < <(parse_reqs)
    log_info "Found: ${req_array[*]}"

    parse_dependencies
    distribute_reqs "${req_array[@]}"

    for ((i=0; i<NUM_AGENTS; i++)); do
        log_info "  Agent $((i+1)): ${WORKSTREAMS[$i]}"
    done

    # Worktrees
    log_head "Creating Worktrees"
    create_worktrees "$feature"

    # Output structured data for the lead
    log_head "Team data written to stdout"
    output_team_data "$feature" "$spec_abs"

    log_ok "Worktrees ready. Agent Teams will handle teammate spawning and display."
}

main "$@"
