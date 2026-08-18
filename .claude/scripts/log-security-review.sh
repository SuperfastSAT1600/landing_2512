#!/bin/bash
# =============================================================================
# Log Security Review
# Description: Log security review completion for audit trail
# Usage: ./.claude/scripts/log-security-review.sh
# Triggered by: SubagentStop hook when security-reviewer agent completes
# =============================================================================

set -euo pipefail

# Constants
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly LOG_DIR="$PROJECT_ROOT/.claude/logs"
readonly LOG_FILE="$LOG_DIR/security-reviews.log"

# =============================================================================
# Helper Functions
# =============================================================================

ensure_log_dir() {
    if [[ ! -d "$LOG_DIR" ]]; then
        mkdir -p "$LOG_DIR"
        echo "# Security Review Logs" > "$LOG_FILE"
        echo "# Format: timestamp | branch | user | status | notes" >> "$LOG_FILE"
        echo "" >> "$LOG_FILE"
    fi
}

get_current_branch() {
    git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown"
}

get_current_commit() {
    git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo "unknown"
}

get_user() {
    git -C "$PROJECT_ROOT" config user.name 2>/dev/null || echo "${USER:-unknown}"
}

get_changed_files() {
    # Get files changed in the current branch vs main
    local base_branch
    base_branch=$(git -C "$PROJECT_ROOT" symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main")

    git -C "$PROJECT_ROOT" diff --name-only "$base_branch"...HEAD 2>/dev/null | wc -l | tr -d ' '
}

# =============================================================================
# Main
# =============================================================================

main() {
    ensure_log_dir

    local timestamp
    local branch
    local commit
    local user
    local changed_files

    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    branch=$(get_current_branch)
    commit=$(get_current_commit)
    user=$(get_user)
    changed_files=$(get_changed_files)

    # Log entry
    local log_entry="$timestamp | $branch | $commit | $user | completed | $changed_files files reviewed"

    echo "$log_entry" >> "$LOG_FILE"

    # Output confirmation
    echo "[Security Review] Logged to $LOG_FILE"
    echo "  Branch: $branch"
    echo "  Commit: $commit"
    echo "  Time: $timestamp"
    echo "  Files: $changed_files changed files reviewed"

    # Check if there are security-related files changed
    local security_files
    security_files=$(git -C "$PROJECT_ROOT" diff --name-only HEAD~1 2>/dev/null | grep -E '(auth|security|password|token|secret|key|crypt)' | wc -l | tr -d ' ')

    if [[ "$security_files" -gt 0 ]]; then
        echo ""
        echo "  NOTE: $security_files security-sensitive files were modified"
        echo "$timestamp | $branch | $commit | $user | alert | $security_files security-sensitive files" >> "$LOG_FILE"
    fi

    # Create summary file for recent review
    local summary_file="$LOG_DIR/last-security-review.json"
    cat > "$summary_file" << EOF
{
  "timestamp": "$timestamp",
  "branch": "$branch",
  "commit": "$commit",
  "reviewer": "claude-security-reviewer",
  "user": "$user",
  "filesReviewed": $changed_files,
  "securitySensitiveFiles": $security_files,
  "status": "completed"
}
EOF

    exit 0
}

main "$@"
