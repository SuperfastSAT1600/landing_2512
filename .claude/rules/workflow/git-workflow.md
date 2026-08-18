# Git Workflow

---

## Branches

`feature/`, `fix/`, `hotfix/`, `chore/` + short description.

## Pull Requests

- <400 lines changed | All CI passes | 1 approval minimum | Delete branch after merge

## Checklist Gates

| Gate | When |
|------|------|
| `pr-review` | Before opening PR |
| `deployment-checklist` | Before deploying |
| `security-audit` | Security-related changes |
| `build-errors-checklist` | Build is broken |
| `database-migration-review` | Before DB migrations |
