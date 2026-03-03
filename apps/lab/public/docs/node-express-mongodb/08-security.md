# 08 — Security Best Practices

> **TL;DR:** Security is not a feature — it's a layer across your entire stack. Use Helmet for HTTP headers, rate limiting for abuse prevention, parameterized queries to prevent injection, CORS properly configured, and HTTPS everywhere. Follow the OWASP Top 10. Validate input, sanitize output, encrypt at rest and in transit.

---

## 1. OWASP Top 10 for Node.js APIs (2021/2023)

| # | Vulnerability | Node.js Relevance | Protection |
|---|---------------|-------------------|------------|
| A01 | **Broken Access Control** | Missing authorization checks | RBAC middleware on every route |
| A02 | **Cryptographic Failures** | Weak hashing, plaintext secrets | Argon2/bcrypt, env vars, vault |
| A03 | **Injection** | NoSQL injection, command injection | Zod validation, mongo-sanitize |
| A04 | **Insecure Design** | No rate limit, no input validation | Threat modeling, security by design |
| A05 | **Security Misconfiguration** | Default configs, verbose errors | Helmet, disable x-powered-by |
| A06 | **Vulnerable Components** | Outdated npm packages | `npm audit`, Snyk, Dependabot |
| A07 | **Auth Failures** | Weak passwords, no MFA | Strong password policy, account lockout |
| A08 | **Data Integrity Failures** | No input validation, unsafe deserialization | Schema validation, signed tokens |
| A09 | **Logging & Monitoring Gaps** | No audit logs, no alerts | Structured logging, alerting |
| A10 | **SSRF** | Fetching user-provided URLs | URL allowlisting, network policies |

---

## 2. Helmet — Security Headers

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  ieNoOpen: true,
  noSniff: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
}));
```

### What Each Header Does

| Header | Purpose |
|--------|---------|
| `Content-Security-Policy` | Prevents XSS by whitelisting resource sources |
| `Strict-Transport-Security` | Forces HTTPS for all future requests |
| `X-Content-Type-Options: nosniff` | Prevents MIME type sniffing |
| `X-Frame-Options: DENY` | Prevents clickjacking via iframes |
| `X-XSS-Protection` | Legacy XSS filter (modern browsers use CSP) |
| `Referrer-Policy` | Controls what's sent in Referer header |
| `Cross-Origin-*` | Isolation policies for cross-origin resources |

---

## 3. CORS Configuration

```typescript
import cors from 'cors';

// Production CORS setup
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,                         // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id', 'X-RateLimit-Remaining'],
  maxAge: 86400,                              // Cache preflight for 24h
};

app.use(cors(corsOptions));
```

---

## 4. NoSQL Injection Prevention

```typescript
// Attack vector: malicious query operators in user input
// POST /api/login  { "email": { "$gt": "" }, "password": { "$gt": "" } }
// This matches ANY user in the database!

// Defense 1: express-mongo-sanitize
import mongoSanitize from 'express-mongo-sanitize';
app.use(mongoSanitize());
// Strips $ and . from req.body, req.query, req.params

// Defense 2: Zod validation (type checking catches it)
const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),      // Must be a string, not an object
    password: z.string().min(8),    // Must be a string, not an object
  }),
});

// Defense 3: Explicit type casting in queries
async function findByEmail(email: string) {
  // Even if somehow an object gets here, String() makes it a string
  return User.findOne({ email: String(email) });
}
```

---

## 5. Rate Limiting Strategies

```typescript
import { rateLimit } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redisClient = createClient({ url: process.env.REDIS_URL });
await redisClient.connect();

// Global API rate limit
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,    // 15 minutes
  max: 100,                     // 100 requests per window per IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: new RedisStore({ sendCommand: (...args: string[]) => redisClient.sendCommand(args) }),
  message: { success: false, message: 'Too many requests. Try again later.' },
  keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
  skip: (req) => req.path === '/health/live', // Don't rate-limit health checks
});

// Strict auth limiter (brute force protection)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,                       // Only 5 login attempts per 15 min
  standardHeaders: 'draft-7',
  store: new RedisStore({ sendCommand: (...args: string[]) => redisClient.sendCommand(args) }),
  message: { success: false, message: 'Too many login attempts. Account temporarily locked.' },
  keyGenerator: (req) => `auth:${req.body.email || req.ip}`,
});

// Expensive operation limiter
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,    // 1 hour
  max: 10,                      // 10 uploads per hour
  store: new RedisStore({ sendCommand: (...args: string[]) => redisClient.sendCommand(args) }),
});

