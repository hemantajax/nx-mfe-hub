# 04 — Middleware Patterns

> **TL;DR:** Middleware is the backbone of Express. Every cross-cutting concern — authentication, logging, validation, error handling, rate limiting, CORS — is implemented as middleware. Order matters critically. Use factory functions for configurable middleware. Always separate error-handling middleware (4 params) from regular middleware (3 params).

---

## 1. Middleware Fundamentals

A middleware function has access to `req`, `res`, and `next`. It can:
- Execute code
- Modify `req` and `res`
- End the request-response cycle
- Call `next()` to pass control to the next middleware

```typescript
// Middleware signature
type Middleware = (req: Request, res: Response, next: NextFunction) => void;

// Error-handling middleware signature (MUST have 4 params)
type ErrorMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => void;
```

### Execution Order

```
Request →  [MW1] → [MW2] → [MW3] → [Route Handler]
                                          │
Response ← [MW3] ← [MW2] ← [MW1] ←──────┘

If any MW calls next(error):
Request →  [MW1] → [MW2] → ✗ → [Error Handler MW]
```

---

## 2. Essential Production Middleware Stack

```typescript
// src/app.ts — middleware registration order matters!
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { requestId } from './common/middleware/request-id';
import { httpLogger } from './common/middleware/http-logger';
import { authenticate } from './common/middleware/authenticate';
import { notFoundHandler } from './common/middleware/not-found';
import { errorHandler } from './common/middleware/error-handler';

const app = express();

// ┌──────────────────────────────────────────────────────────┐
// │ 1. SECURITY — before anything touches the request        │
// └──────────────────────────────────────────────────────────┘
app.use(helmet());
app.use(cors({
  origin: config.allowedOrigins,
  credentials: true,
}));

// ┌──────────────────────────────────────────────────────────┐
// │ 2. REQUEST PARSING — parse the raw body                  │
// └──────────────────────────────────────────────────────────┘
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser(config.cookieSecret));

// ┌──────────────────────────────────────────────────────────┐
// │ 3. OBSERVABILITY — trace and log every request           │
// └──────────────────────────────────────────────────────────┘
app.use(requestId);
app.use(httpLogger);

// ┌──────────────────────────────────────────────────────────┐
// │ 4. RATE LIMITING — protect against abuse                 │
// └──────────────────────────────────────────────────────────┘
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ┌──────────────────────────────────────────────────────────┐
// │ 5. PERFORMANCE — compress responses                      │
// └──────────────────────────────────────────────────────────┘
app.use(compression());

// ┌──────────────────────────────────────────────────────────┐
// │ 6. ROUTES — actual business logic                        │
// └──────────────────────────────────────────────────────────┘
app.use('/api/v1', apiRouter);

// ┌──────────────────────────────────────────────────────────┐
// │ 7. ERROR HANDLING — must be last                         │
// └──────────────────────────────────────────────────────────┘
app.use(notFoundHandler);
app.use(errorHandler);
```

---

## 3. Custom Middleware Implementations

### 3.1 Request ID Middleware

```typescript
// src/common/middleware/request-id.ts
import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = (req.headers['x-request-id'] as string) || randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}
```

### 3.2 HTTP Logger Middleware

```typescript
// src/common/middleware/http-logger.ts
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../config/logger';

export function httpLogger(req: Request, res: Response, next: NextFunction) {
  const start = performance.now();

  res.on('finish', () => {
    const duration = Math.round(performance.now() - start);
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      requestId: req.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    };

    if (res.statusCode >= 400) {
      logger.warn(logData, 'HTTP request completed with error');
    } else {
      logger.info(logData, 'HTTP request completed');
    }
  });

  next();
}
```

### 3.3 Authentication Middleware

```typescript
// src/common/middleware/authenticate.ts
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../errors/app-error';
import { config } from '../../config';

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('No token provided', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }
}
```

### 3.4 Authorization Middleware (Factory Pattern)

```typescript
// src/common/middleware/authorize.ts
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';

export function authorize(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(
        `Role '${req.user.role}' is not authorized for this resource`,
        403
      );
    }

    next();
  };
}

// Usage in routes:
router.delete('/users/:id', authenticate, authorize('admin'), deleteUser);
router.get('/reports', authenticate, authorize('admin', 'manager'), getReports);
```

### 3.5 Validation Middleware (Zod)

```typescript
// src/common/middleware/validate.ts
import type { Request, Response, NextFunction } from 'express';
import { type AnyZodObject, ZodError } from 'zod';
import { AppError } from '../errors/app-error';

export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        throw new AppError('Validation failed', 422, errors);
      }
      next(error);
    }
  };
}
```

### 3.6 Rate Limiter — Per-Route Custom Limits

```typescript
// src/common/middleware/rate-limiter.ts
import { rateLimit, type Options } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClient } from '../../infrastructure/cache/redis.client';

export function createRateLimiter(options: Partial<Options> = {}) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    }),
    message: { success: false, message: 'Too many requests, please try again later' },
    ...options,
  });
}

// Usage: different limits for different routes
const authLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 });
const apiLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 100 });
const uploadLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 10 });

app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/upload', uploadLimiter);
app.use('/api/v1', apiLimiter);
```

---

## 4. Error Handling Middleware

### 4.1 Custom Error Class

```typescript
// src/common/errors/app-error.ts
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors?: unknown[];

  constructor(
    message: string,
    statusCode = 500,
    errors?: unknown[],
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error classes
export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
  }
}

export class ValidationError extends AppError {
  constructor(errors: unknown[]) {
    super('Validation failed', 422, errors);
  }
}
```

