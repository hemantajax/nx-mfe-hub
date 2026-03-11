# 06 — Validation & Error Handling

> **TL;DR:** Validate every input at the API boundary using Zod (TypeScript-first, zero dependencies). Never trust client data. Use a custom AppError class hierarchy with operational vs programming error distinction. Centralize all error handling in one global middleware. Return consistent error response shapes.

---

## 1. Validation Philosophy — Defense in Depth

```
Client Input
    │
    ▼
┌──────────────────────────┐
│  1. API Gateway / WAF    │  ← Block obviously malicious requests
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  2. Express Middleware    │  ← Validate schema shape (Zod)
│     (Request Validation) │     Type-safe before it hits code
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  3. Service Layer        │  ← Business rule validation
│     (Business Validation)│     (e.g., "user balance sufficient")
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  4. Database Layer       │  ← Mongoose schema validation
│     (Schema Validation)  │     (unique, required, enum, min/max)
└──────────────────────────┘
```

**Validate at every layer, but validate different things:**
- API boundary → shape, types, format
- Service → business rules, authorization
- Database → data integrity, uniqueness

---

## 2. Zod — Modern Validation (Recommended)

### Why Zod Over Joi?

| Feature | Zod | Joi |
|---------|-----|-----|
| TypeScript inference | First-class (`z.infer<>`) | Requires separate types |
| Bundle size | ~13KB | ~35KB |
| Dependencies | Zero | Zero |
| Ecosystem | Growing fast | Mature |
| Async validation | Built-in | Built-in |
| Transforms | Built-in | Limited |
| Error formatting | Structured | Structured |

### Basic Schemas

```typescript
import { z } from 'zod';

// Primitives
const emailSchema = z.string().email();
const ageSchema = z.number().int().min(0).max(150);
const uuidSchema = z.string().uuid();
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

// Object
const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email'),
    name: z.string().min(2).max(100).trim(),
    password: z
      .string()
      .min(8, 'Minimum 8 characters')
      .regex(/[A-Z]/, 'Must contain uppercase letter')
      .regex(/[a-z]/, 'Must contain lowercase letter')
      .regex(/[0-9]/, 'Must contain number')
      .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
    role: z.enum(['user', 'admin', 'moderator']).default('user'),
    tags: z.array(z.string()).max(10).optional(),
    address: z.object({
      street: z.string(),
      city: z.string(),
      zip: z.string().regex(/^\d{5}(-\d{4})?$/),
    }).optional(),
  }),
});

// Infer the TypeScript type from the schema
type CreateUserInput = z.infer<typeof createUserSchema>['body'];
// Result: { email: string; name: string; password: string; role: 'user' | 'admin' | 'moderator'; ... }
```

### Advanced Patterns

```typescript
// Refinements (custom validation)
const dateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine(
  (data) => data.endDate > data.startDate,
  { message: 'End date must be after start date', path: ['endDate'] }
);

// Transforms (clean input)
const sanitizedStringSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((val) => val.replace(/[<>]/g, ''));

// Discriminated unions
const notificationSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('email'), email: z.string().email() }),
  z.object({ type: z.literal('sms'), phone: z.string().regex(/^\+\d{10,15}$/) }),
  z.object({ type: z.literal('push'), deviceToken: z.string() }),
]);

// Partial (for update DTOs — all fields optional)
const updateUserSchema = createUserSchema.shape.body.partial().omit({ password: true });

// Extend
const adminUserSchema = createUserSchema.shape.body.extend({
  department: z.string(),
  accessLevel: z.number().int().min(1).max(10),
});

// Pagination query schema (reusable)
const paginationSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('desc'),
    search: z.string().max(200).optional(),
  }),
});
```

### Validation Middleware

