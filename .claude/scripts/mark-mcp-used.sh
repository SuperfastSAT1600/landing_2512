#!/bin/bash
# PostToolUse hook: Track MCP tool usage for session awareness
# Called when Context7, Memory, or other MCP tools are used

MCP_TYPE="${1:-unknown}"
MARKERS_FILE=".claude/user/.mcp-markers.json"

# Create marker directory if needed
mkdir -p .claude/user

# Get current timestamp
TIMESTAMP=$(date +%s)

# Simple approach: always recreate with current markers
# Read existing markers, update/add new one, write back
if [ -f "$MARKERS_FILE" ] && command -v jq &> /dev/null; then
  # jq available - use it for proper JSON manipulation
  jq --arg type "$MCP_TYPE" --arg ts "$TIMESTAMP" \
    '.[$type] = {"lastUsed": ($ts | tonumber)}' \
    "$MARKERS_FILE" > "${MARKERS_FILE}.tmp" && mv "${MARKERS_FILE}.tmp" "$MARKERS_FILE"
else
  # No jq or no file - simple approach: just write timestamp file
  # Store each MCP type in its own file for simplicity
  echo "$TIMESTAMP" > ".claude/user/.mcp-${MCP_TYPE}-marker"

  # Also update combined file for backwards compatibility (simple format)
  echo "{\"${MCP_TYPE}\": {\"lastUsed\": ${TIMESTAMP}}, \"_updated\": ${TIMESTAMP}}" > "$MARKERS_FILE"
fi

exit 0
