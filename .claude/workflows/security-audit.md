# Security Audit Workflow

Comprehensive security assessment of the codebase.

---

## Prerequisites

- [ ] Scope defined (full audit or specific area)
- [ ] Access to all relevant code
- [ ] Previous audit findings available (if any)
- [ ] Time allocated for remediation

---

## Workflow Steps

### Step 1: Automated Scanning
**Agent**: Main context
**Duration**: 15-30 minutes

**Actions**:
1. Run dependency audit
2. Run static analysis tools
3. Run secret detection
4. Run SAST tools

**Commands**:
```bash
# Dependency vulnerabilities
npm audit
npx snyk test

# Secret detection
npx gitleaks detect

# Static analysis
npx eslint . --ext .ts,.tsx -c .eslintrc.security.js

# SAST (if configured)
npx semgrep --config auto
```

**Output**: Automated scan results

---

### Step 2: Manual Code Review
**Agent**: `security-reviewer`
**Duration**: 1-2 hours

**Focus Areas**:

#### Authentication & Session Management
- [ ] Password hashing (bcrypt, argon2)
- [ ] Session token security
- [ ] JWT implementation
- [ ] OAuth/OIDC flows
- [ ] MFA implementation

#### Authorization
- [ ] Role-based access control
- [ ] Resource-level permissions
- [ ] API endpoint protection
- [ ] Admin functionality

#### Input Validation
- [ ] User input validation
- [ ] File upload validation
- [ ] API parameter validation
- [ ] SQL injection prevention
- [ ] XSS prevention

#### Data Protection
- [ ] Sensitive data encryption
- [ ] PII handling
- [ ] Data transmission security
- [ ] Logging (no sensitive data)

#### API Security
- [ ] Rate limiting
- [ ] CORS configuration
- [ ] API authentication
- [ ] Error message safety

---

### Step 3: Configuration Review
**Agent**: `security-reviewer`
**Duration**: 30-45 minutes

**Check**:

#### Environment & Secrets
- [ ] No hardcoded secrets
- [ ] .env files in .gitignore
- [ ] Secrets rotation policy
- [ ] Environment separation

#### Dependencies
- [ ] No vulnerable packages
- [ ] Dependencies up to date
- [ ] License compliance
- [ ] Supply chain security

#### Infrastructure
- [ ] HTTPS enforced
- [ ] Security headers set
- [ ] Cookie security flags
- [ ] CSP configured

---

### Step 4: Vulnerability Assessment
**Agent**: Main context
**Duration**: 30 minutes

**Categorize Findings**:

| Severity | Definition | SLA |
|----------|------------|-----|
| Critical | Active exploit possible | 24 hours |
| High | Significant risk | 1 week |
| Medium | Moderate risk | 1 month |
| Low | Minor risk | Next release |

**For Each Finding**:
1. Describe the vulnerability
2. Explain the impact
3. Provide proof of concept (if safe)
4. Recommend remediation
5. Assign severity

---

### Step 5: Generate Report
**Agent**: `security-reviewer`
**Duration**: 30 minutes

**Report Template**:
```markdown
# Security Audit Report

**Date**: YYYY-MM-DD
**Scope**: [Full codebase / Specific area]
**Auditor**: [Name/Agent]

## Executive Summary
Brief overview of findings and overall security posture.

## Findings Summary
| Severity | Count |
|----------|-------|
| Critical | X |
| High | X |
| Medium | X |
| Low | X |

## Detailed Findings

### [FINDING-001] SQL Injection in User Search
**Severity**: Critical
**Location**: `src/repositories/userRepository.ts:45`
**Description**: User input directly concatenated into SQL query.
**Impact**: Attacker can read/modify database.
**Remediation**: Use parameterized queries.
**Status**: Open

### [FINDING-002] ...

## Recommendations
1. Immediate actions
2. Short-term improvements
3. Long-term security roadmap

## Appendix
- Tools used
- Methodology
- Out of scope items
```

---

### Step 6: Remediation Planning
**Agent**: Main context
**Duration**: 30 minutes

**Actions**:
1. Review findings with team
2. Prioritize by severity and effort
3. Create issues/tickets
4. Assign owners
5. Set deadlines

**Issue Template**:
```markdown
## Security Finding: [FINDING-ID]

**Severity**: [Critical/High/Medium/Low]
**Location**: [File:line]

### Description
[What the vulnerability is]

### Impact
[What could happen if exploited]

### Remediation
[How to fix it]

### References
- [OWASP link]
- [CWE link]
```

---

### Step 7: Fix & Verify
**Agent**: Main context + `security-reviewer`
**Duration**: Variable

**Auto-Gate**: 🔄 **Security Audit Checklist Auto-Triggered**
> After fixes are implemented, automatically run through `.claude/checklists/security-audit.md` for verification

**For each finding**:
1. Implement fix
2. Write regression test
3. Verify fix works
4. Security review of fix
5. Mark finding resolved

**Verification Checklist**:
- [ ] Vulnerability no longer exploitable
- [ ] Regression test added
- [ ] No new vulnerabilities introduced
- [ ] Code review passed

---

### Step 8: Post-Audit
**Agent**: Main context
**Duration**: 15 minutes

**Actions**:
1. Update security documentation
2. Archive audit report
3. Schedule follow-up audit
4. Update security policies if needed

---

## OWASP Top 10 Checklist

### A01: Broken Access Control
- [ ] Authorization checks on all endpoints
- [ ] No direct object references
- [ ] CORS properly configured

### A02: Cryptographic Failures
- [ ] Strong encryption for sensitive data
- [ ] TLS for data in transit
- [ ] Secure password hashing

### A03: Injection
- [ ] Parameterized queries
- [ ] Input validation
- [ ] Output encoding

### A04: Insecure Design
- [ ] Threat modeling done
- [ ] Security requirements defined
- [ ] Secure development lifecycle

### A05: Security Misconfiguration
- [ ] Default credentials changed
- [ ] Unnecessary features disabled
- [ ] Security headers configured

### A06: Vulnerable Components
- [ ] Dependencies scanned
- [ ] Updates applied
- [ ] Monitoring for new vulnerabilities

### A07: Authentication Failures
- [ ] Strong password policy
- [ ] MFA available
- [ ] Brute force protection

### A08: Software/Data Integrity
- [ ] Signed updates
- [ ] Integrity checks
- [ ] Secure CI/CD

### A09: Logging & Monitoring
- [ ] Security events logged
- [ ] No sensitive data in logs
- [ ] Alerting configured

### A10: SSRF
- [ ] URL validation
- [ ] Allowlist for external requests
- [ ] Network segmentation

---

## Tips

1. **Regular audits**: Quarterly minimum
2. **Automate**: Use CI/CD security checks
3. **Train team**: Security awareness
4. **Stay updated**: Follow security news
5. **Document**: Keep audit history
