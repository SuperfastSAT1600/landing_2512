---
name: git-branch-strategy
description: Team branch/PR strategy — feature branches off develop, PRs target develop (NOT main)
metadata:
  type: feedback
---

팀 브랜치 전략 (2026-06-10 합의). PR 기본 대상은 `develop`이며 `main`이 아니다.

- **절대 금지**: `main`·`develop`에 직접 커밋/푸시
- 항상 `develop`에서 시작: `git checkout develop && git pull origin develop && git checkout -b feature/...`
- 네이밍: 신규 기능 `feature/crm-...`/`feature/landing-...`, 버그 `fix/crm-...`
- PR 방향: `feature/xxx` → **`develop`**
- PR 본문 필수 섹션: `## 작업 내용`, `## 확인 필요 사항`(Supabase 마이그레이션 파일, 추가 환경변수 등)
- `develop` → `main` 머지 및 배포는 병윤님이 담당

**Why:** 이 규칙은 CLAUDE.md `workflow/git-workflow.md`의 "main을 PR 대상으로 쓴다"는 기본값을 **덮어쓴다**. 환경 컨텍스트의 "Main branch (you will usually use this for PRs)" 보다 우선한다.

**How to apply:** `/commit-push-pr`, `/ship`, 커밋·PR 작업 시 base 브랜치를 `develop`으로 설정. main으로 PR/푸시하려는 동작은 멈추고 develop으로 교정.
