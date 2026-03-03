# 07 — Logging & Observability

> **TL;DR:** Use Pino for structured JSON logging (5x faster than Winston). Log with context (requestId, userId, service). Use log levels properly: error for failures, warn for recoverable issues, info for business events, debug for troubleshooting. Implement health checks, metrics endpoints, and distributed tracing for production observability.

---

## 1. The Three Pillars of Observability

```
┌─────────────────────────────────────────────────┐
│               Observability                      │
│                                                  │
│  ┌────────┐   ┌─────────┐   ┌───────────────┐  │
│  │  Logs  │   │ Metrics │   │    Traces     │  │
│  │        │   │         │   │               │  │
│  │ What   │   │ How     │   │ Where / Why   │  │
│  │happened│   │ much    │   │ the request   │  │
│  │        │   │         │   │ traveled      │  │
│  └────────┘   └─────────┘   └───────────────┘  │
│                                                  │
│  Logs:    "User 123 login failed — wrong pw"    │
│  Metrics: "auth_failures_total: 47 in 5 min"   │
│  Traces:  "POST /login → AuthService → DB (45ms)" │
└─────────────────────────────────────────────────┘
```

---

## 2. Pino — Fast Structured Logging

### Why Pino Over Winston?

| Feature | Pino | Winston |
|---------|------|---------|
| **Performance** | ~5x faster (low overhead) | Moderate |
| **Output** | JSON by default (structured) | Configurable (text/JSON) |
| **Child loggers** | First-class | Limited |
| **Async I/O** | Worker thread transport | Sync by default |
| **Redaction** | Built-in path-based | Manual |
| **Serializers** | Built-in for err, req, res | Manual |
| **Pretty print** | `pino-pretty` in dev | Built-in |

### Basic Setup

```typescript
// src/config/logger.ts
import pino from 'pino';
import { config } from './index';

export const logger = pino({
  level: config.logLevel || 'info',
  
  // Redact sensitive fields
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'body.password',
      'body.token',
      'body.creditCard',
      '*.password',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },

  // Custom serializers
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },

  // Base context attached to every log
  base: {
    service: config.serviceName,
    version: config.version,
    env: config.env,
  },

  // Transport for development (pretty print)
  ...(config.env === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        ignore: 'pid,hostname',
      },
    },
  }),

  // Timestamp format
  timestamp: pino.stdTimeFunctions.isoTime,
});
```

### Log Levels (Use Correctly!)

```typescript
// FATAL — app is crashing, immediate attention needed
logger.fatal({ err }, 'Database connection failed — shutting down');

// ERROR — operation failed, but app continues
logger.error({ err, userId, orderId }, 'Payment processing failed');

// WARN — something unexpected but handled
logger.warn({ userId, attempts: 4 }, 'Multiple failed login attempts');

// INFO — business events (audit trail)
logger.info({ userId, action: 'login' }, 'User logged in');
logger.info({ orderId, amount: 99.99 }, 'Order placed successfully');

// DEBUG — development troubleshooting
logger.debug({ query, params }, 'Executing database query');

// TRACE — very granular (rarely used in production)
logger.trace({ headers: req.headers }, 'Incoming request headers');
```

### Child Loggers (Request-Scoped Context)

```typescript
// Create a child logger per request with context
export function requestLogger(req: Request, _res: Response, next: NextFunction) {
  req.log = logger.child({
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?.userId,
  });

  req.log.info('Request received');
  next();
}

// Use in controllers/services
class OrderService {
  async createOrder(data: CreateOrderDto, log: pino.Logger) {
    log.info({ items: data.items.length }, 'Creating order');
    
    const order = await this.orderRepo.create(data);
    log.info({ orderId: order.id, total: order.total }, 'Order created');
    
    return order;
  }
}
```

---

## 3. HTTP Request Logging

