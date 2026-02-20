#!/bin/bash
# PostToolUse hook: Detect patterns in errors.md after reading
# Notifies if 2+ similar errors detected (auto-heal candidates)

ERRORS_FILE=".claude/user/errors.md"

# Check if file exists
if [ ! -f "$ERRORS_FILE" ]; then
  exit 0
fi

# Count errors by category (looking for [category] prefix pattern)
# Use tr to remove any whitespace/newlines from grep output
CONTEXT_ERRORS=$(grep -c '^\- \[context\]' "$ERRORS_FILE" 2>/dev/null | tr -d '[:space:]')
CONTEXT_ERRORS=${CONTEXT_ERRORS:-0}
CODE_ERRORS=$(grep -c '^\- \[code\]' "$ERRORS_FILE" 2>/dev/null | tr -d '[:space:]')
CODE_ERRORS=${CODE_ERRORS:-0}
CMD_ERRORS=$(grep -c '^\- \[cmd\]' "$ERRORS_FILE" 2>/dev/null | tr -d '[:space:]')
CMD_ERRORS=${CMD_ERRORS:-0}
TOOL_ERRORS=$(grep -c '^\- \[tool\]' "$ERRORS_FILE" 2>/dev/null | tr -d '[:space:]')
TOOL_ERRORS=${TOOL_ERRORS:-0}
AGENT_ERRORS=$(grep -c '^\- \[agent\]' "$ERRORS_FILE" 2>/dev/null | tr -d '[:space:]')
AGENT_ERRORS=${AGENT_ERRORS:-0}
CONFIG_ERRORS=$(grep -c '^\- \[config\]' "$ERRORS_FILE" 2>/dev/null | tr -d '[:space:]')
CONFIG_ERRORS=${CONFIG_ERRORS:-0}

# Check if any category has 2+ errors (pattern detected)
PATTERNS_FOUND=0

if [ "$CONTEXT_ERRORS" -ge 2 ]; then
  PATTERNS_FOUND=1
fi
if [ "$CODE_ERRORS" -ge 2 ]; then
  PATTERNS_FOUND=1
fi
if [ "$CMD_ERRORS" -ge 2 ]; then
  PATTERNS_FOUND=1
fi
if [ "$TOOL_ERRORS" -ge 2 ]; then
  PATTERNS_FOUND=1
fi
if [ "$AGENT_ERRORS" -ge 2 ]; then
  PATTERNS_FOUND=1
fi
if [ "$CONFIG_ERRORS" -ge 2 ]; then
  PATTERNS_FOUND=1
fi

# Notify if patterns detected
if [ "$PATTERNS_FOUND" -eq 1 ]; then
  echo "[Hook] ⚠️ PATTERNS DETECTED in errors.md (auto-heal candidates):" >&2
  [ "$CONTEXT_ERRORS" -ge 2 ] && echo "[Hook]   - Context errors: $CONTEXT_ERRORS" >&2
  [ "$CODE_ERRORS" -ge 2 ] && echo "[Hook]   - Code errors: $CODE_ERRORS" >&2
  [ "$CMD_ERRORS" -ge 2 ] && echo "[Hook]   - Command errors: $CMD_ERRORS" >&2
  [ "$TOOL_ERRORS" -ge 2 ] && echo "[Hook]   - Tool errors: $TOOL_ERRORS" >&2
  [ "$AGENT_ERRORS" -ge 2 ] && echo "[Hook]   - Agent errors: $AGENT_ERRORS" >&2
  [ "$CONFIG_ERRORS" -ge 2 ] && echo "[Hook]   - Config errors: $CONFIG_ERRORS" >&2
  echo "[Hook] Consider auto-healing per self-improvement.md rules" >&2
fi

# Always exit 0 (notification only, never block)
exit 0
