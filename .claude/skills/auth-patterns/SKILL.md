---
name: auth-patterns
description: Provides authoritative security patterns for implementing authentication and authorization systems based on OWASP, RFC standards, and industry best practices.
---

# Authentication Patterns

Authoritative security patterns for implementing authentication and authorization systems. Based on OWASP, RFC standards, and industry best practices.

**Sources:** OWASP Cheat Sheets, RFC 7519 (JWT), RFC 8725 (JWT BCP), RFC 6749 (OAuth 2.0), OpenID Connect Core 1.0

---

## JWT (JSON Web Tokens)

### Structure (RFC 7519)
`Header.Payload.Signature` - URL-safe, digitally signed claims transferred between parties.

### Critical Security (RFC 8725)
- **Always validate algorithm** - Never trust `alg: "none"`, enforce cryptographic validation
- **Validate critical claims** - `exp` (expiration), `aud` (audience), `iss` (issuer) are mandatory
- **Short-lived access tokens** - 10-15 minutes maximum
- **Never store sensitive data** - JWTs are encoded, not encrypted
- **HTTPS only** - Prevent token interception

### Implementation
```typescript
// Signing with RS256 (asymmetric preferred over HS256)
const payload = { userId: user.id, exp: Math.floor(Date.now() / 1000) + 900 }; // 15min
const token = jwt.sign(payload, privateKey, { algorithm: 'RS256', issuer: 'app', audience: 'users' });

// Verification
const decoded = jwt.verify(token, publicKey, { issuer: 'app', audience: 'users' });
```

**For comprehensive JWT guidance:** See `references/jwt-best-practices.md` for signing algorithms (RS256, ES256, HS256), token storage strategies, refresh patterns, revocation techniques, and vulnerability mitigations.

---

## Token Refresh with Rotation

### Best Practices (Auth0, 2026)
- **Single-use refresh tokens** - Each refresh generates new access + refresh token pair, invalidates old refresh token
- **Reuse detection** - If revoked token used, revoke ALL tokens for user (security breach indicator)
- **Token families** - Track token lineage via `jti` claim for granular revocation
- **Storage** - httpOnly cookies (web), secure storage (mobile), NEVER localStorage

### Lifetimes
- Access: 10-15 minutes
- Refresh: 30-90 days with sliding expiration

---

## OAuth 2.0 & OpenID Connect

### OAuth 2.0 (RFC 6749)
Authorization framework for third-party limited access. Four roles: resource owner, client, authorization server, resource server.

### OpenID Connect Core 1.0
Identity layer on OAuth 2.0. Adds ID Token (JWT) with user authentication info and UserInfo endpoint.

### Authorization Code Flow with PKCE (Recommended)
```
1. Generate code_verifier (43-128 chars), code_challenge = SHA256(verifier)
2. Redirect to /authorize with client_id, redirect_uri, code_challenge, state
3. User authorizes, receives authorization code
4. Exchange code + code_verifier for tokens at /token endpoint
5. Receive access_token, refresh_token, id_token (OIDC)
```

**PKCE critical** for public clients (SPAs, mobile) - prevents authorization code interception.

**For detailed OAuth implementation:** See `references/oauth-flows.md` for complete step-by-step PKCE flow, state parameter CSRF protection, redirect URI validation, scope management, client credentials flow, OpenID Connect ID token validation, and security best practices.

---

## Password Security

### Hashing (OWASP Password Storage)
```typescript
import bcrypt from 'bcrypt';
const hash = await bcrypt.hash(password, 12); // 12+ rounds (13-14 for 2026)
const valid = await bcrypt.compare(password, hash);
```

- **bcrypt cost factor** - Minimum 12 rounds, 13-14 recommended for 2026
- **72 byte limit** - bcrypt truncates at 72 bytes, enforce this limit
- **Argon2id preferred** - OWASP first choice (2023+), bcrypt for legacy systems
- **Never truncate silently** - Reject passwords >72 bytes or use Argon2id