```typescript
// src/common/middleware/validate.ts
import type { Request, Response, NextFunction } from 'express';
import { type AnyZodObject, type ZodError } from 'zod';

export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      throw new AppError('Validation failed', 422, errors);
    }

    // Replace with parsed (transformed/defaulted) values
    req.body = result.data.body ?? req.body;
    req.query = result.data.query ?? req.query;
    req.params = result.data.params ?? req.params;

    next();
  };
}

function formatZodErrors(error: ZodError) {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));
}
```

---

## 3. Joi — Alternative (Legacy/Enterprise)

```typescript
import Joi from 'joi';

const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).max(100).trim().required(),
  password: Joi.string()
    .min(8)
    .pattern(/[A-Z]/, 'uppercase')
    .pattern(/[0-9]/, 'number')
    .required(),
  role: Joi.string().valid('user', 'admin', 'moderator').default('user'),
  tags: Joi.array().items(Joi.string()).max(10).optional(),
});

// Joi validation middleware
function validateJoi(schema: Joi.ObjectSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      throw new AppError('Validation failed', 422, errors);
    }

    req[source] = value;
    next();
  };
}
```

---

## 4. Error Handling Architecture

### 4.1 Operational vs Programming Errors

| Type | Example | Handling |
|------|---------|----------|
| **Operational** | Invalid input, not found, auth failure, timeout | Expected. Return proper HTTP status + message |
| **Programming** | TypeError, null reference, syntax error | Bug. Log + return generic 500 |

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
```

### 4.2 Error Class Hierarchy

```typescript
// 400 — Bad Request
export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400);
  }
}

// 401 — Unauthorized
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
  }
}

// 403 — Forbidden
export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
  }
}

// 404 — Not Found
export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

// 409 — Conflict
export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
  }
}

// 422 — Unprocessable Entity
export class ValidationError extends AppError {
  constructor(errors: unknown[]) {
    super('Validation failed', 422, errors);
  }
}

// 429 — Too Many Requests
export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super('Too many requests', 429);
  }
}
```

### 4.3 Global Error Handler (Production-Grade)

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
  const error = normalizeError(err);

  // Log based on severity
  const logContext = {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    statusCode: error.statusCode,
    userId: req.user?.userId,
  };

  if (!error.isOperational) {
    logger.error({ ...logContext, err: error, stack: error.stack }, 'Programming error');
  } else if (error.statusCode >= 500) {
    logger.error(logContext, error.message);
  } else {
    logger.warn(logContext, error.message);
  }

  // Send response
  const response: Record<string, unknown> = {
    success: false,
    message: error.isOperational ? error.message : 'Internal server error',
  };

  if (error.errors?.length) {
    response.errors = error.errors;
  }

  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
    response.originalError = err.message;
  }

  res.status(error.statusCode).json(response);
}

function normalizeError(err: Error): AppError {
  // Already an AppError
  if (err instanceof AppError) return err;

  // Mongoose validation error
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
      value: (e as any).value,
    }));
    return new AppError('Database validation failed', 422, errors);
  }

  // Mongoose cast error (invalid ObjectId)
  if (err instanceof mongoose.Error.CastError) {
    return new AppError(`Invalid value for ${err.path}: ${err.value}`, 400);
  }

  // MongoDB duplicate key (code 11000)
  if ('code' in err && (err as any).code === 11000) {
    const field = Object.keys((err as any).keyValue || {})[0] || 'unknown';
    return new AppError(`Duplicate value for field: ${field}`, 409);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') return new AppError('Invalid token', 401);
  if (err.name === 'TokenExpiredError') return new AppError('Token expired', 401);

  // Multer file errors
  if (err.name === 'MulterError') {
    const messages: Record<string, string> = {
      LIMIT_FILE_SIZE: 'File too large',
      LIMIT_FILE_COUNT: 'Too many files',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field',
    };
    return new AppError(messages[(err as any).code] || 'File upload error', 400);
  }

  // SyntaxError (malformed JSON body)
  if (err instanceof SyntaxError && 'body' in err) {
    return new AppError('Malformed JSON in request body', 400);
  }

  // Unknown — programming error
  return new AppError(err.message || 'Internal server error', 500, undefined, false);
}
```

