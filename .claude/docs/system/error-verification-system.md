# Error Verification & MCP Enforcement System

Automated enforcement system with two components:
1. **Error verification** - Ensures errors.md is read before work begins
2. **MCP/Skill reminders** - Warns when MCP tools or skills weren't used before coding

---

## How It Works

**Hook-based verification** prevents Claude from starting work without reading the error log.

### Components

1. **Marker file**: `.claude/user/.errors-read-marker`
   - Created when `errors.md` is read
   - Timestamp-based (valid for 5 minutes)
   - Ephemeral (not committed to git)

2. **Mark script**: `.claude/scripts/mark-errors-read.sh`
   - PostToolUse hook on `Read` tool
   - Triggers when `errors.md` is read
   - Updates marker timestamp

3. **Verify script**: `.claude/scripts/verify-errors-read.sh`
   - PreToolUse hook on work tools (Edit/Write/Task/Bash)
   - Checks if marker exists and is fresh
   - Blocks execution if marker is missing/stale

### Flow

```
User starts conversation
↓
Claude attempts first work action (Edit/Write/Bash/Task)
↓
PreToolUse hook: verify-errors-read.sh runs
↓
Marker exists + fresh? ──YES──> Allow execution
↓ NO
Block with error message
↓
Claude reads .claude/user/errors.md
↓
PostToolUse hook: mark-errors-read.sh runs
↓
Marker created/updated
↓
Retry work action → Success
```

---

## Testing

### Test 1: Fresh Session (Should Block)

```bash
# Remove marker to simulate fresh session
rm .claude/user/.errors-read-marker

# Try to create a file (should block)
# Expected: Hook blocks with message to read errors.md first
```

### Test 2: After Reading (Should Pass)

```bash
# Read errors.md
claude read .claude/user/errors.md

# Try to create a file (should succeed)
# Expected: Hook allows execution
```

### Test 3: Stale Session (Should Block)

```bash
# Create old marker (>5 minutes ago)
touch -t 202601010000 .claude/user/.errors-read-marker

# Try to create a file (should block)
# Expected: Hook blocks because marker is stale
```

---

## Debugging

### Check Hook Execution

```bash
# View hook output in Claude Code
# Hooks write to stderr, visible in CLI output
```

### Check Marker Status

```bash
# Check if marker exists
ls -la .claude/user/.errors-read-marker

# Check marker age (seconds)
stat -c %Y .claude/user/.errors-read-marker  # Linux
stat -f %m .claude/user/.errors-read-marker  # macOS
```

### Manual Marker Creation (Testing Only)

```bash
# Create marker manually
mkdir -p .claude/user
touch .claude/user/.errors-read-marker
```

---

## Configuration

### Session Timeout

Default: 5 minutes (300 seconds)

To change, edit `.claude/scripts/verify-errors-read.sh`:

```bash
SESSION_TIMEOUT=300  # Change this value
```

### Disable Verification (Not Recommended)

To temporarily disable, comment out the hook in `.claude/settings.json`:

```json
{
  "matcher": "tool in [\"Edit\", \"Write\", \"Task\"] || ...",
  "hooks": [
    {
      "type": "command",
      "command": "#!/bin/bash\n# ./.claude/scripts/verify-errors-read.sh"
    }
  ]
}
```

---

## Excluded Tools

**Not verified** (read-only, safe):
- `Read` - Always allowed
- `Glob` - File pattern search
- `Grep` - Content search
- `Bash` with read-only commands: `git status`, `git diff`, `git log`, `git branch`

**Verified** (work actions):
- `Edit` - File modifications
- `Write` - File creation
- `Task` - Agent delegation
- `Bash` with write commands: commits, installs, builds, etc.

---

## Gitignore

The marker file is NOT committed:

```gitignore
# .claude/.gitignore
user/.errors-read-marker
```

This ensures each session starts fresh.

---

## Troubleshooting

### Hook not running

1. Check hook is in `.claude/settings.json`
2. Verify script exists and is executable: `ls -l .claude/scripts/verify-errors-read.sh`
3. Check script syntax: `bash -n .claude/scripts/verify-errors-read.sh`

