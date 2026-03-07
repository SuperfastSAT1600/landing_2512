# Commands Directory

User-invoked workflows triggered with `/command-name` syntax.

---

## Core TDD Flow

The primary development workflow:

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `/plan` | Create spec with REQ-XXX IDs and verification tags |
| 2 | `/tdd` or `/parallel-tdd` | Single-agent or multi-agent worktree TDD |
| 3 | `/checkpoint` | Unified gate: types, lint, format, tests, build, security |
| 4 | `/commit-push-pr` | Conventional commit, push, create PR |

---

## TDD Utilities

| Command | Purpose | Duration |
|---------|---------|----------|
| `/req-coverage` | Check which REQ-XXX IDs have test coverage | <1min |
| `/req-status` | Show per-REQ lifecycle dashboard (spec → test → passing) | <1min |
| `/generate-stubs` | Generate test stub files from a spec's traceability matrix | <2min |

---

## Utilities

| Command | Purpose | Duration |
|---------|---------|----------|
| `/quick-fix <issue>` | Fast bug fix with regression test | Minutes |
| `/review` | Code review + security audit | 5-30min |
| `/build-fix` | Fix build errors systematically | Varies |
| `/type-check` | Strict TypeScript checking | <2min |
| `/test-coverage` | Coverage analysis, generate missing tests | 5-15min |
| `/test-ladder` | Progressive escalation: unit → integration → E2E → manual | 5-30min |

---

## Scaffolding

| Command | Purpose | Duration |
|---------|---------|----------|
| `/new-component <Name>` | Scaffold React component with tests | <1min |
| `/create-migration "<desc>"` | Database migration with rollback | 5min |
| `/e2e <workflow>` | Generate and run E2E tests | 10-30min |
| `/update-docs` | Sync documentation with code changes | 5-10min |
| `/open-localhost [port]` | Auto-detect and open dev server | <5sec |

---

## Advanced

| Command | Purpose | Duration |
|---------|---------|----------|
| `/full-feature <desc>` | Complete: plan → spec → implement → test → review → PR | Hours |
| `/refactor-clean [scope]` | Dead code removal + modernization | 15-30min |
| `/spike <topic>` | Time-boxed technical research | 30min-2hr |

---

## System

| Command | Purpose | Duration |
|---------|---------|----------|
| `/health-check` | Comprehensive audit of `.claude/` config | 1-5min |
| `/session-report` | Agent activity and error summary | <1min |
| `/update-system` | Pull latest system files from upstream | <1min |

---

## Usage

```
/full-feature add user notifications
/quick-fix login button not responding
/checkpoint
/new-component UserAvatar
```

---

**Last Updated**: 2026-02-27
