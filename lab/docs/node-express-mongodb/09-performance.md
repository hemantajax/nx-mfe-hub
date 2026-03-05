# 09 — Performance Optimization

> **TL;DR:** Node.js is single-threaded — never block the event loop. Use clustering (or PM2/Docker) to leverage all CPU cores. Cache aggressively with Redis. Optimize MongoDB queries with indexes, projection, and lean(). Use streams for large payloads. Profile before optimizing — measure, don't guess.

---

## 1. Node.js Event Loop — The Foundation

```
   ┌───────────────────────────┐
┌─>│           timers          │  ← setTimeout, setInterval callbacks
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     pending callbacks     │  ← I/O callbacks deferred from previous loop
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │       idle, prepare       │  ← Internal use only
│  └─────────────┬─────────────┘      ┌───────────────┐
│  ┌─────────────┴─────────────┐      │   incoming:   │
│  │           poll            │<─────┤  connections, │
│  └─────────────┬─────────────┘      │   data, etc.  │
│  ┌─────────────┴─────────────┐      └───────────────┘
│  │          check            │  ← setImmediate callbacks
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │    close callbacks        │  ← socket.on('close', ...)
│  └─────────────┬─────────────┘
└─────────────────┘

Between each phase: process microtasks (Promise callbacks, queueMicrotask)
```

**Critical rule:** If you block the event loop (CPU-intensive work), ALL requests wait.

---

## 2. Clustering — Use All CPU Cores

### Native Cluster Module

```typescript
// src/cluster.ts
import cluster from 'node:cluster';
import { availableParallelism } from 'node:os';

const numCPUs = availableParallelism();

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running, forking ${numCPUs} workers`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.error(`Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
    cluster.fork();
  });
} else {
  import('./server.js');
}
```

### PM2 Clustering (Recommended for Production)

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'api',
    script: './dist/server.js',
    instances: 'max',              // Use all CPU cores
    exec_mode: 'cluster',
    max_memory_restart: '500M',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    // Graceful shutdown
    kill_timeout: 5000,
    listen_timeout: 10000,
    // Zero-downtime restart
    wait_ready: true,
    // Logging
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    merge_logs: true,
  }],
};
```

---

## 3. Caching with Redis

### Cache-Aside Pattern

```typescript
// src/infrastructure/cache/cache.service.ts
import { createClient, type RedisClientType } from 'redis';
import { logger } from '../../config/logger';

export class CacheService {
  private client: RedisClientType;

  constructor(redisUrl: string) {
    this.client = createClient({ url: redisUrl });
    this.client.on('error', (err) => logger.error({ err }, 'Redis error'));
  }

  async connect() {
    await this.client.connect();
    logger.info('Redis connected');
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    await this.client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds = 300
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const data = await fetcher();
    await this.set(key, data, ttlSeconds);
    return data;
  }
}
```

### Usage in Service Layer

```typescript
export class ProductService {
  constructor(
    private productRepo: ProductRepository,
    private cache: CacheService
  ) {}

  async getProductById(id: string) {
    return this.cache.getOrSet(
      `product:${id}`,
      () => this.productRepo.findById(id),
      600 // 10 minutes
    );
  }

  async getProducts(page: number, limit: number, category?: string) {
    const cacheKey = `products:${category || 'all'}:${page}:${limit}`;
    return this.cache.getOrSet(
      cacheKey,
      () => this.productRepo.findAll({ category }, page, limit),
      120 // 2 minutes for listings
    );
  }

  async updateProduct(id: string, data: UpdateProductDto) {
    const product = await this.productRepo.updateById(id, data);
    // Invalidate cache
    await this.cache.del(`product:${id}`);
    await this.cache.delPattern('products:*'); // Invalidate listing caches
    return product;
  }
}
```

### HTTP Response Caching

```typescript
// Cache middleware for GET endpoints
function cacheResponse(ttlSeconds = 60) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();

    const key = `http:${req.originalUrl}`;
    const cached = await cache.get<{ body: any; headers: Record<string, string> }>(key);

    if (cached) {
      res.set('X-Cache', 'HIT');
      Object.entries(cached.headers).forEach(([k, v]) => res.set(k, v));
      return res.json(cached.body);
    }

    // Intercept res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode < 400) {
        cache.set(key, { body, headers: { 'Content-Type': 'application/json' } }, ttlSeconds);
      }
      res.set('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
}

router.get('/products', cacheResponse(120), productController.getAll);
```

---

## 4. MongoDB Query Optimization

### Use lean() for Read-Only Queries

```typescript
// Without lean(): returns full Mongoose documents with methods, virtuals, change tracking
const users = await User.find({ isActive: true });
// Memory: ~3-5x more than raw data

// With lean(): returns plain JavaScript objects (POJO)
const users = await User.find({ isActive: true }).lean();
// Memory: minimal, ~3-5x faster
```

### Projection — Only Fetch What You Need

```typescript
// Bad: fetches all 20 fields when you only need 3
const users = await User.find().lean();

// Good: only fetch name, email, avatar
const users = await User.find({}, { name: 1, email: 1, avatar: 1 }).lean();

// Exclude heavy fields
const users = await User.find({}, { biography: 0, activityLog: 0 }).lean();
```

### Pagination — Cursor-Based vs Offset

```typescript
// Offset pagination (simple but slow for deep pages)
const page = 50;
const limit = 20;
const users = await User.find().skip((page - 1) * limit).limit(limit);
// Problem: skip(980) scans and discards 980 documents

// Cursor-based pagination (consistent performance at any depth)
const lastId = req.query.cursor; // ObjectId of last item from previous page
const query = lastId ? { _id: { $gt: lastId } } : {};
const users = await User.find(query).sort({ _id: 1 }).limit(limit + 1).lean();

const hasMore = users.length > limit;
const data = hasMore ? users.slice(0, -1) : users;
const nextCursor = hasMore ? data[data.length - 1]._id : null;
```

### Batch Operations

```typescript
// Bad: N individual queries in a loop
for (const userId of userIds) {
  const user = await User.findById(userId); // N queries!
}

// Good: single query with $in
const users = await User.find({ _id: { $in: userIds } }).lean();

// Bulk write for multiple updates
await User.bulkWrite([
  { updateOne: { filter: { _id: id1 }, update: { $set: { status: 'active' } } } },
  { updateOne: { filter: { _id: id2 }, update: { $set: { status: 'active' } } } },
  { deleteOne: { filter: { _id: id3 } } },
]);
```

---

## 5. Streams — Handle Large Data

```typescript
// Bad: load 1M records into memory
const allOrders = await Order.find().lean();
res.json(allOrders); // Out of memory!

// Good: stream results
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

app.get('/api/v1/export/orders', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Transfer-Encoding', 'chunked');

  const cursor = Order.find({ status: 'completed' }).cursor();
  
  let first = true;
  res.write('[');

  for await (const doc of cursor) {
    if (!first) res.write(',');
    res.write(JSON.stringify(doc));
    first = false;
  }

  res.write(']');
  res.end();
});

// CSV export with transform stream
app.get('/api/v1/export/orders.csv', async (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
  
  res.write('id,customer,total,status,date\n');

  const cursor = Order.find().lean().cursor();
  for await (const order of cursor) {
    res.write(`${order._id},${order.customerName},${order.total},${order.status},${order.createdAt}\n`);
  }

  res.end();
});
```

---

## 6. Worker Threads for CPU-Intensive Tasks

```typescript
// src/common/utils/worker-pool.ts
import { Worker } from 'node:worker_threads';
import { resolve } from 'node:path';

export function runWorker<T>(workerFile: string, data: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerFile, { workerData: data });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker exited with code ${code}`));
    });
  });
}

// Worker file: src/workers/pdf-generator.worker.ts
import { parentPort, workerData } from 'node:worker_threads';

function generatePDF(data: any): Buffer {
  // CPU-intensive PDF generation
  return Buffer.from('...');
}

const result = generatePDF(workerData);
parentPort?.postMessage(result);

// Usage in controller
app.get('/api/v1/reports/:id/pdf', async (req, res) => {
  const reportData = await reportService.getData(req.params.id);
  const pdfBuffer = await runWorker<Buffer>(
    resolve(__dirname, '../workers/pdf-generator.worker.js'),
    reportData
  );
  res.setHeader('Content-Type', 'application/pdf');
  res.send(pdfBuffer);
});
```

---

## 7. Response Compression

```typescript
import compression from 'compression';

app.use(compression({
  level: 6,                  // Compression level (1-9, default 6)
  threshold: 1024,           // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));
```

### Response Size Impact

| Payload | Uncompressed | Gzip | Brotli |
|---------|-------------|------|--------|
| 100 JSON objects | 50 KB | ~8 KB (84%) | ~6 KB (88%) |
| 1000 JSON objects | 500 KB | ~60 KB (88%) | ~45 KB (91%) |
| HTML page | 100 KB | ~15 KB (85%) | ~12 KB (88%) |

---

## 8. Connection Pooling

```typescript
// MongoDB connection pool
await mongoose.connect(uri, {
  maxPoolSize: 10,         // Max concurrent connections
  minPoolSize: 2,          // Keep minimum connections warm
  maxIdleTimeMS: 30000,    // Close idle connections after 30s
  socketTimeoutMS: 45000,  // Close socket after 45s of inactivity
});

// Redis connection pool (using ioredis)
import Redis from 'ioredis';
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 100, 3000),
  lazyConnect: true,
});

// HTTP keep-alive for outgoing requests
import { Agent } from 'node:http';
const keepAliveAgent = new Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
});

fetch('https://api.example.com/data', {
  agent: keepAliveAgent,
});
```

---

## 9. Profiling & Monitoring

### Event Loop Lag Detection

```typescript
let lastCheck = performance.now();

setInterval(() => {
  const now = performance.now();
  const lag = now - lastCheck - 1000;  // Expected 1000ms between checks
  lastCheck = now;

  if (lag > 100) {
    logger.warn({ lagMs: Math.round(lag) }, 'Event loop lag detected');
  }
}, 1000);
```

### Memory Monitoring

```typescript
setInterval(() => {
  const usage = process.memoryUsage();
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const rssMB = Math.round(usage.rss / 1024 / 1024);

  if (heapUsedMB > 400) {
    logger.warn({ heapUsedMB, rssMB }, 'High memory usage');
  }

  // Expose as Prometheus metrics
  memoryGauge.set({ type: 'heapUsed' }, usage.heapUsed);
  memoryGauge.set({ type: 'rss' }, usage.rss);
  memoryGauge.set({ type: 'external' }, usage.external);
}, 30000);
```

### Node.js Built-in Profiler

```bash
# CPU profiling
node --prof dist/server.js
# Process the log
node --prof-process isolate-*.log > profile.txt

# Heap snapshot
node --inspect dist/server.js
# Then use Chrome DevTools to capture heap snapshot

# Clinic.js (comprehensive)
npx clinic doctor -- node dist/server.js
npx clinic flame -- node dist/server.js
npx clinic bubbleprof -- node dist/server.js
```

---

## 10. Performance Checklist

```
Database
  ✅ Index every query field (use ESR rule)
  ✅ Use .lean() for read-only queries
  ✅ Use projection (select only needed fields)
  ✅ Use cursor-based pagination for deep pages
  ✅ Batch operations with $in / bulkWrite
  ✅ Connection pool sized correctly

Caching
  ✅ Redis cache for hot data (cache-aside pattern)
  ✅ HTTP response caching for GET endpoints
  ✅ Cache invalidation on write operations
  ✅ TTL set appropriately per data type

Server
  ✅ Clustering / PM2 cluster mode (all CPU cores)
  ✅ Response compression enabled
  ✅ Body size limits set
  ✅ Worker threads for CPU-intensive work
  ✅ Streams for large data exports
  ✅ Keep-alive connections for outgoing HTTP

Monitoring
  ✅ Event loop lag tracking
  ✅ Memory usage monitoring
  ✅ Prometheus metrics exported
  ✅ Request duration histograms
  ✅ Slow query logging (MongoDB profiler)
```

---

## 11. Common Mistakes

| Mistake | Why It's Bad | Fix |
|---------|-------------|-----|
| CPU-heavy work on event loop | Blocks ALL requests | Use worker_threads |
| No caching | Redundant DB queries, slow responses | Redis cache-aside pattern |
| Loading all data into memory | Out of memory crash | Use streams and cursors |
| No connection pooling | Connection overhead per request | Configure pool sizes |
| Missing database indexes | O(n) collection scans | Index every queried field |
| No response compression | Wasted bandwidth | `compression()` middleware |
| Single process in production | Using only 1 CPU core | PM2 cluster or Docker replicas |
| N+1 query patterns | Exponential DB calls | Use `$in`, `$lookup`, batch queries |
| Premature optimization | Wasted development time | Profile first, optimize what matters |

---

## 12. Interview-Ready Answers

### "How would you scale a Node.js API?"

> "At the process level, I use PM2 cluster mode or Docker replicas to run one worker per CPU core. At the application level, I implement Redis caching for hot data with cache-aside pattern and automatic invalidation on writes. At the database level, I ensure every query path has appropriate indexes (ESR rule), use projection and lean() for read-only paths, and cursor-based pagination for deep datasets. For CPU-intensive operations like PDF generation or image processing, I offload to worker threads. For horizontal scaling, the app is stateless — sessions and cache live in Redis, so any instance can handle any request behind a load balancer."

### "How do you identify performance bottlenecks?"

> "I start with metrics: Prometheus histograms show P50/P95/P99 latency per endpoint. If an endpoint is slow, I check MongoDB slow query logs and `explain()` to verify index usage. For event loop blocking, I monitor event loop lag and use Clinic.js flame graphs to identify hot code paths. For memory leaks, I capture heap snapshots over time and compare retained objects. I never optimize without measuring first."

---

> **Next:** [10-testing.md](10-testing.md) — Unit, integration, E2E, mocking, test containers
