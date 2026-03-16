#!/usr/bin/env bash
# Team Dashboard - shows agent team progress in 4 tmux panes
# Usage: bash .claude/scripts/team-dashboard.sh <team-name>
#
# Layout:
# ┌──────────────────────┬──────────────────────┐
# │   TASK PROGRESS      │   AGENT STATUS       │
# │   (top-left)         │   (top-right)        │
# ├──────────────────────┼──────────────────────┤
# │   MESSAGES LOG       │   FILE CHANGES       │
# │   (bottom-left)      │   (bottom-right)     │
# └──────────────────────┴──────────────────────┘

set -euo pipefail

TEAM="${1:-}"
if [[ -z "$TEAM" ]]; then
    echo "Usage: $0 <team-name>" >&2
    echo "Example: $0 tdd-auth" >&2
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SESSION_NAME="${TEAM}-dashboard"

# Kill existing session if any
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true

# Create tmux session
tmux new-session -d -s "$SESSION_NAME" -x 220 -y 55

# Pane 0: Task Progress (top-left)
tmux send-keys -t "$SESSION_NAME" "watch -t -n 2 -c 'bash \"$SCRIPT_DIR/_dash_tasks.sh\" \"$TEAM\"'" C-m

# Pane 1: Agent Status (top-right)
tmux split-window -h -t "$SESSION_NAME"
tmux send-keys -t "$SESSION_NAME" "watch -t -n 3 -c 'bash \"$SCRIPT_DIR/_dash_agents.sh\" \"$TEAM\"'" C-m

# Pane 2: Messages Log (bottom-left)
tmux split-window -v -t "$SESSION_NAME:0.0"
tmux send-keys -t "$SESSION_NAME" "bash \"$SCRIPT_DIR/_dash_messages.sh\" \"$TEAM\"" C-m

# Pane 3: File Changes (bottom-right)
tmux split-window -v -t "$SESSION_NAME:0.1"
tmux send-keys -t "$SESSION_NAME" "watch -t -n 5 -c 'bash \"$SCRIPT_DIR/_dash_files.sh\"'" C-m

# Even layout
tmux select-layout -t "$SESSION_NAME" tiled

# Attach
tmux attach-session -t "$SESSION_NAME"
