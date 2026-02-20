# OWASP Authentication Security Reference

Comprehensive authentication security guidance based on OWASP Cheat Sheets and industry best practices.

**Sources:**
- OWASP Authentication Cheat Sheet
- OWASP Password Storage Cheat Sheet
- OWASP Session Management Cheat Sheet
- OWASP Multifactor Authentication Cheat Sheet
- NIST Digital Identity Guidelines (SP 800-63B)

---

## Password Storage

### Recommended Algorithms (2026)

**First Choice: Argon2id**
```typescript
import argon2 from 'argon2';

// Hashing
const hash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 47104,    // 46 MiB
  timeCost: 1,          // 1 iteration
  parallelism: 1        // 1 thread
});

// Verification
const valid = await argon2.verify(hash, password);
```

**Why Argon2id?**
- Winner of Password Hashing Competition (2015)
- Resistant to GPU/ASIC attacks (memory-hard)
- Combines data-dependent (Argon2i) and data-independent (Argon2d) approaches
- OWASP first recommendation since 2023

**Second Choice: bcrypt**
```typescript
import bcrypt from 'bcrypt';

// Hashing (2026 recommendation: 13-14 rounds)
const hash = await bcrypt.hash(password, 13);

// Verification
const valid = await bcrypt.compare(password, hash);
```

**bcrypt Limitations:**
- 72-byte password limit (truncates after)
- Slower to compute than Argon2id at equivalent security
- Still acceptable for existing systems

**Configuration Guidelines:**
- **bcrypt cost factor**: 12 minimum, 13-14 recommended (2026)
- **Argon2id memory**: 46 MiB minimum, 64 MiB recommended
- **Test on target hardware**: Hash should take 0.5-1 second

### Deprecated/Forbidden Algorithms

**NEVER use:**
- Plain MD5, SHA-1, SHA-256 (too fast, no salt)
- Custom encryption schemes
- Reversible encryption for passwords

**Legacy migration:**
```typescript
// Double-hash legacy passwords on first login
async function upgradeLegacyPassword(userId: string, password: string, oldHash: string) {
  // Verify old hash
  if (sha256(password) !== oldHash) return false;

  // Upgrade to Argon2id
  const newHash = await argon2.hash(password);
  await db.query('UPDATE users SET password_hash = $1, hash_algorithm = $2 WHERE id = $3',
    [newHash, 'argon2id', userId]);

  return true;
}
```

---

## Password Policy

### OWASP/NIST Recommendations (2026)

**DO:**
- Minimum 8 characters (12+ recommended for high-security)
- Maximum 64 characters minimum (256+ recommended)
- Allow all printable ASCII + Unicode characters
- Allow spaces (encourage passphrases)
- Check against breach databases (Have I Been Pwned API)
- Implement account lockout (5 failed attempts)
- Rate limit authentication endpoints

**DON'T:**
- Require periodic password changes (unless breach detected)
- Enforce complex character requirements (decreases security)
- Limit allowed characters
- Truncate passwords silently
- Implement security questions (easily guessable)

### Breach Database Integration

```typescript
import crypto from 'crypto';
import https from 'https';

async function isPasswordPwned(password: string): Promise<boolean> {
  // Hash password with SHA-1 (API requirement)
  const hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  // Query Have I Been Pwned API (k-anonymity model)
  const response = await new Promise<string>((resolve, reject) => {
    https.get("https://api.pwnedpasswords.com/range/" + prefix, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });

  // Check if suffix exists in response
  return response.includes(suffix);
}

// Usage
if (await isPasswordPwned(password)) {
  throw new ValidationError('This password has been exposed in data breaches. Choose a different password.');
}
```

---

## Session Management

### Session ID Generation

**Requirements:**
- At least 128 bits of entropy (16 bytes)
- Cryptographically secure random number generator
- URL-safe encoding

```typescript
import crypto from 'crypto';

function generateSessionId(): string {
  return crypto.randomBytes(32).toString('base64url'); // 256 bits
}
```

### Session Lifecycle

**Creation:**
```typescript
async function createSession(userId: string): Promise<string> {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + 3600000); // 1 hour

  await db.query(
    'INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES ($1, $2, NOW(), $3)',
    [sessionId, userId, expiresAt]
  );

  return sessionId;
}
```

**Regeneration (after login/privilege escalation):**
```typescript
async function regenerateSession(oldSessionId: string): Promise<string> {
  // Get user from old session
  const session = await db.query('SELECT user_id FROM sessions WHERE id = $1', [oldSessionId]);

  // Delete old session
  await db.query('DELETE FROM sessions WHERE id = $1', [oldSessionId]);

  // Create new session
  return await createSession(session.user_id);
}
```

