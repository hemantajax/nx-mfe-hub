# Chapter 16: Interview Cheat Sheet

> Quick-reference for everything you need the night before. Skim this chapter as your final review — it distills the entire ebook into tables, frameworks, and one-liners.

---

## The System Design Framework (5 Steps)

| Step | Time | What To Do |
|---|---|---|
| **1. Requirements** | 3-5 min | Clarify FRs, NFRs, constraints. Ask about scale, latency, consistency. |
| **2. Estimation** | 2-3 min | Back-of-envelope: DAU, QPS, storage, bandwidth. |
| **3. API Design** | 3-5 min | Define endpoints, methods, request/response shapes. |
| **4. High-Level Design** | 10-15 min | Draw architecture diagram. Explain each component. |
| **5. Deep Dive** | 10-15 min | Go deep into 1-2 areas the interviewer picks. |

---

## Estimation Quick Reference

### Powers of 2

| Power | Value | Size |
|---|---|---|
| 2^10 | 1,024 | 1 KB |
| 2^20 | ~1 million | 1 MB |
| 2^30 | ~1 billion | 1 GB |
| 2^40 | ~1 trillion | 1 TB |
| 2^50 | ~1 quadrillion | 1 PB |

### Time Conversions

| Period | Seconds |
|---|---|
| 1 minute | 60 |
| 1 hour | 3,600 |
| 1 day | 86,400 (~100K) |
| 1 month | 2.6 million (~2.5M) |
| 1 year | 31.5 million (~30M) |

### Quick QPS Math

| Daily Requests | QPS (average) | QPS (peak ~3x) |
|---|---|---|
| 1 million/day | ~12/sec | ~36/sec |
| 10 million/day | ~120/sec | ~360/sec |
| 100 million/day | ~1,200/sec | ~3,600/sec |
| 1 billion/day | ~12,000/sec | ~36,000/sec |

### Latency Numbers Every Engineer Should Know

| Operation | Latency |
|---|---|
| L1 cache reference | 0.5 ns |
| L2 cache reference | 7 ns |
| RAM reference | 100 ns |
| SSD random read | 150 μs |
| HDD random read | 10 ms |
| Round trip same datacenter | 0.5 ms |
| Round trip US coast to coast | 40 ms |
| Round trip US to Europe | 80 ms |
| Round trip US to Asia | 150 ms |

### Storage Math

| Content Type | Average Size |
|---|---|
| Text tweet/message | ~0.5 KB |
| JSON API response | ~2-10 KB |
| Compressed image | ~200 KB - 1 MB |
| 1 minute video (720p) | ~20 MB |
| JavaScript bundle (modern app) | ~100-300 KB (gzipped) |

---

## Common Trade-offs Table

| Decision | Option A | Option B | Choose A When | Choose B When |
|---|---|---|---|---|
| Consistency vs Availability | Strong consistency (CP) | Eventual consistency (AP) | Financial data, inventory | Social feeds, likes, views |
| SQL vs NoSQL | Relational (PostgreSQL) | Document/KV (MongoDB, Redis) | Structured data, JOINs, ACID | Flexible schema, simple lookups, scale |
| SSR vs CSR | Server-Side Rendering | Client-Side Rendering | SEO, fast FCP, content pages | Dashboards, auth apps, rich interactivity |
| SSG vs ISR | Static Generation | Incremental Regeneration | Content rarely changes | Changes hourly/daily |
| Monolith vs Microservices | Single deployable | Independent services | Small team, early stage | Large org, independent teams |
| Monolith vs Micro-Frontends | Single frontend repo | Independent frontend apps | < 10 devs, shared features | 20+ devs, independent teams |
| REST vs GraphQL | RESTful API | GraphQL | Simple CRUD, HTTP caching | Multiple clients, nested data |
| Polling vs WebSocket | Periodic requests | Persistent connection | Low-frequency updates | Real-time, bidirectional |
| Redux vs Zustand | Feature-rich global state | Lightweight global state | Large team, complex state, middleware | Small state, simplicity |
| Server state lib vs Global store | TanStack Query / SWR | Redux / NgRx | API data (90% of cases) | True client-only state |
| Offset vs Cursor pagination | Page numbers | Cursor tokens | Admin tables with page nav | Feeds, infinite scroll |

