# Commands Directory

User-invoked workflows triggered with `/command-name` syntax.

---

## Core Flow

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `/parallel-tdd` | Multi-agent worktree TDD |
| 2 | `/commit-push-pr` | Conventional commit, push, create PR |

---

## Utilities

| Command | Purpose | Duration |
|---------|---------|----------|
| `/verify` | Check latest task's changes are complete, consistent, clean | 2-5min |
| `/fixroot <symptom>` | Trace bug to structural origin, propose deletion-first fix | 10-30min |
| `/quick-fix <issue>` | Fast bug fix with regression test | Minutes |
| `/review` | Code review + security audit | 5-30min |
| `/build-fix` | Fix build errors systematically | Varies |
| `/type-check` | Strict TypeScript checking | <2min |
| `/test-coverage` | Coverage analysis, generate missing tests | 5-15min |

---

## Scaffolding

| Command | Purpose | Duration |
|---------|---------|----------|
| `/e2e <workflow>` | Generate and run E2E tests | 10-30min |
| `/update-docs` | Sync documentation with code changes | 5-10min |
| `/open-localhost [port]` | Auto-detect and open dev server | <5sec |

---

## Advanced

| Command | Purpose | Duration |
|---------|---------|----------|
| `/full-feature <desc>` | Complete: spec → implement → test → review → PR | Hours |
| `/refactor-clean [scope]` | Dead code removal + modernization | 15-30min |
| `/spike <topic>` | Time-boxed technical research | 30min-2hr |

---

## System

| Command | Purpose | Duration |
|---------|---------|----------|
| `/serverlog [service]` | Fetch latest 100 logs from Render | <5sec |
| `/health-check` | Comprehensive audit of `.claude/` config | 1-5min |
| `/update-system` | Pull latest system files from upstream | <1min |

---

## Usage

```
/full-feature add user notifications
/quick-fix login button not responding
/fixroot null check appearing in three places
/serverlog eden-api
```

---

**Last Updated**: 2026-04-30
