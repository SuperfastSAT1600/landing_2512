#!/bin/bash
# =============================================================================
# Create TDD Team (Fixed 6-Role Pipeline)
# Parses spec for REQ-XXX IDs, creates 2 builder worktrees, outputs task data.
#
# Usage: create-tdd-team.sh [spec-file]
#
# Always creates the same pipeline:
#   Research → Architect → Builder 1 + Builder 2 → Verifier + Integrator
#
# Output: Structured text to stdout describing:
#   - REQs split in half (Builder 1 / Builder 2)
#   - Worktree paths for both builders
#   - Task chain with blockedBy dependencies
#   - Role-specific spawn prompts for all 6 teammates
#
# The lead session reads this output and uses it to:
#   1. Create tasks via TaskCreate with blockedBy dependencies
#   2. Spawn 6 teammates with role-specific prompts
# =============================================================================

set -euo pipefail

# --- Argument parsing ---------------------------------------------------------
SPEC_FILE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        *) SPEC_FILE="$1"; shift ;;
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
        # Auto-detect most recent plan
        local recent
        recent=$(ls -t "$PROJECT_ROOT/.claude/plans/"*.md 2>/dev/null | head -1)
        if [[ -z "$recent" ]]; then
            log_err "Usage: $0 [spec-file]"
            log_err "No spec files found in .claude/plans/"
            exit 1
        fi
        SPEC_FILE="$recent"
        log_warn "No spec specified — using most recent: $SPEC_FILE"
    fi

    [[ -f "$SPEC_FILE" ]] || { log_err "Spec file not found: $SPEC_FILE"; ((errors++)); }

    if ! git -C "$PROJECT_ROOT" rev-parse --git-dir &>/dev/null; then
        log_err "Not a git repository: $PROJECT_ROOT"
        ((errors++))
    fi

    [[ $errors -eq 0 ]] || exit 1
}

# =============================================================================
# Parse REQs + dependencies
# =============================================================================

declare -A REQ_TITLES=()

parse_reqs() {
    grep -oE 'REQ-[0-9]{3}' "$SPEC_FILE" | sort -u
}

