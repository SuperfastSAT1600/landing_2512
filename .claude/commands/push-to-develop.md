---
description: Commit changes and push directly to the develop branch
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*), Bash(git push:*), Bash(git branch:*), Bash(git diff:*), Bash(git log:*), Bash(gh pr create:*)
---

# Commit and Push to Develop

This command automates the workflow of committing changes and pushing directly to `develop` (no PR — the push IS the delivery).

## Usage
Use this command when you want to commit and push directly to the `develop` branch without opening a PR.

## Instructions

**IMPORTANT**: After pushing, you MUST send a notification to the Slack channel "commit-업데이트" with the push details. Use the Slack MCP to post the message.

1. **Check Current Status**
   - Run `git status` to see what files have changed
   - Run `git branch` to confirm current branch name
   - Run `git diff` to review all changes

2. **Analyze Changes**
   - Review all modified files
   - Understand the scope of changes
   - Determine if this is a feature, fix, refactor, etc.

3. **Commit Changes**
   - Stage all relevant files with `git add`
   - Create a clear, concise commit message that:
     - Summarizes the "why" not just the "what"
     - Follows the repository's commit message style (check recent `git log`)
     - Is 1-2 sentences maximum
   - Include co-author: `Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>`
   - Use heredoc format for the commit message

4. **Push Directly to Develop**
   - If currently on `develop`: push with `git push` (or `git push -u origin develop` if not tracking)
   - If on another branch: push directly to develop with `git push origin HEAD:develop`
   - Do NOT create a PR — the push to develop is the final step

5. **Send Slack Notification** (REQUIRED - NO EXCEPTIONS)
   After pushing:
   - **MUST use mcp__slack__slack_post_message tool** with channel_id="commit-업데이트"
   - This is NOT optional - every push MUST notify the team
   - **IMPORTANT**: Translate all technical content to natural, professional Korean
   - Messages should be easily understandable by non-technical team members
   - Message format (in natural Korean):
     ```
     📤 develop 브랜치 업데이트

     {COMMIT_TITLE in Korean}

     👤 작성자: {author}

     ━━━━━━━━━━━━━━━━━━━━

     ## 요약
     {Summary in natural Korean - what changed and why}

     ━━━━━━━━━━━━━━━━━━━━

     🤖 Claude Code로 자동 생성됨
     ```
   - Translate technical terms:
     - "Branch" → remove (not needed for vibe coders)
     - "Author" → "작성자"
   - Use friendly language that explains what changed in simple terms

## Example

```bash
# Check status
git status
git branch
git diff

# Stage and commit
git add src/components/Button.tsx src/styles/button.css
git commit -m "$(cat <<'EOF'
Add hover animation to Button component

Improves user experience by providing visual feedback on interaction.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"

# Push directly to develop (from any branch)
git push origin HEAD:develop
```

## Notes
- Always review changes before committing
- Never skip hooks unless explicitly requested
- Ensure commit message accurately reflects changes
- This command bypasses PR review — use only when appropriate
