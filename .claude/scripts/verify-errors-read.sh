#!/bin/bash
# Verification hook: Ensures .claude/user/errors.md was read before starting work

MARKER_FILE=".claude/user/.errors-read-marker"
SESSION_TIMEOUT=300  # 5 minutes in seconds

# Check if marker exists and is recent (within session timeout)
if [ -f "$MARKER_FILE" ]; then
  # Get marker age in seconds (cross-platform)
  if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "Darwin"* ]]; then
    # macOS
    MARKER_AGE=$(($(date +%s) - $(stat -f %m "$MARKER_FILE" 2>/dev/null || echo 0)))
  else
    # Linux/Windows Git Bash
    MARKER_AGE=$(($(date +%s) - $(stat -c %Y "$MARKER_FILE" 2>/dev/null || echo 0)))
  fi

  if [ "$MARKER_AGE" -lt "$SESSION_TIMEOUT" ]; then
    # Marker is fresh, errors.md was read recently
    exit 0
  fi
fi

# Marker doesn't exist or is stale - BLOCK
echo "[Hook] ❌ BLOCKED: Must read .claude/user/errors.md before starting work" >&2
echo "[Hook] This ensures you avoid repeating logged mistakes." >&2
echo "[Hook] Action: Read .claude/user/errors.md first, then retry." >&2
exit 2
