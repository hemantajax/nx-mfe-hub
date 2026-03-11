# 14 — Interview Q&A Cheat Sheet

> **TL;DR:** This is your rapid-fire reference for backend architect interviews. Organized by topic with concise, confident answers. Read this the night before. Each answer is structured to demonstrate depth without rambling.

---

## 1. Node.js Core

### "Explain the Node.js event loop."

> "Node.js runs on a single-threaded event loop powered by libuv. The loop has phases: timers (setTimeout/setInterval), pending callbacks, poll (I/O), check (setImmediate), and close callbacks. Between each phase, microtasks (Promise callbacks, `queueMicrotask`) are drained. This architecture allows Node to handle thousands of concurrent I/O operations without threads, because I/O is delegated to the OS kernel or the libuv thread pool while the main thread moves on. CPU-intensive work blocks the loop — offload it to worker threads or a job queue."

### "What's the difference between `process.nextTick()` and `setImmediate()`?"

> "`process.nextTick()` fires before the event loop continues to the next phase — it's a microtask. `setImmediate()` fires in the check phase, after the current poll phase completes. In practice: `nextTick` is higher priority and can starve the event loop if called recursively. `setImmediate` is safer for deferring work. In modern code, prefer `queueMicrotask()` over `process.nextTick()`."

### "How does Node.js handle concurrency if it's single-threaded?"

> "Node uses an event-driven, non-blocking I/O model. When you make a database query or HTTP call, Node delegates it to the OS (using epoll/kqueue) and continues processing other requests. When the I/O completes, a callback is queued on the event loop. For CPU-bound work, Node provides `worker_threads` that run JavaScript on separate OS threads. The `cluster` module forks multiple Node processes sharing a TCP port. So Node is single-threaded for JavaScript execution but multi-threaded for I/O under the hood (libuv's thread pool)."

### "CommonJS vs ES Modules — what's the difference?"

> "CommonJS (`require()`, `module.exports`) is synchronous, runs at runtime, and is the original Node.js module system. ES Modules (`import`/`export`) are static (analyzed at parse time), enabling tree-shaking and better tooling. ESM is the standard going forward. In Node.js, enable ESM with `\"type\": \"module\"` in package.json. Key differences: ESM is asynchronous, has strict mode by default, and uses file extensions in imports. For new projects, I always use ESM with TypeScript."

---

## 2. Express.js

### "How does Express middleware work internally?"

> "Express maintains an ordered stack of Layer objects. Each Layer has a path matcher and a handler function. On every request, Express iterates through the stack sequentially. For each Layer, it checks if the path matches. If yes, it calls the handler with `(req, res, next)`. The handler must either send a response or call `next()` to pass control forward. Calling `next(err)` skips to the next error-handling middleware (identified by its 4-parameter signature). This is essentially the Chain of Responsibility pattern."

### "What's new in Express 5?"

> "The biggest change: native promise support. Rejected promises in async route handlers automatically forward to the error-handling middleware — no more wrapper functions needed. Path matching uses `path-to-regexp` v8 (stricter, more predictable). Named wildcards are required (`/*path` instead of `/*`). Several deprecated APIs were removed. Return value support for handlers. These are evolutionary improvements, not a rewrite."

### "`app.use()` vs `app.get()` — what's the difference?"

> "`app.use()` matches any HTTP method and matches path prefixes — `app.use('/api', handler)` triggers for `/api`, `/api/users`, `/api/anything`. `app.get()` only matches GET requests with exact path matches. Use `.use()` for middleware and router mounting, `.get()/.post()/.put()/.delete()` for specific endpoint handlers."

---

## 3. MongoDB & Data Modeling

### "Embed vs Reference — how do you decide?"

> "I follow query-driven design. Embed when: data is always read together, the embedded array is bounded (< 100 items), and child data doesn't change independently. Reference when: data is shared across parents, queried independently, or grows unbounded. For hybrid cases, I use the subset pattern — embed a small snapshot (e.g., 3 recent reviews) while keeping the full collection separate."

### "Explain MongoDB indexing best practices."

> "Index every field you query, filter, or sort on. For compound indexes, follow the ESR rule: Equality fields first, Sort fields second, Range fields last. Use `explain('executionStats')` to verify IXSCAN over COLLSCAN. Use partial indexes to index only relevant documents (e.g., only active users). Use TTL indexes for auto-expiring data (sessions, logs). One text index per collection for full-text search. Monitor index size — indexes consume RAM."

### "How do you handle transactions in MongoDB?"

