#!/bin/bash
# =============================================================================
# Set Needs-Verification Flag
# Description: After writing/editing source code files, mark that verification
#              is needed before the task can be considered done.
# Called by: PostToolUse hook on Write/Edit to source files
#
# Only sets flag for actual source code, not config/docs/specs.
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FLAG_FILE="$PROJECT_ROOT/.claude/.needs-verification"

# Read hook input from stdin
INPUT=$(cat)

FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))" 2>/dev/null || echo "")

# Skip non-source files
case "$FILE_PATH" in
    *.md|*.json|*.yml|*.yaml|*.toml|*.env*|*.gitignore|*.gitattributes) exit 0 ;;
    *.template|*.lock) exit 0 ;;
    */.claude/*) exit 0 ;;
    *node_modules/*|*dist/*|*build/*|*.next/*) exit 0 ;;
esac

# Only flag actual code files
case "$FILE_PATH" in
    *.ts|*.tsx|*.js|*.jsx|*.py|*.go|*.rs|*.rb|*.java|*.css|*.scss|*.html|*.vue|*.svelte)
        touch "$FLAG_FILE"
        ;;
esac

exit 0
