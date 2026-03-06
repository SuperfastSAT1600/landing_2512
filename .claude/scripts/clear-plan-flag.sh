#!/bin/bash
# =============================================================================
# Clear Plan Flag
# Description: After a spec is successfully written to .claude/plans/, clear the
#              plan-active flag and run the spec audit.
# Called by: PostToolUse hook on Write to .claude/plans/*.md
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FLAG_FILE="$PROJECT_ROOT/.claude/.plan-active"
AUDIT_SCRIPT="$SCRIPT_DIR/audit-spec.sh"

# Read hook input from stdin
INPUT=$(cat)

# Extract the file path that was just written
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))" 2>/dev/null || echo "")

if [[ -z "$FILE_PATH" || ! -f "$FILE_PATH" ]]; then
    exit 0
fi

# Clear the plan-active flag
rm -f "$FLAG_FILE" 2>/dev/null

# Activate TDD enforcement: require test-first for next implementation cycle
TDD_FLAG="$PROJECT_ROOT/.claude/.tdd-test-written"
TDD_NEEDS_TEST="$PROJECT_ROOT/.claude/.tdd-needs-test"
rm -f "$TDD_FLAG" 2>/dev/null
touch "$TDD_NEEDS_TEST"

# Run the spec audit
echo "[Hook] Spec written: ${FILE_PATH##*/}" >&2
echo "[Hook] Running audit..." >&2
echo "" >&2

if bash "$AUDIT_SCRIPT" "$FILE_PATH" >&2; then
    echo "" >&2
    echo "[Hook] Spec passed audit. Coding tools are now unblocked." >&2

    # Auto-generate test stubs from traceability matrix
    if [[ -f "$SCRIPT_DIR/generate-test-stubs.sh" ]]; then
        echo "" >&2
        echo "[Hook] Auto-generating test stubs from traceability matrix..." >&2
        bash "$SCRIPT_DIR/generate-test-stubs.sh" "$FILE_PATH" >&2 || true
    fi

    # Warn if editing spec during active team session
    if ls ~/.claude/teams/*/config.json 2>/dev/null | head -1 > /dev/null 2>&1; then
        echo "⚠️  WARNING: Active team session detected." >&2
        echo "   Spec changes may not be picked up by running teammates." >&2
        echo "   Consider: /req-status to check coverage, then notify teammates." >&2
    fi

    exit 0
else
    audit_exit=$?
    if [[ $audit_exit -eq 2 ]]; then
        echo "" >&2
        echo "[Hook] Spec has critical issues. Fix the spec before proceeding." >&2
        # Re-set the flag so coding stays blocked
        touch "$FLAG_FILE"
        # Don't exit 2 here — the Write already happened (PostToolUse can't undo it)
        # But the flag being re-set means the PreToolUse gate stays active
        exit 0
    else
        # Warnings only — allow through
        echo "" >&2
        echo "[Hook] Spec has minor warnings but is acceptable. Coding tools unblocked." >&2
        exit 0
    fi
fi