> "MongoDB supports multi-document ACID transactions since v4.0, requiring a replica set. I use `session.withTransaction()` which provides automatic retry on transient errors. All operations in a transaction must use the same session object. I keep transactions short to minimize lock contention. For eventual consistency across services, I use the saga pattern instead of distributed transactions."

### "When would you choose MongoDB over PostgreSQL?"

> "MongoDB for: document-oriented data (nested objects, variable schemas), rapid prototyping, product catalogs with variable attributes, content management, real-time analytics, and horizontal scaling via sharding. PostgreSQL for: complex relationships requiring joins, financial data requiring strict ACID, complex analytical queries with window functions, or when the schema is highly structured and stable. Many production systems use both — MongoDB for flexible domains and PostgreSQL for transactional/relational data."

---

## 4. Architecture & Design Patterns

### "How would you structure a large Node.js API?"

> "Feature-based modular architecture with clear layers. Each module contains its own controller, service, repository, model, routes, validation, and types. Cross-cutting concerns (auth, logging, error handling) live in a shared middleware layer. The layered flow: Route → Controller (HTTP handling) → Service (business logic, no `req`/`res`) → Repository (database queries) → Model (schema). This ensures testability (mock one layer), replaceability (swap DB without touching business logic), and team scalability (teams own modules)."

### "What design patterns do you use in backend development?"

> **Repository Pattern** — abstracts data access, making the service layer database-agnostic.  
> **Factory Pattern** — configurable middleware (e.g., `authorize('admin')` returns customized middleware).  
> **Strategy Pattern** — multiple auth strategies (JWT, OAuth, API key) behind a common interface.  
> **Chain of Responsibility** — Express middleware itself.  
> **Observer Pattern** — event emitters for decoupled side effects (email on registration).  
> **Circuit Breaker** — prevents cascading failures in microservice calls.  
> **Decorator Pattern** — wrapping handlers with cross-cutting concerns (logging, caching)."

### "Monolith vs Microservices?"

> "Start with a well-structured monolith — modular architecture with clean boundaries. Extract to microservices when: a module needs independent scaling, teams need independent deployment cycles, or a module has fundamentally different technology requirements. The cost of microservices (network complexity, distributed transactions, operational overhead) only pays off at scale. Design module boundaries as if they could become services, but don't split until the pain of the monolith exceeds the pain of distribution."

---

## 5. Authentication & Security

### "How do you implement secure authentication?"

> "JWT token pair: short-lived access token (15 min, in memory/header) + long-lived refresh token (7 days, httpOnly cookie + stored in DB). Passwords hashed with argon2id or bcrypt (cost 12+). Refresh token rotation on every use — detect reuse → revoke all user tokens. Rate limit login to 5 attempts per 15 minutes. Account lockout after repeated failures. For microservices: RS256 (asymmetric) so services verify without knowing the secret."

### "Where do you store JWT tokens?"

> "Access token: in memory (JavaScript variable) — shortest lifetime, never persisted. For SPAs, it can be in a closure or React state. Refresh token: in an httpOnly, Secure, SameSite=Strict cookie — XSS can't read it, CSRF is mitigated by SameSite. Never in localStorage (XSS-readable) or sessionStorage. Never in URL parameters (logged in server access logs)."

### "What are the OWASP Top 10 protections you implement?"

> "Broken Access Control → RBAC middleware on every route. Injection → Zod validation + mongo-sanitize. Cryptographic Failures → argon2id for passwords, env vars for secrets. Security Misconfiguration → Helmet headers, disable x-powered-by, no verbose errors in production. Vulnerable Components → `npm audit` in CI, Dependabot for updates. Server-Side Request Forgery → URL allowlisting for external calls."

---

## 6. Performance & Scalability

### "How would you scale a Node.js application?"

> "Vertical: PM2 cluster mode or Docker replicas (one worker per CPU core). Horizontal: stateless app behind a load balancer (sessions in Redis, no local state). Caching: Redis cache-aside for hot data, HTTP response caching for GET endpoints. Database: proper indexing (ESR rule), connection pooling, read replicas for heavy read workloads. Application: streams for large payloads, worker threads for CPU-intensive work, job queues for background processing."

### "How do you identify and fix performance bottlenecks?"

> "Metrics first: Prometheus histograms for per-endpoint latency (P50/P95/P99). Slow endpoint → check MongoDB slow query logs + `explain()` for missing indexes. Event loop blocking → Clinic.js flame graphs. Memory leaks → heap snapshot comparison over time. High CPU → worker thread offloading. The rule: measure before optimizing. I use the 80/20 principle — focus on the endpoints that handle 80% of traffic."

