# JWT Best Practices Reference

Comprehensive JWT security guidance based on RFC 7519, RFC 8725, and industry best practices.

**Sources:**
- RFC 7519: JSON Web Token (JWT)
- RFC 8725: JSON Web Token Best Current Practices
- RFC 7515: JSON Web Signature (JWS)
- RFC 7516: JSON Web Encryption (JWE)
- OWASP JWT Cheat Sheet

---

## JWT Structure (RFC 7519)

### Three Parts (Base64URL-encoded)

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
         HEADER                              PAYLOAD                                                           SIGNATURE
```

**Header:**
```json
{
  "alg": "RS256",  // Algorithm
  "typ": "JWT"     // Type
}
```

**Payload (Claims):**
```json
{
  "sub": "1234567890",           // Subject (user ID)
  "name": "John Doe",            // Custom claim
  "iat": 1516239022,             // Issued at (Unix timestamp)
  "exp": 1516242622,             // Expiration (Unix timestamp)
  "iss": "https://example.com",  // Issuer
  "aud": "https://api.example.com" // Audience
}
```

**Signature:**
```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret
)
```

---

## Critical Security Requirements (RFC 8725)

### 1. Algorithm Verification

**ALWAYS validate the algorithm. Never trust the `alg` header blindly.**

```typescript
import jwt from 'jsonwebtoken';

// BAD: Accepts any algorithm from token header
const decoded = jwt.verify(token, secret); // VULNERABLE

// GOOD: Explicitly specify allowed algorithms
const decoded = jwt.verify(token, secret, {
  algorithms: ['RS256']  // Only accept RS256
});
```

**Why?** The "none" algorithm vulnerability:
```json
// Attacker modifies header
{
  "alg": "none",
  "typ": "JWT"
}
// Signature verification skipped, attacker gains access
```

**Recommended Algorithms (2026):**
- **RS256** (RSA + SHA-256): Asymmetric, recommended for most use cases
- **ES256** (ECDSA + SHA-256): Asymmetric, smaller signatures than RSA
- **HS256** (HMAC + SHA-256): Symmetric, only if secret is properly secured

**FORBIDDEN:**
- `none`: No signature
- `HS256` with public key verification (algorithm confusion attack)

### 2. Validate Critical Claims

**Mandatory validations:**
```typescript
const decoded = jwt.verify(token, publicKey, {
  algorithms: ['RS256'],
  issuer: 'https://example.com',           // iss claim
  audience: 'https://api.example.com',     // aud claim
  clockTolerance: 60,                      // Allow 60s clock skew for exp/nbf
  maxAge: '15m'                            // Maximum token age
});
```

**Standard Claims (RFC 7519):**
- `iss` (Issuer): Who created the token
- `sub` (Subject): Who the token is about (usually user ID)
- `aud` (Audience): Who the token is intended for
- `exp` (Expiration): When the token expires (Unix timestamp)
- `nbf` (Not Before): Token not valid before this time
- `iat` (Issued At): When token was created
- `jti` (JWT ID): Unique identifier for token

### 3. Short-Lived Access Tokens

**Recommended Lifetimes:**
- **Access tokens:** 10-15 minutes maximum
- **Refresh tokens:** 30-90 days with rotation
- **ID tokens:** Same as access tokens

```typescript
const accessToken = jwt.sign(
  { userId: user.id },
  privateKey,
  {
    algorithm: 'RS256',
    expiresIn: '15m',           // 15 minutes
    issuer: 'https://example.com',
    audience: 'https://api.example.com',
    subject: user.id
  }
);
```

### 4. Never Store Sensitive Data

**JWTs are encoded, NOT encrypted. Anyone can decode and read the payload.**

```typescript
// BAD: Sensitive data in payload
const token = jwt.sign({
  userId: user.id,
  email: user.email,
  password: user.password,     // NEVER
  ssn: user.ssn,               // NEVER
  creditCard: user.card        // NEVER
}, secret);

// GOOD: Only necessary, non-sensitive data
const token = jwt.sign({
  userId: user.id,
  role: user.role
}, secret);
```

**Use JWE (JSON Web Encryption) if you must include sensitive data:**
```typescript
import jose from 'jose';

