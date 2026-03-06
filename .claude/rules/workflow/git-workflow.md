# Git Workflow

---

## Branches

`feature/`, `fix/`, `hotfix/`, `chore/` + short description.

## Commits

`<type>(<scope>): <subject>` — max 72 chars, imperative mood, no trailing period.
Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`

## Pull Requests

- <400 lines changed | All CI passes | 1 approval minimum | Delete branch after merge

## Safety

- Never force push `main`/`master` | Never skip hooks (`--no-verify`)
- `--force-with-lease` on feature branches only | Never amend published commits

## Checklist Gates

| Gate | When |
|------|------|
| `pr-review` | Before opening PR |
| `deployment-checklist` | Before deploying |
| `security-audit` | Security-related changes |
| `build-errors-checklist` | Build is broken |
| `database-migration-review` | Before DB migrations |
