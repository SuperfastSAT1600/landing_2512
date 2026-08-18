#!/bin/bash
# PostToolUse hook: Mark that errors.md was read this session

MARKER_FILE=".claude/user/.errors-read-marker"

# Create marker directory if needed
mkdir -p .claude/user

# Touch the marker file to update its timestamp
touch "$MARKER_FILE"

exit 0
