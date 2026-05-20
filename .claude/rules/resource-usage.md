# Resource Usage

**Priority**: Memory → Context7 → Magic UI → custom code.

---

**Context7**: Query before using unfamiliar APIs (`resolve-library-id` → `query-docs`, max 3 calls).

**Magic UI**: Check registries before building common UI components.

**Playwright MCP** (mandatory for UI dev): Start dev server yourself before spot-checks. Navigate + screenshot after any UI change. CLI (`npx playwright test`) for repeatable E2E suites.
