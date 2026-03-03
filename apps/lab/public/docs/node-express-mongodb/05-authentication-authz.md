# 05 — Authentication & Authorization

> **TL;DR:** Use stateless JWT with short-lived access tokens (15 min) + long-lived refresh tokens (7 days, stored in httpOnly cookies). Hash passwords with bcrypt/argon2 (never MD5/SHA). Implement RBAC with role + permission matrices. For OAuth, use PKCE flow. Never store tokens in localStorage — use httpOnly secure cookies.

---

## 1. Authentication vs Authorization

| Concept | Question It Answers | Example |
|---------|-------------------|---------|
| **Authentication (AuthN)** | "Who are you?" | Login with email/password, JWT verification |
| **Authorization (AuthZ)** | "What can you do?" | Admin can delete users, regular user cannot |

---

## 2. Password Hashing — Never Store Plaintext

```typescript
// src/modules/auth/auth.service.ts
import { hash, compare } from 'bcryptjs';

// Alternative: argon2 (winner of Password Hashing Competition)
// import argon2 from 'argon2';

export class AuthService {
  private readonly SALT_ROUNDS = 12;

  async hashPassword(password: string): Promise<string> {
    return hash(password, this.SALT_ROUNDS);
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return compare(password, hashedPassword);
  }
}
```

### Hashing Algorithm Comparison

| Algorithm | Security | Speed | Memory | Recommendation |
|-----------|----------|-------|--------|----------------|
| **bcrypt** | High | Moderate | Low | Default choice, battle-tested |
| **argon2id** | Very High | Configurable | High | Best for new projects (PHC winner) |
| **scrypt** | High | Configurable | High | Good alternative, built into Node.js |
| **PBKDF2** | Moderate | Fast | Low | Legacy, acceptable |
| MD5/SHA | None | Very Fast | None | NEVER use for passwords |

### Argon2 Example (Preferred for New Projects)

```typescript
import argon2 from 'argon2';

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,  // Hybrid (side-channel + GPU resistance)
    memoryCost: 65536,       // 64 MB
    timeCost: 3,             // 3 iterations
    parallelism: 4,          // 4 threads
  });
}

async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}
```

---

## 3. JWT Authentication — Complete Implementation

### 3.1 Token Pair Strategy

```
┌─────────────────────────────────────────────────────────┐
│                   Token Pair Strategy                     │
│                                                          │
│  Access Token (JWT)              Refresh Token            │
│  ├── Short-lived: 15 min        ├── Long-lived: 7 days  │
│  ├── Sent in: Auth header        ├── Sent in: httpOnly   │
│  ├── Contains: userId, role      │   cookie              │
│  ├── Stateless verification      ├── Stored in DB        │
│  └── Not revocable individually  └── Revocable           │
│                                                          │
│  Flow:                                                   │
│  1. Login → get both tokens                              │
│  2. API calls → use access token                         │
│  3. Access expired → use refresh to get new pair         │
│  4. Refresh expired → re-login                           │
│  5. Logout → delete refresh token from DB + clear cookie │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Token Service

```typescript
// src/modules/auth/token.service.ts
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { config } from '../../config';
import { RefreshToken } from './refresh-token.model';
import type { AuthPayload } from '../../common/middleware/authenticate';

export class TokenService {
  generateAccessToken(payload: AuthPayload): string {
    return jwt.sign(payload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiresIn,  // '15m'
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    });
  }

  async generateRefreshToken(userId: string): Promise<string> {
    const token = randomBytes(40).toString('hex');

    await RefreshToken.create({
      token,
      user: userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return token;
  }

  verifyAccessToken(token: string): AuthPayload {
    return jwt.verify(token, config.jwt.accessSecret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    }) as AuthPayload;
  }

  async verifyRefreshToken(token: string) {
    const storedToken = await RefreshToken.findOne({
      token,
      expiresAt: { $gt: new Date() },
      isRevoked: false,
    }).populate('user');

    if (!storedToken) return null;
    return storedToken;
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await RefreshToken.findOneAndUpdate({ token }, { isRevoked: true });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await RefreshToken.updateMany(
      { user: userId, isRevoked: false },
      { isRevoked: true }
    );
  }
}
```

### 3.3 Refresh Token Model

```typescript
// src/modules/auth/refresh-token.model.ts
import { Schema, model, Types } from 'mongoose';

