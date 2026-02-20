#!/bin/bash
# PreToolUse hook: Warn if MCP tools weren't used before coding
# Called before Write/Edit on code files

MARKERS_DIR=".claude/user"
SESSION_TIMEOUT=300  # 5 minutes in seconds

# Skip if not a code file (this check is backup - hook matcher should filter)
FILE_PATH="${1:-}"
if [[ -n "$FILE_PATH" ]]; then
  if [[ ! "$FILE_PATH" =~ \.(ts|tsx|js|jsx|py|go|rs|java|kt|swift|rb|php|cs|cpp|c|h)$ ]]; then
    exit 0
  fi
fi

# Check if any MCP marker files exist (individual or combined)
MARKERS_FOUND=0
FRESH_MARKERS=0
CURRENT_TIME=$(date +%s)

# Check for individual marker files (.mcp-*-marker)
shopt -s nullglob 2>/dev/null || true
for marker in "$MARKERS_DIR"/.mcp-*-marker; do
  if [ -f "$marker" ]; then
    MARKERS_FOUND=1
    # Get marker age
    if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "Darwin"* ]]; then
      MARKER_TIME=$(stat -f %m "$marker" 2>/dev/null || echo 0)
    else
      MARKER_TIME=$(stat -c %Y "$marker" 2>/dev/null || echo 0)
    fi
    MARKER_AGE=$((CURRENT_TIME - MARKER_TIME))
    if [ "$MARKER_AGE" -lt "$SESSION_TIMEOUT" ]; then
      FRESH_MARKERS=1
      break
    fi
  fi
done
shopt -u nullglob 2>/dev/null || true

# Also check combined markers file
MARKERS_FILE="$MARKERS_DIR/.mcp-markers.json"
if [ -f "$MARKERS_FILE" ] && [ "$FRESH_MARKERS" -eq 0 ]; then
  MARKERS_FOUND=1
  if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "Darwin"* ]]; then
    MARKER_TIME=$(stat -f %m "$MARKERS_FILE" 2>/dev/null || echo 0)
  else
    MARKER_TIME=$(stat -c %Y "$MARKERS_FILE" 2>/dev/null || echo 0)
  fi
  MARKER_AGE=$((CURRENT_TIME - MARKER_TIME))
  if [ "$MARKER_AGE" -lt "$SESSION_TIMEOUT" ]; then
    FRESH_MARKERS=1
  fi
fi

# Also check skills marker
SKILLS_MARKER="$MARKERS_DIR/.skills-marker"
if [ -f "$SKILLS_MARKER" ] && [ "$FRESH_MARKERS" -eq 0 ]; then
  MARKERS_FOUND=1
  if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "Darwin"* ]]; then
    MARKER_TIME=$(stat -f %m "$SKILLS_MARKER" 2>/dev/null || echo 0)
  else
    MARKER_TIME=$(stat -c %Y "$SKILLS_MARKER" 2>/dev/null || echo 0)
  fi
  MARKER_AGE=$((CURRENT_TIME - MARKER_TIME))
  if [ "$MARKER_AGE" -lt "$SESSION_TIMEOUT" ]; then
    FRESH_MARKERS=1
  fi
fi

# No markers found at all
if [ "$MARKERS_FOUND" -eq 0 ]; then
  echo "[Hook] ⚠️ REMINDER: No MCP tools or skills used this session" >&2
  echo "[Hook] Consider querying Context7 for unfamiliar libraries" >&2
  echo "[Hook] Consider searching Memory for similar patterns" >&2
  echo "[Hook] Consider loading relevant skills before coding" >&2
  exit 1  # Warn but allow (exit 1 = warning, exit 2 = block)
fi

# Markers exist but all are stale
if [ "$FRESH_MARKERS" -eq 0 ]; then
  echo "[Hook] ⚠️ REMINDER: MCP/skill markers are stale (>5 min old)" >&2
  echo "[Hook] Consider refreshing Context7/Memory queries for current context" >&2
  exit 1  # Warn but allow
fi

# Fresh markers exist - allow silently
exit 0
