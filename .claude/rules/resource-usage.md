# Resource Usage

**Priority order**: Memory (past patterns) → Context7 (library docs) → Magic UI (components) → custom code.

---

## Tools

**Context7**: Query before using unfamiliar APIs (`resolve-library-id` → `query-docs`, max 3 calls). Check for version changes when upgrading.

**Magic UI**: Check `getUIComponents` before building common UI. Check specialized catalogs (animations, buttons, backgrounds) before writing custom code.

**Memory**: Store architectural decisions (`create_entities` type="decision"). Search for similar patterns before solving (`search_nodes`). Store user preferences for cross-session consistency.

**Render**: Check logs/metrics before debugging production (`list_logs`, `get_metrics`). Validate workspace before creating resources.

**Filesystem MCP**: Use `read_multiple_files` for batch reads. Use `directory_tree` for structure, `search_files` for patterns.

**Playwright**:
- MCP (MANDATORY during UI dev): After implementing any UI change, navigate to localhost and take a screenshot to verify visually — do not skip this step
- **Dev server startup (MANDATORY before spot-checks)**: Before using Playwright MCP, start the project's dev server in the background (`npm run dev &`, `npx next dev &`, etc.). Wait a few seconds for it to be ready, then navigate. NEVER skip a Playwright spot-check because "no live server is running" — start one yourself.
- MCP: Also use for accessibility checks, layout debugging, and interactive inspection during development
- CLI (`npx playwright test`): repeatable E2E suites in checkpoint, CI, batch validation
- `(BROWSER)` REQs: write a Playwright test file for `req-coverage.sh`; use MCP for spot-checks during dev
