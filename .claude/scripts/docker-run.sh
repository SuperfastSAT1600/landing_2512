#!/bin/bash
# ============================================================
# Claude Code in Docker (YOLO mode)
# ============================================================
#
# Uses your existing Claude login from the host — no extra setup.
#
#   ./docker-run.sh             ← then type "claude" inside
#   ./docker-run.sh --tmux      ← for agent teams
#   ./docker-run.sh --build     ← rebuild after Dockerfile changes
#
# Supports regular repos AND git worktrees automatically.
#
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
IMAGE_NAME="claude-code-yolo"

# ── Load .env from project root ───────────────────────────
if [ -f "$PROJECT_ROOT/.env" ]; then
    set -a
    # shellcheck disable=SC1090
    source <(sed 's/\r//' "$PROJECT_ROOT/.env")
    set +a
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ── Build image if needed ──────────────────────────────────
if [ "$1" = "--build" ]; then
    echo -e "${YELLOW}Building Docker image...${NC}"
    docker build -t "$IMAGE_NAME" -f "$PROJECT_ROOT/.devcontainer/Dockerfile" "$PROJECT_ROOT/.devcontainer"
    echo -e "${GREEN}Done!${NC}"
    shift
    [ $# -eq 0 ] && exit 0
fi

if ! docker image inspect "$IMAGE_NAME" > /dev/null 2>&1; then
    echo -e "${YELLOW}First run — building Docker image (takes ~1 min)...${NC}"
    docker build -t "$IMAGE_NAME" -f "$PROJECT_ROOT/.devcontainer/Dockerfile" "$PROJECT_ROOT/.devcontainer"
    echo -e "${GREEN}Done!${NC}"
fi

# ── Find host credentials ────────────────────────────────
# In WSL, $HOME is /home/<user> but credentials live in the Windows home.
# Detect WSL and use the Windows user profile path instead.
HOST_CLAUDE_DIR="$HOME/.claude"
if [ -d "/mnt/c" ] && [ -f "/mnt/c/Users/$USER/.claude/.credentials.json" ]; then
    HOST_CLAUDE_DIR="/mnt/c/Users/$USER/.claude"
elif [ -d "/mnt/c" ] && [ -n "$WSLENV" ] || grep -qi microsoft /proc/version 2>/dev/null; then
    WIN_HOME=$(wslpath "$(cmd.exe /C 'echo %USERPROFILE%' 2>/dev/null | tr -d '\r')" 2>/dev/null || true)
    if [ -n "$WIN_HOME" ] && [ -f "$WIN_HOME/.claude/.credentials.json" ]; then
        HOST_CLAUDE_DIR="$WIN_HOME/.claude"
    fi
fi

echo -e "  Credentials: ${GREEN}$HOST_CLAUDE_DIR${NC}"

if [ ! -f "$HOST_CLAUDE_DIR/.credentials.json" ]; then
    echo ""
    echo -e "${RED}Not logged in.${NC} Run this first (outside Docker):"
    echo ""
    echo "  claude login"
    echo ""
    exit 1
fi

# ── Common docker args ────────────────────────────────────
# Mounts host ~/.claude READ-ONLY to a staging path.
# Entrypoint copies credentials to a container-local dir so
# multiple containers never conflict with each other.
DOCKER_ARGS=(
    --rm -it
    -v "$PROJECT_ROOT:/workspace"
    -v "$HOST_CLAUDE_DIR:/host-claude:ro"
    -e "CLAUDE_CONFIG_DIR=/home/claude/.claude"
    --memory=4g
    --cpus=2
)

# ── Pass GitHub token for gh CLI ─────────────────────────
# gh CLI automatically uses GH_TOKEN env var for auth.
# Set GH_TOKEN on your host (e.g. in ~/.bashrc) or pass it directly:
#   GH_TOKEN=ghp_xxx ./docker-run.sh
if [ -n "$GH_TOKEN" ]; then
    DOCKER_ARGS+=(-e "GH_TOKEN=$GH_TOKEN")
    echo -e "  GitHub CLI: ${GREEN}authenticated via GH_TOKEN${NC}"
elif [ -n "$GITHUB_TOKEN" ]; then
    DOCKER_ARGS+=(-e "GH_TOKEN=$GITHUB_TOKEN")
    echo -e "  GitHub CLI: ${GREEN}authenticated via GITHUB_TOKEN${NC}"
else
    echo -e "  GitHub CLI: ${YELLOW}no token found${NC} (set GH_TOKEN on host to enable)"
fi

# ── Pass Supabase access token ────────────────────────────
# Supabase CLI uses SUPABASE_ACCESS_TOKEN env var for auth.
# Set it on your host (e.g. in .env or ~/.bashrc):
#   SUPABASE_ACCESS_TOKEN=sbp_xxx ./docker-run.sh
if [ -n "$SUPABASE_ACCESS_TOKEN" ]; then
    DOCKER_ARGS+=(-e "SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN")
    echo -e "  Supabase CLI: ${GREEN}authenticated via SUPABASE_ACCESS_TOKEN${NC}"
else
    echo -e "  Supabase CLI: ${YELLOW}no token found${NC} (set SUPABASE_ACCESS_TOKEN on host to enable)"
fi

# ── Git worktree support ─────────────────────────────────
# If this project is a git worktree (.git is a file, not a dir),
# mount the main repo's .git and pass env vars so git works
# inside the container. NO host files are modified.
if [ -f "$PROJECT_ROOT/.git" ]; then
    GITDIR_TARGET=$(sed 's/^gitdir: //' "$PROJECT_ROOT/.git")

    # Convert Windows paths (C:/...) to WSL style if needed
    if [[ "$GITDIR_TARGET" =~ ^[A-Z]:/ ]] && [ -d "/mnt/c" ]; then
        DRIVE_LETTER=$(echo "${GITDIR_TARGET:0:1}" | tr 'A-Z' 'a-z')
        GITDIR_TARGET="/mnt/$DRIVE_LETTER/${GITDIR_TARGET:3}"
    fi

    # Resolve to absolute path
    if GITDIR_ABS=$(cd "$PROJECT_ROOT" && cd "$GITDIR_TARGET" 2>/dev/null && pwd); then
        WORKTREE_NAME=$(basename "$GITDIR_ABS")
        MAIN_GIT_DIR=$(cd "$GITDIR_ABS/../.." && pwd)

        if [ -d "$MAIN_GIT_DIR/worktrees/$WORKTREE_NAME" ]; then
            DOCKER_ARGS+=(
                -v "$MAIN_GIT_DIR:/main-git"
                -e "WORKTREE_NAME=$WORKTREE_NAME"
            )
            echo -e "  Worktree: ${YELLOW}$WORKTREE_NAME${NC} (main: $(basename "$(dirname "$MAIN_GIT_DIR")"))"
        fi
    fi
fi

# Add image name (must be last before the command)
DOCKER_ARGS+=("$IMAGE_NAME")

# ── Start container ───────────────────────────────────────
echo ""
echo -e "${GREEN}Starting Claude Code container...${NC}"
echo -e "${BLUE}────────────────────────────────────────────${NC}"
echo -e "  Your project is at ${GREEN}/workspace${NC}"
echo -e "  YOLO mode is ${YELLOW}ON${NC} (safe — you're inside Docker)"
echo ""

if [ "$1" = "--tmux" ]; then
    echo -e "  ${GREEN}tmux cheat sheet:${NC}"
    echo -e "    Split side-by-side:  ${YELLOW}Ctrl+B${NC} then ${YELLOW}%${NC}"
    echo -e "    Split top/bottom:    ${YELLOW}Ctrl+B${NC} then ${YELLOW}\"${NC}"
    echo -e "    Switch pane:         ${YELLOW}Ctrl+B${NC} then ${YELLOW}arrow key${NC}"
    echo -e "    Leave (keep alive):  ${YELLOW}Ctrl+B${NC} then ${YELLOW}d${NC}"
    echo -e "    Close pane:          type ${YELLOW}exit${NC}"
    echo ""
    echo -e "  Type ${GREEN}claude${NC} in each pane to start an agent."
    echo -e "${BLUE}────────────────────────────────────────────${NC}"
    echo ""
    docker run "${DOCKER_ARGS[@]}" tmux new-session -s claude
else
    echo -e "  Type ${GREEN}claude${NC} to start."
    echo -e "  Type ${YELLOW}exit${NC} to leave."
    echo -e "${BLUE}────────────────────────────────────────────${NC}"
    echo ""
    docker run "${DOCKER_ARGS[@]}" bash
fi
