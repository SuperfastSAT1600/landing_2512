#!/bin/bash
# =============================================================================
# Launch Parallel TDD (hook wrapper)
# Called by: PostToolUse hook on Write to .claude/plans/*.md
# Uses the just-written spec file (passed via $file_path env var from hook,
# or falls back to finding the most recent spec in .claude/plans/).
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Check worktree availability before attempting anything
check_worktree_support() {
    local test_dir
    test_dir=$(mktemp -d 2>/dev/null) || return 1
    local test_wt="$test_dir/wt-test"

    # Try to create a detached worktree
    if git -C "$PROJECT_ROOT" worktree add --detach "$test_wt" HEAD >/dev/null 2>&1; then
        # Clean up test worktree
        git -C "$PROJECT_ROOT" worktree remove --force "$test_wt" >/dev/null 2>&1 || true
        rm -rf "$test_dir" 2>/dev/null || true
        return 0
    else
        rm -rf "$test_dir" 2>/dev/null || true
        return 1
    fi
}

# Prefer the file that was just written (set by the Write hook via $file_path)
if [[ -n "${file_path:-}" && -f "${file_path}" ]]; then
    latest="$file_path"
else
    # Fallback: most recent spec in .claude/plans/
    PLANS_DIR="$PROJECT_ROOT/.claude/plans"
    latest=""
    if [[ -d "$PLANS_DIR" ]]; then
        latest=$(find "$PLANS_DIR" -name "*.md" -type f -print0 2>/dev/null \
            | xargs -0 ls -t 2>/dev/null \
            | head -n 1)
    fi
fi

if [[ -z "$latest" ]]; then
    echo "[Hook] No spec found — skipping parallel TDD setup" >&2
    exit 0
fi

# Count REQs — skip if fewer than 2 (not worth parallelising)
req_count=$(grep -cE 'REQ-[0-9]{3}' "$latest" 2>/dev/null || echo 0)
if [[ "$req_count" -lt 2 ]]; then
    echo "[Hook] Only $req_count REQ(s) in spec — skipping parallel TDD (use /tdd instead)" >&2
    exit 0
fi

# Guard: check worktree support before proceeding
if ! check_worktree_support; then
    echo "" >&2
    echo "[Hook] Git worktrees are not available in this environment." >&2
    echo "" >&2
    echo "Worktrees require a full git repository on a local filesystem." >&2
    echo "Cloud sessions, shallow clones, or some CI environments may not support them." >&2
    echo "" >&2
    echo "To run parallel TDD without worktrees, use the /parallel-tdd command" >&2
    echo "directly — it will spawn parallel subagents (one per 1-2 REQs) in the" >&2
    echo "shared working directory instead." >&2
    echo "" >&2
    exit 0
fi

# Guard: skip if worktrees already exist for this feature (avoids re-launch on spec edit)
WORKTREES_DIR="$PROJECT_ROOT/.worktrees"
spec_basename=$(basename "$latest" .md)
if [[ -d "$WORKTREES_DIR" ]]; then
    active_worktrees=$(find "$WORKTREES_DIR" -maxdepth 1 -type d -name "${spec_basename}*" 2>/dev/null | head -1)
    if [[ -n "$active_worktrees" ]]; then
        echo "[Hook] Worktrees already exist for '${spec_basename}' — skipping re-launch. Delete .worktrees/${spec_basename}* to re-run." >&2
        exit 0
    fi
fi

echo "[Hook] Launching parallel TDD for: ${latest##*/} ($req_count REQs)" >&2

bash "$SCRIPT_DIR/create-tdd-team.sh" "$latest" 2>&1
