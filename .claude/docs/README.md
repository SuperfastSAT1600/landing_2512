# Documentation

Complete guide to using and customizing this Claude Code workflow template.

---

## 📚 Documentation Structure

### Getting Started
- **[Integration Guide](getting-started/INTEGRATION.md)** - Add this template to existing projects
- **[Integration Guide (Korean)](getting-started/INTEGRATION.ko.md)** - 기존 프로젝트에 통합하기

### Comprehensive Guides
- **[Complete Workflow Guide](guides/WORKFLOW.md)** - In-depth guide covering all features (1500+ lines)
- **[Workflow Guide (Korean)](guides/WORKFLOW.ko.md)** - 전체 워크플로우 가이드 (한국어)

### System Documentation
- **[MCP-Only Architecture](system/mcp-only-architecture.md)** - Understanding the MCP-only approach (no CLI tools)
- **[Error Verification System](system/error-verification-system.md)** - Hook-based error logging enforcement
- **[Slack Notifications](system/slack-notifications.md)** - Slack MCP integration setup

---

## 🚀 Quick Navigation

### For New Users
1. Start with the main [README](../../README.md) in the root directory
2. Run `node setup.cjs` to configure your environment
3. Refer to [WORKFLOW.md](guides/WORKFLOW.md) for detailed usage

### For Existing Projects
1. See [INTEGRATION.md](getting-started/INTEGRATION.md) for step-by-step integration
2. Follow the setup wizard: `node setup.cjs`
3. Customize `CLAUDE.md` with your tech stack

### For Korean Speakers
- [통합 가이드](getting-started/INTEGRATION.ko.md)
- [워크플로우 가이드](guides/WORKFLOW.ko.md)
- [메인 README](../../README.ko.md)

---

## 📖 Key Concepts

### Configuration Files
- **`.mcp.json`** - Claude Code MCP server configuration (API keys for Claude's tools)
- **`.env`** - Application runtime environment variables (your app's config)
- **`CLAUDE.md`** - Project-specific guidelines and tech stack
- **`.claude/`** - Agents, skills, rules, templates, and workflows

### Template Organization
- **`.claude/templates/`** - All templates (MCP, environment, code)
- **`.claude/agents/`** - 10 specialized agents
- **`.claude/skills/`** - 20+ knowledge reference files
- **`.claude/rules/`** - Core coding standards and protocols

### Difference Between `.env` and `.mcp.json`
| File | Purpose | Read By | Examples |
|------|---------|---------|----------|
| `.mcp.json` | Claude Code tooling | Claude CLI | GitHub PAT, Slack Bot Token |
| `.env` | Application runtime | Your app code | Database URL, JWT Secret, API keys |

---

## 🔗 External Resources

- [Claude Code Documentation](https://docs.anthropic.com/claude-code)
- [MCP Protocol](https://modelcontextprotocol.io/)
- [GitHub Issues](../../issues) - Report bugs or request features

---

**Last Updated**: 2026-02-04
