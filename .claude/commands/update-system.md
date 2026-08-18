---
description: Update .claude/ system files from upstream repository
allowed-tools: Bash(.claude/scripts/update-system.sh:*), Read, Grep, Glob
---

# Update System

Update `.claude/` system files from upstream while preserving user data.

## Usage

```
/update-system
```

## Instructions

1. **Ensure source exists**: `../claude-code-setup/.claude/`
2. **Run update**: `bash .claude/scripts/update-system.sh`
3. **Verify**: `/health-check`

## What Gets Updated

**System** (overwritten): agents, skills, rules, commands, workflows, templates, checklists, scripts, settings.json

**User** (preserved): `.claude/user/`, `settings.local.json`, `CLAUDE.md`

## Notes

- Automatic timestamped backup created before update
- Script handles structural migrations automatically
- Rollback: `cp -r .claude-backup-TIMESTAMP/user/* .claude/user/`

---

**Duration**: 30-60 seconds