**Validation:**
```typescript
async function validateSession(sessionId: string): Promise<User | null> {
  const result = await db.query(
    'SELECT users.* FROM users JOIN sessions ON users.id = sessions.user_id WHERE sessions.id = $1 AND sessions.expires_at > NOW()',
    [sessionId]
  );

  return result.rows[0] || null;
}
```

### Cookie Security

**Secure Configuration:**
```typescript
res.cookie('__Host-sessionId', sessionId, {
  httpOnly: true,        // Prevents JavaScript access (XSS protection)
  secure: true,          // HTTPS only
  sameSite: 'strict',    // CSRF protection
  maxAge: 3600000,       // 1 hour in milliseconds
  path: '/',             // Explicit path
  // No 'domain' attribute (restricts to exact host)
});
```

**Cookie Prefix `__Host-`:**
- Browser enforces `secure: true`
- Browser enforces `path: '/'`
- Browser rejects if `domain` attribute present
- Prevents subdomain attacks

**Alternative: `__Secure-` prefix:**
- Enforces `secure: true` only
- Allows `domain` and custom `path`

---

## Account Lockout & Rate Limiting

### Account Lockout Policy

**OWASP Recommendations:**
- Lock after 5 consecutive failed attempts
- Lockout duration: 15-30 minutes (or require email unlock)
- Notify user via email when account is locked
- Log all lockout events for security monitoring

```typescript
interface LoginAttempt {
  userId: string;
  success: boolean;
  timestamp: Date;
  ipAddress: string;
}

async function checkAccountLockout(userId: string): Promise<boolean> {
  const attempts = await db.query(
    `SELECT COUNT(*) as count FROM login_attempts
     WHERE user_id = $1 AND success = false
     AND timestamp > NOW() - INTERVAL '15 minutes'`,
    [userId]
  );

  if (attempts.rows[0].count >= 5) {
    return true; // Account locked
  }

  return false;
}

async function recordLoginAttempt(attempt: LoginAttempt): Promise<void> {
  await db.query(
    'INSERT INTO login_attempts (user_id, success, timestamp, ip_address) VALUES ($1, $2, $3, $4)',
    [attempt.userId, attempt.success, attempt.timestamp, attempt.ipAddress]
  );

  // Clean up old attempts (retention policy)
  await db.query('DELETE FROM login_attempts WHERE timestamp < NOW() - INTERVAL '90 days'');
}
```

### Rate Limiting

**Endpoint-Specific Limits:**
```typescript
import rateLimit from 'express-rate-limit';

// Login endpoint: 5 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Password reset: 3 attempts per hour per IP
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Too many password reset requests. Please try again later.' }
});

app.post('/auth/login', loginLimiter, loginHandler);
app.post('/auth/reset-password', resetLimiter, resetHandler);
```

---

## Multi-Factor Authentication (MFA)

### MFA Effectiveness

**Microsoft Analysis (2019-2025):**
- Blocks 99.9% of automated attacks
- Reduces account compromise by 99.22%
- Most effective security control per dollar invested

### Authentication Factors

**Three Categories (must use factors from different categories):**
1. **Knowledge:** Password, PIN, security questions
2. **Possession:** Phone, hardware token, authenticator app
3. **Inherence:** Fingerprint, face recognition, voice

**Invalid MFA Examples:**
- Password + PIN (both knowledge factors)
- SMS + authenticator app (both possession of same device)

### TOTP Implementation (RFC 6238)

```typescript
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

// Generate secret for user
async function enrollMFA(userId: string): Promise<{ secret: string; qrCode: string }> {
  const secret = speakeasy.generateSecret({
    name: "MyApp (" + userId + ")",
    issuer: 'MyApp',
    length: 32
  });

  // Store secret in database (encrypted)
  await db.query('UPDATE users SET mfa_secret = $1 WHERE id = $2',
    [encrypt(secret.base32), userId]);

  // Generate QR code for user to scan
  const qrCode = await qrcode.toDataURL(secret.otpauth_url!);

  return { secret: secret.base32, qrCode };
}

// Verify TOTP code
async function verifyMFA(userId: string, token: string): Promise<boolean> {
  const user = await db.query('SELECT mfa_secret FROM users WHERE id = $1', [userId]);
  const secret = decrypt(user.rows[0].mfa_secret);

  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1 // Allow 1 time-step tolerance (±30 seconds)
  });
}
```

### WebAuthn/FIDO2 (Modern Standard)

**Advantages:**
- Phishing-resistant (public key cryptography)
- No shared secrets (private key never leaves device)
- Supports biometrics, hardware tokens
- OWASP preferred method (2024+)