---

## Technology Decision Framework

### Database Selection

```
Need ACID? → PostgreSQL
Need flexible schema? → MongoDB
Need sub-ms cache? → Redis
Need full-text search? → Elasticsearch
Need graph traversal? → Neo4j
Need time-series? → TimescaleDB
Default? → PostgreSQL (handles 90% of cases)
```

### Rendering Strategy Selection

```
Static content, SEO critical? → SSG
Changes periodically, SEO? → ISR
Dynamic per-user, SEO? → SSR
Authenticated dashboard? → CSR
Mix of static + interactive? → RSC (Server Components)
```

### State Management Selection

```
Data from API? → TanStack Query / SWR (server state)
Shared across app (auth, theme)? → Zustand / Signals (lightweight)
Complex with middleware? → Redux Toolkit / NgRx
Multi-step flow? → XState (state machine)
Survives refresh? → URL params
Form data? → React Hook Form / Angular Reactive Forms
Only one component needs it? → Local state (useState / signal)
```

### Real-Time Protocol Selection

```
Server → Client only? → SSE (Server-Sent Events)
Bidirectional? → WebSocket
Simple, low-frequency? → Polling (every 30s)
High-performance internal? → gRPC streaming
```

---

## Key Buzzwords: One-Line Explanations

| Term | One-Line Definition |
|---|---|
| **ACID** | Atomicity, Consistency, Isolation, Durability — guarantees for database transactions |
| **BASE** | Basically Available, Soft state, Eventually consistent — NoSQL trade-off |
| **CAP Theorem** | Distributed systems can only guarantee 2 of 3: Consistency, Availability, Partition tolerance |
| **CDN** | Content Delivery Network — serves assets from edge servers near users |
| **CORS** | Cross-Origin Resource Sharing — browser security for cross-domain API calls |
| **CQRS** | Separate read and write data models for different optimization |
| **CSP** | Content Security Policy — HTTP header preventing XSS by restricting resource sources |
| **CSR** | Client-Side Rendering — browser downloads JS and renders everything |
| **DNS** | Domain Name System — translates hostnames to IP addresses |
| **Event Sourcing** | Store events instead of current state — enables audit trail and time travel |
| **gRPC** | Google's RPC framework using Protocol Buffers over HTTP/2 |
| **HATEOAS** | REST principle: responses include links to related actions |
| **Hydration** | Attaching JS interactivity to server-rendered HTML |
| **Idempotent** | Same operation applied multiple times produces the same result |
| **ISR** | Incremental Static Regeneration — regenerate static pages on demand |
| **JWT** | JSON Web Token — self-contained auth token with encoded claims |
| **LCP** | Largest Contentful Paint — time until main content is visible |
| **INP** | Interaction to Next Paint — responsiveness metric for all interactions |
| **CLS** | Cumulative Layout Shift — measures visual stability |
| **Load Balancer** | Distributes traffic across multiple servers |
| **Message Queue** | Decouples producers from consumers for async processing (Kafka, RabbitMQ) |
| **Micro-Frontend** | Independently deployable frontend modules owned by separate teams |
| **Module Federation** | Webpack feature for runtime loading of remote JavaScript modules |
| **OAuth 2.0** | Authorization framework for delegated access (Google Sign-In, etc.) |
| **PKCE** | Proof Key for Code Exchange — secures OAuth for SPAs (no client secret) |
| **RSC** | React Server Components — components that run only on the server |
| **Saga** | Pattern for managing distributed transactions across microservices |
| **Sharding** | Splitting data across multiple databases for horizontal scaling |
| **SPA** | Single Page Application — one HTML page, JS handles navigation |
| **SRI** | Subresource Integrity — verify external script integrity via hash |
| **SSE** | Server-Sent Events — server pushes events to browser over HTTP |
| **SSG** | Static Site Generation — pre-render pages at build time |
| **SSR** | Server-Side Rendering — server generates HTML per request |
| **Stale-While-Revalidate** | Serve cached data immediately, fetch fresh data in background |
| **Virtual Scrolling** | Render only visible list items, swap on scroll |
| **WebSocket** | Full-duplex bidirectional communication over single TCP connection |
| **XSS** | Cross-Site Scripting — injecting malicious JS into web pages |

---

## Common Interview Follow-Up Questions