### Password Policy (OWASP Authentication)
- **Minimum 8 characters** (12+ recommended)
- **No complexity requirements** - Allow all characters (unicode, spaces)
- **No periodic changes** - Encourage strong passwords + MFA instead (NIST guideline)
- **Check breach databases** - Reject passwords in haveibeenpwned.com

**For in-depth password security:** See `references/owasp-auth.md` for Argon2id vs bcrypt comparison, password policy guidelines, breach database integration, session management, account lockout strategies, MFA implementation (TOTP, WebAuthn), and common authentication vulnerabilities.

---

## Multi-Factor Authentication (MFA)

### OWASP MFA Requirements
- **Independent factors** - Password + PIN is NOT MFA (both knowledge factors)
- **MFA effectiveness** - Stops 99.9% of account compromises (Microsoft analysis)
- **Modern standards** - FIDO2 Passkeys, WebAuthn for biometric authentication
- **Risk-based** - Require MFA for high-risk actions (new device, suspicious location)

### Implementation
- TOTP (Time-based One-Time Password) - RFC 6238, 6-digit codes, 30s window
- WebAuthn - Public key cryptography, hardware tokens, biometrics
- SMS (fallback only) - Vulnerable to SIM swapping, not recommended as primary

**For complete MFA implementation:** See `references/owasp-auth.md` for TOTP enrollment and verification code examples, WebAuthn/FIDO2 registration and authentication flows, recovery code generation, and MFA factor categories.

---

## Session Management

### Secure Cookie Configuration (OWASP)
```typescript
res.cookie('__Host-session', token, {
  httpOnly: true,    // Prevents XSS access
  secure: true,      // HTTPS only
  sameSite: 'strict', // CSRF protection (use 'lax' if external links needed)
  maxAge: 3600000,   // 1 hour
  path: '/'
});
```

**Cookie prefix `__Host-`** enforces secure, path=/, no domain (prevents subdomain attacks).

### Session Storage
- Redis/Memcached for distributed systems
- Database for persistent sessions
- Regenerate session ID after login (prevent fixation)

**For detailed session security:** See `references/owasp-auth.md` for session ID generation with cryptographic randomness, session lifecycle management (creation, regeneration, validation), cookie security prefixes (`__Host-` vs `__Secure-`), and session fixation attack prevention.

---

## Authorization (RBAC)

### Role-Based Access Control
```typescript
interface Permission { resource: string; action: string; }
const roles = {
  admin: [{ resource: '*', action: '*' }],
  editor: [{ resource: 'posts', action: 'write' }],
  viewer: [{ resource: 'posts', action: 'read' }]
};

// Middleware
function requirePermission(resource: string, action: string) {
  return (req, res, next) => {
    const hasAccess = req.user.roles.some(r =>
      roles[r].some(p => (p.resource === '*' || p.resource === resource) &&
                         (p.action === '*' || p.action === action))
    );
    if (!hasAccess) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}
```

### Implementation Best Practices
- Start with clear role definitions tied to business functions
- Automate provisioning (HR system integration)
- Implement in phases, don't aim for 100% coverage initially
- Review and audit regularly

---

## Security Checklist

### Before Production
- [ ] No hardcoded secrets (use env vars)
- [ ] All passwords hashed with bcrypt 12+ or Argon2id
- [ ] JWT algorithm validation enforced
- [ ] Tokens transmitted over HTTPS only
- [ ] httpOnly, secure, sameSite=strict cookies
- [ ] Rate limiting on auth endpoints (5 attempts/15min)
- [ ] Account lockout after failed attempts
- [ ] MFA available for sensitive operations
- [ ] Session regeneration after privilege escalation
- [ ] Generic error messages (no credential enumeration)

---

## Resources

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [RFC 7519: JSON Web Token](https://datatracker.ietf.org/doc/html/rfc7519)
- [RFC 8725: JWT Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725.html)
- [RFC 6749: OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [Auth0: Refresh Token Rotation](https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation)