const jwt = await new jose.EncryptJWT({ userId: user.id, email: user.email })
  .setProtectedHeader({ alg: 'RSA-OAEP-256', enc: 'A256GCM' })
  .setIssuedAt()
  .setExpirationTime('15m')
  .encrypt(publicKey);
```

### 5. HTTPS Only

**Never transmit JWTs over unencrypted connections.**

```typescript
// Server configuration
app.use((req, res, next) => {
  if (!req.secure && process.env.NODE_ENV === 'production') {
    return res.redirect(301, "https://" + req.headers.host + req.url);
  }
  next();
});
```

---

## Signing Algorithms

### RS256 (RSA + SHA-256) - Recommended

**Use Cases:**
- API authentication (public clients, SPAs)
- Microservices (services validate without shared secret)
- Token verification by multiple services

**Implementation:**
```typescript
import jwt from 'jsonwebtoken';
import fs from 'fs';

// Generate key pair (one-time setup)
// openssl genrsa -out private.key 2048
// openssl rsa -in private.key -pubout -out public.key

const privateKey = fs.readFileSync('./private.key');
const publicKey = fs.readFileSync('./public.key');

// Sign
const token = jwt.sign(
  { userId: user.id },
  privateKey,
  { algorithm: 'RS256', expiresIn: '15m' }
);

// Verify
const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
```

**Advantages:**
- Public key can be shared safely
- Private key only on auth server
- Any service can verify tokens

**Disadvantages:**
- Slower than HMAC (not significant for most apps)
- Larger token size

### ES256 (ECDSA + SHA-256)

**Advantages over RS256:**
- Smaller signatures (64 bytes vs 256 bytes for RS256)
- Faster signature generation
- Same security level with smaller keys (256-bit ECDSA ≈ 3072-bit RSA)

**Implementation:**
```typescript
// Generate key pair
// openssl ecparam -name prime256v1 -genkey -noout -out private-ec.key
// openssl ec -in private-ec.key -pubout -out public-ec.key

const privateKey = fs.readFileSync('./private-ec.key');
const publicKey = fs.readFileSync('./public-ec.key');

const token = jwt.sign(
  { userId: user.id },
  privateKey,
  { algorithm: 'ES256', expiresIn: '15m' }
);
```

### HS256 (HMAC + SHA-256)

**Use Cases:**
- Server-to-server communication with shared secret
- Monolithic applications

**Implementation:**
```typescript
const secret = process.env.JWT_SECRET; // Minimum 256 bits (32 bytes)

const token = jwt.sign(
  { userId: user.id },
  secret,
  { algorithm: 'HS256', expiresIn: '15m' }
);

const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
```

**Advantages:**
- Faster than RSA/ECDSA
- Simpler key management (single secret)

**Disadvantages:**
- Secret must be shared with all verifiers
- Secret compromise = full system compromise

**Requirements:**
- Secret must be at least 256 bits (32 bytes) for HS256
- Use cryptographically secure random generation
- Rotate secrets periodically

```typescript
// Generate strong secret
import crypto from 'crypto';
const secret = crypto.randomBytes(32).toString('hex');
```

---

## Token Storage

### Web Browsers

**Option 1: httpOnly Cookies (Recommended)**
```typescript
res.cookie('__Host-accessToken', token, {
  httpOnly: true,        // Not accessible via JavaScript (XSS protection)
  secure: true,          // HTTPS only
  sameSite: 'strict',    // CSRF protection
  maxAge: 900000,        // 15 minutes
  path: '/'
});
```

**Advantages:**
- Protected from XSS attacks
- Automatically sent with requests
- Browser-managed lifecycle

**Disadvantages:**
- Requires CSRF protection (SameSite handles most cases)
- Cannot be accessed by JavaScript (intentional security feature)

**Option 2: Memory (JavaScript variable)**
```typescript
// Store token in React state/context
const [token, setToken] = useState<string | null>(null);

// Fetch and store on login
const login = async (username: string, password: string) => {
  const response = await fetch('/auth/login', { /* ... */ });
  const { token } = await response.json();
  setToken(token);
};
```

**Advantages:**
- Cleared on tab close
- No persistence across page reloads

**Disadvantages:**
- Lost on page refresh (user must re-authenticate)
- Doesn't survive browser crashes

**Option 3: sessionStorage (Acceptable for SPAs)**
```typescript
// Store token
sessionStorage.setItem('token', token);