interface IRefreshToken {
  token: string;
  user: Types.ObjectId;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>({
  token: { type: String, required: true, unique: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  expiresAt: { type: Date, required: true },
  isRevoked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// TTL index: auto-delete expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = model<IRefreshToken>('RefreshToken', refreshTokenSchema);
```

### 3.4 Auth Controller

```typescript
// src/modules/auth/auth.controller.ts
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { sendSuccess } from '../../common/utils/response';
import { config } from '../../config';

const authService = new AuthService();
const tokenService = new TokenService();

export class AuthController {
  async login(req: Request, res: Response) {
    const { email, password } = req.body;
    const user = await authService.validateCredentials(email, password);

    const accessToken = tokenService.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = await tokenService.generateRefreshToken(user.id);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth',
    });

    sendSuccess(res, { accessToken, user: { id: user.id, email: user.email, role: user.role } });
  }

  async refresh(req: Request, res: Response) {
    const oldRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!oldRefreshToken) throw new AppError('Refresh token required', 401);

    const stored = await tokenService.verifyRefreshToken(oldRefreshToken);
    if (!stored) throw new AppError('Invalid refresh token', 401);

    // Rotate refresh token (invalidate old, issue new)
    await tokenService.revokeRefreshToken(oldRefreshToken);

    const accessToken = tokenService.generateAccessToken({
      userId: stored.user.id,
      email: stored.user.email,
      role: stored.user.role,
    });

    const newRefreshToken = await tokenService.generateRefreshToken(stored.user.id);

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth',
    });

    sendSuccess(res, { accessToken });
  }

  async logout(req: Request, res: Response) {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      await tokenService.revokeRefreshToken(refreshToken);
    }

    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    sendSuccess(res, null, 204);
  }

  async logoutAll(req: Request, res: Response) {
    await tokenService.revokeAllUserTokens(req.user!.userId);
    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    sendSuccess(res, { message: 'All sessions terminated' });
  }
}
```

---

## 4. Role-Based Access Control (RBAC)

### Simple Role Check

```typescript
// Already covered in middleware chapter
export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!roles.includes(req.user!.role)) {
      throw new AppError('Insufficient permissions', 403);
    }
    next();
  };
}
```

### Permission-Based RBAC (Granular)

```typescript
// src/common/middleware/permissions.ts
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['user:read', 'user:write', 'user:delete', 'order:read', 'order:write', 'order:delete', 'report:read'],
  manager: ['user:read', 'order:read', 'order:write', 'report:read'],
  user: ['user:read:own', 'order:read:own', 'order:write:own'],
};

export function requirePermission(...permissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const userRole = req.user!.role;
    const userPermissions = ROLE_PERMISSIONS[userRole] || [];

    const hasPermission = permissions.every((perm) =>
      userPermissions.includes(perm) || userPermissions.includes(perm.replace(':own', ''))
    );

    if (!hasPermission) {
      throw new AppError('Insufficient permissions', 403);
    }

    next();
  };
}

// Usage
router.get('/users', authenticate, requirePermission('user:read'), getUsers);
router.delete('/users/:id', authenticate, requirePermission('user:delete'), deleteUser);
```

### Resource Ownership Check

```typescript
// src/common/middleware/ownership.ts
export function requireOwnership(paramField = 'id') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const resourceUserId = req.params[paramField];
    const requestingUserId = req.user!.userId;

    if (req.user!.role === 'admin') return next();

    if (resourceUserId !== requestingUserId) {
      throw new AppError('Access denied — you can only access your own resources', 403);
    }

    next();
  };
}

// Usage: user can only access their own profile
router.get('/users/:id', authenticate, requireOwnership('id'), getUser);
router.patch('/users/:id', authenticate, requireOwnership('id'), updateUser);
```

---

## 5. OAuth 2.0 with PKCE (Google Example)

```typescript
// src/modules/auth/strategies/google.strategy.ts
import { OAuth2Client } from 'google-auth-library';
import { config } from '../../../config';
import { UserService } from '../../user/user.service';

const oauth2Client = new OAuth2Client(
  config.google.clientId,
  config.google.clientSecret,
  config.google.redirectUri
);

export class GoogleStrategy {
  generateAuthUrl(state: string, codeVerifier: string): string {
    const codeChallenge = oauth2Client.generateCodeVerifier();

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
  }

