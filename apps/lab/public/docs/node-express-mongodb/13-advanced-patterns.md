# 13 — Advanced Patterns

> **TL;DR:** Beyond CRUD: CQRS separates read/write models for scalability. Event-driven architecture decouples services through events. Job queues (BullMQ) handle background work. The Repository pattern abstracts data access. API versioning prevents breaking clients. WebSockets enable real-time features. These patterns matter when systems outgrow simple REST APIs.

---

## 1. CQRS — Command Query Responsibility Segregation

### The Problem CQRS Solves

In a typical CRUD app, reads and writes use the same model:

```
Client → API → Same Service → Same Model → Same Database
```

When reads and writes have different requirements:
- Reads need denormalized data (fast, pre-joined)
- Writes need normalized data (consistent, validated)
- Read traffic is 100x write traffic

### CQRS Separates the Two

```
                    ┌─────────────────────┐
                    │    Command Side      │  ← Writes (POST, PUT, DELETE)
                    │  (Write Model)       │
Client ─────────── │  - Validates          │ ──→ Write DB (normalized)
                    │  - Business rules     │
                    │  - Emits events       │
                    └─────────────────────┘
                                │
                          Events published
                                │
                    ┌─────────────────────┐
                    │     Query Side       │  ← Reads (GET)
                    │  (Read Model)        │
Client ─────────── │  - Denormalized views │ ──→ Read DB (optimized for queries)
                    │  - No business logic  │
                    │  - Fast projections   │
                    └─────────────────────┘
```

### Implementation

```typescript
// Command side — write
export class OrderCommandService {
  async createOrder(dto: CreateOrderDto): Promise<string> {
    const order = await this.orderRepo.create(dto);

    // Emit event for read side to consume
    await this.eventBus.publish('order.created', {
      orderId: order.id,
      userId: order.userId,
      items: order.items,
      total: order.total,
      createdAt: order.createdAt,
    });

    return order.id;
  }

  async cancelOrder(orderId: string, reason: string): Promise<void> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) throw new NotFoundError('Order');
    if (order.status === 'shipped') throw new AppError('Cannot cancel shipped order', 400);

    await this.orderRepo.updateById(orderId, { status: 'cancelled', cancelReason: reason });

    await this.eventBus.publish('order.cancelled', { orderId, reason });
  }
}

// Query side — read (optimized, denormalized)
export class OrderQueryService {
  async getOrderSummary(orderId: string) {
    // Read from a denormalized view collection (pre-joined data)
    return this.orderViewRepo.findById(orderId);
  }

  async getUserOrderHistory(userId: string, page: number, limit: number) {
    return this.orderViewRepo.findByUser(userId, page, limit);
  }

  async getDashboardStats() {
    // Pre-computed aggregation, not calculated on every request
    return this.statsRepo.getLatest();
  }
}

// Event handler — keeps read model in sync
export class OrderEventHandler {
  async handleOrderCreated(event: OrderCreatedEvent) {
    await this.orderViewRepo.create({
      orderId: event.orderId,
      customerName: await this.userRepo.getNameById(event.userId),
      items: event.items,
      total: event.total,
      status: 'pending',
      createdAt: event.createdAt,
    });

    await this.statsRepo.incrementOrderCount();
    await this.statsRepo.addRevenue(event.total);
  }
}
```

---

## 2. Event-Driven Architecture

### Event Bus (In-Process)

```typescript
// src/infrastructure/events/event-bus.ts
import { EventEmitter } from 'node:events';
import { logger } from '../../config/logger';

type EventHandler = (data: unknown) => Promise<void>;

class EventBus {
  private emitter = new EventEmitter();
  private handlers = new Map<string, EventHandler[]>();

  async publish(event: string, data: unknown): Promise<void> {
    logger.info({ event, data }, 'Event published');
    this.emitter.emit(event, data);
  }

  subscribe(event: string, handler: EventHandler): void {
    this.emitter.on(event, async (data) => {
      try {
        await handler(data);
      } catch (error) {
        logger.error({ err: error, event }, 'Event handler failed');
      }
    });
  }
}

export const eventBus = new EventBus();

// Register handlers at startup
eventBus.subscribe('user.registered', async (data) => {
  await emailService.sendWelcome(data.email, data.name);
});

eventBus.subscribe('order.created', async (data) => {
  await inventoryService.reserveStock(data.items);
  await notificationService.notifyWarehouse(data);
});

eventBus.subscribe('order.cancelled', async (data) => {
  await inventoryService.releaseStock(data.orderId);
  await paymentService.processRefund(data.orderId);
});
```

### Event Bus (Distributed with Redis Pub/Sub)

```typescript
// src/infrastructure/events/redis-event-bus.ts
import { createClient } from 'redis';

export class RedisEventBus {
  private publisher;
  private subscriber;

  constructor(redisUrl: string) {
    this.publisher = createClient({ url: redisUrl });
    this.subscriber = createClient({ url: redisUrl });
  }

  async connect() {
    await this.publisher.connect();
    await this.subscriber.connect();
  }

  async publish(channel: string, data: unknown): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(data));
  }

  async subscribe(channel: string, handler: (data: unknown) => Promise<void>): Promise<void> {
    await this.subscriber.subscribe(channel, async (message) => {
      const data = JSON.parse(message);
      await handler(data);
    });
  }
}
```

---

## 3. Job Queues with BullMQ

### Setup

```typescript
// src/infrastructure/queue/queue.service.ts
import { Queue, Worker, type Job } from 'bullmq';
import { logger } from '../../config/logger';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

// Define queues
export const emailQueue = new Queue('email', { connection });
export const reportQueue = new Queue('report', { connection });
export const notificationQueue = new Queue('notification', { connection });

// Email worker
const emailWorker = new Worker('email', async (job: Job) => {
  const { to, subject, template, data } = job.data;
  logger.info({ jobId: job.id, to, subject }, 'Processing email job');

  await emailService.send({ to, subject, template, data });

  logger.info({ jobId: job.id }, 'Email sent successfully');
}, {
  connection,
  concurrency: 5,
  limiter: {
    max: 10,
    duration: 1000, // 10 emails per second
  },
});

emailWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Email job failed');
});

emailWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Email job completed');
});

// Report generation worker (CPU-intensive)
const reportWorker = new Worker('report', async (job: Job) => {
  const { reportType, filters, userId } = job.data;

  // Long-running report generation
  const report = await reportService.generate(reportType, filters);
  
  // Notify user when done
  await notificationQueue.add('report-ready', {
    userId,
    reportUrl: report.downloadUrl,
  });
}, {
  connection,
  concurrency: 2,  // Limited concurrency for heavy work
});
```

### Producing Jobs

```typescript
// In controllers/services
export class OrderController {
  async create(req: Request, res: Response) {
    const order = await orderService.createOrder(req.body);

    // Queue background jobs (don't block the response)
    await emailQueue.add('order-confirmation', {
      to: req.user!.email,
      subject: 'Order Confirmation',
      template: 'order-confirmation',
      data: { orderId: order.id, items: order.items, total: order.total },
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });

    sendSuccess(res, order, 201);
  }
}

// Scheduled/recurring jobs
await reportQueue.add('daily-sales-report', {
  reportType: 'daily-sales',
}, {
  repeat: {
    pattern: '0 8 * * *',  // Every day at 8 AM
  },
});

// Delayed jobs
await notificationQueue.add('abandoned-cart-reminder', {
  userId: user.id,
  cartId: cart.id,
}, {
  delay: 2 * 60 * 60 * 1000, // 2 hours
});
```

---

## 4. Repository Pattern (Clean)

```typescript
// src/common/repository/base.repository.ts
import { type Model, type FilterQuery, type UpdateQuery, type Document } from 'mongoose';

export abstract class BaseRepository<T extends Document> {
  constructor(protected readonly model: Model<T>) {}

  async findById(id: string): Promise<T | null> {
    return this.model.findById(id).lean() as Promise<T | null>;
  }

  async findOne(filter: FilterQuery<T>): Promise<T | null> {
    return this.model.findOne(filter).lean() as Promise<T | null>;
  }

  async findAll(
    filter: FilterQuery<T> = {},
    page = 1,
    limit = 20,
    sort: Record<string, 1 | -1> = { createdAt: -1 }
  ): Promise<{ data: T[]; total: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.model.find(filter).sort(sort).skip(skip).limit(limit).lean() as Promise<T[]>,
      this.model.countDocuments(filter),
    ]);
    return { data, total };
  }

  async create(data: Partial<T>): Promise<T> {
    const doc = new this.model(data);
    return doc.save() as Promise<T>;
  }

  async updateById(id: string, update: UpdateQuery<T>): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).lean() as Promise<T | null>;
  }

  async deleteById(id: string): Promise<T | null> {
    return this.model.findByIdAndDelete(id).lean() as Promise<T | null>;
  }

  async exists(filter: FilterQuery<T>): Promise<boolean> {
    const count = await this.model.countDocuments(filter);
    return count > 0;
  }
}

// Usage
export class UserRepository extends BaseRepository<IUserDocument> {
  constructor() {
    super(User);
  }

  // Custom methods specific to User
  async findByEmail(email: string): Promise<IUserDocument | null> {
    return this.model.findOne({ email }).select('+password').lean();
  }

  async findActiveUsers(): Promise<IUserDocument[]> {
    return this.model.find({ isActive: true }).lean();
  }
}
```

---

## 5. API Versioning Strategies

### URL-Based Versioning (Most Common)

```typescript
// src/app.ts
import { v1Router } from './routes/v1';
import { v2Router } from './routes/v2';

app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);

// src/routes/v1/index.ts
const router = Router();
router.use('/users', v1UserRoutes);
router.use('/orders', v1OrderRoutes);
export { router as v1Router };

// src/routes/v2/index.ts
const router = Router();
router.use('/users', v2UserRoutes); // New response format
router.use('/orders', v1OrderRoutes); // Reuse v1 if unchanged
export { router as v2Router };
```

### Header-Based Versioning

```typescript
function versionRouter(versions: Record<string, Router>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const version = req.headers['api-version'] as string || req.headers['accept-version'] as string || 'v1';
    const router = versions[version];

    if (!router) {
      throw new AppError(`API version '${version}' is not supported`, 400);
    }

    router(req, res, next);
  };
}

app.use('/api/users', versionRouter({
  v1: v1UserRoutes,
  v2: v2UserRoutes,
}));
```

---

## 6. WebSocket Integration

```typescript
// src/infrastructure/websocket/ws.server.ts
import { WebSocketServer, type WebSocket } from 'ws';
import type { Server } from 'node:http';
import { logger } from '../../config/logger';
import jwt from 'jsonwebtoken';
import { config } from '../../config';

interface AuthenticatedSocket extends WebSocket {
  userId: string;
  isAlive: boolean;
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clients = new Map<string, Set<AuthenticatedSocket>>();

  wss.on('connection', (ws: AuthenticatedSocket, req) => {
    // Authenticate via query token
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    try {
      const payload = jwt.verify(token!, config.jwt.accessSecret) as any;
      ws.userId = payload.userId;
      ws.isAlive = true;
    } catch {
      ws.close(4001, 'Unauthorized');
      return;
    }

    // Track client
    if (!clients.has(ws.userId)) clients.set(ws.userId, new Set());
    clients.get(ws.userId)!.add(ws);
    logger.info({ userId: ws.userId }, 'WebSocket connected');

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch {
        ws.send(JSON.stringify({ error: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      clients.get(ws.userId)?.delete(ws);
      if (clients.get(ws.userId)?.size === 0) clients.delete(ws.userId);
    });
  });

  // Heartbeat to detect stale connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws: AuthenticatedSocket) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));

  // Public API to send messages to specific users
  return {
    sendToUser(userId: string, event: string, data: unknown) {
      const userSockets = clients.get(userId);
      if (!userSockets) return;
      const message = JSON.stringify({ event, data });
      userSockets.forEach((ws) => {
        if (ws.readyState === ws.OPEN) ws.send(message);
      });
    },

    broadcast(event: string, data: unknown) {
      const message = JSON.stringify({ event, data });
      wss.clients.forEach((ws) => {
        if (ws.readyState === ws.OPEN) ws.send(message);
      });
    },
  };
}
```

---

## 7. Microservices Communication

### Synchronous (HTTP/gRPC)

```typescript
// Service-to-service HTTP call with retry
import { setTimeout } from 'node:timers/promises';

async function callService<T>(
  url: string,
  options: RequestInit = {},
  retries = 3
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'X-Service': 'order-service',
          ...options.headers,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (attempt === retries) throw error;
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await setTimeout(delay);
    }
  }

  throw new Error('Unreachable');
}
```

### Asynchronous (Message Queue)

```typescript
// Producer (Order Service)
await messageQueue.publish('inventory.reserve', {
  orderId: order.id,
  items: order.items.map((i) => ({ sku: i.sku, quantity: i.quantity })),
});

// Consumer (Inventory Service)
messageQueue.subscribe('inventory.reserve', async (message) => {
  const { orderId, items } = message;
  try {
    await inventoryService.reserve(items);
    await messageQueue.publish('inventory.reserved', { orderId, success: true });
  } catch (error) {
    await messageQueue.publish('inventory.reserve.failed', { orderId, error: error.message });
  }
});
```

