#!/bin/bash
# =============================================================================
# Sync Dependencies
# Description: Synchronize and verify project dependencies
# Usage: ./.claude/scripts/sync-deps.sh [--check|--update|--audit]
# =============================================================================

set -euo pipefail

# Constants
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
if [[ -t 1 ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[0;33m'
    BLUE='\033[0;34m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    NC=''
fi

# Counters
ERRORS=0
WARNINGS=0

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${GREEN}[INFO]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*" >&2
    ((WARNINGS++)) || true
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
    ((ERRORS++)) || true
}

log_section() {
    echo ""
    echo -e "${BLUE}=== $* ===${NC}"
}

has_command() {
    command -v "$1" >/dev/null 2>&1
}

# =============================================================================
# Package Manager Detection
# =============================================================================

detect_package_manager() {
    cd "$PROJECT_ROOT"

    # Check for lock files
    if [[ -f "pnpm-lock.yaml" ]]; then
        echo "pnpm"
    elif [[ -f "yarn.lock" ]]; then
        echo "yarn"
    elif [[ -f "bun.lockb" ]]; then
        echo "bun"
    elif [[ -f "package-lock.json" ]]; then
        echo "npm"
    elif [[ -f "package.json" ]]; then
        echo "npm"  # Default to npm if package.json exists
    elif [[ -f "requirements.txt" ]] || [[ -f "pyproject.toml" ]]; then
        echo "pip"
    elif [[ -f "Cargo.toml" ]]; then
        echo "cargo"
    elif [[ -f "go.mod" ]]; then
        echo "go"
    else
        echo ""
    fi
}

# =============================================================================
# Node.js Dependencies
# =============================================================================

sync_node_deps() {
    local pm="$1"
    local action="${2:-check}"

    log_section "Node.js Dependencies ($pm)"

    case "$pm" in
        npm)
            sync_npm_deps "$action"
            ;;
        yarn)
            sync_yarn_deps "$action"
            ;;
        pnpm)
            sync_pnpm_deps "$action"
            ;;
        bun)
            sync_bun_deps "$action"
            ;;
    esac
}

sync_npm_deps() {
    local action="$1"

    case "$action" in
        check)
            log_info "Checking for outdated packages..."
            npm outdated 2>/dev/null || true

            log_info "Checking for vulnerabilities..."
            npm audit --audit-level=moderate 2>/dev/null || log_warn "Security vulnerabilities found"
            ;;
        update)
            log_info "Installing dependencies..."
            npm ci 2>/dev/null || npm install

            log_info "Updating packages..."
            npm update
            ;;
        audit)
            log_info "Running security audit..."
            npm audit 2>/dev/null || true

            log_info "Attempting auto-fix..."
            npm audit fix 2>/dev/null || log_warn "Some vulnerabilities require manual attention"
            ;;
    esac
}

sync_yarn_deps() {
    local action="$1"

    case "$action" in
        check)
            log_info "Checking for outdated packages..."
            yarn outdated 2>/dev/null || true

            log_info "Checking for vulnerabilities..."
            yarn audit 2>/dev/null || log_warn "Security vulnerabilities found"
            ;;
        update)
            log_info "Installing dependencies..."
            yarn install --frozen-lockfile 2>/dev/null || yarn install

            log_info "Updating packages..."
            yarn upgrade
            ;;
        audit)
            log_info "Running security audit..."
            yarn audit 2>/dev/null || true
            ;;
    esac
}

sync_pnpm_deps() {
    local action="$1"

    case "$action" in
        check)
            log_info "Checking for outdated packages..."
            pnpm outdated 2>/dev/null || true

            log_info "Checking for vulnerabilities..."
            pnpm audit 2>/dev/null || log_warn "Security vulnerabilities found"
            ;;
        update)
            log_info "Installing dependencies..."
            pnpm install --frozen-lockfile 2>/dev/null || pnpm install

            log_info "Updating packages..."
            pnpm update
            ;;
        audit)
            log_info "Running security audit..."
            pnpm audit 2>/dev/null || true

            log_info "Attempting auto-fix..."
            pnpm audit --fix 2>/dev/null || log_warn "Some vulnerabilities require manual attention"
            ;;
    esac
}

sync_bun_deps() {
    local action="$1"

    case "$action" in
        check)
            log_info "Checking packages..."
            bun pm ls 2>/dev/null || true
            ;;
        update)
            log_info "Installing dependencies..."
            bun install --frozen-lockfile 2>/dev/null || bun install
            ;;
        audit)
            log_warn "Bun does not have built-in audit. Consider using npm audit."
            ;;
    esac
}

# =============================================================================
# Python Dependencies
# =============================================================================