---

## 5. Input Sanitization

```typescript
// src/common/middleware/sanitize.ts
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss';

// Prevent NoSQL injection: remove $ and . from req.body/query/params
export const mongoSanitizeMiddleware = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn({ requestId: req.id, key }, 'Sanitized malicious input');
  },
});

// XSS sanitization helper
export function sanitizeHtml(input: string): string {
  return xss(input, {
    whiteList: {},           // Allow no HTML tags
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script'],
  });
}

// Sanitize all string fields in request body
export function sanitizeBody(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    req.body = deepSanitize(req.body);
  }
  next();
}

function deepSanitize(obj: any): any {
  if (typeof obj === 'string') return sanitizeHtml(obj);
  if (Array.isArray(obj)) return obj.map(deepSanitize);
  if (obj && typeof obj === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = deepSanitize(value);
    }
    return sanitized;
  }
  return obj;
}
```

---

## 6. File Upload Validation

```typescript
import multer from 'multer';
import path from 'node:path';
import { AppError } from '../errors/app-error';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5,
  },
  fileFilter(_req, file, callback) {
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      callback(new AppError(`File type ${file.mimetype} is not allowed`, 400));
      return;
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    if (!validExtensions.includes(ext)) {
      callback(new AppError(`File extension ${ext} is not allowed`, 400));
      return;
    }

    callback(null, true);
  },
});

// Usage
router.post('/avatar', authenticate, upload.single('avatar'), updateAvatar);
router.post('/documents', authenticate, upload.array('files', 5), uploadDocuments);
```

---

## 7. API Error Response Standards

### Consistent Error Format

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "body.email", "message": "Invalid email format", "code": "invalid_string" },
    { "field": "body.password", "message": "Minimum 8 characters", "code": "too_small" }
  ]
}
```

### HTTP Status Code Guide

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST that creates a resource |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Malformed request (bad JSON, invalid params) |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource (unique constraint violation) |
| 422 | Unprocessable Entity | Valid JSON but fails business validation |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server failure |
| 503 | Service Unavailable | Server overloaded or in maintenance |

---

## 8. Common Mistakes

| Mistake | Why It's Bad | Fix |
|---------|-------------|-----|
| No input validation | Injection attacks, garbage data, crashes | Validate every input with Zod |
| Validating only in the client | Client validation is bypassed easily | Always validate server-side |
| Generic "Something went wrong" | Unhelpful for debugging | Return specific operational error messages |
| Stack traces in production | Info leak, security risk | Only show stack in development |
| Not sanitizing user input | XSS and NoSQL injection | Use `express-mongo-sanitize` + XSS filter |
| Returning 200 for errors | Confuses clients, breaks API contracts | Use proper HTTP status codes |
| Not validating file types | Users can upload executables | Check both MIME type and extension |
| Separate TS types and Zod schemas | Drift between validation and types | Infer types from Zod: `z.infer<>` |

---

## 9. Interview-Ready Answers

### "How do you handle validation in a Node.js API?"

> "I validate at the API boundary using Zod middleware that checks `body`, `query`, and `params` against typed schemas. Zod gives me TypeScript type inference for free — my DTOs are derived from validation schemas, so they can never drift. The middleware returns 422 with structured error details on failure. Business validation happens in the service layer. Database-level constraints (unique, enum) are the last line of defense. I also sanitize inputs against NoSQL injection and XSS."

### "How do you handle errors globally?"

> "I use a centralized error-handling middleware with the `(err, req, res, next)` signature. All custom errors extend an `AppError` base class that carries `statusCode`, `isOperational` flag, and optional `errors` array. The handler normalizes known error types (Mongoose validation, JWT errors, duplicate keys) into AppError instances. Operational errors return specific messages; programming errors return a generic 500. Everything is logged with request context (request ID, user ID, URL)."

---

> **Next:** [07-logging-observability.md](07-logging-observability.md) — Pino/Winston, structured logging, APM, health checks
