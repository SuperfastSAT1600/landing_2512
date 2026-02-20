#!/bin/bash
#
# Send pending Slack notifications
# This script is called by Claude Code to send notifications via Slack MCP
#
# Usage:
#   ./send-slack-notification.sh [notification_file]
#
# If no file is specified, finds the most recent notification in /tmp

set -e

NOTIFICATION_FILE="${1:-}"

# Find most recent notification if not specified
if [ -z "$NOTIFICATION_FILE" ]; then
  NOTIFICATION_FILE=$(ls -t /tmp/claude-slack-notification-*.json 2>/dev/null | head -1)
fi

if [ -z "$NOTIFICATION_FILE" ] || [ ! -f "$NOTIFICATION_FILE" ]; then
  echo "[Slack] No pending notifications found" >&2
  exit 0
fi

echo "[Slack] Processing notification: $NOTIFICATION_FILE" >&2

# Read notification data
CHANNEL=$(grep -o '"channel": *"[^"]*"' "$NOTIFICATION_FILE" | sed 's/"channel": *"\([^"]*\)"/\1/')
MESSAGE=$(grep -o '"message": *"[^"]*"' "$NOTIFICATION_FILE" | sed 's/"message": *"\([^"]*\)"/\1/')

echo "[Slack] Channel: $CHANNEL" >&2
echo "[Slack] Message: ${MESSAGE:0:100}..." >&2

# Output structured data for Claude Code to process
cat <<EOF
{
  "action": "send_slack_message",
  "channel": "$CHANNEL",
  "message": "$MESSAGE",
  "notification_file": "$NOTIFICATION_FILE"
}
EOF

exit 0
