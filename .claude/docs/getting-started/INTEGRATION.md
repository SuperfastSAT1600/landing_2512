# Integration Guide

How to add Claude Code to your **existing codebase**.

---

## Overview

You have an existing project and want to add Claude Code workflow automation.

**Example scenario**: You have a project at `/home/user/my-app` and want to add Claude Code.

**What you'll end up with**:
```
my-app/                    (your existing project)
├── .claude/              ← NEW (workflow system)
├── CLAUDE.md             ← NEW (your tech stack config)
├── setup.cjs             ← NEW (optional setup wizard)
├── lib/                  ← NEW (wizard modules)
├── src/                  (your existing code - unchanged)
├── package.json          (your existing code - unchanged)
└── ... (rest of your code - unchanged)
```

**Estimated Time**: 20-40 minutes

---

## Prerequisites

- [x] Existing codebase with code in it
- [x] Git initialized
- [x] Node.js installed (v18 or later recommended)

---

## Step 1: Download Claude Code Setup

First, get the `claude-code-setup` files. Two options:

### Option A: Clone Next to Your Project (Recommended)

```bash
# Where you are now: /home/user/my-app (your project)

# Go up one level
cd ..

# Clone claude-code-setup next to your project
git clone https://github.com/YOUR-ORG/claude-code-setup.git

# Now you have:
# /home/user/my-app/              (your project)
# /home/user/claude-code-setup/   (the template)
```

### Option B: Clone to Temp Directory

```bash
# Clone to /tmp (will be deleted later)
git clone https://github.com/YOUR-ORG/claude-code-setup.git /tmp/claude-code-setup
```

---

## Step 2: Copy Files Into Your Project

Now copy the Claude Code files into your project:

```bash
# Go to your project directory
cd /home/user/my-app

# Copy workflow system
cp -r ../claude-code-setup/.claude/ .

# Copy tech stack config (REQUIRED!)
cp ../claude-code-setup/CLAUDE.md .

# Copy setup wizard (OPTIONAL but recommended)
cp ../claude-code-setup/setup.cjs .
cp -r ../claude-code-setup/lib/ .

# Copy MCP template (OPTIONAL - already included in .claude/ copy above)
```

**If you used /tmp in Option B**, replace `../claude-code-setup/` with `/tmp/claude-code-setup/`:
```bash
cp -r /tmp/claude-code-setup/.claude/ .
cp /tmp/claude-code-setup/CLAUDE.md .
# etc...
```

**After this step, your project has**:
```
my-app/
├── .claude/       ← NEW (10 agents, 25 commands, 12 checklists)
├── CLAUDE.md      ← NEW (tech stack config)
├── setup.cjs      ← NEW (wizard)
├── lib/           ← NEW (wizard modules)
├── src/           (your existing code)
└── ...
```

---

## Step 3: Customize CLAUDE.md

Run the setup wizard to automatically detect your tech stack and update CLAUDE.md:

```bash
# The wizard will:
# - Check and install Claude Code CLI if needed
# - Auto-detect your framework, backend, database, and testing tools
# - Update CLAUDE.md with your actual stack (no manual editing needed!)
# - REQUIRE Slack MCP setup (for PR notifications to commit-업데이트 channel)
# - Configure other MCP servers
# - Set up environment files
# - Offer to install project dependencies (npm/pnpm/yarn/bun)
node setup.cjs
```

