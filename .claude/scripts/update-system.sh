#!/bin/bash
# Safe update script for .claude/ system files
# Preserves user data while updating system configuration

set -e  # Exit on error

CLAUDE_DIR=".claude"
USER_DIR="$CLAUDE_DIR/user"
BACKUP_DIR=".claude-backup-$(date +%Y%m%d-%H%M%S)"
SOURCE_DIR="../claude-code-setup/.claude"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Claude Code System Update ===${NC}\n"

# Step 1: Validate and update source
echo -e "${BLUE}[1/6] Validating and updating source...${NC}"

REPO_DIR="../claude-code-setup"

if [ ! -d "$REPO_DIR" ]; then
    echo -e "${RED}✗ Error: Repository not found: $REPO_DIR${NC}"
    echo -e "${YELLOW}Cloning repository...${NC}"
    cd ..
    if ! git clone https://github.com/YOUR_REPO/claude-code-setup.git; then
        echo -e "${RED}✗ Failed to clone repository${NC}"
        echo -e "${YELLOW}Please clone manually:${NC}"
        echo -e "  cd .."
        echo -e "  git clone https://github.com/YOUR_REPO/claude-code-setup.git"
        exit 1
    fi
    cd - > /dev/null
    echo -e "${GREEN}✓ Repository cloned${NC}"
else
    echo -e "${GREEN}✓ Repository found: $REPO_DIR${NC}"

    # Pull latest changes
    echo -e "${YELLOW}→ Pulling latest changes...${NC}"
    cd "$REPO_DIR"

    # Stash any local changes if they exist
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        echo -e "${YELLOW}  → Stashing local changes...${NC}"
        git stash push -m "Auto-stash before update-system $(date +%Y%m%d-%H%M%S)" > /dev/null
    fi

    # Pull latest from the default remote branch
    if ! git pull; then
        echo -e "${RED}✗ Failed to pull updates${NC}"
        echo -e "${YELLOW}Please update manually:${NC}"
        echo -e "  cd $REPO_DIR"
        echo -e "  git pull"
        cd - > /dev/null
        exit 1
    fi

    cd - > /dev/null
    echo -e "${GREEN}✓ Repository updated${NC}"
fi

if [ ! -d "$SOURCE_DIR" ]; then
    echo -e "${RED}✗ Error: Source directory not found: $SOURCE_DIR${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Source ready: $SOURCE_DIR${NC}"

# Step 2: Detect existing installation
echo -e "\n${BLUE}[2/6] Detecting installation...${NC}"

HAS_NEW_STRUCTURE=false
HAS_OLD_STRUCTURE=false

if [ -d "$USER_DIR" ]; then
    echo -e "${GREEN}✓ New structure detected (.claude/user/)${NC}"
    HAS_NEW_STRUCTURE=true
fi

if [ -f "$CLAUDE_DIR/health/changelog.md" ]; then
    echo -e "${YELLOW}⚠ Old structure detected (.claude/health/changelog.md)${NC}"
    HAS_OLD_STRUCTURE=true
fi

# Step 3: Create backup
echo -e "\n${BLUE}[3/6] Creating backup...${NC}"

mkdir -p "$BACKUP_DIR"

# Backup user data (new structure)
if [ "$HAS_NEW_STRUCTURE" = true ]; then
    if [ -d "$USER_DIR" ]; then
        cp -r "$USER_DIR" "$BACKUP_DIR/"
        echo -e "${GREEN}✓ Backed up user/ folder${NC}"
    fi
    if [ -d "$USER_DIR/agent-errors" ]; then
        echo -e "${GREEN}✓ Backed up agent-errors/ folder${NC}"
    fi
fi

# Backup settings.local.json
if [ -f "$CLAUDE_DIR/settings.local.json" ]; then
    cp "$CLAUDE_DIR/settings.local.json" "$BACKUP_DIR/"
    echo -e "${GREEN}✓ Backed up settings.local.json${NC}"
fi

# Backup old structure
if [ "$HAS_OLD_STRUCTURE" = true ]; then
    if [ -f "$CLAUDE_DIR/health/changelog.md" ]; then
        mkdir -p "$BACKUP_DIR/health"
        cp "$CLAUDE_DIR/health/changelog.md" "$BACKUP_DIR/health/"
        echo -e "${GREEN}✓ Backed up old changelog${NC}"
    fi
fi

echo -e "${GREEN}Backup created at: $BACKUP_DIR${NC}"

# Step 4: Update system files
echo -e "\n${BLUE}[4/6] Updating system files...${NC}"

# Preserve user data before update
TEMP_USER_DIR=$(mktemp -d)
TEMP_SETTINGS=$(mktemp)

# Cleanup trap for temp files
cleanup() {
    rm -rf "$TEMP_USER_DIR" 2>/dev/null || true
    rm -f "$TEMP_SETTINGS" 2>/dev/null || true
}
trap cleanup EXIT

if [ -d "$USER_DIR" ] && [ "$(ls -A "$USER_DIR" 2>/dev/null)" ]; then
    cp -r "$USER_DIR/"* "$TEMP_USER_DIR/" 2>/dev/null || true
    echo -e "${YELLOW}→ Preserving user data temporarily${NC}"
