---
name: slack-pr-updates
description: Slack — post commit/push/PR updates to the commit-업데이트 channel; 병윤 user ID for @-mention
metadata:
  type: reference
---

커밋·푸시·PR 업데이트 공유는 Slack **`commit-업데이트`** 채널에 올린다.

- 채널: `commit-업데이트` — channel_id `C09UT6DFUBY` (구 이름 "개발")
- 병윤(배병윤) 멘션: `<@U07FK6LSK7C>` — PR 알림 시 태그할 대상 (develop→main 머지 담당, [[git-branch-strategy]])
- 봇(landingpage app)이 멤버인 채널만 post 가능. `commit-업데이트`에는 게시 성공 확인됨.

**Why:** 2026-06-10 PR #110 공유 시, 봇 멤버 채널을 찾다가 `개발_병윤`(C0B5SKL75FU)에 잘못 먼저 올렸다. 사용자가 "원래 commit/push 진행하는 채널"인 `commit-업데이트`로 지정.

**How to apply:** PR/커밋 공유 요청 시 기본 대상은 `C09UT6DFUBY`. 병윤 확인 필요하면 메시지 첫머리에 `<@U07FK6LSK7C>` 멘션. 현재 Slack MCP 도구에는 메시지 삭제 기능이 없으니 잘못 올리면 직접 못 지운다 — 채널 먼저 확정하고 게시할 것.
