# OAuth 2.0 & OpenID Connect Reference

Comprehensive guide to OAuth 2.0 authorization flows and OpenID Connect authentication based on RFC 6749, RFC 7636 (PKCE), and OpenID Connect Core 1.0.

**Sources:**
- RFC 6749: OAuth 2.0 Authorization Framework
- RFC 7636: Proof Key for Code Exchange (PKCE)
- RFC 8252: OAuth 2.0 for Native Apps
- OpenID Connect Core 1.0
- OAuth 2.0 Security Best Current Practice (BCP)

---

## OAuth 2.0 Fundamentals

### Four Roles

1. **Resource Owner**: User who owns the data (end-user)
2. **Client**: Application requesting access (web app, mobile app, SPA)
3. **Authorization Server**: Issues access tokens after authentication (e.g., Auth0, Keycloak)
4. **Resource Server**: Hosts protected resources (API server)

### Grant Types (Authorization Flows)

| Grant Type | Use Case | Security |
|------------|----------|----------|
| Authorization Code + PKCE | Web apps, SPAs, mobile apps | **Recommended (2026)** |
| Client Credentials | Server-to-server | High |
| Refresh Token | Renewing access tokens | High |
| ~~Implicit~~ | ~~SPAs~~ | **DEPRECATED** |
| ~~Resource Owner Password~~ | ~~Legacy apps~~ | **DEPRECATED** |

---

## Authorization Code Flow with PKCE (Recommended)

### What is PKCE?

**Proof Key for Code Exchange** (RFC 7636) - Prevents authorization code interception attacks.