```typescript
// src/common/middleware/http-logger.ts
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../config/logger';

export function httpLogger(req: Request, res: Response, next: NextFunction) {
  const start = performance.now();

  // Log on response finish
  res.on('finish', () => {
    const duration = Math.round(performance.now() - start);
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length'),
      requestId: req.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.userId,
    };

    if (res.statusCode >= 500) {
      logger.error(logData, 'Server error response');
    } else if (res.statusCode >= 400) {
      logger.warn(logData, 'Client error response');
    } else if (duration > 3000) {
      logger.warn(logData, 'Slow request detected');
    } else {
      logger.info(logData, 'Request completed');
    }
  });

  next();
}
```

### Production Log Output (JSON)

```json
{
  "level": 30,
  "time": "2026-03-04T10:15:30.123Z",
  "service": "order-api",
  "version": "1.2.3",
  "env": "production",
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "method": "POST",
  "url": "/api/v1/orders",
  "status": 201,
  "duration": "45ms",
  "userId": "user_abc123",
  "msg": "Request completed"
}
```

This format is parseable by ELK Stack, Datadog, CloudWatch, Grafana Loki, etc.

---

## 4. Winston — Alternative Setup

```typescript
// src/config/logger-winston.ts
import winston from 'winston';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}${stack ? '\n' + stack : ''}`;
  })
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'api',
  },
  transports: [
    new winston.transports.Console(),
    // File transport for production
    ...(process.env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error', maxsize: 5242880, maxFiles: 5 }),
          new winston.transports.File({ filename: 'logs/combined.log', maxsize: 5242880, maxFiles: 5 }),
        ]
      : []),
  ],
  // Don't exit on uncaughtException — let graceful shutdown handle it
  exitOnError: false,
});
```

---

## 5. Health Check Endpoints

```typescript
// src/modules/health/health.controller.ts
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { redisClient } from '../../infrastructure/cache/redis.client';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: Record<string, ComponentHealth>;
}

interface ComponentHealth {
  status: 'up' | 'down';
  latency?: string;
  message?: string;
}

export class HealthController {
  // Lightweight — for load balancer / Kubernetes liveness probe
  async liveness(_req: Request, res: Response) {
    res.json({ status: 'ok' });
  }

  // Detailed — for Kubernetes readiness probe
  async readiness(_req: Request, res: Response) {
    const health = await this.checkHealth();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  }

  private async checkHealth(): Promise<HealthStatus> {
    const checks: Record<string, ComponentHealth> = {};

    // MongoDB check
    checks.mongodb = await this.checkMongo();

    // Redis check
    checks.redis = await this.checkRedis();

    // Memory check
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    checks.memory = {
      status: heapUsedMB < 512 ? 'up' : 'down',
      message: `${heapUsedMB}MB heap used`,
    };

    const allUp = Object.values(checks).every((c) => c.status === 'up');
    const allDown = Object.values(checks).every((c) => c.status === 'down');

    return {
      status: allUp ? 'healthy' : allDown ? 'unhealthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      version: process.env.npm_package_version || '0.0.0',
      checks,
    };
  }

  private async checkMongo(): Promise<ComponentHealth> {
    const start = performance.now();
    try {
      await mongoose.connection.db!.admin().ping();
      return { status: 'up', latency: `${Math.round(performance.now() - start)}ms` };
    } catch {
      return { status: 'down', message: 'MongoDB unreachable' };
    }
  }

  private async checkRedis(): Promise<ComponentHealth> {
    const start = performance.now();
    try {
      await redisClient.ping();
      return { status: 'up', latency: `${Math.round(performance.now() - start)}ms` };
    } catch {
      return { status: 'down', message: 'Redis unreachable' };
    }
  }
}

// Routes
router.get('/health/live', healthController.liveness);
router.get('/health/ready', healthController.readiness);
```

---

## 6. Metrics with Prometheus

```typescript
// src/common/middleware/metrics.ts
import client from 'prom-client';

// Collect default Node.js metrics (CPU, memory, event loop lag)
client.collectDefaultMetrics({ prefix: 'node_' });

// Custom: HTTP request duration
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 3, 5, 10],
});

