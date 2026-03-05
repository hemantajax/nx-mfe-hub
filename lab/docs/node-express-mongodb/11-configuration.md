# 11 — Environment & Configuration

> **TL;DR:** Never hardcode configuration. Use env vars for environment-specific values, validate them at startup with Zod (fail fast), and expose a single typed config object. Use `.env` files for local development only — never commit them. For secrets, use a vault or cloud-native secrets manager in production.

---

## 1. Configuration Hierarchy

```
Highest priority
    │
    ▼
┌──────────────────────────┐
│  Environment variables   │  ← Set by deployment platform (Kubernetes, Docker, etc.)
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  .env.<NODE_ENV>         │  ← .env.production, .env.staging (local overrides)
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  .env.local              │  ← Developer's personal overrides (gitignored)
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  .env                    │  ← Default local development values
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  config/index.ts defaults│  ← Hardcoded fallbacks (non-sensitive only)
└──────────────────────────┘
Lowest priority
```

---

## 2. Env Validation with Zod (Fail Fast)

```typescript
// src/config/env.validation.ts
import { z } from 'zod';

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('0.0.0.0'),
  API_PREFIX: z.string().default('/api/v1'),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid MongoDB connection string'),
  DB_MAX_POOL_SIZE: z.coerce.number().int().min(1).max(100).default(10),

  // Redis
  REDIS_URL: z.string().url().optional(),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_ISSUER: z.string().default('api'),
  JWT_AUDIENCE: z.string().default('web'),

  // CORS
  ALLOWED_ORIGINS: z.string().default('http://localhost:4200'),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // External Services
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),

  // Encryption
  ENCRYPTION_KEY: z.string().min(32).optional(),

  // Cookie
  COOKIE_SECRET: z.string().min(32).default('change-this-in-production-32chars!'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(
      result.error.issues
        .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
        .join('\n')
    );
    process.exit(1);
  }

  return result.data;
}
```

---

## 3. Typed Config Object (Single Source of Truth)

```typescript
// src/config/index.ts
import 'dotenv/config'; // Load .env files before validation
import { validateEnv } from './env.validation';

const env = validateEnv();

export const config = {
  env: env.NODE_ENV,
  port: env.PORT,
  host: env.HOST,
  apiPrefix: env.API_PREFIX,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',

  database: {
    url: env.DATABASE_URL,
    maxPoolSize: env.DB_MAX_POOL_SIZE,
  },

  redis: {
    url: env.REDIS_URL,
  },

  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  },

  cors: {
    allowedOrigins: env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()),
  },

  logging: {
    level: env.LOG_LEVEL,
  },

  email: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.SMTP_FROM,
  },

  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: env.GOOGLE_REDIRECT_URI,
  },

  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
  },

  cookieSecret: env.COOKIE_SECRET,
  encryptionKey: env.ENCRYPTION_KEY,

  serviceName: 'my-api',
  version: process.env.npm_package_version || '0.0.0',
} as const;

export type Config = typeof config;
```

### Usage Throughout the App

```typescript
// Anywhere in the codebase
import { config } from '../config';

// Type-safe, autocomplete, no process.env scattered everywhere
mongoose.connect(config.database.url, {
  maxPoolSize: config.database.maxPoolSize,
});

jwt.sign(payload, config.jwt.accessSecret, {
  expiresIn: config.jwt.accessExpiresIn,
});

if (config.isProduction) {
  app.set('trust proxy', 1);
}
```

---

## 4. .env File Templates

### .env.example (Committed to Git)

```bash
# Application
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
API_PREFIX=/api/v1

# Database
DATABASE_URL=mongodb://localhost:27017/myapp
DB_MAX_POOL_SIZE=10

# Redis (optional for development)
REDIS_URL=redis://localhost:6379

# JWT (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_ACCESS_SECRET=your-access-secret-min-32-chars-here
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars-here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
ALLOWED_ORIGINS=http://localhost:4200,http://localhost:3000

# Logging
LOG_LEVEL=debug

# Cookie
COOKIE_SECRET=your-cookie-secret-min-32-chars-here

# Email (optional)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
# SMTP_FROM=noreply@myapp.com

# Google OAuth (optional)
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
# GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/auth/google/callback
```

### .gitignore Entries

```gitignore
# Environment files
.env
.env.local
.env.*.local
.env.production
.env.staging

# Keep the template
!.env.example
```

---

## 5. Secrets Management in Production

### Level 1: Environment Variables (Basic)

```bash
# Set directly in deployment platform
# Docker Compose
environment:
  - DATABASE_URL=mongodb://prod-host:27017/myapp
  - JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}

# Kubernetes
envFrom:
  - secretRef:
      name: api-secrets
```

### Level 2: Secrets Manager (Recommended)