// Retrieve token
const token = sessionStorage.getItem('token');

// Clear on logout
sessionStorage.removeItem('token');
```

**Advantages:**
- Persists across page reloads
- Cleared when tab closes
- Per-tab isolation

**Disadvantages:**
- Vulnerable to XSS (JavaScript can access)

**NEVER use localStorage:**
- Persists across sessions (security risk)
- Accessible by all scripts (XSS vulnerability)
- No expiration mechanism

### Mobile Apps

**Option 1: Secure Storage (iOS Keychain, Android Keystore)**
```typescript
import * as SecureStore from 'expo-secure-store';

// Store token
await SecureStore.setItemAsync('accessToken', token);

// Retrieve token
const token = await SecureStore.getItemAsync('accessToken');

// Delete token
await SecureStore.deleteItemAsync('accessToken');
```

**Option 2: Encrypted Shared Preferences (Android) / Keychain (iOS)**
```typescript
import EncryptedStorage from 'react-native-encrypted-storage';

await EncryptedStorage.setItem('accessToken', token);
const token = await EncryptedStorage.getItem('accessToken');
```

---

## Token Refresh Pattern

### Single Refresh Token (Basic)

```typescript
// Login: Issue access + refresh token
async function login(username: string, password: string) {
  const user = await authenticateUser(username, password);

  const accessToken = jwt.sign(
    { userId: user.id, type: 'access' },
    privateKey,
    { algorithm: 'RS256', expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh', jti: generateJti() },
    privateKey,
    { algorithm: 'RS256', expiresIn: '90d' }
  );

  // Store refresh token in database
  await db.query(
    'INSERT INTO refresh_tokens (jti, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'90 days\')',
    [refreshToken.jti, user.id]
  );

  return { accessToken, refreshToken };
}

// Refresh: Issue new access token
async function refresh(refreshToken: string) {
  // Verify refresh token
  const decoded = jwt.verify(refreshToken, publicKey, { algorithms: ['RS256'] });

  // Check if refresh token is revoked
  const tokenExists = await db.query(
    'SELECT 1 FROM refresh_tokens WHERE jti = $1 AND revoked = false',
    [decoded.jti]
  );

  if (!tokenExists.rows[0]) {
    throw new Error('Refresh token revoked or invalid');
  }

  // Issue new access token
  const accessToken = jwt.sign(
    { userId: decoded.userId, type: 'access' },
    privateKey,
    { algorithm: 'RS256', expiresIn: '15m' }
  );

  return { accessToken };
}
```

### Refresh Token Rotation (Recommended)

**Why rotate?** Limits damage from stolen refresh tokens.

```typescript
async function refreshWithRotation(refreshToken: string) {
  const decoded = jwt.verify(refreshToken, publicKey, { algorithms: ['RS256'] });

  // Check token validity and reuse
  const storedToken = await db.query(
    'SELECT * FROM refresh_tokens WHERE jti = $1',
    [decoded.jti]
  );

  if (!storedToken.rows[0]) {
    throw new Error('Refresh token not found');
  }

  if (storedToken.rows[0].used) {
    // Reuse detected: Revoke all tokens for user (security breach)
    await db.query('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1', [decoded.userId]);
    throw new Error('Token reuse detected. All sessions revoked.');
  }

  // Mark old token as used
  await db.query('UPDATE refresh_tokens SET used = true WHERE jti = $1', [decoded.jti]);

  // Issue new access + refresh token pair
  const newAccessToken = jwt.sign(
    { userId: decoded.userId, type: 'access' },
    privateKey,
    { algorithm: 'RS256', expiresIn: '15m' }
  );

  const newRefreshJti = generateJti();
  const newRefreshToken = jwt.sign(
    { userId: decoded.userId, type: 'refresh', jti: newRefreshJti, parentJti: decoded.jti },
    privateKey,
    { algorithm: 'RS256', expiresIn: '90d' }
  );

  // Store new refresh token
  await db.query(
    'INSERT INTO refresh_tokens (jti, user_id, parent_jti, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL \'90 days\')',
    [newRefreshJti, decoded.userId, decoded.jti]
  );

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}
```

---

## Token Revocation

### Challenge
JWTs are stateless by design - once issued, they're valid until expiration. Revocation requires state.

### Strategies

**1. Token Blacklist (Simple)**
```typescript
// Revoke token
async function revokeToken(jti: string) {
  await redis.set("blacklist:" + jti, '1', 'EX', 900); // Expire after token lifetime
}

// Check if token is revoked
async function isTokenRevoked(jti: string): Promise<boolean> {
  const revoked = await redis.get("blacklist:" + jti);
  return revoked !== null;
}

// Middleware
async function validateToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });

  if (await isTokenRevoked(decoded.jti)) {
    return res.status(401).json({ error: 'Token revoked' });
  }

  req.user = decoded;
  next();
}
```

**2. Short-Lived Tokens + Refresh Rotation (Recommended)**
- Access tokens expire in 15 minutes (natural revocation)
- Refresh tokens stored in database (can be revoked)
- Revoke all refresh tokens for user to force logout

**3. Token Versioning**
```typescript
// Add version claim to token
const token = jwt.sign(
  { userId: user.id, version: user.tokenVersion },
  privateKey,
  { algorithm: 'RS256', expiresIn: '15m' }
);

