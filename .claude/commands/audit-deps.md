# Audit Dependencies Command

Security audit and health check for project dependencies.

---

## Usage

```
/audit-deps [options]
```

**Options:**
```
/audit-deps                    # Full audit
/audit-deps --security-only    # Just security vulnerabilities
/audit-deps --outdated-only    # Just outdated packages
/audit-deps --fix              # Auto-fix where possible
```

---

## What This Command Does

Comprehensive dependency analysis:

1. **Security Audit**: Find vulnerabilities (CVEs)
2. **Outdated Check**: Find packages needing updates
3. **License Check**: Verify license compliance
4. **Bundle Analysis**: Check package sizes
5. **Report**: Summarize findings and recommendations

---

## Audit Components

### 1. Security Vulnerabilities
```bash
npm audit
```
- Critical vulnerabilities (CVSS 9.0+)
- High vulnerabilities (CVSS 7.0-8.9)
- Moderate vulnerabilities (CVSS 4.0-6.9)
- Low vulnerabilities (CVSS 0.1-3.9)

### 2. Outdated Packages
```bash
npm outdated
```
- Major updates (breaking changes)
- Minor updates (new features)
- Patch updates (bug fixes)

### 3. License Compliance
```bash
npx license-checker
```
- Compatible licenses (MIT, Apache, BSD)
- Copyleft licenses (GPL, LGPL)
- Unknown/custom licenses

### 4. Bundle Size Impact
- Large packages (>100KB)
- Duplicate packages
- Tree-shaking opportunities

---

## Example Session

**User**: `/audit-deps`

**Claude**:

### Dependency Audit Report

**Project**: my-app
**Date**: 2024-01-15
**Total Dependencies**: 156 (45 direct, 111 transitive)

---

### 1. Security Vulnerabilities

```
┌─────────────┬────────┬─────────────┐
│ Severity    │ Count  │ Auto-fixable│
├─────────────┼────────┼─────────────┤
│ Critical    │ 1      │ Yes         │
│ High        │ 3      │ 2           │
│ Moderate    │ 8      │ 6           │
│ Low         │ 12     │ 10          │
└─────────────┴────────┴─────────────┘
```

**Critical: `jsonwebtoken@8.5.1`**
- CVE-2022-23529: Algorithm confusion attack
- Fix: Update to `jsonwebtoken@9.0.0`
- Breaking changes: Yes (see migration guide)

**High: `axios@0.21.1`**
- CVE-2021-3749: Server-Side Request Forgery
- Fix: Update to `axios@1.6.0`
- Breaking changes: Minor

---

### 2. Outdated Packages

**Major Updates (Breaking)**
```
┌─────────────────┬─────────┬─────────┬────────────────────┐
│ Package         │ Current │ Latest  │ Breaking Changes   │
├─────────────────┼─────────┼─────────┼────────────────────┤
│ next            │ 13.5.0  │ 14.1.0  │ App Router changes │
│ react           │ 17.0.2  │ 18.2.0  │ Concurrent mode    │
│ typescript      │ 4.9.5   │ 5.3.3   │ Decorator changes  │
└─────────────────┴─────────┴─────────┴────────────────────┘
```

**Minor Updates (Features)**
```
┌─────────────────┬─────────┬─────────┐
│ Package         │ Current │ Latest  │
├─────────────────┼─────────┼─────────┤
│ zod             │ 3.21.0  │ 3.22.4  │
│ tailwindcss     │ 3.3.0   │ 3.4.1   │
│ @tanstack/query │ 5.0.0   │ 5.17.0  │
└─────────────────┴─────────┴─────────┘
```

**Patch Updates (Fixes)**
```
15 packages have patch updates available
Run: npm update
```

---

### 3. License Compliance

```
✅ All licenses compatible with MIT project license

┌─────────────┬───────┬────────────────────────┐
│ License     │ Count │ Notable Packages       │
├─────────────┼───────┼────────────────────────┤
│ MIT         │ 98    │ react, lodash, axios   │
│ Apache-2.0  │ 23    │ typescript             │
│ ISC         │ 18    │ glob, minimatch        │
│ BSD-3       │ 12    │ qs, tough-cookie       │
│ 0BSD        │ 5     │ tslib                  │
└─────────────┴───────┴────────────────────────┘
```

---

### 4. Bundle Analysis

**Large Packages (>100KB gzipped)**
```
┌─────────────────┬───────────┬─────────────────────────┐
│ Package         │ Size      │ Recommendation          │
├─────────────────┼───────────┼─────────────────────────┤
│ lodash          │ 71.5KB    │ Use lodash-es + imports │
│ moment          │ 67.9KB    │ Replace with date-fns   │
│ @mui/material   │ 324KB     │ Use tree-shaking        │
└─────────────────┴───────────┴─────────────────────────┘
```

**Duplicates Found**
```
- tslib: 2.3.0, 2.5.0, 2.6.0 (dedupe recommended)
```

---

### Recommendations

#### Immediate Actions (Security)
```bash
# Fix critical vulnerability
npm install jsonwebtoken@9.0.0

# Fix high vulnerabilities
npm audit fix
```

#### Planned Updates
1. **React 18 Migration** (2-4 hours)
   - Update react, react-dom
   - Replace ReactDOM.render
   - Review Suspense usage

2. **Next.js 14 Migration** (4-8 hours)
   - Update next
   - Review App Router changes
   - Update middleware

#### Optimizations
```bash
# Remove moment, use date-fns
npm uninstall moment
npm install date-fns

# Use specific lodash imports
npm uninstall lodash
npm install lodash.debounce lodash.throttle
```

---

### Quick Fix Commands

```bash
# Fix auto-fixable vulnerabilities
npm audit fix

# Update all patch versions
npm update

# Update specific package
npm install package@latest

# Interactive update
npx npm-check -u
```

---

## Auto-Fix Mode

**User**: `/audit-deps --fix`

**Claude**:

### Auto-Fix Report

**Attempting automatic fixes...**

✅ Fixed: 18 vulnerabilities
- 10 low severity
- 6 moderate severity
- 2 high severity

⚠️ Cannot auto-fix: 4 issues
- 1 critical (breaking change required)
- 3 moderate (peer dependency conflicts)

**Changes made:**
```
Package updates applied:
  axios: 0.21.1 → 1.6.0
  node-fetch: 2.6.1 → 2.7.0
  follow-redirects: 1.14.0 → 1.15.4
  ... 15 more
```

**Verification:**
```bash
npm test  # ✅ All tests passing
npm build # ✅ Build successful
```

---

## CI Integration

```yaml
# .github/workflows/audit.yml
name: Dependency Audit

on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9am
  pull_request:
    paths:
      - 'package*.json'

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm audit --audit-level=high
      - run: npx license-checker --failOn "GPL"
```

---

## Related Commands

- `/security-review` - Full security audit including code
- `/lint-fix` - Code quality checks
- `/test-and-build` - Verify after updates
