#!/bin/bash
# PostToolUse hook: Track skill loading for session awareness
# Called when the Skill tool is used

SKILLS_MARKER=".claude/user/.skills-marker"

# Create marker directory if needed
mkdir -p .claude/user

# Get current timestamp
TIMESTAMP=$(date +%s)

# Simple approach: just update the skills marker file
echo "$TIMESTAMP" > "$SKILLS_MARKER"

exit 0