**Basic Registration Flow:**
```typescript
import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server';

// 1. Generate registration challenge
async function startRegistration(userId: string) {
  const options = await generateRegistrationOptions({
    rpName: 'MyApp',
    rpID: 'example.com',
    userID: userId,
    userName: user.email,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  // Store challenge for verification
  await redis.set("webauthn:challenge:" + userId, options.challenge, 'EX', 300);

  return options;
}

// 2. Verify registration response
async function verifyRegistration(userId: string, response: any) {
  const expectedChallenge = await redis.get("webauthn:challenge:" + userId);

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: 'https://example.com',
    expectedRPID: 'example.com',
  });

  if (verification.verified) {
    // Store credential for future authentications
    await db.query(
      'INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter) VALUES ($1, $2, $3, $4)',
      [userId, verification.registrationInfo!.credentialID, verification.registrationInfo!.credentialPublicKey, 0]
    );
  }

  return verification.verified;
}
```

### Recovery Codes

**Always provide backup authentication:**
```typescript
function generateRecoveryCodes(count: number = 10): string[] {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );
}

async function storeRecoveryCodes(userId: string): Promise<string[]> {
  const codes = generateRecoveryCodes();

  // Hash codes before storing (single-use)
  const hashedCodes = await Promise.all(
    codes.map(code => bcrypt.hash(code, 10))
  );

  await db.query(
    'INSERT INTO recovery_codes (user_id, code_hash, used) VALUES ' +
    hashedCodes.map((_, i) => "($1, $" + (i + 2) + ", false)").join(', '),
    [userId, ...hashedCodes]
  );

  return codes; // Show once to user
}
```

---

## Common Authentication Vulnerabilities

### Credential Stuffing

**Attack:** Automated login attempts using leaked username/password pairs from other breaches.

**Mitigations:**
- Rate limiting on login endpoint
- CAPTCHA after failed attempts
- Device fingerprinting
- Breach database checking (Have I Been Pwned)
- Credential stuffing detection (unusual login patterns)

### Session Fixation

**Attack:** Attacker sets user's session ID before authentication, then hijacks session after login.

**Mitigation:**
```typescript
// Always regenerate session ID after successful login
async function login(username: string, password: string, oldSessionId?: string) {
  const user = await authenticateUser(username, password);

  if (oldSessionId) {
    await db.query('DELETE FROM sessions WHERE id = $1', [oldSessionId]);
  }

  const newSessionId = await createSession(user.id);
  return newSessionId; // Return new session ID
}
```

### Brute Force Attacks

**Attack:** Systematic password guessing.

**Mitigations:**
- Account lockout after 5 failed attempts
- Progressive delays (1s, 2s, 4s, 8s...)
- CAPTCHA requirement
- IP-based rate limiting
- Notification of unusual activity

### Timing Attacks

**Attack:** Deduce valid usernames by measuring response time differences.

**Mitigation:**
```typescript
async function login(username: string, password: string) {
  // Always hash password even if user doesn't exist
  const user = await db.query('SELECT * FROM users WHERE username = $1', [username]);

  const hash = user.rows[0]?.password_hash || '$2b$12$dummy.hash.to.prevent.timing.attack';
  const valid = await bcrypt.compare(password, hash);

  if (!user.rows[0] || !valid) {
    // Generic error message (prevents username enumeration)
    throw new Error('Invalid username or password');
  }

  return user.rows[0];
}
```

---

## Compliance Standards

### GDPR (EU)
- Right to access authentication logs
- Right to delete account (including all sessions)
- Breach notification within 72 hours
- Data minimization (don't store unnecessary auth data)

### PCI DSS (Payment Card Industry)
- MFA required for all access to cardholder data
- Session timeout after 15 minutes of inactivity
- Failed login attempts limited (6 max)
- Account lockout duration minimum 30 minutes

### HIPAA (Healthcare - US)
- Unique user identification required
- Automatic logoff after inactivity
- Encryption for data at rest and in transit
- Audit controls for all authentication events

---

## Security Checklist

**Before Production:**
- [ ] Passwords hashed with Argon2id (or bcrypt 13+)
- [ ] No password complexity requirements (allow all characters)
- [ ] Breach database checking enabled
- [ ] Account lockout after 5 failed attempts
- [ ] Rate limiting on all auth endpoints
- [ ] Session IDs regenerated after login
- [ ] Cookies use `__Host-` prefix with httpOnly, secure, sameSite
- [ ] MFA available (TOTP or WebAuthn)
- [ ] Recovery codes provided
- [ ] Generic error messages (no user enumeration)
- [ ] All authentication over HTTPS only
- [ ] Authentication events logged
- [ ] Timing attack mitigations implemented