// Increment version on password change, logout all sessions
async function revokeAllTokens(userId: string) {
  await db.query('UPDATE users SET token_version = token_version + 1 WHERE id = $1', [userId]);
}

// Validate token version
async function validateToken(req, res, next) {
  const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });

  const user = await db.query('SELECT token_version FROM users WHERE id = $1', [decoded.userId]);

  if (decoded.version !== user.rows[0].token_version) {
    return res.status(401).json({ error: 'Token revoked' });
  }

  req.user = decoded;
  next();
}
```

---

## Common JWT Vulnerabilities

### 1. Algorithm Confusion (CVE-2015-9235)

**Attack:** Change `RS256` to `HS256`, use public key as HMAC secret.

```typescript
// Vulnerable code
const decoded = jwt.verify(token, publicKeyOrSecret); // Accepts any algorithm

// Attacker modifies header to HS256, signs with public key (known)
// Server verifies using public key as HMAC secret -> signature valid
```

**Mitigation:**
```typescript
const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] }); // Only RS256
```

### 2. None Algorithm

**Attack:** Set `alg: "none"`, remove signature.

**Mitigation:**
```typescript
// Always specify algorithms, never accept 'none'
const decoded = jwt.verify(token, secret, { algorithms: ['RS256', 'HS256'] });
```

### 3. Weak Secrets (HS256)

**Attack:** Brute-force weak HMAC secrets.

**Mitigation:**
```typescript
// Use strong secrets (256+ bits)
const secret = crypto.randomBytes(32).toString('hex');
```

### 4. Missing Expiration

**Attack:** Token valid forever.

**Mitigation:**
```typescript
// Always set expiration
const token = jwt.sign(payload, secret, { expiresIn: '15m' });
```

### 5. Missing Audience/Issuer Validation

**Attack:** Token issued for Service A used on Service B.

**Mitigation:**
```typescript
const decoded = jwt.verify(token, publicKey, {
  algorithms: ['RS256'],
  issuer: 'https://auth.example.com',
  audience: 'https://api.example.com'
});
```

---

## Security Checklist

**Before Production:**
- [ ] Algorithm explicitly validated (`algorithms` parameter)
- [ ] Never accept `alg: "none"`
- [ ] HS256 secrets minimum 256 bits
- [ ] RS256/ES256 keys minimum 2048/256 bits
- [ ] Expiration claim (`exp`) always set
- [ ] Maximum access token lifetime 15 minutes
- [ ] Issuer (`iss`) and audience (`aud`) validated
- [ ] No sensitive data in payload
- [ ] Tokens transmitted over HTTPS only
- [ ] Refresh token rotation implemented
- [ ] Revocation strategy in place
- [ ] JTI claim for tracking/revocation
- [ ] Clock skew tolerance configured (60s max)
- [ ] Token storage secure (httpOnly cookies or secure storage)
