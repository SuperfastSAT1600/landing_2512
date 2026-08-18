#!/usr/bin/env bash
# Messages Log Pane — tails inter-agent messages
# Usage: bash _dash_messages.sh <team-name>

TEAM="${1:-}"
if [[ -z "$TEAM" ]]; then
    echo "Usage: $0 <team-name>" >&2
    exit 1
fi

INBOX_DIR="$HOME/.claude/teams/$TEAM/inboxes"
MARKER="/tmp/.dash_msg_marker_${TEAM}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}${YELLOW}═══════════════════════════════════════════${NC}"
echo -e "${BOLD}${YELLOW}  💬 INTER-AGENT MESSAGES — Team: $TEAM${NC}"
echo -e "${BOLD}${YELLOW}═══════════════════════════════════════════${NC}"
echo ""

agent_color() {
    case "$1" in
        team-lead)  echo -e "${WHITE}" ;;
        research)   echo -e "${CYAN}" ;;
        architect)  echo -e "${BLUE}" ;;
        builder-1)  echo -e "${GREEN}" ;;
        builder-2)  echo -e "${YELLOW}" ;;
        verifier)   echo -e "${PURPLE}" ;;
        integrator) echo -e "${CYAN}" ;;
        *)          echo -e "${DIM}" ;;
    esac
}

touch "$MARKER"

while true; do
    if [ -d "$INBOX_DIR" ]; then
        find "$INBOX_DIR" -name "*.json" -newer "$MARKER" 2>/dev/null | sort | while read -r msgfile; do
            [ -f "$msgfile" ] || continue
            info=$(python3 -c "
import json, os
try:
    m = json.load(open('$msgfile'))
    sender = m.get('from', m.get('sender', '?'))
    recipient = os.path.basename(os.path.dirname('$msgfile'))
    content = m.get('content', m.get('summary', ''))[:80]
    ts = m.get('timestamp', '')
    if ts:
        from datetime import datetime
        try:
            dt = datetime.fromisoformat(ts.replace('Z','+00:00'))
            ts = dt.strftime('%H:%M:%S')
        except: pass
    print(f'{sender}|{recipient}|{content}|{ts}')
except: pass
" 2>/dev/null)

            if [ -n "$info" ]; then
                IFS='|' read -r sender recipient content ts <<< "$info"
                scolor=$(agent_color "$sender")
                echo -e "  ${DIM}${ts}${NC} ${scolor}${sender}${NC} → ${DIM}${recipient}${NC}"
                echo -e "    ${content}"
                echo ""
            fi
        done
    fi

    touch "$MARKER"
    sleep 3
done