parse_titles() {
    while IFS= read -r line; do
        if [[ "$line" =~ ^###[[:space:]]*(REQ-[0-9]{3}):?[[:space:]]*(.*) ]]; then
            local req="${BASH_REMATCH[1]}"
            local title="${BASH_REMATCH[2]}"
            REQ_TITLES["$req"]="$title"
        fi
    done < "$SPEC_FILE"
}

# =============================================================================
# Create 2 builder git worktrees
# =============================================================================

declare -a WORKTREE_PATHS=()
declare -a BRANCH_NAMES=()

create_worktrees() {
    local feature="$1"
    mkdir -p "$WORKTREES_DIR"

    for builder_n in 1 2; do
        local branch="feat/${feature}-builder-${builder_n}"
        local path="$WORKTREES_DIR/${feature}-builder-${builder_n}"

        if [[ -d "$path" ]]; then
            log_warn "Removing stale worktree: $path"
            git -C "$PROJECT_ROOT" worktree remove --force "$path" 2>/dev/null || rm -rf "$path"
            git -C "$PROJECT_ROOT" branch -D "$branch" 2>/dev/null || true
        fi

        log_info "Worktree builder-${builder_n} → $branch"
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
    local -a all_reqs=("${@:3}")
    local total=${#all_reqs[@]}

    # Split REQs in half
    local half=$(( (total + 1) / 2 ))
    local builder1_reqs=("${all_reqs[@]:0:$half}")
    local builder2_reqs=("${all_reqs[@]:$half}")

    cat <<EOF
# Agent Teams: Parallel TDD Setup (Fixed 6-Role Pipeline)

## Spec
$spec_abs

## Feature
$feature

## Pipeline
Research → Architect → Builder 1 + Builder 2 → Verifier + Integrator

## Worktrees
- Builder 1: ${WORKTREE_PATHS[0]} (branch: ${BRANCH_NAMES[0]})
- Builder 2: ${WORKTREE_PATHS[1]} (branch: ${BRANCH_NAMES[1]})

## Tasks to Create (in order)

Create these tasks using TaskCreate. Preserve blockedBy dependencies.

### Task 1: RESEARCH: Research phase
- **blockedBy**: none
- **Description**: Research libraries, APIs, patterns, and best practices for this feature. Output a research.md file in .claude/plans/ summarizing findings. Do NOT write any implementation code.

### Task 2: ARCH: Architecture plan
- **blockedBy**: RESEARCH task ID
- **Description**: Based on research.md, write a technical architecture plan to .claude/plans/arch.md. Include: file tree, interfaces/types, component contracts, API shapes, migration plan (if DB). Do NOT write any implementation code.

EOF

    echo "### Builder 1 REQs (blockedBy: ARCH task ID)"
    echo ""
    for req in "${builder1_reqs[@]}"; do
        local title="${REQ_TITLES[$req]:-$req}"
        echo "### Task: $req: $title"
        echo "- **blockedBy**: ARCH task ID"
        echo "- **Worktree**: ${WORKTREE_PATHS[0]}"
        echo "- **Description**: Implement $req using strict TDD. Read arch.md first. Write failing test: test('$req: $title', () => { ... }), then minimal code to pass, then refactor. Commit after this REQ."
        echo ""
    done

    echo "### Builder 2 REQs (blockedBy: ARCH task ID)"
    echo ""
    for req in "${builder2_reqs[@]}"; do
        local title="${REQ_TITLES[$req]:-$req}"
        echo "### Task: $req: $title"
        echo "- **blockedBy**: ARCH task ID"
        echo "- **Worktree**: ${WORKTREE_PATHS[1]}"
        echo "- **Description**: Implement $req using strict TDD. Read arch.md first. Write failing test: test('$req: $title', () => { ... }), then minimal code to pass, then refactor. Commit after this REQ."
        echo ""
    done

    cat <<EOF
### Task: VERIFY: QA and acceptance
- **blockedBy**: all REQ task IDs
- **Description**: Review all implemented REQs. Test edge cases, security, and acceptance criteria. Report any bugs via SendMessage to the relevant builder. Verify all (BROWSER) REQs have Playwright tests.

### Task: INTEGRATE: Build and integration
- **blockedBy**: all REQ task IDs
- **Description**: Verify the full system builds and runs correctly. Check dependencies, run migrations, confirm CI passes. Merge builder branches if needed. Report blockers via SendMessage.

---

## Teammates to Spawn

Create an agent team named "tdd-${feature}" and spawn these 6 teammates:

### Research Agent
- **Role**: research
- **Spawn prompt**: "You are the Research Agent on team tdd-${feature}. Your job is to research libraries, APIs, patterns, and best practices for the feature described in $spec_abs. Read the spec carefully. Output your findings to .claude/plans/research.md (create if missing). Do NOT write any implementation code. Claim the RESEARCH task from the shared task list and mark it complete when research.md is written."

### Architect
- **Role**: architect
- **Spawn prompt**: "You are the Architect on team tdd-${feature}. Wait for the RESEARCH task to complete, then read .claude/plans/research.md and $spec_abs. Write a technical architecture plan to .claude/plans/arch.md including: file tree, interfaces/types, component contracts, API shapes, DB migration plan. Do NOT write any implementation code. Claim the ARCH task and mark it complete when arch.md is written."

### Builder 1
- **Worktree**: ${WORKTREE_PATHS[0]}
- **Branch**: ${BRANCH_NAMES[0]}
- **Spawn prompt**: "You are Builder 1 on team tdd-${feature}. Work ONLY in directory ${WORKTREE_PATHS[0]} (branch ${BRANCH_NAMES[0]}). Wait for ARCH to complete, then read .claude/plans/arch.md and $spec_abs. Claim REQ tasks (first half) from the shared task list and implement each using strict TDD: write a failing test first (test('REQ-XXX: behavior', ...)), then minimal code to pass, then refactor. Commit after each REQ. Do NOT edit files outside your worktree."

### Builder 2
- **Worktree**: ${WORKTREE_PATHS[1]}
- **Branch**: ${BRANCH_NAMES[1]}
- **Spawn prompt**: "You are Builder 2 on team tdd-${feature}. Work ONLY in directory ${WORKTREE_PATHS[1]} (branch ${BRANCH_NAMES[1]}). Wait for ARCH to complete, then read .claude/plans/arch.md and $spec_abs. Claim REQ tasks (second half) from the shared task list and implement each using strict TDD: write a failing test first (test('REQ-XXX: behavior', ...)), then minimal code to pass, then refactor. Commit after each REQ. Do NOT edit files outside your worktree."

### Verifier/QA
- **Spawn prompt**: "You are the Verifier/QA on team tdd-${feature}. Wait for all REQ tasks to complete. Then review all implementations against $spec_abs: test edge cases, security, and acceptance criteria. For any bugs found, send a message to the relevant Builder via SendMessage with the bug details. Verify all (BROWSER) REQs have Playwright test files. Claim the VERIFY task and mark it complete when all issues are resolved."

### Integrator
- **Spawn prompt**: "You are the Integrator on team tdd-${feature}. Wait for all REQ tasks to complete. Then verify the full system builds and runs correctly: check dependencies, run migrations, confirm CI passes. If you find integration issues, send a message to the relevant teammate via SendMessage. Claim the INTEGRATE task and mark it complete when the system runs end-to-end."

---

## After All Tasks Complete

Merge builder branches back to main:
\`\`\`bash
git checkout main
git merge --no-ff ${BRANCH_NAMES[0]}
git merge --no-ff ${BRANCH_NAMES[1]}
\`\`\`

Verify:
\`\`\`bash
bash ./.claude/scripts/verify-merge.sh
\`\`\`

Run checkpoint gate:
\`\`\`bash
/checkpoint
\`\`\`

Clean up:
\`\`\`bash
git worktree prune
git branch -d ${BRANCH_NAMES[0]}
git branch -d ${BRANCH_NAMES[1]}
\`\`\`

Monitor with dashboard (optional):
\`\`\`bash
bash .claude/scripts/team-dashboard.sh tdd-${feature}
\`\`\`
EOF
}

# =============================================================================
# Main
# =============================================================================

main() {
    log_head "Create TDD Team (Fixed 6-Role Pipeline)"

    validate
    cd "$PROJECT_ROOT"

    local feature
    feature=$(basename "$SPEC_FILE" .md | tr '[:upper:]' '[:lower:]' | tr ' _' '-')
    local spec_abs
    spec_abs="$(cd "$(dirname "$SPEC_FILE")" && pwd)/$(basename "$SPEC_FILE")"

    log_info "Spec:    $SPEC_FILE"
    log_info "Feature: $feature"
    log_info "Pipeline: Research → Architect → Builder×2 → Verifier + Integrator"

    # Parse REQs
    log_head "Parsing Requirements"
    mapfile -t req_array < <(parse_reqs)

    if [[ ${#req_array[@]} -eq 0 ]]; then
        log_err "No REQ-XXX IDs found in $SPEC_FILE"
        exit 1
    fi

    parse_titles
    log_info "Found ${#req_array[@]} REQs: ${req_array[*]}"

    local half=$(( (${#req_array[@]} + 1) / 2 ))
    log_info "Builder 1: ${req_array[*]:0:$half}"
    log_info "Builder 2: ${req_array[*]:$half}"

    # Create 2 builder worktrees
    log_head "Creating Builder Worktrees"
    create_worktrees "$feature"

    # Output structured data for the lead
    log_head "Team data written to stdout"
    output_team_data "$feature" "$spec_abs" "${req_array[@]}"

    log_ok "Worktrees ready. Spawn 6 teammates per the prompts above."
}

main "$@"