**Originally designed for:** Mobile/native apps (can't keep secrets)
**Now required for:** ALL public clients (SPAs, mobile apps)
**Recommended for:** Even confidential clients (defense in depth)

### How PKCE Works

1. Client generates random `code_verifier` (43-128 characters)
2. Client creates `code_challenge = SHA256(code_verifier)`
3. Client sends `code_challenge` to authorization server
4. Server issues authorization code
5. Client sends authorization code + original `code_verifier`
6. Server verifies `SHA256(code_verifier) === code_challenge`
7. Server issues access token

**Why secure?** Even if authorization code is intercepted, attacker can't exchange it without the original `code_verifier` (never transmitted until code exchange).

### Step-by-Step Implementation

#### Step 1: Generate PKCE Parameters

```typescript
import crypto from 'crypto';

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url'); // 43 characters
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// Client stores these
const codeVerifier = generateCodeVerifier();
const codeChallenge = generateCodeChallenge(codeVerifier);
```

#### Step 2: Redirect to Authorization Endpoint

```typescript
// Client initiates authorization
const authUrl = new URL('https://auth.example.com/authorize');
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('client_id', 'YOUR_CLIENT_ID');
authUrl.searchParams.set('redirect_uri', 'https://yourapp.com/callback');
authUrl.searchParams.set('scope', 'openid profile email');
authUrl.searchParams.set('state', generateState()); // CSRF protection
authUrl.searchParams.set('code_challenge', codeChallenge);
authUrl.searchParams.set('code_challenge_method', 'S256'); // SHA-256

// Store state and code_verifier in session (server) or sessionStorage (SPA)
sessionStorage.setItem('pkce_verifier', codeVerifier);
sessionStorage.setItem('oauth_state', state);

// Redirect user to authorization server
window.location.href = authUrl.toString();
```

**Parameters:**
- `response_type=code`: Request authorization code
- `client_id`: Your application's identifier
- `redirect_uri`: Where to send user after authorization (must be pre-registered)
- `scope`: Permissions requested (space-separated)
- `state`: Random string for CSRF protection
- `code_challenge`: SHA-256 hash of code_verifier
- `code_challenge_method`: Hashing method (S256 or plain)

#### Step 3: Handle Callback (Authorization Code)

```typescript
// User redirected back to https://yourapp.com/callback?code=AUTH_CODE&state=STATE

// Validate state parameter
const receivedState = new URL(window.location.href).searchParams.get('state');
const storedState = sessionStorage.getItem('oauth_state');

if (receivedState !== storedState) {
  throw new Error('State mismatch - possible CSRF attack');
}

const authorizationCode = new URL(window.location.href).searchParams.get('code');
```

#### Step 4: Exchange Code for Tokens

```typescript
async function exchangeCodeForTokens(code: string, codeVerifier: string) {
  const response = await fetch('https://auth.example.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'https://yourapp.com/callback',
      client_id: 'YOUR_CLIENT_ID',
      code_verifier: codeVerifier // Proves client is same as initial request
    })
  });

  if (!response.ok) {
    throw new Error('Token exchange failed');
  }

  const tokens = await response.json();
  return tokens; // { access_token, refresh_token, id_token (OIDC), expires_in }
}

// Usage
const codeVerifier = sessionStorage.getItem('pkce_verifier');
const tokens = await exchangeCodeForTokens(authorizationCode, codeVerifier);

// Clean up
sessionStorage.removeItem('pkce_verifier');
sessionStorage.removeItem('oauth_state');
```

#### Step 5: Use Access Token

```typescript
// Make authenticated API requests
const response = await fetch('https://api.example.com/user/profile', {
  headers: {
    'Authorization': 'Bearer ' + tokens.access_token
  }
});

const userProfile = await response.json();
```

### Full Example (Express Server)

```typescript
import express from 'express';
import session from 'express-session';
import crypto from 'crypto';

const app = express();

app.use(session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: true, sameSite: 'lax' }
}));

// Login route
app.get('/login', (req, res) => {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('hex');

  // Store in session
  req.session.codeVerifier = codeVerifier;
  req.session.state = state;

  const authUrl = new URL('https://auth.example.com/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', process.env.CLIENT_ID!);
  authUrl.searchParams.set('redirect_uri', 'https://yourapp.com/callback');
  authUrl.searchParams.set('scope', 'openid profile email');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  res.redirect(authUrl.toString());
});

// Callback route
app.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  // Validate state
  if (state !== req.session.state) {
    return res.status(400).send('State mismatch');
  }

  // Exchange code for tokens
  const tokenResponse = await fetch('https://auth.example.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code as string,
      redirect_uri: 'https://yourapp.com/callback',
      client_id: process.env.CLIENT_ID!,
      client_secret: process.env.CLIENT_SECRET!, // Only for confidential clients
      code_verifier: req.session.codeVerifier
    })
  });

  const tokens = await tokenResponse.json();

  // Store tokens securely
  req.session.accessToken = tokens.access_token;
  req.session.refreshToken = tokens.refresh_token;

  // Clean up
  delete req.session.codeVerifier;
  delete req.session.state;

  res.redirect('/dashboard');
});
```

---

## State Parameter (CSRF Protection)

### Why State is Critical

**Attack scenario without state:**
1. Attacker initiates OAuth flow for victim's account
2. Attacker intercepts authorization code
3. Victim's session linked to attacker's account
4. Victim unknowingly uses attacker's account (data leakage)

**Mitigation with state:**
```typescript
// Generate cryptographically random state
function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Before redirect
const state = generateState();
sessionStorage.setItem('oauth_state', state);

// On callback
const receivedState = new URL(window.location.href).searchParams.get('state');
const storedState = sessionStorage.getItem('oauth_state');

if (receivedState !== storedState) {
  throw new Error('State mismatch - possible CSRF attack');
}
```

---

## Redirect URI Validation

### Authorization Server Requirements

**MUST:**
- Require exact match of pre-registered redirect URIs
- Reject wildcard redirect URIs (e.g., `https://*.example.com`)
- Use HTTPS for redirect URIs (except localhost for development)

**Client Registration:**
```json
{
  "client_id": "abc123",
  "redirect_uris": [
    "https://yourapp.com/callback",
    "https://yourapp.com/auth/callback",
    "http://localhost:3000/callback"  // Development only
  ]
}
```

### Open Redirect Vulnerability

**Attack:**
```
https://auth.example.com/authorize?redirect_uri=https://evil.com
```

**If server doesn't validate, authorization code goes to attacker.**

**Mitigation:**
```typescript
// Authorization server validation
const registeredRedirectUris = await getClientRedirectUris(clientId);

if (!registeredRedirectUris.includes(redirectUri)) {
  throw new Error('Invalid redirect_uri');
}
```

---

## Scope Management

### Common Scopes

**OpenID Connect:**
- `openid`: Required for OIDC (returns id_token)
- `profile`: Name, picture, etc.
- `email`: Email address and verification status
- `address`: Physical address
- `phone`: Phone number and verification status

**Custom Scopes:**
- `read:posts`: Read user's posts
- `write:posts`: Create/update posts
- `delete:posts`: Delete posts
- `admin`: Administrative access

### Implementation

```typescript
// Client requests scopes
const scopes = ['openid', 'profile', 'email', 'read:posts'];
authUrl.searchParams.set('scope', scopes.join(' '));

// Authorization server validates requested scopes
function validateScopes(requestedScopes: string[], clientId: string): string[] {
  const allowedScopes = getClientAllowedScopes(clientId);
  return requestedScopes.filter(scope => allowedScopes.includes(scope));
}

// Access token includes granted scopes
const accessToken = jwt.sign({
  sub: user.id,
  scope: 'openid profile email read:posts',
  aud: 'https://api.example.com'
}, privateKey, { expiresIn: '15m' });

// API validates scopes
function requireScope(...requiredScopes: string[]) {
  return (req, res, next) => {
    const tokenScopes = req.user.scope.split(' ');
    const hasScope = requiredScopes.every(scope => tokenScopes.includes(scope));

    if (!hasScope) {
      return res.status(403).json({ error: 'Insufficient scope' });
    }

    next();
  };
}

app.get('/api/posts', requireScope('read:posts'), (req, res) => {
  // Return posts
});
```

---

## Client Credentials Flow

### Use Case
Server-to-server authentication (no user involved).

### Implementation

```typescript
// Client (Service A) requests token
async function getClientCredentialsToken() {
  const response = await fetch('https://auth.example.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(clientId + ":" + clientSecret).toString('base64')
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'api:read api:write'
    })
  });

  const { access_token, expires_in } = await response.json();
  return access_token;
}

// Use token to call API (Service B)
const token = await getClientCredentialsToken();
const apiResponse = await fetch('https://api.example.com/data', {
  headers: { 'Authorization': 'Bearer ' + token }
});
```

**No refresh token** (client can request new token anytime with credentials).

---

## OpenID Connect (OIDC)

### What is OIDC?

**OAuth 2.0** = Authorization framework (access to resources)
**OpenID Connect** = Authentication layer on top of OAuth 2.0 (identity verification)

### ID Token (JWT)

**Structure:**
```json
{
  "iss": "https://auth.example.com",
  "sub": "user123",
  "aud": "client_abc",
  "exp": 1672531200,
  "iat": 1672527600,
  "nonce": "random_nonce",
  "name": "John Doe",
  "email": "john@example.com",
  "email_verified": true,
  "picture": "https://example.com/avatar.jpg"
}
```

**Standard Claims:**
- `sub`: Subject (unique user ID)
- `name`: Full name
- `given_name`: First name
- `family_name`: Last name
- `email`: Email address
- `email_verified`: Email verification status (boolean)
- `picture`: Profile picture URL
- `locale`: Locale (e.g., "en-US")

### ID Token Validation

```typescript
import jwt from 'jsonwebtoken';

function validateIdToken(idToken: string) {
  // Fetch public keys from authorization server
  const publicKey = await fetchPublicKey('https://auth.example.com/.well-known/jwks.json');

  const decoded = jwt.verify(idToken, publicKey, {
    algorithms: ['RS256'],
    issuer: 'https://auth.example.com',
    audience: process.env.CLIENT_ID,
    clockTolerance: 60
  });

  // Validate nonce (if using implicit flow - deprecated)
  if (decoded.nonce && decoded.nonce !== req.session.nonce) {
    throw new Error('Nonce mismatch');
  }

  return decoded;
}
```

### UserInfo Endpoint

**Alternative to ID token for user data:**
```typescript
async function getUserInfo(accessToken: string) {
  const response = await fetch('https://auth.example.com/userinfo', {
    headers: { 'Authorization': 'Bearer ' + accessToken }
  });

  return await response.json();
  // { sub, name, email, email_verified, picture, ... }
}
```

**When to use:**
- ID token too large (many claims)
- Need fresh user data (ID token is snapshot at issuance)
- Custom claims not included in ID token

---

## Token Endpoint Security

### Client Authentication Methods

**1. Client Secret (Basic Authentication)**
```typescript
const authHeader = Buffer.from(clientId + ":" + clientSecret).toString('base64');

fetch('https://auth.example.com/token', {
  headers: { 'Authorization': 'Basic ' + authHeader }
});
```

**2. Client Secret (POST Body) - Less Secure**
```typescript
fetch('https://auth.example.com/token', {
  method: 'POST',
  body: new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    // ... other params
  })
});
```

**3. Private Key JWT (Most Secure for Confidential Clients)**
```typescript
const assertion = jwt.sign(
  {
    iss: clientId,
    sub: clientId,
    aud: 'https://auth.example.com/token',
    jti: crypto.randomUUID(),
    exp: Math.floor(Date.now() / 1000) + 300
  },
  privateKey,
  { algorithm: 'RS256' }
);

fetch('https://auth.example.com/token', {
  method: 'POST',
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: authCode,
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: assertion
  })
});
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// Token endpoint: 10 requests per minute per IP
const tokenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'too_many_requests' }
});

app.post('/token', tokenLimiter, tokenHandler);
```

---

## Refresh Token Best Practices

### Refresh Token Grant

```typescript
async function refreshAccessToken(refreshToken: string) {
  const response = await fetch('https://auth.example.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.CLIENT_ID!,
      client_secret: process.env.CLIENT_SECRET! // Confidential clients only
    })
  });

  const tokens = await response.json();
  return tokens; // { access_token, refresh_token (rotated), expires_in }
}
```

### Refresh Token Rotation (Recommended)

**Each refresh returns new refresh token, old token invalidated.**

See `jwt-best-practices.md` for detailed implementation.

---

## Common OAuth Vulnerabilities

### 1. Authorization Code Interception

**Mitigation:** PKCE (mandatory for public clients)

### 2. CSRF via Redirect URI

**Mitigation:** State parameter validation

### 3. Open Redirect

**Mitigation:** Exact redirect URI matching

### 4. Token Leakage

**Mitigations:**
- HTTPS only
- Short-lived access tokens
- httpOnly cookies (web)
- Secure storage (mobile)

### 5. Scope Escalation

**Mitigation:**
- Validate requested scopes against client registration
- Require user consent for sensitive scopes
- Token introspection validates scopes

---

## Security Checklist

**Before Production:**
- [ ] PKCE implemented for all public clients
- [ ] State parameter generated and validated
- [ ] Redirect URIs pre-registered and validated (exact match)
- [ ] HTTPS for all endpoints (except localhost development)
- [ ] Access tokens expire in 15 minutes or less
- [ ] Refresh token rotation implemented
- [ ] Client credentials secured (environment variables, secrets manager)
- [ ] Scopes validated against client registration
- [ ] Rate limiting on token endpoint
- [ ] ID token signature and claims validated (OIDC)
- [ ] Nonce validated if using implicit flow (deprecated)
- [ ] Tokens never logged or exposed in URLs