sync_python_deps() {
    local action="${1:-check}"

    log_section "Python Dependencies"

    case "$action" in
        check)
            if [[ -f "requirements.txt" ]]; then
                log_info "Checking requirements.txt..."
                if has_command pip-audit; then
                    pip-audit 2>/dev/null || log_warn "Vulnerabilities found"
                else
                    log_warn "pip-audit not installed. Run: pip install pip-audit"
                fi
            fi

            if [[ -f "pyproject.toml" ]]; then
                log_info "Found pyproject.toml"
                if has_command poetry; then
                    poetry show --outdated 2>/dev/null || true
                fi
            fi
            ;;
        update)
            if has_command pip; then
                log_info "Upgrading pip..."
                pip install --upgrade pip

                if [[ -f "requirements.txt" ]]; then
                    log_info "Installing requirements..."
                    pip install -r requirements.txt
                fi
            fi

            if has_command poetry && [[ -f "pyproject.toml" ]]; then
                log_info "Updating poetry dependencies..."
                poetry update
            fi
            ;;
        audit)
            if has_command pip-audit; then
                log_info "Running security audit..."
                pip-audit 2>/dev/null || true
            else
                log_warn "Install pip-audit for security scanning: pip install pip-audit"
            fi
            ;;
    esac
}

# =============================================================================
# Rust Dependencies
# =============================================================================

sync_rust_deps() {
    local action="${1:-check}"

    log_section "Rust Dependencies"

    case "$action" in
        check)
            log_info "Checking for outdated packages..."
            cargo outdated 2>/dev/null || log_warn "cargo-outdated not installed"

            log_info "Checking for vulnerabilities..."
            cargo audit 2>/dev/null || log_warn "cargo-audit not installed"
            ;;
        update)
            log_info "Updating dependencies..."
            cargo update

            log_info "Building..."
            cargo build
            ;;
        audit)
            if has_command cargo-audit; then
                log_info "Running security audit..."
                cargo audit
            else
                log_warn "Install cargo-audit: cargo install cargo-audit"
            fi
            ;;
    esac
}

# =============================================================================
# Go Dependencies
# =============================================================================

sync_go_deps() {
    local action="${1:-check}"

    log_section "Go Dependencies"

    case "$action" in
        check)
            log_info "Listing dependencies..."
            go list -m all 2>/dev/null | head -20

            log_info "Checking for vulnerabilities..."
            go vuln 2>/dev/null || govulncheck ./... 2>/dev/null || log_warn "govulncheck not installed"
            ;;
        update)
            log_info "Tidying modules..."
            go mod tidy

            log_info "Downloading dependencies..."
            go mod download
            ;;
        audit)
            if has_command govulncheck; then
                log_info "Running vulnerability check..."
                govulncheck ./...
            else
                log_warn "Install govulncheck: go install golang.org/x/vuln/cmd/govulncheck@latest"
            fi
            ;;
    esac
}

# =============================================================================
# Main
# =============================================================================

print_usage() {
    echo "Usage: $0 [--check|--update|--audit]"
    echo ""
    echo "Options:"
    echo "  --check   Check for outdated and vulnerable packages (default)"
    echo "  --update  Update/install dependencies"
    echo "  --audit   Run security audit and attempt fixes"
    echo ""
}

main() {
    local action="check"

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --check)
                action="check"
                shift
                ;;
            --update)
                action="update"
                shift
                ;;
            --audit)
                action="audit"
                shift
                ;;
            -h|--help)
                print_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                print_usage
                exit 1
                ;;
        esac
    done

    echo "=============================================="
    echo "Dependency Sync - Action: $action"
    echo "=============================================="

    cd "$PROJECT_ROOT"

    # Detect and sync appropriate package managers
    local pm
    pm=$(detect_package_manager)

    case "$pm" in
        npm|yarn|pnpm|bun)
            sync_node_deps "$pm" "$action"
            ;;
        pip)
            sync_python_deps "$action"
            ;;
        cargo)
            sync_rust_deps "$action"
            ;;
        go)
            sync_go_deps "$action"
            ;;
        "")
            log_error "No supported package manager detected"
            exit 1
            ;;
    esac

    # Summary
    echo ""
    echo "=============================================="
    if [[ $ERRORS -gt 0 ]]; then
        echo -e "${RED}Completed with $ERRORS error(s), $WARNINGS warning(s)${NC}"
        exit 1
    elif [[ $WARNINGS -gt 0 ]]; then
        echo -e "${YELLOW}Completed with $WARNINGS warning(s)${NC}"
        exit 0
    else
        echo -e "${GREEN}Completed successfully${NC}"
        exit 0
    fi
}

main "$@"
