# 02 — Express 5 Deep Dive

> **TL;DR:** Express 5 brings native promise support (no more `asyncHandler` wrapper needed), improved path matching with `path-to-regexp` v8, removed deprecated methods, and better TypeScript types. Understand the request lifecycle: incoming request → middleware stack → route matching → handler → response. Express is a thin layer over Node's `http` module.

---

## 1. Express 5 — What Changed from Express 4

Express 5 was in alpha for years and has reached stable. Key changes:

| Feature | Express 4 | Express 5 |
|---------|-----------|-----------|
| **Async error handling** | Requires wrapper or `next(err)` | Native — rejected promises auto-call `next(err)` |
| **Path matching** | `path-to-regexp` v1 | `path-to-regexp` v8 (stricter, more predictable) |
| **`req.query`** | Mutable, uses `qs` library | Configurable getter, `qs` optional |
| **`req.host`** | Stripped port | Returns full host with port |
| **`req.params`** | Named + unnamed captures | Named captures only |
| **Removed methods** | — | `res.json(obj, status)`, `res.send(status)` removed |
| **`app.del()`** | Alias for `.delete()` | Removed |
| **Return value** | `void` | Route handlers can `return` a response |

### Upgrading

```bash
npm install express@5
npm install @types/express@5
```

### Native Async Error Handling (The Biggest Win)

```typescript
// Express 4 — needed async wrapper
app.get('/users', asyncHandler(async (req, res) => {
  const users = await userService.getAll(); // if this throws, app crashes
  res.json(users);
}));

// Express 5 — native promise support
app.get('/users', async (req, res) => {
  const users = await userService.getAll(); // rejection auto-forwarded to error handler
  res.json(users);
});
```

---

## 2. Express Internals — How It Works Under the Hood

Express is fundamentally:

```typescript
const http = require('node:http');
const app = express();

// express() returns a function: (req, res) => void
const server = http.createServer(app);
server.listen(3000);
```

The `app` function is a request handler that:
1. Receives the raw `IncomingMessage` and `ServerResponse`
2. Enhances them into Express's `req` and `res` objects
3. Iterates through the middleware/route stack
4. Calls `next()` to move to the next middleware

### The Stack

```
app._router.stack = [
  Layer { route: undefined, handle: queryParser },     // built-in
  Layer { route: undefined, handle: expressInit },      // built-in
  Layer { route: undefined, handle: cors },             // app.use(cors())
  Layer { route: undefined, handle: jsonParser },       // app.use(express.json())
  Layer { route: undefined, handle: helmet },           // app.use(helmet())
  Layer { route: Route('/api/users'), handle: ... },    // app.get('/api/users', ...)
  Layer { route: Route('/api/orders'), handle: ... },   // app.get('/api/orders', ...)
  Layer { route: undefined, handle: errorHandler },     // app.use(errorHandler)
]
```

Each Layer has:
- **path** — what URL pattern to match
- **handle** — the middleware function
- **route** — if it's a route (vs middleware), the Route object with HTTP method handlers

---

## 3. Request Lifecycle — Complete Flow

```
Client sends HTTP request
         │
         ▼
┌─────────────────────────┐
│  Node.js http.Server    │  ← Raw TCP → HTTP parsing
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Express app function   │  ← (req, res, next)
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  1. Query parser        │  ← Parse ?key=value into req.query
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  2. express.json()      │  ← Parse JSON body into req.body
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  3. cors()              │  ← Set CORS headers
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  4. helmet()            │  ← Set security headers
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  5. requestId()         │  ← Attach UUID
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  6. Route matching      │  ← Match method + path
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  7. Route middleware     │  ← authenticate, validate
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  8. Route handler        │  ← Controller method
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  9. Error handler        │  ← If any middleware called next(err)
└─────────────────────────┘
```

---

## 4. Router — Modular Route Organization

```typescript
// src/app.ts
import express from 'express';
import { userRoutes } from './modules/user/user.routes';
import { orderRoutes } from './modules/order/order.routes';
import { authRoutes } from './modules/auth/auth.routes';

const app = express();

// Global middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/orders', orderRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export { app };
```

### Nested Routers

```typescript
// src/modules/order/order.routes.ts
import { Router } from 'express';
import { orderItemRoutes } from './order-item.routes';

const router = Router();

router.get('/', getAllOrders);
router.get('/:orderId', getOrderById);
router.post('/', createOrder);

// Nested: /api/v1/orders/:orderId/items
router.use('/:orderId/items', orderItemRoutes);

export { router as orderRoutes };
```

### Route Parameter Middleware

```typescript
// Validate and load entity before any route handler that uses :userId
router.param('userId', async (req, _res, next, id) => {
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return next(new AppError('Invalid user ID format', 400));
  }
  const user = await User.findById(id);
  if (!user) return next(new AppError('User not found', 404));
  req.user = user;
  next();
});
```

---

## 5. Request Object Deep Dive

```typescript
// Key req properties
req.params       // { id: '123' } from /users/:id
req.query        // { page: '1', sort: 'name' } from ?page=1&sort=name
req.body         // Parsed JSON body (needs express.json())
req.headers      // All headers (lowercase keys)
req.method       // 'GET', 'POST', etc.
req.path         // '/api/v1/users' (without query string)
req.originalUrl  // '/api/v1/users?page=1' (full URL)
req.ip           // Client IP (respects trust proxy)
req.hostname     // 'example.com'
req.protocol     // 'https'
req.secure       // true if HTTPS
req.xhr          // true if X-Requested-With: XMLHttpRequest
req.cookies      // Parsed cookies (needs cookie-parser)
req.signedCookies // Signed cookies

// Useful methods
req.get('Content-Type')      // Get header value
req.is('json')               // Check Content-Type
req.accepts('json')          // Content negotiation
```

