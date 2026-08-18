# MCP-Only Architecture

This template uses **ONLY Model Context Protocol (MCP) servers** for all external integrations. No CLI tools are required.

---

## Philosophy

**Traditional Approach** (❌ Avoided):
- Install GitHub CLI → Authenticate → Use `gh` commands
- Install Supabase CLI → Login → Link project → Use `supabase` commands
- Install various CLIs → Manage multiple auth systems → Different behavior per platform

**MCP-Only Approach** (✅ Used):
- Configure MCP servers once → Authenticate via `claude /mcp` → Everything works through MCPs
- Single source of truth for credentials (`.mcp.json`)
- Consistent experience across all platforms
- No PATH management, no shell compatibility issues

---

## Supported Services

| Service | MCP Type | Authentication | Setup |
|---------|----------|----------------|-------|
| **GitHub** | Process (npx) | Personal Access Token | https://github.com/settings/tokens |
| **Supabase** | HTTP | OAuth (via `claude /mcp`) | Project ref in URL, then authenticate |
| **Slack** | Process (npx) | Bot Token + Team ID | https://api.slack.com/apps |
| **Render** | HTTP | API Key | https://dashboard.render.com/account/settings |
| **Cloudflare** | HTTP | API Token | https://dash.cloudflare.com/profile/api-tokens |
| **Context7** | Process (npx) | None (public) | Automatic |
| **Magic UI** | Process (npx) | None (public) | Automatic |
| **Memory** | Process (npx) | None (local) | Automatic |
| **Filesystem** | Process (npx) | None (local) | Automatic |

---

## How It Works

### 1. Setup (One-Time)

```bash
node setup.cjs
```

The wizard:
1. Collects credentials for each MCP server
2. Generates `.mcp.json` with server configurations
3. Stores credentials securely (file is gitignored)

### 2. Authentication (Per Service)

```bash
claude /mcp
```

In the MCP menu:
- Select service (e.g., "supabase")
- Choose "Authenticate"
- Complete OAuth flow in browser

### 3. Usage (Automatic)

Claude Code automatically uses MCPs for all operations:
- **GitHub**: Create PRs, search code, manage issues
- **Supabase**: Query database, manage auth, upload files
- **Slack**: Send notifications, read channels

---

## Credential Storage

All credentials are stored in `.mcp.json` (gitignored):

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxx"
      },
      "disabled": false
    },
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=abcdefghijklmnopqr",
      "disabled": false
    }
  }
}
```

**Note**: Supabase HTTP MCP has no `env` object - authentication happens via OAuth through `claude /mcp`.

**Security**:
- ✅ File is gitignored (never committed)
- ✅ Only accessible locally
- ✅ Use `.claude/templates/mcp.template.json` as shareable template

---

## Advantages Over CLI Tools

### 1. **Faster Setup**
- No package manager installations
- No global tool management
- No version conflicts

### 2. **Cross-Platform Consistency**
- Same setup process on Windows, macOS, Linux
- No shell-specific issues (bash vs PowerShell vs cmd)
- No PATH configuration needed

### 3. **Centralized Authentication**
- All auth flows through `claude /mcp`
- One credential file (`.mcp.json`)
- Easy to rotate credentials

### 4. **Better Developer Experience**
- No context switching between terminal and IDE
- Claude handles all API interactions
- Automatic retry and error handling

### 5. **Team Onboarding**
- New developers run one command: `node setup.cjs`
- No need to learn CLI tools
- Consistent environment for everyone

---

## Common Tasks

### Adding a New MCP Server

1. Add to `.claude/templates/mcp.template.json`:
```json
{
  "new-service": {
    "command": "npx",
    "args": ["-y", "@company/mcp-server"],
    "env": {
      "SERVICE_API_KEY": "YOUR_API_KEY_HERE"
    },
    "disabled": true,
    "description": "Service integration"
  }
}
```

2. Update `lib/mcp.cjs` to handle credential collection

3. Run `node setup.cjs` again to reconfigure

### Updating Credentials

```bash
# Edit .mcp.json directly
# OR re-run setup wizard
node setup.cjs
```

### Disabling a Server

Edit `.mcp.json`:
```json
{
  "github": {
    "disabled": true  // ← Set to true
  }
}
```

---

## Troubleshooting

### "MCP server not responding"

1. Check server is enabled: `"disabled": false` in `.mcp.json`
2. Verify credentials are correct
3. Try re-authenticating: `claude /mcp` → Select service → Authenticate

### "Authentication failed"

1. Ensure you have the correct permissions (e.g., GitHub PAT with `repo` scope)
2. Check token hasn't expired
3. Verify Team ID / Project Ref is correct

### "Command 'npx' not found"

You need Node.js installed. Run:
```bash
node --version  # Should be 20+
npx --version   # Should work
```

---

## Migration from CLI Tools

If you previously used CLI tools, they're no longer needed:

| Old Way | New Way |
|---------|---------|
| `gh pr create` | Claude uses GitHub MCP automatically |
| `supabase db push` | Claude uses Supabase MCP for migrations |
| `vercel deploy` | Claude uses Vercel MCP (or Render/Cloudflare) |

You can safely uninstall:
```bash
# No longer needed
brew uninstall gh
scoop uninstall supabase
npm uninstall -g vercel
```

---

## Resources

- **MCP Documentation**: https://modelcontextprotocol.io/
- **GitHub MCP**: https://github.com/modelcontextprotocol/servers
- **Supabase MCP**: https://mcp.supabase.com/
- **Setup Wizard Code**: `setup.cjs` and `lib/mcp.cjs`