**Important**: The wizard will prompt for Slack MCP credentials (REQUIRED):
- Slack Bot Token (from https://api.slack.com/apps)
- Slack Team ID (starts with T)

This is needed to auto-send PR notifications to the commit-업데이트 channel when using `/commit-push-pr`.

**What gets detected**:
- Frontend: Next.js, React, Vue, Svelte, Angular, etc.
- Backend: Node.js (Express, Fastify, NestJS), Supabase, Python (FastAPI, Django), Go, etc.
- Database: PostgreSQL, MySQL, MongoDB, SQLite, Supabase, Prisma
- Testing: Vitest, Jest, Playwright, Cypress, etc.

The wizard will prompt you to confirm or adjust detected values before updating CLAUDE.md.

**Manual editing** (if you prefer):
```bash
# Open CLAUDE.md and replace placeholders manually
code CLAUDE.md
# Replace: {{FRONTEND_STACK}}, {{BACKEND_STACK}}, {{TESTING_STACK}}, etc.
```

---

## Step 4: Add Framework-Specific Templates (If Needed)

Claude Code includes generic templates (test, migration, PR description) that work out of the box.

React/Next.js templates now live with their skills:
- React: `.claude/skills/react-patterns/templates/`
- Next.js: `.claude/skills/nextjs-patterns/templates/`

Load them via `Skill("react-patterns")` or `Skill("nextjs-patterns")` — no manual copying needed.

---

## Step 5: Test It Works

```bash
# Start Claude Code
claude
```

In Claude, ask:
```
What's our tech stack?
```

Claude should describe YOUR stack (from `CLAUDE.md`), not the template defaults.

---

## Complete Example Walkthrough

Let's say you have a Next.js + Supabase project at `/Users/john/projects/my-saas-app`:

```bash
# 1. Download claude-code-setup
cd /Users/john/projects
git clone https://github.com/YOUR-ORG/claude-code-setup.git

# 2. Go to your project
cd my-saas-app

# 3. Copy files
cp -r ../claude-code-setup/.claude/ .
cp ../claude-code-setup/CLAUDE.md .
cp ../claude-code-setup/setup.cjs .
cp -r ../claude-code-setup/lib/ .

# 4. Run setup wizard (auto-detects your stack and updates CLAUDE.md)
node setup.cjs

# The wizard will:
# - Install Claude Code CLI if not already installed
# - Auto-detect: Next.js 14, Supabase, Vitest
# - Update CLAUDE.md with your actual stack (no manual editing!)
# - Configure MCP servers and environment files
# - Install project dependencies automatically
# - You just confirm the detected values and you're done!

# 5. Templates now live with skills — no copying needed
# React: .claude/skills/react-patterns/templates/
# Next.js: .claude/skills/nextjs-patterns/templates/

# 6. Add to git
git add .claude/ CLAUDE.md setup.cjs lib/
git commit -m "Add Claude Code workflow automation"

# 7. Start using it
claude
```

Your project now has Claude Code! 🎉

---

## What If I Don't Want setup.cjs?

**Not recommended** - you'll miss automatic tech stack detection and CLAUDE.md updates.

But if you prefer manual setup:

```bash
# Minimal integration (just copy these 2)
cp -r ../claude-code-setup/.claude/ .
cp ../claude-code-setup/CLAUDE.md .

# Manually edit CLAUDE.md and replace all {{...}} placeholders
code CLAUDE.md
# Replace: {{FRONTEND_STACK}}, {{BACKEND_STACK}}, {{TESTING_STACK}}, etc.

# Done!
claude
```

**Note**: You'll need to manually update CLAUDE.md whenever your stack changes.

---

## Cleanup (Optional)

After copying everything, you can delete the cloned template:

```bash
# If you cloned next to your project:
rm -rf ../claude-code-setup

# If you cloned to /tmp:
rm -rf /tmp/claude-code-setup
```

---

## Troubleshooting

### "I don't see .claude/ folder after copying"

**Cause**: You might be in the wrong directory

**Fix**: Check where you are:
```bash
pwd  # Should show /home/user/my-app (your project)
ls -la  # Should show .claude/ folder
```

### "Claude doesn't know my tech stack"

**Cause**: `CLAUDE.md` still has `{{...}}` placeholders

**Fix**: Run `node setup.cjs` to auto-detect and update your stack, OR manually edit `CLAUDE.md` and replace all placeholders

### "setup.cjs not found"

**Cause**: You didn't copy `setup.cjs` and `lib/`

**Fix**: Either copy them, or skip the wizard and edit `CLAUDE.md` manually

### "Claude Code CLI installation failed during setup"

**Cause**: Permission issues or npm not in PATH

**Fix**: Install manually and run setup again:
```bash
# macOS/Linux
sudo npm install -g @anthropic-ai/claude-code

# Windows (run as Administrator)
npm install -g @anthropic-ai/claude-code

# Then re-run setup
node setup.cjs
```

---

## Next Steps

1. Read [../guides/WORKFLOW.md](../guides/WORKFLOW.md) - Complete workflow guide
2. Try `/full-feature` - Build your first feature with Claude
3. Commit changes: `git add .claude/ CLAUDE.md && git commit -m "Add Claude Code"`

---

**Need Help?**
- Template setup: [../README.md](../README.md)
- Main README: [README.md](README.md)
- Issues: https://github.com/YOUR-ORG/claude-code-setup/issues
