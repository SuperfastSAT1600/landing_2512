# Security Audit Checklist

Comprehensive security review checklist.

---

## Authentication

### Password Security
- [ ] Passwords hashed with bcrypt/argon2 (10+ rounds)
- [ ] Password strength requirements enforced
- [ ] No passwords stored in plain text
- [ ] Password reset tokens expire
- [ ] Old passwords cannot be reused

### Session Management
- [ ] Session tokens are random and unpredictable
- [ ] Sessions expire after inactivity
- [ ] Session invalidated on logout
- [ ] Session regenerated after privilege change
- [ ] Concurrent session handling defined

### JWT (if used)
- [ ] Short expiration time (15min recommended)
- [ ] Refresh token rotation implemented
- [ ] Tokens stored securely (httpOnly cookies)
- [ ] Algorithm specified (not 'none')
- [ ] Secret key is strong and rotated

### Multi-Factor Authentication
- [ ] MFA available for sensitive operations
- [ ] Backup codes provided
- [ ] MFA required for admin accounts

---

## Authorization

### Access Control
- [ ] All endpoints require authentication (unless public)
- [ ] Role-based access control implemented
- [ ] Permissions checked server-side
- [ ] No horizontal privilege escalation possible
- [ ] No vertical privilege escalation possible

### Resource Access
- [ ] Users can only access their own data
- [ ] Admin functions properly protected
- [ ] API keys have appropriate scopes
- [ ] Rate limiting on sensitive endpoints

---

## Input Validation

### General
- [ ] All user input validated server-side
- [ ] Input length limits enforced
- [ ] Special characters handled safely
- [ ] File upload types restricted
- [ ] File upload size limited

### SQL Injection
- [ ] Parameterized queries used
- [ ] No string concatenation in queries
- [ ] ORM queries reviewed for safety
- [ ] Raw queries minimized and reviewed

### XSS Prevention
- [ ] Output encoding applied
- [ ] Content Security Policy set
- [ ] No innerHTML with user data
- [ ] React/framework escaping used

### Other Injection
- [ ] Command injection prevented
- [ ] LDAP injection prevented
- [ ] Path traversal prevented
- [ ] Template injection prevented

---

## Data Protection

### Sensitive Data
- [ ] PII encrypted at rest
- [ ] PII encrypted in transit (TLS)
- [ ] Sensitive data masked in logs
- [ ] Credit card data handled per PCI DSS
- [ ] Data retention policy followed

### Secrets Management
- [ ] No secrets in source code
- [ ] No secrets in git history
- [ ] Environment variables used
- [ ] Secrets rotated regularly
- [ ] Access to secrets audited

---

## API Security

### Transport
- [ ] HTTPS enforced (HSTS)
- [ ] TLS 1.2+ required
- [ ] Valid certificates used
- [ ] Certificate pinning (if mobile)

### Headers
- [ ] Content-Security-Policy set
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options set
- [ ] Referrer-Policy set
- [ ] Permissions-Policy set

### CORS
- [ ] Allowed origins explicitly listed
- [ ] Credentials only with specific origins
- [ ] No wildcard (*) with credentials

### Rate Limiting
- [ ] Rate limiting on all public endpoints
- [ ] Stricter limits on auth endpoints
- [ ] Rate limit headers returned
- [ ] DDoS protection in place

---

## Dependencies

### Packages
- [ ] No known vulnerabilities (npm audit)
- [ ] Dependencies up to date
- [ ] Unused dependencies removed
- [ ] License compliance verified

### Third-Party Services
- [ ] API keys scoped minimally
- [ ] Webhooks verified
- [ ] Callbacks validated
- [ ] Failure modes handled

---

## Logging & Monitoring

### Logging
- [ ] Security events logged
- [ ] Authentication failures logged
- [ ] No sensitive data in logs
- [ ] Logs tamper-resistant
- [ ] Log retention defined

### Monitoring
- [ ] Anomaly detection enabled
- [ ] Alerts for suspicious activity
- [ ] Failed login threshold alerts
- [ ] Error rate monitoring

---

## Infrastructure

### Configuration
- [ ] Debug mode disabled in production
- [ ] Default credentials changed
- [ ] Unnecessary services disabled
- [ ] Error messages don't leak info

### Network
- [ ] Firewall rules appropriate
- [ ] Network segmentation in place
- [ ] Admin interfaces not public
- [ ] Database not publicly accessible

---

## Compliance

- [ ] GDPR requirements met (if applicable)
- [ ] CCPA requirements met (if applicable)
- [ ] SOC 2 requirements met (if applicable)
- [ ] HIPAA requirements met (if applicable)

---

## Sign-Off

**Auditor**: _______________
**Date**: _______________
**Result**: [ ] Pass [ ] Fail
**Next Audit**: _______________
