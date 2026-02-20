---
description: Run a comprehensive security audit on your codebase
allowed-tools: Bash(npm audit:*), Bash(npx eslint:*), Read, Grep, Glob
---

# Security Review Command

Runs a comprehensive security audit on your codebase using the security-reviewer agent.

---

## Usage

```bash
/security-review
```

Or with specific scope:
```bash
/security-review <directory or file>
```

---

## What It Does

1. **Delegates to security-reviewer agent** with focused security context
2. **Scans for OWASP Top 10 vulnerabilities**:
   - SQL injection
   - XSS
   - Authentication issues
   - Authorization flaws
   - Security misconfigurations
   - And more...
3. **Detects hardcoded secrets** (API keys, passwords, tokens)
4. **Checks dependencies** for known vulnerabilities
5. **Generates prioritized report** with severity levels and remediation steps

---

## When to Use

- ✅ Before committing security-critical changes
- ✅ Before deploying to production
- ✅ After adding authentication/authorization
- ✅ When handling sensitive data
- ✅ Quarterly security audits
- ✅ After major refactoring
- ✅ When onboarding new team members (to learn secure patterns)

---

## Instructions

### 1. Determine Scope

```bash
# Full codebase audit (use sparingly - can be slow)
/security-review

# Specific module
/security-review src/auth/

# Single file
/security-review src/api/users.ts
```

### 2. Delegate to Security Agent

You should delegate this task to the `security-reviewer` agent with clear scope:

```
"Delegate to the security-reviewer agent to audit [scope].

Focus on:
- Authentication and authorization
- Input validation
- SQL/NoSQL injection
- XSS vulnerabilities
- Hardcoded secrets
- Dependency vulnerabilities

Generate a prioritized report with:
- Critical issues (fix immediately)
- High severity issues (fix within 1 week)
- Medium severity issues (fix within 1 month)
- Low severity issues (address in next sprint)

For each issue, provide:
- File and line number
- Description of vulnerability
- Vulnerable code snippet
- Secure code example
- Remediation steps
- CVSS score
"
```

### 3. Review Agent Report

The security-reviewer will return a detailed report. Review it carefully:

- **Critical issues**: Fix immediately (within 24 hours)
- **High severity**: Fix within 1 week
- **Medium severity**: Plan for next sprint
- **Low severity**: Add to backlog

### 4. Implement Fixes

For each issue:
1. Read the vulnerable code
2. Review the secure code example
3. Implement the fix
4. Test the fix
5. Re-run security review to verify

### 5. Document and Track

```bash
# Create issues for findings
gh issue create --title "Security: SQL Injection in login endpoint" --label security --body "[details]"

# Track in project board
# Update security changelog
```

---

## Example Session

```
User: /security-review src/auth/

Claude: I'll delegate to the security-reviewer agent to audit the authentication module.

[Agent runs security analysis...]

Agent Report:
==============
# Security Audit Report - Authentication Module

## Critical Issues (2)

### 1. SQL Injection in Login Handler
**File**: src/auth/login.ts:45
**Severity**: Critical (CVSS 9.8)
**Code**:
```typescript
db.query(`SELECT * FROM users WHERE email = '${email}'`)
```
**Fix**:
```typescript
db.query('SELECT * FROM users WHERE email = $1', [email])
```

### 2. Hardcoded JWT Secret
**File**: src/auth/jwt.ts:12
**Severity**: Critical (CVSS 9.1)
**Code**:
```typescript
const JWT_SECRET = "my-secret-key-12345";
```
**Fix**:
```typescript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET not configured');
```

## High Severity Issues (1)

### 3. No Rate Limiting on Login
**File**: src/routes/auth.ts:23
**Severity**: High (CVSS 7.5)
[details...]

## Recommendations
1. Fix SQL injection immediately
2. Rotate JWT secret and use environment variable
3. Add rate limiting (5 attempts per 15 minutes)
4. Consider adding 2FA for admin accounts

==============

Claude: I've identified 3 critical/high security issues in your authentication module. Would you like me to implement the fixes?
```

---

## Output Format

The security-reviewer agent will provide:

