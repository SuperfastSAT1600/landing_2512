#!/bin/bash
# =============================================================================
# Plan Mode Session Start
# Description: Set the .plan-active flag on session start (since defaultMode=plan)
#              and inject context telling Claude about the spec-first workflow.
# Called by: SessionStart hook
# Output: stdout text is injected into Claude's context
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FLAG_FILE="$PROJECT_ROOT/.claude/.plan-active"
PLANS_DIR="$PROJECT_ROOT/.claude/plans"

# Read hook input from stdin (contains session_id, hook_event_name, etc.)
cat > /dev/null

# Check if there's already a recent spec (within last hour)
latest=""
if [[ -d "$PLANS_DIR" ]]; then
    latest=$(find "$PLANS_DIR" -name "*.md" -not -name "playwright-mcp.md" -type f -mmin -60 -print0 2>/dev/null \
        | xargs -0 --no-run-if-empty ls -t 2>/dev/null \
        | head -n 1)
fi

if [[ -n "$latest" ]]; then
    # Recent spec exists — no flag needed
    rm -f "$FLAG_FILE" 2>/dev/null
    echo "[Session] Recent spec found: ${latest##*/} — spec-first gate inactive."
else
    # No recent spec — set flag
    echo "NEEDS_SPEC" > "$FLAG_FILE"
    echo "[Session] Spec-first workflow active. You MUST write a spec to .claude/plans/[feature].md before coding. Use .claude/templates/spec.md.template as the template. Coding tools (Edit, Write, Bash) will be blocked until the spec is written."
fi

exit 0
