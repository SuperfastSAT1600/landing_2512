#!/bin/bash
# =============================================================================
# TeammateIdle Hook: Quality Gate
# Fires when an agent team teammate is about to go idle.
# Blocks idle if:
#   1. Uncommitted changes exist in the working directory
#   2. Test suite is failing
#   3. Lint has errors (if linter configured)
#
# Exit 0 = allow idle
# Exit 2 = keep working (stderr fed back as feedback)
# =============================================================================

set -uo pipefail

INPUT=$(cat)
TEAMMATE_NAME=$(echo "$INPUT" | jq -r '.teammate_name // "unknown"')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

WORK_DIR="${CWD:-.}"

# --- Check 1: Uncommitted changes ---
if git -C "$WORK_DIR" rev-parse --git-dir &>/dev/null; then
    if ! git -C "$WORK_DIR" diff --quiet HEAD 2>/dev/null; then
        echo "Quality gate: $TEAMMATE_NAME has uncommitted changes. Commit your work before going idle." >&2
        exit 2
    fi
    # Also check for untracked files in src/ or test directories
    UNTRACKED=$(git -C "$WORK_DIR" ls-files --others --exclude-standard -- 'src/' 'test/' 'tests/' '__tests__/' '*.test.*' '*.spec.*' 2>/dev/null)
    if [[ -n "$UNTRACKED" ]]; then
        echo "Quality gate: $TEAMMATE_NAME has untracked source/test files. Stage and commit before going idle:" >&2
        echo "$UNTRACKED" | head -10 >&2
        exit 2
    fi
fi

# --- Check 2: Test suite passes ---
if [[ -f "$WORK_DIR/package.json" ]]; then
    if grep -q '"test"' "$WORK_DIR/package.json" 2>/dev/null; then
        TEST_OUTPUT=$(cd "$WORK_DIR" && npm test -- --passWithNoTests 2>&1) || {
            echo "Quality gate: $TEAMMATE_NAME has failing tests. Fix them before going idle." >&2
            echo "Failures (last 15 lines):" >&2
            echo "$TEST_OUTPUT" | tail -15 >&2
            exit 2
        }
    fi
elif [[ -f "$WORK_DIR/Cargo.toml" ]]; then
    TEST_OUTPUT=$(cd "$WORK_DIR" && cargo test 2>&1) || {
        echo "Quality gate: $TEAMMATE_NAME has failing tests. Fix them before going idle." >&2
        echo "$TEST_OUTPUT" | tail -15 >&2
        exit 2
    }
elif [[ -f "$WORK_DIR/go.mod" ]]; then
    TEST_OUTPUT=$(cd "$WORK_DIR" && go test ./... 2>&1) || {
        echo "Quality gate: $TEAMMATE_NAME has failing tests. Fix them before going idle." >&2
        echo "$TEST_OUTPUT" | tail -15 >&2
        exit 2
    }
elif [[ -f "$WORK_DIR/pyproject.toml" ]] || [[ -f "$WORK_DIR/setup.py" ]]; then
    TEST_OUTPUT=$(cd "$WORK_DIR" && python -m pytest 2>&1) || {
        echo "Quality gate: $TEAMMATE_NAME has failing tests. Fix them before going idle." >&2
        echo "$TEST_OUTPUT" | tail -15 >&2
        exit 2
    }
fi

# --- Check 3: Lint (optional, only if eslint/biome configured) ---
if [[ -f "$WORK_DIR/package.json" ]]; then
    if [[ -f "$WORK_DIR/biome.json" ]] || [[ -f "$WORK_DIR/biome.jsonc" ]]; then
        # Biome detected — use biome check
        LINT_OUTPUT=$(cd "$WORK_DIR" && npx biome check src/ 2>&1) || {
            echo "Quality gate: $TEAMMATE_NAME has lint errors (biome). Fix them before going idle." >&2
            echo "Lint errors (first 15 lines):" >&2
            echo "$LINT_OUTPUT" | head -15 >&2
            exit 2
        }
    elif grep -qE '"eslint"' "$WORK_DIR/package.json" 2>/dev/null || \
         [[ -f "$WORK_DIR/.eslintrc.json" ]] || [[ -f "$WORK_DIR/.eslintrc.js" ]] || \
         [[ -f "$WORK_DIR/eslint.config.js" ]]; then
        # ESLint detected — use eslint
        LINT_OUTPUT=$(cd "$WORK_DIR" && npx eslint src/ --quiet 2>&1) || {
            echo "Quality gate: $TEAMMATE_NAME has lint errors (eslint). Fix them before going idle." >&2
            echo "Lint errors (first 15 lines):" >&2
            echo "$LINT_OUTPUT" | head -15 >&2
            exit 2
        }
    fi
fi

exit 0