// Apply
app.use('/api/', globalLimiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/upload', uploadLimiter);
```

---

## 6. Request Size & Slowloris Protection

```typescript
// Limit JSON body size (prevent memory exhaustion)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Timeout slow requests
import timeout from 'connect-timeout';
app.use(timeout('30s'));

// Or manually:
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    if (!res.headersSent) {
      res.status(408).json({ success: false, message: 'Request timeout' });
    }
  });
  next();
});

// Limit parameter pollution
import hpp from 'hpp';
app.use(hpp({
  whitelist: ['sort', 'fields', 'filter'],
}));
```

---

## 7. Data Encryption

### At Rest

```typescript
// MongoDB field-level encryption (CSFLE)
import { ClientEncryption } from 'mongodb';

// Or application-level encryption for sensitive fields
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = scryptSync(process.env.ENCRYPTION_KEY!, 'salt', 32);

export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, tagHex, dataHex] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data) + decipher.final('utf8');
}

// Usage in Mongoose schema
userSchema.pre('save', function (next) {
  if (this.isModified('ssn')) {
    this.ssn = encrypt(this.ssn);
  }
  next();
});
```

### In Transit

```typescript
// Force HTTPS in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// Or let nginx/load balancer handle TLS termination
// and verify with trust proxy:
app.set('trust proxy', 1);
```

---

## 8. Dependency Security

```bash
# Check for known vulnerabilities
npm audit

# Auto-fix what's possible
npm audit fix

# Use Snyk for deeper scanning
npx snyk test

# Lock file integrity
npm ci  # Always use in CI (respects lockfile exactly)

# Keep dependencies updated
npx npm-check-updates -u
```

### package.json Security Practices

```json
{
  "scripts": {
    "audit": "npm audit --audit-level=high",
    "preinstall": "npx only-allow npm",
    "prepare": "husky install"
  },
  "overrides": {
    "vulnerable-package": ">=2.0.0"
  }
}
```

---

## 9. Security Headers Checklist

```
✅ Helmet enabled with CSP
✅ CORS properly configured (not wildcard in production)
✅ X-Powered-By disabled
✅ HSTS enabled (HTTPS enforcement)
✅ X-Content-Type-Options: nosniff
✅ X-Frame-Options: DENY
✅ Referrer-Policy: strict-origin-when-cross-origin
✅ Content-Security-Policy configured
✅ Rate limiting on all API routes
✅ Stricter rate limiting on auth endpoints
✅ Body size limited (10kb for JSON)
✅ Request timeout configured (30s)
✅ HPP protection enabled
✅ MongoDB sanitization enabled
✅ Cookie flags: httpOnly, secure, sameSite
```

---

## 10. Common Mistakes

| Mistake | Why It's Bad | Fix |
|---------|-------------|-----|
| `cors({ origin: '*' })` in production | Any site can call your API | Whitelist specific origins |
| `app.use(express.json())` without size limit | Memory exhaustion DoS | `express.json({ limit: '10kb' })` |
| Storing secrets in code | Secrets in version control | Use env vars / vault |
| No `npm audit` in CI | Shipping known vulnerabilities | Add audit step to CI pipeline |
| Verbose error messages in production | Stack trace leaks internal structure | Generic 500 messages in production |
| No rate limiting | Brute force, DDoS, scraping | Rate limit all routes |
| `eval()` or `Function()` with user input | Remote code execution | Never use eval with external input |
| Logging tokens/passwords | Secrets in log files | Redact sensitive fields in logger |
| No input validation | Injection attacks | Validate everything with Zod |
| Running as root in container | Privilege escalation | Use non-root user in Dockerfile |

---

## 11. Interview-Ready Answers

### "How do you secure a Node.js API?"

> "I follow a defense-in-depth approach across multiple layers. At the HTTP level: Helmet for security headers, CORS with explicit origin allowlist, and body size limits. At the application level: Zod validation on every input, express-mongo-sanitize against NoSQL injection, and HPP against parameter pollution. For authentication: argon2 password hashing, short-lived JWTs, refresh token rotation, and httpOnly cookies. For abuse prevention: tiered rate limiting — strict on auth routes (5/15min), moderate on APIs (100/15min). Infrastructure: HTTPS everywhere, npm audit in CI, non-root Docker containers, and secrets in a vault — never in environment files committed to git."

### "What's your approach to preventing injection attacks?"

> "For NoSQL injection, I use three defenses: schema validation with Zod ensures inputs are the expected type (a string, not an object with `$gt`), express-mongo-sanitize strips MongoDB operators from user input, and I use parameterized queries (never string concatenation). For command injection, I never use `exec()` or `eval()` with user input — I use specific Node.js APIs like `child_process.execFile()` with explicit arguments. For XSS, I sanitize output and set CSP headers."

---

> **Next:** [09-performance.md](09-performance.md) — Clustering, caching, query optimization, profiling
