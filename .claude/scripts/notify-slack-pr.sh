#!/bin/bash
#
# Slack PR Notification Script
# Sends notifications to the 개발 channel when PRs are created or pushed
# Messages are in natural Korean for non-technical team members
#
# Usage:
#   ./notify-slack-pr.sh <event_type>
#
# Event types:
#   - pr_created: PR was just created
#   - push: Code was pushed to remote
#
# Environment variables:
#   - SLACK_CHANNEL: Channel name (default: 개발)

set -e

EVENT_TYPE="${1:-unknown}"
SLACK_CHANNEL="${SLACK_CHANNEL:-개발}"

# Get current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

# Get author name
AUTHOR=$(git config user.name 2>/dev/null || echo "Unknown")

# Get PR details if available
PR_URL=$(gh pr view --json url -q .url 2>/dev/null || echo "")
PR_TITLE=$(gh pr view --json title -q .title 2>/dev/null || echo "")
PR_BODY=$(gh pr view --json body -q .body 2>/dev/null || echo "")
PR_NUMBER=$(gh pr view --json number -q .number 2>/dev/null || echo "")

# Function to translate PR body to natural Korean
translate_pr_body() {
  local body="$1"

  # Simple translations for common sections
  body="${body//## Summary/## 요약}"
  body="${body//## Test plan/## 테스트 방법}"
  body="${body//## Technical Changes/## 기술적 변경사항}"
  body="${body//## Files Changed/## 변경된 파일}"
  body="${body//## What changed/## 무엇이 바뀌었나요}"
  body="${body//## Why/## 왜 바꿨나요}"
  body="${body//## How to test/## 테스트하는 방법}"

  echo "$body"
}

# Build message based on event type
case "$EVENT_TYPE" in
  pr_created)
    if [ -n "$PR_URL" ] && [ -n "$PR_TITLE" ]; then
      TRANSLATED_BODY=$(translate_pr_body "$PR_BODY")
      MESSAGE="✨ *새로운 코드 리뷰 요청* #$PR_NUMBER\n\n*$PR_TITLE*\n\n👤 작성자: $AUTHOR\n\n━━━━━━━━━━━━━━━━━━━━\n\n$TRANSLATED_BODY\n\n━━━━━━━━━━━━━━━━━━━━\n\n🔗 <$PR_URL|자세히 보기>\n\n_🤖 Claude Code로 자동 생성됨_"
    else
      MESSAGE="✨ *새로운 코드 리뷰 요청*\n👤 작성자: $AUTHOR\n\n_🤖 Claude Code로 자동 생성됨_"
    fi
    ;;

  push)
    if [ -n "$PR_URL" ] && [ -n "$PR_TITLE" ]; then
      TRANSLATED_BODY=$(translate_pr_body "$PR_BODY")
      MESSAGE="📤 *코드 업데이트* #$PR_NUMBER\n\n*$PR_TITLE*\n\n👤 작성자: $AUTHOR\n\n━━━━━━━━━━━━━━━━━━━━\n\n$TRANSLATED_BODY\n\n━━━━━━━━━━━━━━━━━━━━\n\n🔗 <$PR_URL|자세히 보기>\n\n_🤖 Claude Code로 자동 생성됨_"
    else
      # No PR associated, just show push info
      COMMIT_MSG=$(git log -1 --pretty=format:"%s" 2>/dev/null || echo "변경사항 없음")
      MESSAGE="📤 *코드 업데이트*\n👤 작성자: $AUTHOR\n💬 내용: $COMMIT_MSG\n\n_🤖 Claude Code로 자동 생성됨_"
    fi
    ;;

  *)
    MESSAGE="📢 *작업 알림*\n👤 작성자: $AUTHOR\n\n_🤖 Claude Code로 자동 생성됨_"
    ;;
esac

# Send to Slack via Claude Code with MCP
# This will be executed by Claude Code which has access to Slack MCP
echo "[Slack] Sending notification to #$SLACK_CHANNEL: $EVENT_TYPE" >&2
echo "[Slack] Channel: $SLACK_CHANNEL" >&2

# Save notification details to temp file for Claude Code to process
TEMP_FILE="/tmp/claude-slack-notification-$$.json"

# Output JSON (with or without jq)
if command -v jq &> /dev/null; then
  # Use jq for proper JSON escaping if available
  jq -n \
    --arg channel "$SLACK_CHANNEL" \
    --arg message "$MESSAGE" \
    --arg event_type "$EVENT_TYPE" \
    --arg branch "$BRANCH" \
    --arg author "$AUTHOR" \
    --arg pr_url "$PR_URL" \
    '{
      channel: $channel,
      message: $message,
      event_type: $event_type,
      branch: $branch,
      author: $author,
      pr_url: $pr_url
    }' > "$TEMP_FILE"
else
  # Fallback: simple JSON without jq (basic escaping)
  cat > "$TEMP_FILE" <<EOF
{
  "channel": "$SLACK_CHANNEL",
  "message": "$MESSAGE",
  "event_type": "$EVENT_TYPE",
  "branch": "$BRANCH",
  "author": "$AUTHOR",
  "pr_url": "$PR_URL"
}
EOF
fi

echo "[Slack] Notification saved to $TEMP_FILE" >&2
echo "$TEMP_FILE"

exit 0