### "What caching strategies do you use?"

> "Cache-aside (lazy loading): check cache first, miss → query DB → populate cache. Cache invalidation on write: delete/update cache keys when data changes. TTL-based expiration: different TTLs by data volatility (user profile: 10 min, product listing: 2 min, feature flags: 30 sec). Redis for shared cache (multi-instance), in-process cache (Map/LRU) for hot, small datasets. Never cache user-specific data without user-scoped keys."

---

## 7. Testing

### "How do you approach testing a backend API?"

> "Testing trophy: heavy on integration tests (HTTP request → database → response), lighter on unit tests (pure business logic) and E2E (critical user flows). Tools: Vitest for speed, Supertest for HTTP testing, mongodb-memory-server for isolated DB tests. I test happy paths AND error scenarios (401, 403, 404, 409, 422). Mock only external boundaries (third-party APIs, email services). 80%+ coverage enforced in CI."

### "What do you mock and what don't you mock?"

> "Mock: external HTTP services, email providers, payment gateways, cloud storage — anything with side effects or cost. Don't mock: your own services, repositories, or database in integration tests — the whole point is testing them together. The database is 'mocked' by using an in-memory MongoDB instance (mongodb-memory-server) that's fast and isolated per test suite."

---

## 8. DevOps & Deployment

### "How do you handle zero-downtime deployments?"

> "In Kubernetes: rolling update strategy with `maxUnavailable: 0` and readiness probes. The app implements graceful shutdown — on SIGTERM, stop accepting new connections, finish in-flight requests (30s timeout), close DB/Redis connections, flush logs, exit. `keepAliveTimeout` set higher than the load balancer timeout (65s vs ALB's 60s). At least 3 replicas ensure availability during pod rotation."

### "What does your CI/CD pipeline look like?"

> "On every PR: lint + type-check + test + security audit. On merge to main: all of the above + Docker build (multi-stage, Alpine) + push to registry + deploy to staging. After staging validation: promote to production with rolling update. Rollback: `kubectl rollout undo` if readiness probes fail. The pipeline takes ~5 minutes for quality gates and ~2 minutes for build+deploy."

---

## 9. Quick Reference Tables

### HTTP Status Codes

| Code | When to Use |
|------|-------------|
| 200 | Successful GET, PUT, PATCH |
| 201 | Successful POST (resource created) |
| 204 | Successful DELETE (no body) |
| 400 | Malformed request (bad JSON, invalid params) |
| 401 | Missing/invalid authentication |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 409 | Conflict (duplicate resource) |
| 422 | Valid JSON but fails validation |
| 429 | Rate limit exceeded |
| 500 | Unexpected server error |
| 503 | Service unavailable (maintenance/overload) |

### REST API Design Cheat Sheet

| Action | Method | Path | Status |
|--------|--------|------|--------|
| List all | GET | /api/v1/users | 200 |
| Get one | GET | /api/v1/users/:id | 200 / 404 |
| Create | POST | /api/v1/users | 201 |
| Full update | PUT | /api/v1/users/:id | 200 / 404 |
| Partial update | PATCH | /api/v1/users/:id | 200 / 404 |
| Delete | DELETE | /api/v1/users/:id | 204 / 404 |
| Nested | GET | /api/v1/users/:id/orders | 200 |
| Action | POST | /api/v1/orders/:id/cancel | 200 |
| Search | GET | /api/v1/users?search=john&role=admin | 200 |

### MongoDB Index Cheat Sheet

| Index Type | When to Use | Example |
|------------|-------------|---------|
| Single field | Simple equality/range queries | `{ email: 1 }` |
| Compound | Multi-field queries (ESR order) | `{ status: 1, createdAt: -1, price: 1 }` |
| Text | Full-text search | `{ name: 'text', description: 'text' }` |
| TTL | Auto-expire documents | `{ expiresAt: 1 }, { expireAfterSeconds: 0 }` |
| Unique | Prevent duplicates | `{ email: 1 }, { unique: true }` |
| Partial | Index only matching docs | `{ email: 1 }, { partialFilterExpression: { isActive: true } }` |
| Wildcard | Dynamic/unknown fields | `{ 'metadata.$**': 1 }` |

### Estimation Numbers (System Design)