---

## 6. Response Object Deep Dive

```typescript
// Setting status and sending
res.status(201).json({ data: user });
res.status(204).end();
res.sendStatus(404);                    // Sends "Not Found" text

// Headers
res.set('X-Request-Id', uuid);
res.set({ 'X-Powered-By': 'MyApp', 'X-Version': '1.0' });
res.append('Set-Cookie', 'token=abc');  // Append (not replace)

// Cookies
res.cookie('session', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000,         // 1 day in ms
  signed: true,
});
res.clearCookie('session');

// Redirect
res.redirect(301, '/new-url');

// File download
res.download('/path/to/file.pdf');
res.sendFile('/absolute/path/to/file.html');

// Streaming
res.type('application/json');
stream.pipe(res);
```

---

## 7. App Configuration — Production Setup

```typescript
// src/app.ts — complete production setup
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import { requestId } from './common/middleware/request-id';
import { httpLogger } from './common/middleware/http-logger';
import { errorHandler } from './common/middleware/error-handler';
import { notFoundHandler } from './common/middleware/not-found';

const app = express();

// Trust proxy (required behind load balancer / nginx)
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:4200',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                    // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests' },
}));

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Compression
app.use(compression());

// Request ID + HTTP logging
app.use(requestId);
app.use(httpLogger);

// Disable fingerprinting
app.disable('x-powered-by');

// Routes
app.use('/api/v1', apiRouter);

// Error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export { app };
```

---

## 8. Server Bootstrap — Separate from App

```typescript
// src/server.ts
import { app } from './app';
import { config } from './config';
import { connectDatabase } from './infrastructure/database/connection';
import { logger } from './config/logger';

async function bootstrap() {
  await connectDatabase();

  const server = app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port} in ${config.env} mode`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    server.close(async () => {
      logger.info('HTTP server closed');
      // Close DB connections, flush logs, etc.
      process.exit(0);
    });

    // Force shutdown after 30s
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Unhandled errors
  process.on('unhandledRejection', (reason: Error) => {
    logger.fatal({ err: reason }, 'Unhandled Rejection');
    throw reason; // Let it become uncaughtException
  });

  process.on('uncaughtException', (error: Error) => {
    logger.fatal({ err: error }, 'Uncaught Exception — shutting down');
    process.exit(1);
  });
}

bootstrap();
```

**Why separate `app.ts` and `server.ts`?**
- `app.ts` is importable for testing (supertest) without starting a server
- `server.ts` handles the lifecycle (listen, shutdown, error handling)
- Clean separation of concerns

---

## 9. Express 5 Path Matching Changes

```typescript
// Express 4 (loose matching)
app.get('/users/:id', handler);     // Matches /users/123 AND /users/123/ (trailing slash)
app.get('/users/*', handler);       // Matches any sub-path

// Express 5 (strict matching)
app.get('/users/:id', handler);     // Matches /users/123 only
app.get('/users/:id{/}?', handler); // Explicitly allow trailing slash
app.get('/users/*path', handler);   // Named wildcard (must have a name)

// Express 5 regex in params
app.get('/users/:id(\\d+)', handler);          // Only numeric IDs
app.get('/files/*filepath', handler);           // Capture entire sub-path
app.get('/api/:version(v\\d+)/:resource', h);  // /api/v1/users
```

---

## 10. Common Mistakes

| Mistake | Why It's Bad | Fix |
|---------|-------------|-----|
| Not calling `next()` in middleware | Request hangs forever | Always call `next()` or send a response |
| Error handler with 3 params | Express ignores it as error handler | Must have exactly 4 params `(err, req, res, next)` |
| `app.listen()` in the same file as routes | Can't import app for testing | Separate `app.ts` and `server.ts` |
| Sending response twice | `ERR_HTTP_HEADERS_SENT` crash | Use `return res.json()` pattern |
| No `trust proxy` behind nginx | `req.ip` returns `127.0.0.1` | `app.set('trust proxy', 1)` |
| Parsing huge bodies | Memory DoS attack | Set `limit: '10kb'` on `express.json()` |
| Sync blocking in handlers | Blocks the event loop | Always use async/await |
| Not using `compression` | Wastes bandwidth | `app.use(compression())` |

---

## 11. Interview-Ready Answers

### "How does Express middleware work?"

> "Express maintains an ordered stack of Layer objects. Each Layer has a path matcher and a handler function. When a request comes in, Express iterates through the stack. For each Layer, it checks if the request path matches. If it does, it calls the handler with `(req, res, next)`. Calling `next()` moves to the next matching Layer. Calling `next(err)` skips to the next error-handling middleware (4-param signature). If a handler sends a response without calling `next()`, the chain stops."

### "What's the difference between `app.use()` and `app.get()`?"

> "`app.use()` matches any HTTP method and matches path prefixes — `app.use('/api', handler)` matches `/api`, `/api/users`, `/api/anything`. `app.get()` only matches GET requests and requires exact path match (excluding the query string). Use `.use()` for middleware and router mounting, `.get()/.post()` etc. for endpoint handlers."

### "How do you handle errors in Express?"

> "In Express 5, rejected promises in async handlers are automatically forwarded to the error-handling middleware. I define a global error handler as the last middleware with the signature `(err, req, res, next)`. Custom error classes carry status codes and operational flags. This centralizes all error formatting and logging in one place. For Express 4, I use an `asyncHandler` wrapper that catches rejections and calls `next(err)`."

---

> **Next:** [03-mongodb-mongoose.md](03-mongodb-mongoose.md) — Schema design, indexing, aggregation, and transactions
