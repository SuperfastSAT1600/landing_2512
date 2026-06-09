---
description: Commit ALL local changes (yours + any outside this session) and push directly to develop
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*), Bash(git push:*), Bash(git branch:*), Bash(git diff:*), Bash(git log:*), Bash(gh pr create:*)
---

# Push ALL to Develop

Same as `/push-to-develop`, but stages **every** local change — including
files modified outside this terminal session (other terminals, editors,
upstream git operations, untracked files you intended to ship, etc.).

Use this when you've been working across multiple terminals or tools and want
a single sweep that captures the full working-tree state.

## Difference from `/push-to-develop`

| | `/push-to-develop`      | `/push-all-to-develop`         |
|---|---|---|
| Staging | Selective (`git add <files>`) — only relevant files | **`git add -A`** — every modified + untracked file |
| Scope   | Just what the agent worked on this session         | The entire working tree |
| Safety  | Won't accidentally include unrelated work          | Will include everything — review carefully |

## Instructions

**IMPORTANT**: After pushing, you MUST send a notification to the Slack channel "commit-업데이트" with the push details. Use the Slack MCP to post the message.

1. **Check Current Status**
   - Run `git status` to see ALL changed and untracked files
   - Run `git branch` to confirm current branch name
   - Run `git diff` and `git diff --cached` to review all changes

2. **Review Carefully — This Stages Everything**
   - Look through the full `git status` output
   - Confirm nothing sensitive is present (`.env`, credentials, large binaries, backup folders, IDE state files, etc.)
   - If anything should NOT ship, abort and use `/push-to-develop` instead with selective staging
   - When in doubt, ask the user before proceeding

3. **Analyze Changes**
   - Group the changes into a coherent theme if possible
   - If changes span multiple unrelated themes, the commit message should acknowledge that (e.g. "chore: sync local working tree — multiple unrelated updates")

4. **Commit All Changes**
   - Stage with `git add -A` (captures modifications, additions, AND deletions across the whole tree)
   - Create a clear, concise commit message that:
     - Summarizes what's in the sweep — be honest if it's mixed
     - Follows the repository's commit message style (check recent `git log`)
   - Include co-author: `Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>`
   - Use heredoc format for the commit message

5. **Push Directly to Develop**
   - If currently on `develop`: push with `git push` (or `git push -u origin develop` if not tracking)
   - If on another branch: push directly to develop with `git push origin HEAD:develop`
   - Do NOT create a PR — the push to develop is the final step

6. **Send Slack Notification** (REQUIRED - NO EXCEPTIONS)
   After pushing:
   - **MUST use mcp__slack__slack_post_message tool** with channel_id="commit-업데이트"
   - This is NOT optional - every push MUST notify the team
   - **IMPORTANT**: Translate all technical content to natural, professional Korean
   - Messages should be easily understandable by non-technical team members
   - Message format (in natural Korean):
     ```
     📤 develop 브랜치 업데이트

     {COMMIT_TITLE in Korean}

     👤 작성자: AI Assistant

     ━━━━━━━━━━━━━━━━━━━━

     ## 요약
     {Summary in natural Korean - what changed and why. If the sweep covers multiple unrelated topics, list them as bullets.}

     ━━━━━━━━━━━━━━━━━━━━

     🤖 Claude Code로 자동 생성됨
     ```
   - Translate technical terms:
     - "Branch" → remove (not needed for vibe coders)
     - "Author" → "작성자"
   - Use friendly language that explains what changed in simple terms

## Example

```bash
# Check status — review carefully, you're about to stage everything
git status
git branch
git diff
git diff --cached

# Stage all changes (your work + anything else in the tree)
git add -A
git commit -m "$(cat <<'EOF'
chore: sync local working tree to develop

Includes Button hover animation work + config tweaks made earlier.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"

# Push directly to develop (from any branch)
git push origin HEAD:develop
```

## Notes
- Always review `git status` carefully before staging — `git add -A` is broad
- Never commit `.env`, credentials, or large binaries (gitignore them first)
- Never skip hooks unless explicitly requested
- This command bypasses PR review — use only when appropriate
- If the change set is large and mixed, consider splitting into multiple `/push-to-develop` runs instead
