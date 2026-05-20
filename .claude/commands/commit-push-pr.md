---
description: Commit changes, push to remote, and create a pull request
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*), Bash(git push:*), Bash(git branch:*), Bash(git diff:*), Bash(git log:*), Bash(gh pr create:*)
---

# Commit, Push, and Create PR

This command automates the workflow of committing changes, pushing to remote, and creating a pull request.

## Usage
Use this command when you've completed a feature or fix and want to create a PR in one shot.

## Instructions

You are about to commit changes, push to remote, and create a pull request. Follow these steps:

**IMPORTANT**: After creating the PR or pushing to an existing PR, you MUST send a notification to the Slack channel "commit-업데이트" with the PR details. Use the Slack MCP to post the message.

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

4. **Push to Remote**
   - Check if branch is tracking remote with `git branch -vv`
   - If not tracking, push with `-u` flag: `git push -u origin <branch-name>`
   - If already tracking, use: `git push`

5. **Create Pull Request**
   - Check if `develop` branch exists on remote: `git ls-remote --heads origin develop`
   - If `develop` exists: `gh pr create --base develop`
   - If `develop` does not exist: `gh pr create --base main`
   - Title should be clear and descriptive
   - Body should include:
     - **Summary**: 1-3 bullet points of what changed
     - **Test plan**: Checklist of how to test/verify the changes
     - Footer: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`
   - Use heredoc for PR body to ensure proper formatting

6. **Send Slack Notification** (REQUIRED - NO EXCEPTIONS)
   After PR creation or pushing to remote:
   - **MUST use mcp__slack__slack_post_message tool** with channel_id="commit-업데이트"
   - This is NOT optional - every PR/push MUST notify the team
   - **IMPORTANT**: Translate all technical content to natural, professional Korean
   - Messages should be easily understandable by non-technical team members
   - Message format (in natural Korean):
     ```
     ✨ 새로운 코드 리뷰 요청 #{PR_NUMBER}

     {PR_TITLE in Korean}

     👤 작성자: {author}

     ━━━━━━━━━━━━━━━━━━━━

     ## 요약
     {Summary in natural Korean - what changed and why}

     ## 테스트 방법
     {Test plan in natural Korean - how to verify it works}

     ━━━━━━━━━━━━━━━━━━━━

     🔗 자세히 보기: {PR_URL}

     🤖 Claude Code로 자동 생성됨
     ```
   - For pushes to existing PR, use "📤 코드 업데이트 #{PR_NUMBER}" instead
   - Translate technical terms:
     - "Summary" → "요약"
     - "Test plan" → "테스트 방법"
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

# Push
git push -u origin feature/button-hover

# Create PR (target develop if it exists, otherwise main)
git ls-remote --heads origin develop  # check if develop exists
gh pr create --base develop --title "Add hover animation to Button component" --body "$(cat <<'EOF'
## Summary
- Added CSS transition for hover state
- Improved accessibility with focus indicators
- Updated Button component props

## Test plan
- [ ] Hover over buttons in Storybook
- [ ] Verify keyboard focus indicators work
- [ ] Test in mobile viewport

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

## Notes
- Always review changes before committing
- Never skip hooks unless explicitly requested
- Ensure commit message accurately reflects changes
- PR should be ready for review when created