### "How would you handle failure of X?"

**Template answer:**
1. **Detect** — monitoring/alerting catches the failure
2. **Degrade gracefully** — show cached data, disable the broken feature, show error boundary
3. **Retry** — exponential backoff for transient failures
4. **Fallback** — alternative path (e.g., polling if WebSocket dies)
5. **Recover** — auto-heal when the service returns
6. **Notify** — alert the team, track in error monitoring

### "How would you scale this to 10x/100x users?"

**Template answer:**
1. **Identify the bottleneck** — is it frontend, API, database, or network?
2. **Frontend** — CDN for assets, code splitting, SSG/ISR for pages
3. **API** — horizontal scaling (stateless servers + load balancer), caching (Redis)
4. **Database** — read replicas, caching layer, then sharding if needed
5. **Async** — move non-critical work to message queues
6. **Monitoring** — auto-scaling based on metrics

### "How do you ensure consistency?"

**Template answer:**
- **Strong consistency** needed? → Single leader DB, synchronous replication, transactions
- **Eventual consistency** acceptable? → Async replication, CQRS, event-driven
- **UI handling** → Optimistic updates with rollback, loading states for critical operations, stale-while-revalidate for reads

### "How do you keep this maintainable?"

**Template answer:**
1. **Component architecture** — atomic design, clear boundaries
2. **Code organization** — feature-based folders, enforced module boundaries
3. **Testing** — integration tests with Testing Library, E2E for critical paths
4. **Type safety** — TypeScript strict mode
5. **CI/CD** — automated linting, testing, performance budgets
6. **Documentation** — Storybook for components, ADRs for decisions

### "What metrics would you track?"

**Template answer:**
- **Performance**: LCP, INP, CLS (p75 and p95)
- **Reliability**: Error rate, API success rate, availability
- **User experience**: Time on page, bounce rate, task completion rate
- **Business**: Conversion rate, feature adoption, user retention
- **Technical**: Bundle size, build time, test coverage

---

## UI Architect-Specific Topics to Prepare

### Design System Architecture
- Tokens → Primitives → Components → Patterns → Pages
- Platform-agnostic tokens (CSS vars, design token formats)
- Versioning and backward compatibility

### Accessibility (WCAG 2.1 AA)
- Semantic HTML, ARIA roles, keyboard navigation
- Color contrast (4.5:1 for text, 3:1 for large text)
- Focus management, live regions, screen reader testing

### Internationalization (i18n)
- String externalization (ICU message format)
- RTL layout support (CSS logical properties)
- Number, date, currency formatting (Intl API)
- Dynamic locale loading (lazy load translations)

### Performance Budget
- Total JS: < 200KB gzipped
- LCP: < 2.5s
- INP: < 200ms
- CLS: < 0.1

### Architecture Decision Records (ADRs)
Document why you chose X over Y:
```
# ADR-001: Use Zustand over Redux
## Status: Accepted
## Context: Our app has minimal global state (auth, theme, cart)
## Decision: Zustand — 1KB, no provider, simple API
## Consequences: Less structure for future teams, but our state is simple enough
```

---

## Final Preparation Checklist

- [ ] Can you explain the 5-step system design framework from memory?
- [ ] Can you do back-of-envelope estimation for QPS, storage, bandwidth?
- [ ] Can you draw a high-level architecture with CDN, LB, API, cache, DB, queue?
- [ ] Can you justify SQL vs NoSQL for a given scenario?
- [ ] Can you explain caching layers (browser → CDN → Redis → DB)?
- [ ] Can you compare REST vs GraphQL with trade-offs?
- [ ] Can you explain SSR vs CSR vs SSG vs ISR and when to use each?
- [ ] Can you design a component architecture (atomic design, compound components)?
- [ ] Can you classify state (server, global, local, URL, form)?
- [ ] Can you discuss Core Web Vitals and how to optimize each?
- [ ] Can you explain micro-frontends and when NOT to use them?
- [ ] Can you articulate XSS prevention and secure token storage?
- [ ] Can you describe a testing strategy (trophy model)?
- [ ] Can you explain your observability approach (errors, RUM, feature flags)?
- [ ] Can you handle follow-ups on failure, scaling, consistency, and maintainability?

---

**Good luck with the interview. You've got this.**
