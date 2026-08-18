---
name: github-actions
description: Provides patterns for building fast, reliable CI/CD workflows with GitHub-hosted runners including workflow syntax, caching, secrets, and reusable workflows.
---

# GitHub Actions

Fast, reliable CI/CD workflows with GitHub-hosted runners. Core patterns for building production pipelines.

**Sources:** GitHub Actions Documentation (docs.github.com/en/actions), GitHub Actions Best Practices

---

## Workflow Syntax

Define workflows in `.github/workflows/*.yml`. Triggered by push, pull_request, schedule, or manual dispatch.

```yaml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: {node-version: 20, cache: npm}
      - run: npm ci && npm test
```

**Reference:** https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions

---

## Events and Triggers

- `push`: Triggers on git push to branches/tags
- `pull_request`: Triggers on PR open, sync, reopen
- `schedule`: Cron syntax for scheduled runs
- `workflow_dispatch`: Manual trigger from UI
- `workflow_call`: Make workflow reusable

**Path filters:** Run only when specific files change

```yaml
on:
  push:
    paths: ['src/**', '!**/*.md']
```

**Reference:** https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows

---

## Jobs and Steps

Jobs run in parallel by default. Use `needs` for sequential execution. Steps run shell commands or reusable actions.

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: npm run build

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - run: npm run deploy
```

**Reference:** https://docs.github.com/en/actions/using-jobs

---

## Matrix Strategies

Test multiple versions/platforms in parallel.

```yaml
strategy:
  matrix:
    node: [18, 20, 22]
    os: [ubuntu-latest, windows-latest]
runs-on: ubuntu-latest  # Or use matrix.os variable
```

**Reference:** https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs

---

## Caching Dependencies

Cache node_modules, pip packages, or build outputs. Setup actions include built-in caching.

```yaml
- uses: actions/setup-node@v4
  with:
    cache: npm  # auto-caches node_modules
```

**Manual caching:**

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: OS-node-HASH  # Use: runner.os and hashFiles() variables
```

**Reference:** https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows

---

## Secrets Management

Store sensitive data in repository/environment/organization secrets. Automatically masked in logs.

```yaml
steps:
  - run: echo "API_KEY_VALUE"  # Use secrets.API_KEY variable
```

**OIDC for cloud providers** (preferred over static credentials):

**Reference:** https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions

---

## Environment Variables

Define at workflow/job/step level.

```yaml
env:
  NODE_ENV: production

jobs:
  build:
    env:
      API_URL: https://api.example.com
```

**Reference:** https://docs.github.com/en/actions/learn-github-actions/variables

---

## Reusable Workflows

Share workflows across repositories.

```yaml
# .github/workflows/reusable.yml
on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string

# Caller
jobs:
  call:
    uses: ./.github/workflows/reusable.yml
    with:
      environment: production
```

**Reference:** https://docs.github.com/en/actions/using-workflows/reusing-workflows

---

## Templates

Code templates for this domain (in `templates/`):
- `github-workflow.yml` — GitHub Actions CI/CD pipeline template

---

## Resources

- **GitHub Actions Docs:** https://docs.github.com/en/actions
- **Workflow Syntax:** https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
- **Security Best Practices:** https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions
- **Caching:** https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows
