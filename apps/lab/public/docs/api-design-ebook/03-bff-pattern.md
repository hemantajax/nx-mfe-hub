# Chapter 03 — The BFF Pattern (Backend for Frontend)

## TL;DR

A **Backend for Frontend (BFF)** is a dedicated server layer owned by the frontend team that aggregates, transforms, and adapts backend microservices into shapes the UI actually needs — instead of making the client do that work.

> **One-liner for interviews:** "A BFF is a server the frontend team owns, sitting between the browser and backend services, that speaks the UI's language so the UI doesn't have to translate."

---

## Core Concept

### The Problem BFF Solves

Modern UIs consume data from many sources — user service, order service, notification service, recommendation engine. Without a BFF, the client either:

**Option A — Client-side aggregation (bad):**
```
Browser → /api/users/me         → UserService
Browser → /api/orders?userId=X  → OrderService
Browser → /api/notifications    → NotificationService
Browser → /api/recommendations  → RecommendationService
```
4 round trips. 4 failure points. Auth token exposed to 4 services. UI does data merging.

**Option B — Fat generic API (also bad):**
Backend adds a `/dashboard` endpoint. Now backend knows about UI concerns. Mobile, web, and TV have different dashboard needs — backend becomes entangled with all of them.

**Option C — BFF (right):**
```
Browser → BFF /dashboard        → BFF aggregates all 4 services server-side
                                → Returns one response shaped for this UI
```

One round trip. One failure point. UI gets exactly what it needs. Backend services stay clean.

---

## Deep Dive

### What a BFF Does

1. **Aggregates** multiple backend service calls into one UI-optimized response
2. **Transforms** backend data shapes into frontend-friendly formats (rename fields, flatten nested objects, format dates)
3. **Filters** — returns only the fields the UI needs, discarding the rest
4. **Authenticates** — validates the session and propagates identity to downstream services
5. **Orchestrates** — sequences or parallelizes service calls and handles partial failures

### What a BFF Does NOT Do