  async handleCallback(code: string, codeVerifier: string) {
    const { tokens } = await oauth2Client.getToken({
      code,
      codeVerifier,
    });

    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: config.google.clientId,
    });

    const payload = ticket.getPayload()!;

    // Find or create user
    const userService = new UserService();
    let user = await userService.findByEmail(payload.email!);

    if (!user) {
      user = await userService.createUser({
        email: payload.email!,
        name: payload.name!,
        provider: 'google',
        providerId: payload.sub,
        avatar: payload.picture,
        isEmailVerified: payload.email_verified ?? false,
      });
    }

    return user;
  }
}
```

---

## 6. Session-Based Auth vs JWT — When to Use Each

| Criteria | JWT (Stateless) | Session (Stateful) |
|----------|----------------|-------------------|
| **Scalability** | Excellent — no server state | Requires shared session store |
| **Revocation** | Hard — need blocklist | Easy — delete session |
| **Cross-domain** | Easy — token in header | Hard — cookies are domain-bound |
| **Mobile** | Excellent | Harder |
| **Performance** | No DB lookup per request | DB/Redis lookup per request |
| **Payload** | Can carry claims (role, etc.) | Server looks up user data |
| **Best for** | APIs, microservices, SPAs | Traditional web apps, SSR |

**Architect answer:** "For APIs consumed by SPAs and mobile apps, I use JWTs with short-lived access tokens and rotated refresh tokens in httpOnly cookies. For server-rendered apps with simple auth needs, express-session with Redis is simpler and more revocable."

---

## 7. Security Checklist for Auth

- [ ] Hash passwords with bcrypt (cost 12+) or argon2id
- [ ] Access tokens expire in 15 minutes max
- [ ] Refresh tokens stored in DB, revocable
- [ ] Refresh token rotation on every use (detect token reuse → revoke all)
- [ ] httpOnly, Secure, SameSite cookies for refresh tokens
- [ ] Rate limit login endpoint (5 attempts per 15 min)
- [ ] Account lockout after N failed attempts
- [ ] HTTPS everywhere in production
- [ ] No tokens in URL query parameters (logged in server logs!)
- [ ] Never store tokens in localStorage (XSS-accessible)
- [ ] Validate JWT issuer, audience, and expiration
- [ ] Use strong secrets (256-bit minimum for HMAC, RSA 2048+ for asymmetric)

---

## 8. Common Mistakes

| Mistake | Why It's Bad | Fix |
|---------|-------------|-----|
| JWT in localStorage | XSS can steal tokens | httpOnly cookies |
| No refresh token rotation | Stolen refresh token = permanent access | Rotate on every use |
| Long-lived access tokens (24h+) | Can't revoke, wide attack window | 15 min max |
| Symmetric JWT in microservices | Every service has the secret | Use RS256 (asymmetric) |
| `select: false` missing on password | Password leaked in queries | Always exclude password by default |
| No rate limit on login | Brute force attacks | Rate limit to 5/15min |
| Password in JWT payload | Anyone can decode JWT (base64) | Only store userId, role |
| No logout mechanism | Tokens remain valid forever | Refresh token revocation + short access tokens |

---

## 9. Interview-Ready Answers

### "How do you implement secure authentication?"

> "I use a JWT token pair strategy. On login, I issue a short-lived access token (15 min, signed with RS256 for microservices or HS256 for monoliths) and a long-lived refresh token (7 days) stored as an httpOnly, Secure, SameSite=Strict cookie. The refresh token is also stored in MongoDB with a TTL index for automatic cleanup. On each refresh, I rotate the token — invalidate the old one and issue a new one. If I detect a reused refresh token, I revoke all tokens for that user (indicates theft). Passwords are hashed with argon2id. Login endpoints are rate-limited to 5 attempts per 15 minutes."

### "JWT vs Sessions — when do you use each?"

> "JWTs are ideal for stateless APIs, especially in microservice architectures where you don't want every service hitting a session store. Sessions are better for server-rendered apps where you need immediate revocation and simpler security model. In practice, I use JWT for APIs and mobile backends, and sessions with Redis for admin dashboards and internal tools."

### "How do you handle token revocation?"

> "Since JWTs are stateless, you can't truly revoke an access token without a blocklist. My approach: keep access tokens very short-lived (15 min) so they auto-expire. For immediate revocation, I maintain a Redis-backed blocklist of revoked access token JTIs. Refresh tokens are stored in MongoDB and can be revoked instantly. On password change or security events, I revoke all refresh tokens for the user."

---

> **Next:** [06-validation-error-handling.md](06-validation-error-handling.md) — Zod/Joi validation, global error handler, custom errors
