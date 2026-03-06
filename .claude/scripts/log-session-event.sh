#!/bin/bash
# =============================================================================
# Log Session Event
# Description: Append a structured JSON event to session-log.jsonl
# Usage: ./.claude/scripts/log-session-event.sh <event> <agent> <result> [details]
# =============================================================================

set -euo pipefail

# Constants
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly LOG_FILE="$PROJECT_ROOT/.claude/user/session-log.jsonl"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Arguments
EVENT="${1:-unknown}"
AGENT="${2:-unknown}"
RESULT="${3:-unknown}"
DETAILS="${4:-}"

# Build JSON line (minimal deps — no jq required)
TIMESTAMP=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

# Escape special JSON characters in details
escape_json() {
    local str="$1"
    str="${str//\\/\\\\}"
    str="${str//\"/\\\"}"
    str="${str//$'\n'/\\n}"
    str="${str//$'\t'/\\t}"
    echo "$str"
}

ESCAPED_DETAILS=$(escape_json "$DETAILS")

if [[ -n "$DETAILS" ]]; then
    echo "{\"ts\":\"$TIMESTAMP\",\"event\":\"$EVENT\",\"agent\":\"$AGENT\",\"result\":\"$RESULT\",\"details\":\"$ESCAPED_DETAILS\"}" >> "$LOG_FILE"
else
    echo "{\"ts\":\"$TIMESTAMP\",\"event\":\"$EVENT\",\"agent\":\"$AGENT\",\"result\":\"$RESULT\"}" >> "$LOG_FILE"
fi
