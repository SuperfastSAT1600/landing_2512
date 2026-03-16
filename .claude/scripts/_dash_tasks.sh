#!/usr/bin/env bash
# Task Progress Pane — shows all tasks for an agent team
# Usage: bash _dash_tasks.sh <team-name>

TEAM="${1:-}"
if [[ -z "$TEAM" ]]; then
    echo "Usage: $0 <team-name>" >&2
    exit 1
fi

TASKS_DIR="$HOME/.claude/tasks/$TEAM"

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

echo -e "${BOLD}${CYAN}═══════════════════════════════════════════${NC}"
echo -e "${BOLD}${CYAN}  📋 TASK PROGRESS — Team: $TEAM${NC}"
echo -e "${BOLD}${CYAN}═══════════════════════════════════════════${NC}"
echo ""

total=0
completed=0
in_progress=0
pending=0

for f in "$TASKS_DIR"/*.json; do
    [ -f "$f" ] || continue

    subject=$(python3 -c "import json; d=json.load(open('$f')); print(d.get('subject',''))" 2>/dev/null)
    status=$(python3 -c "import json; d=json.load(open('$f')); print(d.get('status',''))" 2>/dev/null)
    owner=$(python3 -c "import json; d=json.load(open('$f')); print(d.get('owner',''))" 2>/dev/null)
    blocked_by=$(python3 -c "import json; d=json.load(open('$f')); bl=d.get('blockedBy',[]); print(','.join(str(b) for b in bl) if bl else '')" 2>/dev/null)
    id=$(basename "$f" .json)

    [ -z "$subject" ] && continue
    [[ "$status" == "deleted" ]] && continue

    total=$((total + 1))

    case "$status" in
        completed)
            icon="✅"; color="$GREEN"; completed=$((completed + 1)) ;;
        in_progress)
            icon="🔄"; color="$YELLOW"; in_progress=$((in_progress + 1)) ;;
        pending)
            if [ -n "$blocked_by" ]; then icon="🔒"; color="$DIM"
            else icon="⏳"; color="$WHITE"; fi
            pending=$((pending + 1)) ;;
        *)
            icon="❓"; color="$DIM" ;;
    esac

    short_subject="${subject:0:50}"
    owner_tag=""
    [ -n "$owner" ] && owner_tag="${DIM}[${owner}]${NC}"
    block_info=""
    [ -n "$blocked_by" ] && block_info="${RED}← blocked${NC}"

    echo -e "  ${color}${icon} #${id} ${short_subject}${NC} ${owner_tag} ${block_info}"
done

echo ""
echo -e "${BOLD}─────────────────────────────────────────${NC}"

if [ $total -gt 0 ]; then
    pct=$((completed * 100 / total))
    bar_width=30
    filled=$((completed * bar_width / total))
    empty=$((bar_width - filled))
    bar="${GREEN}"
    for ((i=0; i<filled; i++)); do bar+="█"; done
    bar+="${DIM}"
    for ((i=0; i<empty; i++)); do bar+="░"; done
    bar+="${NC}"
    echo -e "  ${bar} ${BOLD}${pct}%${NC} (${completed}/${total})"
else
    echo -e "  ${DIM}No tasks found in $TASKS_DIR${NC}"
fi

echo -e "  ${GREEN}✅ ${completed} done${NC}  ${YELLOW}🔄 ${in_progress} active${NC}  ${WHITE}⏳ ${pending} pending${NC}"
echo ""
echo -e "${DIM}  Updated: $(date '+%H:%M:%S')${NC}"
