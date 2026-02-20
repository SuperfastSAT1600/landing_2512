# Resource Usage Rules

Mandatory protocols for MCPs, APIs, and plugins.

---

## Context7
- Always query before using unfamiliar APIs (resolve-library-id → query-docs, max 3 calls)
- Check for version-specific API changes when upgrading

## Magic UI
- Always check before building common UI patterns (getUIComponents)
- Check specialized catalogs (animations, effects, buttons, backgrounds) before custom code

## Memory
- Store architectural decisions (create_entities type="decision")
- Search for similar patterns before solving problems (search_nodes)
- Store user preferences and coding style for cross-session consistency

## Render
- Check logs and metrics before debugging production (list_logs, get_metrics)
- Validate workspace selection before creating resources (get_selected_workspace)

## Filesystem MCP
- Use read_multiple_files for batch reads (not sequential Read calls)
- Use directory_tree for structure, search_files for patterns

---

## Skills
- **ALWAYS** check relevant skills before coding
- Skills contain authoritative patterns - use them instead of guessing
- If pattern doesn't exist → implement + log observation

---

## Priority Order
1. Check Skills for domain patterns
2. Check Memory for past patterns
3. Query Context7 for library docs
4. Check Magic UI for components
5. Write custom code as last resort
