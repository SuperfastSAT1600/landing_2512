# Slack Notification System

Status: **FUNCTIONAL** (via `/commit-push-pr` command)

---

## How It Works

Slack notifications are sent automatically when using the `/commit-push-pr` command. Every PR creation or push to existing PR triggers a notification to the #commit-업데이트 channel.

### Working Components

✅ **Slack MCP Integration**
- Configured and tested
- Has `chat:write` permission
- Can post to #commit-업데이트 channel (ID: C09UT6DFUBY)

✅ **`/commit-push-pr` Command**
- Commits changes
- Pushes to remote
- Creates PR with `gh pr create`
- **Sends Slack notification automatically** (mandatory step)

✅ **Korean Translation**
- All notifications are in natural, professional Korean
- Technical terms translated for non-technical team members
- Format designed for "vibe coders" (Korean slang for casual developers)

### Notification Format

**For new PRs:**
```
✨ 새로운 코드 리뷰 요청 #123

[PR Title in Korean]

👤 작성자: [Author]

━━━━━━━━━━━━━━━━━━━━

## 요약
[What changed and why]

## 테스트 방법
[How to verify it works]

━━━━━━━━━━━━━━━━━━━━

🔗 자세히 보기: [PR URL]

🤖 Claude Code로 자동 생성됨
```

**For pushes to existing PRs:**
```
📤 코드 업데이트 #123

[PR Title in Korean]

👤 작성자: [Author]

━━━━━━━━━━━━━━━━━━━━

[Updated summary and test plan]

━━━━━━━━━━━━━━━━━━━━

🔗 자세히 보기: [PR URL]

🤖 Claude Code로 자동 생성됨
```

---

## Architecture

### Why Not Use Git Hooks?

**Initial attempt**: PostToolUse hooks that run bash scripts
**Problem**: Bash hooks cannot invoke MCP tools (architectural limitation)

**Current solution**: Integrate Slack notification as a mandatory step in `/commit-push-pr` command

### Command Flow

```
User runs: /commit-push-pr

┌─────────────────────────────────┐
│ 1. Check git status & diff      │
└──────────┬──────────────────────┘
           ↓
┌─────────────────────────────────┐
│ 2. Commit with clear message    │
└──────────┬──────────────────────┘
           ↓
┌─────────────────────────────────┐
│ 3. Push to remote               │
└──────────┬──────────────────────┘
           ↓
┌─────────────────────────────────┐
│ 4. Create PR with gh pr create  │
└──────────┬──────────────────────┘
           ↓
┌─────────────────────────────────┐
│ 5. Send Slack notification      │ ← MANDATORY STEP
│    via mcp__slack__slack_post_  │
│    message tool                 │
└─────────────────────────────────┘
```

---

## Testing

Slack notifications were tested on 2026-01-30:

```bash
# Test message sent successfully
mcp__slack__slack_post_message(
  channel_id="commit-업데이트",
  text="🧪 Test: Slack notification system check"
)

# Result: ✅ Success
# Channel ID: C09UT6DFUBY
# Message timestamp: 1769756641.241359
```

---

## Configuration

### Required MCP Permissions

- ✅ `chat:write` - Post messages (HAVE THIS)
- ❌ `channels:read` - List channels (DON'T HAVE, DON'T NEED)

We can post to #commit-업데이트 using the channel name directly, so listing channels is not required.

### Channel Configuration

**Channel name**: commit-업데이트 (Korean for "commit updates")
**Channel ID**: C09UT6DFUBY
**Workspace**: T07FK3GB2NP

---

## Limitations

1. **Only works with `/commit-push-pr` command**
   - Regular `git push` commands won't trigger notifications
   - Manual PR creation won't trigger notifications
   - Must use the command for notifications to work

2. **Requires Slack MCP to be enabled**
   - Check `.claude/settings.local.json`: "slack" must be in `enabledMcpjsonServers`
   - If disabled, re-run setup wizard

3. **No retroactive notifications**
   - Only notifies for PRs created/updated via the command
   - Past PRs won't be notified

---

## Troubleshooting

### Notification not sent

**Check:**
1. Slack MCP enabled: `.claude/settings.local.json` → `enabledMcpjsonServers` includes "slack"
2. Command instructions followed: `/commit-push-pr` should send notification as final step
3. Channel accessible: User must have access to #commit-업데이트 channel

**Test manually:**
```
mcp__slack__slack_post_message(
  channel_id="commit-업데이트",
  text="Test notification"
)
```

### Wrong channel

**Update channel:**
Edit `.claude/commands/commit-push-pr.md` line 54:
```
- **MUST use mcp__slack__slack_post_message tool** with channel_id="commit-업데이트"
```

Change "commit-업데이트" to your desired channel name or ID.

---

## Future Improvements

**Potential enhancements:**
- [ ] Support notifications for other workflows (hotfix, release)
- [ ] Configurable notification templates
- [ ] Thread replies for PR updates (instead of new messages)
- [ ] Mention specific users for code review requests
- [ ] Integration with PR approval workflow

**Non-viable (architectural limitation):**
- ~~Automatic notifications on any git push~~ (hooks can't invoke MCP)
- ~~Background notification service~~ (Claude Code doesn't support this)