### Hook blocks even after reading

1. Check marker exists: `ls .claude/user/.errors-read-marker`
2. Check marker timestamp is recent: `stat .claude/user/.errors-read-marker`
3. Manually create marker: `touch .claude/user/.errors-read-marker`

### Script fails on Windows

Scripts use cross-platform `stat` command:
- Git Bash on Windows: uses Linux-style `stat -c %Y`
- macOS: uses BSD-style `stat -f %m`

If issues persist, check `$OSTYPE` variable:
```bash
echo $OSTYPE
```

---

## Benefits

1. **Structural enforcement** - Not reliant on Claude following instructions
2. **Fail-closed** - Blocks by default until verified
3. **Session-aware** - 5-minute timeout assumes same session
4. **Non-intrusive** - Only blocks work actions, not reads/searches
5. **Auditable** - Hook messages visible in CLI output

---

---

## Part 2: MCP & Skill Usage Reminders

### Purpose

Provides **warnings** (not blocks) when coding without first:
- Querying Context7 for library documentation
- Searching Memory for similar patterns
- Loading relevant skills

### Components

1. **Marker file**: `.claude/user/.mcp-markers.json`
   - Tracks which MCP tools were used in session
   - Timestamp-based (valid for 5 minutes)
   - Ephemeral (not committed to git)

2. **MCP tracking scripts**:
   - `.claude/scripts/mark-mcp-used.sh` - PostToolUse for Context7/Memory
   - `.claude/scripts/mark-skill-loaded.sh` - PostToolUse for Skill tool

3. **Verification script**: `.claude/scripts/verify-prep-done.sh`
   - PreToolUse on Edit/Write for code files
   - Checks if MCP markers exist and are fresh
   - **Warns** (exit 1) if missing, doesn't block

4. **Pattern detection script**: `.claude/scripts/detect-error-patterns.sh`
   - PostToolUse when errors.md is read
   - Counts errors by category
   - **Notifies** (exit 0) if 2+ errors in any category

### Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ MCP Tool Called │ ──▶ │ PostToolUse Hook │ ──▶ │ Marker Created  │
│ (Context7, etc) │     │ Creates Marker   │     │ (.mcp-markers)  │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
┌─────────────────┐     ┌──────────────────┐              │
│ Write/Edit Code │ ──▶ │ PreToolUse Hook  │ ◀────────────┘
│                 │     │ Checks Markers   │
└─────────────────┘     └──────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
              [ALLOW]            [WARN]
         (markers present)    (markers missing)
```

### Enforcement Levels

| Behavior | Exit Code | Effect |
|----------|-----------|--------|
| MCP tools not used | 1 | Warning message, continues |
| Skills not loaded | 1 | Warning message, continues |
| Error patterns detected | 0 | Notification only |
| Errors.md not read | 2 | BLOCKED |

### Hooks Added

**PostToolUse**:
- `mcp__.*context7.*` → mark-mcp-used.sh context7
- `mcp__memory__*` → mark-mcp-used.sh memory
- `Skill` → mark-skill-loaded.sh
- `Read errors.md` → detect-error-patterns.sh (chained)

**PreToolUse**:
- `Edit/Write` on code files → verify-prep-done.sh

### MCP Markers Format

Individual marker files for simplicity (no jq dependency):
- `.claude/user/.mcp-context7-marker` - timestamp
- `.claude/user/.mcp-memory-marker` - timestamp
- `.claude/user/.skills-marker` - timestamp

Combined JSON file (when jq is available):
```json
{
  "context7": {"lastUsed": 1738742400},
  "_updated": 1738742400
}
```

### Limitations

| Limitation | Mitigation |
|------------|------------|
| Can't detect WHICH skill should be loaded | Warn generically |
| Can't verify Context7 query was relevant | Manual review |
| Pattern detection is category-based | Good for 2+ threshold |
| Markers reset each session | By design |

---

**Last Updated**: 2026-02-05