| Metric | Value |
|--------|-------|
| MongoDB query (indexed) | 1–5 ms |
| MongoDB query (unindexed) | 50–500 ms |
| Redis GET | 0.1–0.5 ms |
| Network round trip (same region) | 0.5–2 ms |
| Network round trip (cross-region) | 50–150 ms |
| Bcrypt hash (cost 12) | 250–400 ms |
| JWT sign (HS256) | 0.1 ms |
| JWT verify (HS256) | 0.1 ms |
| Node.js requests/sec (single core) | 10,000–50,000 (JSON API) |
| MongoDB writes/sec (single replica set) | 10,000–50,000 |
| Redis operations/sec | 100,000+ |

### Node.js Package Recommendations

| Category | Recommended | Alternative |
|----------|-------------|-------------|
| **HTTP Framework** | Express 5 | Fastify, Hono |
| **Enterprise Framework** | NestJS | — |
| **Validation** | Zod | Joi, class-validator |
| **ORM/ODM** | Mongoose 8 | Prisma (MongoDB adapter) |
| **Logging** | Pino | Winston |
| **Testing** | Vitest + Supertest | Jest |
| **Auth** | jsonwebtoken + bcryptjs | passport, argon2 |
| **Job Queue** | BullMQ | Agenda, bee-queue |
| **Cache** | redis (ioredis) | keyv |
| **Process Manager** | PM2 | Docker + K8s |
| **Linting** | ESLint + typescript-eslint | Biome |
| **HTTP Client** | Node fetch (built-in) | axios, got |
| **WebSocket** | ws | socket.io |
| **File Upload** | multer | busboy |
| **Security** | helmet + cors + express-rate-limit | — |
| **API Docs** | Swagger (swagger-jsdoc) | TypeDoc |
| **Monitoring** | prom-client + OpenTelemetry | Datadog agent |

---

## 10. Architecture Decision Checklist

When designing a system in an interview, cover these:

```
✅ Requirements
   - Functional requirements (what it does)
   - Non-functional requirements (performance, scale, availability)
   - Constraints (budget, team size, timeline)

✅ Data Model
   - Entities and relationships
   - Embed vs Reference decisions
   - Indexing strategy
   - Data access patterns

✅ API Design
   - REST endpoints (resource → URL mapping)
   - Request/response schemas
   - Authentication method
   - Error response format
   - Pagination strategy
   - API versioning

✅ Architecture
   - Layered architecture (Route → Controller → Service → Repository)
   - Module/feature boundaries
   - Shared vs feature-specific code
   - Dependency injection approach

✅ Security
   - Authentication (JWT strategy, token storage)
   - Authorization (RBAC/ABAC)
   - Input validation (Zod schemas)
   - Rate limiting
   - CORS policy

✅ Performance
   - Caching strategy (what, where, TTL, invalidation)
   - Database indexes
   - Connection pooling
   - Background job processing

✅ Observability
   - Structured logging with context
   - Health check endpoints
   - Metrics (Prometheus/Grafana)
   - Distributed tracing

✅ Deployment
   - Docker containerization
   - CI/CD pipeline
   - Zero-downtime deployment
   - Graceful shutdown
   - Environment configuration

✅ Error Handling
   - Custom error hierarchy
   - Global error handler
   - Operational vs programming errors
   - Consistent error response format
```

---

## 11. Behavioral Questions for Backend Architects

### "Tell me about a system you designed from scratch."

> Structure: Situation → Problem → Your Solution → Architecture Decisions → Trade-offs → Result  
> Key: Emphasize WHY you made each decision, not just what you built.

### "How do you handle technical debt?"

> "I categorize debt into three buckets: safety (security vulnerabilities — fix immediately), velocity (slowing development — schedule in sprints), and cosmetic (ugly but working — document and deprioritize). I maintain a tech debt register and allocate 20% of sprint capacity to addressing high-impact items. Prevention is better: code reviews, architectural decision records (ADRs), and automated quality gates in CI."

### "How do you make technology decisions for a team?"

> "I evaluate on five axes: team familiarity, ecosystem maturity, long-term maintenance cost, performance requirements, and hiring market. I write an ADR (Architecture Decision Record) documenting the options, trade-offs, and rationale. I prototype the top 2 candidates with a real use case from our system. The team discusses and we decide together — I make the final call only when there's no consensus. Most importantly: I choose boring technology for infrastructure and save innovation budget for business differentiators."

---

> **Ebook complete.** Start with [01-architecture.md](01-architecture.md) and work through sequentially, or jump to any topic using the [README](README.md).