### 4.2 Global Error Handler

```typescript
// src/common/middleware/error-handler.ts
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';
import { logger } from '../../config/logger';
import mongoose from 'mongoose';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Convert known errors to AppError
  let error = normalizeError(err);

  // Log the error
  if (error.statusCode >= 500) {
    logger.error({
      err: error,
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      body: req.body,
    }, error.message);
  } else {
    logger.warn({
      statusCode: error.statusCode,
      message: error.message,
      requestId: req.id,
      url: req.originalUrl,
    }, 'Client error');
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.isOperational ? error.message : 'Internal server error',
    ...(error.errors && { errors: error.errors }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
    }),
  });
}

function normalizeError(err: Error): AppError {
  if (err instanceof AppError) return err;

  // Mongoose validation error
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return new AppError('Validation failed', 422, errors);
  }

  // Mongoose cast error (invalid ObjectId)
  if (err instanceof mongoose.Error.CastError) {
    return new AppError(`Invalid ${err.path}: ${err.value}`, 400);
  }

  // MongoDB duplicate key
  if ((err as any).code === 11000) {
    const field = Object.keys((err as any).keyValue)[0];
    return new AppError(`Duplicate value for field: ${field}`, 409);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return new AppError('Invalid token', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return new AppError('Token expired', 401);
  }

  // Unknown error — treat as 500
  return new AppError(err.message, 500, undefined, false);
}
```

### 4.3 Not Found Handler

```typescript
// src/common/middleware/not-found.ts
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
}
```

---

## 5. Async Handler Utility (Express 4 — Still Useful)

```typescript
// src/common/utils/async-handler.ts
import type { Request, Response, NextFunction } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export function asyncHandler(fn: AsyncRequestHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

In Express 5, this wrapper is no longer needed — but it's still a common interview question and useful for Express 4 codebases.

---

## 6. Middleware Composition Patterns

### Chain Multiple Middleware per Route

```typescript
router.post(
  '/orders',
  authenticate,                    // 1. Verify JWT
  authorize('user', 'admin'),     // 2. Check role
  validate(createOrderSchema),     // 3. Validate body
  asyncHandler(orderController.create) // 4. Handle request
);
```

### Conditional Middleware

```typescript
function conditionalMiddleware(
  condition: (req: Request) => boolean,
  middleware: Middleware
): Middleware {
  return (req, res, next) => {
    if (condition(req)) {
      return middleware(req, res, next);
    }
    next();
  };
}

// Only apply rate limit in production
app.use(
  conditionalMiddleware(
    () => process.env.NODE_ENV === 'production',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 100 })
  )
);
```

### Middleware Combiner

```typescript
function combineMiddleware(...middlewares: Middleware[]): Middleware {
  return middlewares.reduce((combined, mw) => {
    return (req, res, next) => {
      combined(req, res, (err) => {
        if (err) return next(err);
        mw(req, res, next);
      });
    };
  });
}

const protectedRoute = combineMiddleware(authenticate, authorize('admin'));
router.delete('/users/:id', protectedRoute, deleteUser);
```

---

## 7. Extending Express Types

```typescript
// src/common/types/express.d.ts
import type { AuthPayload } from '../middleware/authenticate';

declare global {
  namespace Express {
    interface Request {
      id: string;
      user?: AuthPayload;
      startTime?: number;
    }
  }
}

export {};
```

---

## 8. Common Mistakes

| Mistake | Why It's Bad | Fix |
|---------|-------------|-----|
| Wrong middleware order | Security headers not set before routes | Follow the order in Section 2 |
| Error handler with 3 params | Express treats it as regular middleware | Must be `(err, req, res, next)` — all 4 |
| Calling `next()` after `res.json()` | Headers already sent error | Use `return res.json()` |
| Not handling async errors | Unhandled promise → crash | Use `asyncHandler` or Express 5 |
| Putting error handler before routes | Never catches route errors | Error handlers must be registered last |
| Hardcoded rate limits | Can't adjust per environment | Use config/env vars |
| No request ID | Can't trace requests in logs | Add request-id middleware |
| Missing CORS for SPA | Frontend can't call API | Configure cors() properly |

---

## 9. Interview-Ready Answers

### "What is middleware in Express?"

> "Middleware functions are functions that have access to the request, response, and the next middleware in the chain. They can execute code, modify req/res, end the cycle, or call next(). Express uses a stack-based architecture — middleware is executed in the order it's registered. Error-handling middleware has a special 4-parameter signature and is skipped during normal flow, only invoked when `next(err)` is called."

### "How would you implement authentication middleware?"

> "I extract the JWT from the Authorization header, verify it against the secret, and attach the decoded payload to `req.user`. If the token is missing or invalid, I throw an AppError with status 401. For authorization, I use a factory function that takes allowed roles and returns middleware that checks `req.user.role` against the allowed list. This composes cleanly: `router.delete('/users/:id', authenticate, authorize('admin'), handler)`."

### "What's the difference between application-level and route-level middleware?"

> "Application-level middleware is registered with `app.use()` and runs on every request matching the path. Route-level middleware is attached to a specific Router instance and only runs when that router is matched. Error-handling middleware is a special application-level middleware with 4 parameters that acts as a centralized error handler."

---

> **Next:** [05-authentication-authz.md](05-authentication-authz.md) — JWT, OAuth 2.0, RBAC, and session management