```typescript
// src/config/secrets.ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'us-east-1' });

export async function getSecret(secretName: string): Promise<Record<string, string>> {
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const response = await client.send(command);
  return JSON.parse(response.SecretString!);
}

// Load secrets before app starts
async function loadSecrets() {
  if (config.isProduction) {
    const dbSecrets = await getSecret('prod/api/database');
    const jwtSecrets = await getSecret('prod/api/jwt');

    process.env.DATABASE_URL = dbSecrets.DATABASE_URL;
    process.env.JWT_ACCESS_SECRET = jwtSecrets.JWT_ACCESS_SECRET;
    process.env.JWT_REFRESH_SECRET = jwtSecrets.JWT_REFRESH_SECRET;
  }
}
```

### Level 3: HashiCorp Vault

```typescript
import Vault from 'node-vault';

const vault = Vault({
  apiVersion: 'v1',
  endpoint: process.env.VAULT_ADDR,
  token: process.env.VAULT_TOKEN,
});

async function loadVaultSecrets() {
  const { data } = await vault.read('secret/data/api');
  Object.assign(process.env, data.data);
}
```

### Secrets Hierarchy for Environments

| Environment | Secrets Source | .env File | Vault |
|-------------|---------------|-----------|-------|
| **Local Dev** | `.env` file | Yes | No |
| **CI/CD** | CI secrets (GitHub Actions, etc.) | No | Optional |
| **Staging** | Kubernetes Secrets / SSM | No | Optional |
| **Production** | Vault / AWS Secrets Manager | No | Yes |

---

## 6. Multi-Environment Configuration

```typescript
// src/config/database.ts
import { config } from './index';

interface DatabaseConfig {
  url: string;
  options: {
    maxPoolSize: number;
    minPoolSize: number;
    retryWrites: boolean;
    w: string;
    readPreference: string;
  };
}

const databaseConfigs: Record<string, Partial<DatabaseConfig['options']>> = {
  development: {
    maxPoolSize: 5,
    minPoolSize: 1,
  },
  test: {
    maxPoolSize: 2,
    minPoolSize: 1,
  },
  staging: {
    maxPoolSize: 10,
    minPoolSize: 2,
    readPreference: 'secondaryPreferred',
  },
  production: {
    maxPoolSize: 20,
    minPoolSize: 5,
    readPreference: 'secondaryPreferred',
    retryWrites: true,
    w: 'majority',
  },
};

export function getDatabaseConfig(): DatabaseConfig {
  return {
    url: config.database.url,
    options: {
      maxPoolSize: 10,
      minPoolSize: 2,
      retryWrites: true,
      w: 'majority',
      readPreference: 'primary',
      ...databaseConfigs[config.env],
    },
  };
}
```

---

## 7. Feature Flags

```typescript
// src/config/features.ts
import { config } from './index';

export const features = {
  enableNewCheckout: config.env === 'production'
    ? process.env.FF_NEW_CHECKOUT === 'true'
    : true,

  enableEmailVerification: config.env !== 'test',

  maxUploadSizeMB: config.isProduction ? 5 : 50,

  enableRateLimiting: config.env !== 'test',

  enableCaching: config.env !== 'test' && !!config.redis.url,
} as const;

// Usage
if (features.enableNewCheckout) {
  router.use('/checkout/v2', newCheckoutRoutes);
}
```

---

## 8. Common Mistakes

| Mistake | Why It's Bad | Fix |
|---------|-------------|-----|
| Committing `.env` to Git | Secrets exposed in version control | `.gitignore` + `.env.example` template |
| `process.env.X` scattered everywhere | No validation, typos, no autocomplete | Centralized `config` object |
| No env validation at startup | App crashes later with cryptic errors | Zod validation in config/index.ts |
| Hardcoded API keys | Can't rotate, can't deploy multi-env | Use env vars or secrets manager |
| Same secrets for all environments | Staging breach = production breach | Unique secrets per environment |
| Default JWT secret in production | Anyone can forge tokens | Validate min-length, no defaults for secrets |
| Using `dotenv` in production | Unnecessary, env vars set by platform | Only load `.env` in development |
| No `.env.example` | New devs don't know what env vars are needed | Always maintain `.env.example` |

---

## 9. Interview-Ready Answers

### "How do you manage configuration and secrets?"

> "I have a three-tier approach. First, all env vars are validated at startup using Zod — if any required variable is missing or malformed, the app fails immediately with a clear error message. This prevents runtime surprises. Second, I expose a single typed `config` object that the entire app imports — no `process.env.X` scattered around. Third, secrets management varies by environment: `.env` files for local development (gitignored), CI platform secrets for CI/CD, and AWS Secrets Manager or HashiCorp Vault for production. I never commit secrets to version control and every environment has its own set of credentials."

### "What happens if a required env var is missing?"

> "The app fails to start with a clear error message listing exactly which variables are missing or invalid. This is by design — I validate all environment variables at the very beginning of the startup sequence using Zod. It's better to fail fast at deployment time than to fail at 3am when a code path finally hits the missing config. My CI/CD pipeline also checks for required env vars before deploying."

---

> **Next:** [12-deployment-devops.md](12-deployment-devops.md) — Docker, CI/CD, PM2, graceful shutdown, health probes
