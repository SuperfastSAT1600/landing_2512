#!/usr/bin/env bash
# Agent Status Pane — shows 6-role pipeline status
# Usage: bash _dash_agents.sh <team-name>

TEAM="${1:-}"
if [[ -z "$TEAM" ]]; then
    echo "Usage: $0 <team-name>" >&2
    exit 1
fi

TEAM_CONFIG="$HOME/.claude/teams/$TEAM/config.json"
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

echo -e "${BOLD}${PURPLE}═══════════════════════════════════════════${NC}"
echo -e "${BOLD}${PURPLE}  🤖 AGENT STATUS — Team: $TEAM${NC}"
echo -e "${BOLD}${PURPLE}═══════════════════════════════════════════${NC}"
echo ""

if [ ! -f "$TEAM_CONFIG" ]; then
    echo -e "  ${RED}Team config not found: $TEAM_CONFIG${NC}"
    exit 0
fi

python3 -c "
import json, os, glob

config = json.load(open('$TEAM_CONFIG'))
tasks_dir = '$TASKS_DIR'

icons = {
    'team-lead':  '👑',
    'research':   '🔭',
    'architect':  '🏗️ ',
    'builder-1':  '🔨',
    'builder-2':  '🔨',
    'verifier':   '🔍',
    'integrator': '📦',
}

colors = {
    'team-lead':  '\033[1;37m',
    'research':   '\033[0;36m',
    'architect':  '\033[0;34m',
    'builder-1':  '\033[0;32m',
    'builder-2':  '\033[1;33m',
    'verifier':   '\033[0;35m',
    'integrator': '\033[0;36m',
}

NC = '\033[0m'
DIM = '\033[2m'
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'

task_status = {}
for tf in glob.glob(os.path.join(tasks_dir, '*.json')):
    try:
        t = json.load(open(tf))
        owner = t.get('owner', '')
        status = t.get('status', '')
        subject = t.get('subject', '')
        if not subject or status == 'deleted':
            continue
        if owner not in task_status:
            task_status[owner] = []
        task_status[owner].append({'subject': subject[:40], 'status': status})
    except:
        pass

for member in config.get('members', []):
    name = member.get('name', '?')
    icon = icons.get(name, '🤖')
    color = colors.get(name, '\033[0m')
    tasks = task_status.get(name, [])
    active = [t for t in tasks if t['status'] == 'in_progress']
    done = [t for t in tasks if t['status'] == 'completed']
    pending = [t for t in tasks if t['status'] == 'pending']

    if active:
        status_str = f'{YELLOW}WORKING{NC}'
        detail = active[0]['subject']
    elif pending:
        status_str = f'{DIM}WAITING{NC}'
        detail = f'{len(pending)} tasks queued'
    elif done and not pending:
        status_str = f'{GREEN}DONE{NC}'
        detail = f'{len(done)} tasks completed'
    else:
        status_str = f'{DIM}IDLE{NC}'
        detail = ''

    print(f'  {color}{icon} {name:<14}{NC} {status_str}')
    if detail:
        print(f'     {DIM}└─ {detail}{NC}')
    print()
" 2>/dev/null

echo -e "${BOLD}─────────────────────────────────────────${NC}"
echo ""
echo -e "  ${BOLD}Pipeline Flow:${NC}"
echo ""
echo -e "  ${CYAN}research${NC} → ${BLUE}architect${NC} → ${GREEN}builder-1${NC} ──┐"
echo -e "                          → ${YELLOW}builder-2${NC} ──┤→ ${PURPLE}verifier${NC} + ${CYAN}integrator${NC}"
echo ""
echo -e "${DIM}  Updated: $(date '+%H:%M:%S')${NC}"