// Custom: HTTP request count
const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// Custom: Active connections
const activeConnections = new client.Gauge({
  name: 'http_active_connections',
  help: 'Number of active HTTP connections',
});

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const end = httpRequestDuration.startTimer();
  activeConnections.inc();

  res.on('finish', () => {
    const route = req.route?.path || req.path;
    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode.toString(),
    };

    end(labels);
    httpRequestTotal.inc(labels);
    activeConnections.dec();
  });

  next();
}

// Metrics endpoint (scraped by Prometheus)
router.get('/metrics', async (_req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
});
```

---

## 7. Distributed Tracing with OpenTelemetry

```typescript
// src/infrastructure/telemetry/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'order-api',
    [ATTR_SERVICE_VERSION]: '1.0.0',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-mongodb': { enabled: true },
      '@opentelemetry/instrumentation-http': { enabled: true },
    }),
  ],
});

export function initTracing() {
  sdk.start();
  process.on('SIGTERM', () => sdk.shutdown());
}
```

---

## 8. Logging Best Practices

### Do's

```typescript
// 1. Log with context (structured data)
logger.info({ userId, orderId, amount }, 'Order placed');

// 2. Use appropriate log levels
logger.error({ err, context }, 'Payment failed');        // Something broke
logger.warn({ userId, ip }, 'Suspicious login attempt');  // Attention needed
logger.info({ userId }, 'User signed up');                // Business event

// 3. Log at boundaries (entry/exit of important operations)
logger.info({ orderId }, 'Processing order');
// ... processing ...
logger.info({ orderId, duration }, 'Order processed');

// 4. Include request ID in every log
logger.info({ requestId: req.id, userId }, 'Fetching user profile');
```

### Don'ts

```typescript
// 1. Never log sensitive data
logger.info({ password, ssn, creditCard }); // NEVER!

// 2. Don't log in tight loops
for (const item of thousandItems) {
  logger.debug({ item }); // Floods logs, kills performance
}
// Instead: log summary
logger.info({ count: thousandItems.length }, 'Processed items');

// 3. Don't use console.log in production
console.log('User created'); // No structure, no levels, no context

// 4. Don't log and throw
logger.error(err);
throw err; // The error handler will log it — double logging!
```

---

## 9. Common Mistakes

| Mistake | Why It's Bad | Fix |
|---------|-------------|-----|
| Using `console.log` | No levels, no structure, no context | Use Pino/Winston |
| Logging sensitive data | Compliance violation, security risk | Redact passwords, tokens, PII |
| No request ID in logs | Can't trace a request across services | Add request-id middleware |
| Too verbose in production | Storage costs, noise | Set level to `info` in production |
| Not logging errors with stack | Can't debug production issues | Pass `err` object to Pino |
| Synchronous file logging | Blocks event loop | Use Pino async transports |
| No health check endpoint | Can't automate failover | Add `/health/live` and `/health/ready` |
| Missing log rotation | Disk fills up | Use `pino-roll` or logrotate |

---

## 10. Interview-Ready Answers

### "How do you implement logging in production?"

> "I use Pino for structured JSON logging — it's 5x faster than Winston with minimal overhead. Every log entry includes a request ID, timestamp, service name, and relevant context. I configure log levels: `info` in production, `debug` in staging. Sensitive fields like passwords and tokens are automatically redacted. Logs are shipped to a centralized platform (ELK, Datadog, or CloudWatch) where I create dashboards and alerts. Child loggers per request carry context automatically so I can trace a request through all log entries."

### "How do you monitor a Node.js application?"

> "I implement three pillars: Structured logs (Pino → ELK/Datadog), metrics (Prometheus client with HTTP histograms, custom counters, and Node.js runtime metrics scraped into Grafana), and traces (OpenTelemetry auto-instrumentation that traces requests across services). Health check endpoints at `/health/live` for Kubernetes liveness and `/health/ready` for readiness (checks DB, Redis, memory). I set up alerts on error rate spikes, latency P99 degradation, and memory threshold breaches."

---

> **Next:** [08-security.md](08-security.md) — OWASP Top 10, Helmet, rate limiting, injection prevention
