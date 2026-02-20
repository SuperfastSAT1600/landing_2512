# Claude Code Workflow Template

**Setup**: `node setup.cjs` → Follow prompts → Start using

---

## Must-Read First

- **PRD**: `docs/PRD.md` - Architecture, features, workflow patterns
- **Errors**: `.claude/user/errors.md` - Read this before every task

---

## Quick Reference

**Workflow**: Main agent codes standard tasks, delegates to 34 specialized agents for expertise
**Agents (34)**: See `.claude/agents/` for full list and INDEX.md

**Resources**:
- Skills: `.claude/skills/` (react-patterns, rest-api-design, etc.)
- Workflows: `.claude/workflows/`
- Checklists: `.claude/checklists/`
- Templates: `.claude/templates/`
- Scripts: `.claude/scripts/`

---

## Self-Aware System

This setup continuously improves itself. During every task, the system observes its own configuration and proposes fixes, evolutions, and simplifications after completing your work.

- **Execution Protocol**: `.claude/rules/task-execution-protocol.md` (MANDATORY for all agents)
- **Rules**: `.claude/rules/self-aware-system.md`
- **User Data**: `.claude/user/` (changelog, errors, custom content)
- **Health Check**: Run `/health-check` for a comprehensive audit
- **Agent count**: 34 (33 specialists + 1 system-health)

### Mandatory Checkpoints (Every Task)

1. **PRE-TASK**: Identify parallel work opportunities [enforced]
2. **DURING**: Observe `.claude/` issues [passive noting]
3. **POST-TASK**: Auto-heal recurring patterns, report observations [enforced]

This ensures maximum speed through parallelization and continuous system improvement through auto-healing.

---

## How It Works

**Main agent codes directly** for standard tasks (CRUD, simple features, bug fixes).
**Specialists handle** complex domains (auth, databases, performance, security).

Just describe what you want in plain English:

| You say | What happens |
|---------|--------------|
| "Add a user profile page" | Main agent implements directly |
| "I want users to log in with OAuth" | Delegates to auth-specialist |
| "The checkout is broken" | Main agent fixes via quick-fix workflow |
| "Is this code secure?" | Delegates to security-reviewer |
| "Make the page faster" | Delegates to performance-optimizer |

### Main Agent Templates

When creating React code, the main agent uses:
- `variants/react/component.tsx.template` - React components with TypeScript
- `variants/react/form.tsx.template` - Form components with React Hook Form + Zod
- `variants/react/hook.ts.template` - Custom React hooks with proper cleanup
- `variants/react/context.tsx.template` - React Context providers with type safety
- `variants/react/hoc.tsx.template` - Higher-Order Components with ref forwarding

---

## Key Locations

**Your Data** (gitignored):
- `.claude/user/errors.md` - Error log
- `.claude/user/changelog.md` - System improvements
- `.claude/user/agent-errors/` - Subagent errors

**Documentation**:
- `docs/PRD.md` - Product requirements, architecture
- `.claude/rules/` - Mandatory protocols
- `.claude/agents/INDEX.md` - All 34 specialists
- `.claude/skills/` - Domain patterns

**Configuration**:
- `.claude/settings.json` - Shared settings (hooks, MCP)
- `.claude/settings.local.json` - Local overrides (gitignored)

---

## Tech Stack

**Frontend**: {{FRONTEND_STACK}}

**Backend**: {{BACKEND_STACK}}

**Database**: Supabase (PostgreSQL)

**Testing**: {{TESTING_STACK}}

**DevOps**: Docker, GitHub Actions

---

## Project Structure

```
src/
├── app/           # Application pages/routes
├── components/    # Reusable components
├── features/      # Feature modules
├── lib/           # Third-party integrations
├── hooks/         # Custom hooks (if applicable)
├── utils/         # Utility functions
└── types/         # TypeScript types
```

---

## Dependencies

**Approved**: date-fns, zod
<!-- Add your approved dependencies here -->

**Forbidden**: moment.js, full lodash
<!-- Add your forbidden dependencies here -->

---

## Error Log

Error log is now maintained in `.claude/user/errors.md` to preserve it during system updates.

Main agent: append errors there when you make a mistake. Subagents: report errors in your response for the main agent to log.

---

## Updating System

```bash
./.claude/scripts/update-system.sh
```

The script automatically:
- Clones `claude-code-setup` (if needed) to parent directory
- Pulls latest changes from the repository
- Updates system files while preserving your data

**Preserved**: `.claude/user/`, `settings.local.json`, `CLAUDE.md`
**Updated**: agents, skills, rules, commands, workflows, templates

---

**Last Updated**: 2026-02-12
