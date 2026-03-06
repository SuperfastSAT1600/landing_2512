# User Data Folder

This folder contains **your data** that should be preserved when updating the `.claude/` system.

---

## What's Here

### `changelog.md`
Your system's self-healing history. Every time the system auto-fixes an issue or you make improvements, it's logged here. This is valuable data showing how your setup evolves over time.

**DO NOT DELETE** - Contains 50+ entries of fixes and improvements.

### `errors.md`
Error log where mistakes are recorded to prevent recurrence. When the main agent makes an error, it's documented here so the same mistake never happens again.

### `agent-errors/`
Per-agent error logs. Each specialist agent logs domain-specific errors to its own file:
- `agent-errors/auth-specialist.md` - Auth-related errors
- `agent-errors/api-designer.md` - API design errors
- etc.

This enables pattern detection per agent domain and prevents recurring domain-specific mistakes.

### `custom/`
Your custom agents, skills, and commands that extend the base system:
- `custom/agents/` - Custom specialist agents
- `custom/skills/` - Custom knowledge modules
- `custom/commands/` - Custom workflows

---

## Creating Custom Content

### Custom Agent Example
Create `.claude/user/custom/agents/my-specialist.md`:

```markdown
---
description: What this agent does
skills: [relevant-skill-1, relevant-skill-2]
---

# My Custom Specialist

## When to Use
- [specific use cases]

## Expertise
- [what this agent knows]

## Workflow
1. [step by step process]
```

### Custom Skill Example
Create `.claude/user/custom/skills/my-pattern.md`:

```markdown
---
description: Quick description of this pattern
---

# My Custom Pattern

## When to Use
[scenarios where this applies]

## Implementation
[code examples and guidelines]
```

---

## Update Safety

When you update `.claude/` system files from the repository:

```bash
# 1. Clone/update claude-code-setup in parent directory
cd ..
git clone https://github.com/YOUR_REPO/claude-code-setup.git  # or git pull if already cloned

# 2. Run update script from your project
cd your-project
./.claude/scripts/update-system.sh
```

The script will:
- ✅ Copy latest system files from `../claude-code-setup/.claude/`
- ✅ Preserve your `changelog.md`
- ✅ Preserve your `errors.md`
- ✅ Preserve your `agent-errors/` folder
- ✅ Preserve your `custom/` folder
- ✅ Preserve your `settings.local.json`
- ✅ Create a timestamped backup just in case

---

## Git Behavior

This folder is configured via `.claude/.gitignore`:
- Your data files (`changelog.md`, `errors.md`, `agent-errors/**`, `custom/**`) are **NOT tracked**
- Folder structure (`.gitkeep` files) **IS tracked**
- You can commit custom content to your own repos if desired

---

**Last Updated**: 2026-01-30