- Business logic (that lives in domain services)
- Persistence (it's stateless; no DB of its own usually)
- Serve multiple fundamentally different client types (one BFF per client type)

---

### BFF vs API Gateway

These are often confused. They're different things:

| Concern | API Gateway | BFF |
|---------|-------------|-----|
| **Owner** | Platform / infra team | Frontend team |
| **Purpose** | Routing, auth, rate limiting, observability | Aggregation, transformation, UI-specific logic |
| **Knowledge of UI** | None | High |
| **Typical logic** | Reverse proxy, JWT validation | Compose, transform, tailor |
| **Scales with** | Traffic | Number of distinct client types |

A BFF typically sits **behind** an API gateway. The gateway handles cross-cutting concerns (TLS termination, rate limits, auth token validation). The BFF handles UI-specific composition.

---

### One BFF Per Client Type

The "per frontend" in BFF is intentional. One BFF for:
- Web app
- iOS app
- Android app
- Smart TV / embedded

Why separate? Mobile needs compact payloads, fewer fields, different pagination. Web can handle richer data. TV has different interaction models. A shared BFF optimized for all becomes optimized for none.

```
                  ┌─────────────┐
                  │  Web BFF    │──┐
                  └─────────────┘  │
                  ┌─────────────┐  ├──► UserService
Browser/App ─────►│ Mobile BFF  │──┤    OrderService
                  └─────────────┘  │    NotificationService
                  ┌─────────────┐  │
                  │   TV BFF    │──┘
                  └─────────────┘
```

---

### When BFF Makes Sense

✅ Multiple client types with diverging data needs  
✅ Microservices backend requiring aggregation  
✅ Frontend team wants to move fast without waiting on backend teams  
✅ You need UI-specific auth flows (e.g., cookie-based sessions for web, token-based for mobile)  
✅ N+1 roundtrip problem is hurting performance  

### When BFF Doesn't Make Sense

❌ Monolith backend with one client type — add the endpoint to the monolith  
❌ Small team — BFF adds an extra service to deploy, monitor, and maintain  
❌ Simple CRUD app — the overhead isn't worth the separation  
❌ Public API product — BFF is internal; public APIs need general-purpose design  

---

### BFF Implementation Patterns

#### Node.js / TypeScript BFF (Most Common for Web)

```typescript
// web-bff/src/routes/dashboard.ts
app.get('/dashboard', authenticate, async (req, res) => {
  const userId = req.user.id;

  // Parallel service calls — don't waterfall if independent
  const [user, orders, notifications] = await Promise.allSettled([
    userService.getUser(userId),
    orderService.getRecentOrders(userId, { limit: 5 }),
    notificationService.getUnread(userId),
  ]);

  // Transform into UI-ready shape
  res.json({
    profile: {
      name: fulfilled(user)?.name,
      avatarUrl: fulfilled(user)?.avatar,
    },
    recentOrders: fulfilled(orders)?.map(formatOrder) ?? [],
    unreadCount: fulfilled(notifications)?.length ?? 0,
  });
});

function fulfilled<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === 'fulfilled' ? result.value : null;
}
```

Key pattern: Use `Promise.allSettled` over `Promise.all` — if one service fails, you still return a partial response rather than a 500.

#### GraphQL as the BFF Layer

GraphQL fits naturally in the BFF position. The schema is the UI contract. Resolvers call backend services.

```
React App → GraphQL BFF → UserService (REST/gRPC)
                        → OrderService (REST/gRPC)
                        → NotificationService (gRPC)
```

Benefits: The schema IS the documentation. Frontend devs can write queries without waiting for new endpoints.

---

### BFF and Authentication

The BFF is the auth boundary for the browser:

```
Browser  ←──HTTP-only cookie──→  Web BFF  ←──JWT──→  Backend Services
```

- **Web BFF:** Stores session in an HTTP-only cookie (XSS-proof). Exchanges it for a JWT when calling backend services.
- **Mobile BFF:** Accepts OAuth tokens from the mobile app. Forwards or exchanges them.
- **Backend services:** Trust the BFF's JWT. They don't know about sessions or cookies.

This pattern prevents access tokens from living in JavaScript memory (where XSS can steal them).

---

## Examples

### Dashboard Aggregation

**Without BFF (client-side):**
```javascript
// 4 sequential or parallel fetches in the browser
const [user, orders, notifs, recs] = await Promise.all([
  fetch('/api/users/me').then(r => r.json()),
  fetch('/api/orders?userId=me&limit=5').then(r => r.json()),
  fetch('/api/notifications?unread=true').then(r => r.json()),
  fetch('/api/recommendations').then(r => r.json()),
]);
// Then map, filter, transform everything in the browser
```

**With BFF:**
```javascript
// One call from the browser
const dashboard = await fetch('/bff/dashboard').then(r => r.json());
// Already shaped exactly for the UI — no transformation needed
```

### Mobile vs Web BFF Response Comparison

```json
// Web BFF /dashboard
{
  "profile": { "name": "Priya", "avatar": "https://...", "bio": "Engineer" },
  "orders": [{ "id": "o1", "total": 250.00, "status": "shipped", "trackingUrl": "..." }],
  "unreadCount": 3,
  "recommendations": [...]
}

// Mobile BFF /dashboard
{
  "name": "Priya",
  "avatarThumb": "https://.../64x64.jpg",
  "orderCount": 1,
  "badge": 3
}
```

Same backend services. Two BFFs. Two perfectly-shaped responses.

---

## Best Practices

- **BFF is owned by the frontend team.** The frontend team deploys it, monitors it, and decides its shape. This is the core value proposition.
- **Keep BFFs thin.** If business logic creeps in ("discount 10% for premium users"), move it to a domain service. BFFs transform; they don't decide.
- **Use parallel service calls.** Default to `Promise.allSettled` / concurrent gRPC calls. Never waterfall service calls that are independent.
- **Handle partial failures gracefully.** If the recommendations service is down, return the dashboard without recommendations rather than a 500.
- **Log the correlation ID.** Pass a request ID from the browser → BFF → all downstream services. Essential for distributed tracing.
- **Health check each downstream.** Your BFF's `/health` endpoint should report the status of its upstream dependencies.

---

## Common Mistakes

❌ **One BFF for all clients** — The BFF becomes the fat generic API problem with extra steps. Split by client type.

❌ **Business logic in the BFF** — "Should this user see this feature?" is a domain question. Answer it in a domain service. The BFF calls that service.

❌ **Waterfall service calls** — Calling UserService, then waiting for the result before calling OrderService wastes latency. Call them in parallel when possible.

❌ **BFF with its own database** — A BFF with a database is a microservice, not a BFF. If you're persisting data, reconsider the architecture.

❌ **Tight coupling to backend field names** — Map backend fields to UI field names in the BFF. If the backend renames a field, the BFF absorbs the change without touching the frontend.

---

## Interview Q&A

**Q: What's a BFF and when would you use one?**  
A: "A BFF is a server-side aggregation layer owned by the frontend team. It sits between the browser and backend services, combines multiple service calls into one UI-optimized response, and handles UI-specific concerns like session management. I'd use it when: (1) the client needs to aggregate multiple microservices, causing N+ roundtrips, (2) multiple client types (web, mobile) need different data shapes from the same backend, or (3) the frontend team needs to move fast without backend API changes."

**Q: How is BFF different from an API gateway?**  
A: "An API gateway handles infrastructure concerns — routing, TLS, rate limiting, auth token validation — and is owned by the platform team. It knows nothing about the UI. A BFF handles UI-specific composition — it knows what the dashboard needs and assembles it. They work together: the gateway sits in front of the BFF and handles cross-cutting concerns, while the BFF handles UI logic."

**Q: What happens when a downstream service the BFF depends on goes down?**  
A: "That's where `Promise.allSettled` (or equivalent in other languages) is important. Rather than letting one service's failure cascade into a 500 for the whole page, the BFF returns a partial response. For example, if recommendations fail but the order and user service succeed, the BFF returns the page without the recommendations panel. The frontend handles the 'recommendations unavailable' state. I'd also add circuit breakers so a consistently failing service stops being called immediately."

**Q: Should the BFF have a database?**  
A: "Typically no. Once a BFF has its own database, it's becoming a microservice. BFFs should be stateless — they aggregate and transform data from other services. Session state can be stored in Redis if needed, but the BFF itself shouldn't own data. If you find yourself needing to persist something in the BFF, it's a sign that logic belongs in a domain service."

---

## Next Steps

- **Contract-First Design** → [04-contract-first-design.md](./04-contract-first-design.md) — how to type the BFF's API contract
- **Error Handling** → [05-error-handling-and-resilience.md](./05-error-handling-and-resilience.md) — resilience patterns inside a BFF
- **REST vs GraphQL** → [01-rest-vs-graphql-vs-grpc.md](./01-rest-vs-graphql-vs-grpc.md) — choosing the BFF's wire protocol