fi

if [ -f "$CLAUDE_DIR/settings.local.json" ]; then
    cp "$CLAUDE_DIR/settings.local.json" "$TEMP_SETTINGS"
    echo -e "${YELLOW}→ Preserving settings.local.json temporarily${NC}"
fi

# Copy system files from source (exclude user directory)
echo -e "${YELLOW}→ Copying system files from $SOURCE_DIR${NC}"

# Copy all directories except user/
for dir in "$SOURCE_DIR"/*; do
    if [ -d "$dir" ]; then
        dirname=$(basename "$dir")
        if [ "$dirname" != "user" ]; then
            cp -r "$dir" "$CLAUDE_DIR/"
            echo -e "  ✓ Updated $dirname/"
        fi
    fi
done

# Copy root-level files in .claude/
for file in "$SOURCE_DIR"/*; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        if [ "$filename" != "settings.local.json" ]; then
            cp "$file" "$CLAUDE_DIR/"
            echo -e "  ✓ Updated $filename"
        fi
    fi
done

echo -e "${GREEN}✓ System files updated${NC}"

# Restore user data
if [ "$(ls -A "$TEMP_USER_DIR" 2>/dev/null)" ]; then
    mkdir -p "$USER_DIR"
    cp -r "$TEMP_USER_DIR/"* "$USER_DIR/"
    echo -e "${GREEN}✓ Restored user data${NC}"
fi

if [ -f "$TEMP_SETTINGS" ] && [ -s "$TEMP_SETTINGS" ]; then
    cp "$TEMP_SETTINGS" "$CLAUDE_DIR/settings.local.json"
    echo -e "${GREEN}✓ Restored settings.local.json${NC}"
fi

# Cleanup temp files
rm -rf "$TEMP_USER_DIR"
rm -f "$TEMP_SETTINGS"

# Step 5: Migrate old structure if needed
if [ "$HAS_OLD_STRUCTURE" = true ]; then
    echo -e "\n${BLUE}[5/6] Migrating old structure...${NC}"

    mkdir -p "$USER_DIR"

    if [ -f "$CLAUDE_DIR/health/changelog.md" ]; then
        # Preserve new changelog if it exists, otherwise move old one
        if [ ! -f "$USER_DIR/changelog.md" ]; then
            mv "$CLAUDE_DIR/health/changelog.md" "$USER_DIR/changelog.md"
            echo -e "${GREEN}✓ Migrated changelog to user/ folder${NC}"
        else
            echo -e "${YELLOW}⚠ New changelog already exists, keeping old one in backup${NC}"
        fi
    fi

    # Clean up old health directory
    if [ -d "$CLAUDE_DIR/health" ] && [ ! "$(ls -A "$CLAUDE_DIR/health" 2>/dev/null)" ]; then
        rmdir "$CLAUDE_DIR/health"
        echo -e "${GREEN}✓ Removed empty health/ directory${NC}"
    fi

    echo -e "${GREEN}Migration complete!${NC}"
else
    echo -e "\n${BLUE}[5/6] No migration needed${NC}"
fi

# Step 6: Verify and report
echo -e "\n${BLUE}[6/6] Verification...${NC}"

echo -e "\n${GREEN}Updated:${NC}"
echo "  - .claude/agents/ (system agents)"
echo "  - .claude/skills/ (system skills)"
echo "  - .claude/rules/ (system rules)"
echo "  - .claude/commands/ (system commands)"
echo "  - .claude/workflows/ (system workflows)"
echo "  - .claude/templates/ (system templates)"

echo -e "\n${GREEN}Preserved:${NC}"
if [ -f "$USER_DIR/changelog.md" ]; then
    CHANGELOG_LINES=$(wc -l < "$USER_DIR/changelog.md")
    echo "  - .claude/user/changelog.md ($CHANGELOG_LINES lines)"
fi
if [ -f "$USER_DIR/errors.md" ]; then
    echo "  - .claude/user/errors.md"
fi
if [ -f "$CLAUDE_DIR/settings.local.json" ]; then
    echo "  - .claude/settings.local.json"
fi
if [ -d "$USER_DIR/custom" ] && [ "$(ls -A "$USER_DIR/custom" 2>/dev/null)" ]; then
    CUSTOM_COUNT=$(find "$USER_DIR/custom" -type f | wc -l)
    echo "  - .claude/user/custom/ ($CUSTOM_COUNT custom files)"
fi
if [ -d "$USER_DIR/agent-errors" ]; then
    AGENT_ERROR_COUNT=$(find "$USER_DIR/agent-errors" -name "*.md" -type f 2>/dev/null | wc -l)
    if [ "$AGENT_ERROR_COUNT" -gt 0 ]; then
        echo "  - .claude/user/agent-errors/ ($AGENT_ERROR_COUNT agent error logs)"
    fi
fi

echo -e "\n${GREEN}Backup location:${NC} $BACKUP_DIR"
echo -e "${YELLOW}You can safely delete the backup after verifying everything works.${NC}"

echo -e "\n${GREEN}✓ Update complete!${NC}\n"
