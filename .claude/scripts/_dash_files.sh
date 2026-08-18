#!/usr/bin/env bash
# File Changes Pane — shows recent git changes and active specs
# Usage: bash _dash_files.sh
# Auto-detects project root via git

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

# Auto-detect project root
PROJECT_DIR=$(git rev-parse --show-toplevel 2>/dev/null)
if [[ -z "$PROJECT_DIR" ]]; then
    echo -e "${RED}Not in a git repository${NC}"
    exit 1
fi

echo -e "${BOLD}${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${BOLD}${GREEN}  📁 FILE CHANGES (git status)${NC}"
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════${NC}"
echo ""

cd "$PROJECT_DIR"

staged=$(git diff --cached --name-only 2>/dev/null | head -10)
modified=$(git diff --name-only 2>/dev/null | head -20)
untracked=$(git ls-files --others --exclude-standard 2>/dev/null | head -10)

if [ -n "$staged" ]; then
    echo -e "  ${GREEN}${BOLD}Staged:${NC}"
    while IFS= read -r f; do
        echo -e "    ${GREEN}+ ${f}${NC}"
    done <<< "$staged"
    echo ""
fi

if [ -n "$modified" ]; then
    echo -e "  ${YELLOW}${BOLD}Modified:${NC}"
    while IFS= read -r f; do
        echo -e "    ${YELLOW}~ ${f}${NC}"
    done <<< "$modified"
    echo ""
fi

if [ -n "$untracked" ]; then
    echo -e "  ${CYAN}${BOLD}New Files:${NC}"
    while IFS= read -r f; do
        echo -e "    ${CYAN}? ${f}${NC}"
    done <<< "$untracked"
    echo ""
fi

if [ -z "$staged" ] && [ -z "$modified" ] && [ -z "$untracked" ]; then
    echo -e "  ${DIM}No changes detected${NC}"
fi

echo ""
echo -e "${BOLD}─────────────────────────────────────────${NC}"
echo ""
echo -e "  ${BOLD}📝 Active Specs:${NC}"

specs_dir="$PROJECT_DIR/.claude/plans"
if [ -d "$specs_dir" ]; then
    while IFS= read -r f; do
        name=$(basename "$f")
        size=$(wc -l < "$f" 2>/dev/null || echo 0)
        echo -e "    ${BLUE}📄 ${name}${NC} ${DIM}(${size} lines)${NC}"
    done < <(find "$specs_dir" -name "*.md" -not -name "*.template" 2>/dev/null | sort)
else
    echo -e "    ${DIM}No .claude/plans/ directory found${NC}"
fi

echo ""
echo -e "${DIM}  Root: ${PROJECT_DIR}${NC}"
echo -e "${DIM}  Updated: $(date '+%H:%M:%S')${NC}"