```markdown
# Security Audit Report

## Executive Summary
- X Critical issues
- Y High severity issues
- Z Medium severity issues
- W Low severity issues

## Critical Issues
[Detailed findings with code examples]

## High Severity Issues
[Detailed findings with code examples]

## Medium Severity Issues
[Detailed findings with code examples]

## Low Severity Issues
[Detailed findings with code examples]

## Recommendations
[Prioritized action items]

## Positive Findings
[What you're doing well]
```

---

## Integration with Workflow

### Pre-Commit Hook
```bash
# Add to .git/hooks/pre-commit
if [[ $(git diff --cached --name-only | grep -E 'auth|api|db') ]]; then
  echo "Security-critical files changed. Run /security-review before committing."
fi
```

### CI/CD Integration
```yaml
# .github/workflows/security.yml
name: Security Audit
on: [pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm audit
      - run: npx eslint . --ext .ts --rule 'no-eval: error'
```

### Regular Audits
- **Weekly**: Quick scan of changed files
- **Monthly**: Full codebase audit
- **Quarterly**: Third-party penetration test

---

## Common Findings

### SQL Injection
```typescript
// ❌ Vulnerable
db.query(`SELECT * FROM users WHERE id = ${userId}`)

// ✅ Secure
db.query('SELECT * FROM users WHERE id = $1', [userId])
```

### XSS
```typescript
// ❌ Vulnerable
<div dangerouslySetInnerHTML={{__html: userInput}} />

// ✅ Secure
<div>{escapeHtml(userInput)}</div>
```

### Hardcoded Secrets
```typescript
// ❌ Vulnerable
const API_KEY = "sk-1234567890";

// ✅ Secure
const API_KEY = process.env.API_KEY;
```

### Missing Rate Limiting
```typescript
// ❌ Vulnerable
app.post('/api/login', loginHandler);

// ✅ Secure
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
app.post('/api/login', limiter, loginHandler);
```

---

## Tips

### 1. Scope Appropriately
- Don't audit entire codebase daily
- Focus on security-critical modules
- Audit changed files before commits

### 2. Prioritize Fixes
- Critical: Drop everything, fix now
- High: This week
- Medium: Next sprint
- Low: Backlog

### 3. Learn from Findings
- Update CLAUDE.md with secure patterns
- Add examples to avoid
- Train team on common vulnerabilities

### 4. Automate
- Add npm audit to CI
- Use pre-commit hooks
- Set up Dependabot
- Configure ESLint security rules

### 5. Don't Ignore Low Severity
- They accumulate
- Can combine into higher severity
- Technical debt grows

---

## Tools Used

The security-reviewer agent uses:

1. **Pattern matching** for common vulnerabilities
2. **npm audit** for dependency vulnerabilities
3. **Static analysis** principles from:
   - OWASP guidelines
   - CWE Top 25
   - Security best practices
4. **Context-aware analysis** of data flow

---

## Limitations

### What It Can Find:
- ✅ Common vulnerability patterns
- ✅ Hardcoded secrets
- ✅ Known dependency vulnerabilities
- ✅ Missing security controls

### What It Cannot Find:
- ❌ Business logic vulnerabilities
- ❌ Zero-day exploits
- ❌ Complex race conditions
- ❌ Infrastructure misconfigurations
- ❌ Social engineering vectors

**Recommendation**: Complement with:
- Manual code review
- Penetration testing
- Security training
- Third-party audits

---

## After the Audit

1. **Triage findings** by severity
2. **Create tracking issues** for each finding
3. **Assign owners** for critical/high issues
4. **Set deadlines** (critical: 24h, high: 1 week)
5. **Implement fixes** with tests
6. **Re-run audit** to verify fixes
7. **Document patterns** in CLAUDE.md to prevent recurrence

---

## Related Commands

- `/review-changes` - General code review (includes some security checks)
- `/commit-push-pr` - Will warn if security issues detected

---

## Resources

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- CWE Top 25: https://cwe.mitre.org/top25/
- Security Rules: See `.claude/rules/security.md`
- Security Agent: See `.claude/agents/security-reviewer.md`
