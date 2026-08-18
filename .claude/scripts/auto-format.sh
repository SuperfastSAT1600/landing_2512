#!/bin/bash
# =============================================================================
# Auto Format
# Description: Automatically format code files on save
# Usage: ./.claude/scripts/auto-format.sh [file_path]
# Triggered by: PostToolUse hook on Edit/Write operations
# =============================================================================

set -euo pipefail

# Constants
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Get file path from argument or environment
FILE_PATH="${1:-${file_path:-}}"

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo "[Format] $*"
}

log_error() {
    echo "[Format] ERROR: $*" >&2
}

get_extension() {
    local file="$1"
    echo "${file##*.}"
}

has_command() {
    command -v "$1" >/dev/null 2>&1
}

# =============================================================================
# Formatters
# =============================================================================

format_javascript() {
    local file="$1"

    # Try Prettier first
    if has_command npx && [[ -f "$PROJECT_ROOT/package.json" ]]; then
        if npx prettier --check "$file" >/dev/null 2>&1; then
            log_info "Already formatted: $file"
            return 0
        fi

        if npx prettier --write "$file" 2>/dev/null; then
            log_info "Formatted with Prettier: $file"
            return 0
        fi
    fi

    log_info "Skipped (no formatter): $file"
}

format_typescript() {
    format_javascript "$1"

    # Run ESLint after Prettier for TypeScript files
    if has_command npx && [[ -f "$PROJECT_ROOT/package.json" ]]; then
        npx eslint --fix "$1" 2>/dev/null || true
    fi
}

format_json() {
    local file="$1"

    if has_command npx && [[ -f "$PROJECT_ROOT/package.json" ]]; then
        if npx prettier --write "$file" 2>/dev/null; then
            log_info "Formatted JSON: $file"
            return 0
        fi
    fi

    # Fallback: Python json.tool
    if has_command python3; then
        local temp_file
        temp_file=$(mktemp)
        if python3 -m json.tool "$file" > "$temp_file" 2>/dev/null; then
            mv "$temp_file" "$file"
            log_info "Formatted JSON: $file"
            return 0
        fi
        rm -f "$temp_file"
    fi

    log_info "Skipped JSON (no formatter): $file"
}

format_css() {
    local file="$1"

    if has_command npx && [[ -f "$PROJECT_ROOT/package.json" ]]; then
        if npx prettier --write "$file" 2>/dev/null; then
            log_info "Formatted CSS: $file"
            return 0
        fi
    fi

    log_info "Skipped CSS (no formatter): $file"
}

format_python() {
    local file="$1"

    # Try Black first
    if has_command black; then
        if black --quiet "$file" 2>/dev/null; then
            log_info "Formatted with Black: $file"
            return 0
        fi
    fi

    # Try autopep8
    if has_command autopep8; then
        if autopep8 --in-place "$file" 2>/dev/null; then
            log_info "Formatted with autopep8: $file"
            return 0
        fi
    fi

    log_info "Skipped Python (no formatter): $file"
}

format_go() {
    local file="$1"

    if has_command gofmt; then
        if gofmt -w "$file" 2>/dev/null; then
            log_info "Formatted with gofmt: $file"
            return 0
        fi
    fi

    log_info "Skipped Go (gofmt not found): $file"
}

format_rust() {
    local file="$1"

    if has_command rustfmt; then
        if rustfmt "$file" 2>/dev/null; then
            log_info "Formatted with rustfmt: $file"
            return 0
        fi
    fi

    log_info "Skipped Rust (rustfmt not found): $file"
}

format_sql() {
    local file="$1"

    # Try sql-formatter via npx
    if has_command npx; then
        if npx sql-formatter --fix "$file" 2>/dev/null; then
            log_info "Formatted SQL: $file"
            return 0
        fi
    fi

    log_info "Skipped SQL (no formatter): $file"
}

format_markdown() {
    local file="$1"

    if has_command npx && [[ -f "$PROJECT_ROOT/package.json" ]]; then
        if npx prettier --write --prose-wrap always "$file" 2>/dev/null; then
            log_info "Formatted Markdown: $file"
            return 0
        fi
    fi

    log_info "Skipped Markdown (no formatter): $file"
}

format_yaml() {
    local file="$1"

    if has_command npx && [[ -f "$PROJECT_ROOT/package.json" ]]; then
        if npx prettier --write "$file" 2>/dev/null; then
            log_info "Formatted YAML: $file"
            return 0
        fi
    fi

    log_info "Skipped YAML (no formatter): $file"
}

# =============================================================================
# Main
# =============================================================================

main() {
    # Validate input
    if [[ -z "$FILE_PATH" ]]; then
        log_error "No file path provided"
        exit 1
    fi

    # Check if file exists
    if [[ ! -f "$FILE_PATH" ]]; then
        log_error "File not found: $FILE_PATH"
        exit 1
    fi

    # Skip certain files
    if [[ "$FILE_PATH" =~ node_modules/ ]] || \
       [[ "$FILE_PATH" =~ \.min\. ]] || \
       [[ "$FILE_PATH" =~ dist/ ]] || \
       [[ "$FILE_PATH" =~ build/ ]] || \
       [[ "$FILE_PATH" =~ \.git/ ]]; then
        exit 0
    fi

    # Get file extension and format accordingly
    local ext
    ext=$(get_extension "$FILE_PATH")

    case "$ext" in
        js|jsx|mjs|cjs)
            format_javascript "$FILE_PATH"
            ;;
        ts|tsx)
            format_typescript "$FILE_PATH"
            ;;
        json)
            format_json "$FILE_PATH"
            ;;
        css|scss|less)
            format_css "$FILE_PATH"
            ;;
        py)
            format_python "$FILE_PATH"
            ;;
        go)
            format_go "$FILE_PATH"
            ;;
        rs)
            format_rust "$FILE_PATH"
            ;;
        sql)
            format_sql "$FILE_PATH"
            ;;
        md|mdx)
            format_markdown "$FILE_PATH"
            ;;
        yml|yaml)
            format_yaml "$FILE_PATH"
            ;;
        *)
            # Unknown extension, skip silently
            ;;
    esac

    exit 0
}

main "$@"