### Saga Pattern (Distributed Transactions)

```typescript
// Orchestrator Saga for Order Creation
class CreateOrderSaga {
  private steps: SagaStep[] = [
    {
      name: 'reserveInventory',
      execute: (ctx) => inventoryService.reserve(ctx.items),
      compensate: (ctx) => inventoryService.release(ctx.items),
    },
    {
      name: 'processPayment',
      execute: (ctx) => paymentService.charge(ctx.userId, ctx.total),
      compensate: (ctx) => paymentService.refund(ctx.paymentId),
    },
    {
      name: 'createShipment',
      execute: (ctx) => shippingService.create(ctx.orderId, ctx.address),
      compensate: (ctx) => shippingService.cancel(ctx.shipmentId),
    },
  ];

  async execute(context: OrderContext): Promise<void> {
    const completedSteps: SagaStep[] = [];

    for (const step of this.steps) {
      try {
        const result = await step.execute(context);
        Object.assign(context, result);
        completedSteps.push(step);
      } catch (error) {
        logger.error({ step: step.name, err: error }, 'Saga step failed, compensating');

        // Compensate in reverse order
        for (const completed of completedSteps.reverse()) {
          try {
            await completed.compensate(context);
          } catch (compensateError) {
            logger.fatal(
              { step: completed.name, err: compensateError },
              'Compensation failed — manual intervention needed'
            );
          }
        }

        throw new AppError('Order creation failed', 500);
      }
    }
  }
}
```

---

## 8. Circuit Breaker Pattern

```typescript
// src/common/utils/circuit-breaker.ts
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;

  constructor(
    private readonly threshold = 5,
    private readonly resetTimeoutMs = 30000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
      } else {
        throw new AppError('Service temporarily unavailable (circuit open)', 503);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      logger.warn({ failures: this.failureCount }, 'Circuit breaker opened');
    }
  }
}

// Usage
const paymentBreaker = new CircuitBreaker(5, 30000);

async function processPayment(orderId: string, amount: number) {
  return paymentBreaker.execute(() =>
    callService(`${PAYMENT_SERVICE_URL}/charge`, {
      method: 'POST',
      body: JSON.stringify({ orderId, amount }),
    })
  );
}
```

---

## 9. Common Mistakes

| Mistake | Why It's Bad | Fix |
|---------|-------------|-----|
| Synchronous inter-service calls everywhere | Coupling, cascading failures | Use async events where possible |
| No retry/circuit breaker | One service failure takes down everything | Implement circuit breaker + retries |
| Distributed transactions without saga | Inconsistent state across services | Implement saga with compensation |
| Event handlers without idempotency | Duplicate processing on retry | Use idempotency keys |
| No dead letter queue | Failed messages lost forever | DLQ for failed job inspection |
| Monolith-in-disguise microservices | Network overhead without benefits | Start monolith, extract when needed |
| No event versioning | Breaking changes break consumers | Version events: `order.created.v2` |

---

## 10. Interview-Ready Answers

### "When would you use CQRS?"

> "When read and write patterns differ significantly. For example, an e-commerce system where writes are normalized (order → items → inventory updates) but reads need denormalized views (order summary with product names, prices, delivery status). CQRS lets me optimize each side independently — the write model ensures consistency while the read model is pre-joined and cached for sub-millisecond queries. For simpler CRUD apps, CQRS adds unnecessary complexity."

### "How do you handle background jobs?"

> "I use BullMQ with Redis for reliable background processing. Jobs like email sending, report generation, and webhook delivery go into named queues with configurable retry policies (exponential backoff, max 3 attempts). Workers process jobs concurrently (5 for emails, 2 for heavy reports). Failed jobs go to a dead letter queue for inspection. For scheduled tasks like daily reports, I use BullMQ's repeat feature with cron patterns. The key insight: anything that doesn't need to block the HTTP response should be a background job."

### "Monolith vs Microservices — how do you decide?"

> "I start with a well-structured monolith using the module pattern (feature-based folders with clear boundaries). This gives me fast iteration, simple deployment, and no distributed system complexity. I extract into microservices when: a module needs independent scaling (e.g., image processing), different teams need independent deploy cycles, or a module has fundamentally different runtime requirements (e.g., ML inference). The key: design module boundaries as if they could become services, but don't split until the pain of the monolith exceeds the pain of distribution."

---

> **Next:** [14-interview-qa.md](14-interview-qa.md) — Architect-level Q&A cheat sheet
