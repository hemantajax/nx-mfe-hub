# Chapter 01 — REST vs GraphQL vs gRPC: A Frontend Perspective

## TL;DR

| Protocol | Best For | Avoid When |
|----------|----------|------------|
| **REST** | Public APIs, CRUD resources, caching-heavy, broad client compatibility | Client needs flexible, multi-resource queries |
| **GraphQL** | Complex UIs, multiple clients with diverging data needs, rapid iteration | Simple APIs, small teams, heavy caching requirements |
| **gRPC** | Service-to-service, streaming, mobile perf-critical paths | Public APIs, browser-native clients (without grpc-web) |

> **One-liner for interviews:** "REST for resources, GraphQL for flexible client queries, gRPC for internal high-performance channels."

---

## Core Concept

Every API is a contract between a producer (backend) and a consumer (frontend or another service). The protocol you choose shapes:

- **What data travels** (fixed shapes vs flexible queries)
- **How efficient that travel is** (JSON text vs binary Protobuf)
- **Who controls the shape** (server-driven vs client-driven)
- **How you cache** (HTTP caching vs custom solutions)

Think of REST as ordering from a fixed menu, GraphQL as building your own plate at a buffet, and gRPC as a dedicated private line between two systems.

---

## Deep Dive

### REST

**How it works:** Resources are nouns (`/users`, `/orders`), HTTP verbs are actions (`GET`, `POST`, `PUT`, `DELETE`). The server defines the shape; the client takes what it gets.

**Strengths:**
- Native HTTP caching (`Cache-Control`, `ETag`, CDN-friendly)
- Universally understood — any client, any language
- Simple mental model, easy to document with OpenAPI
- Stateless by design — scales horizontally without coordination

**Weaknesses:**
- **Over-fetching:** `GET /users/123` returns 40 fields; you need 3
- **Under-fetching:** You need user + their orders + shipping address → 3 round trips
- **Versioning pain:** Changing a response shape risks breaking consumers

**When a senior engineer picks REST:**
- Public-facing APIs where unknown clients must integrate
- Simple CRUD domains (blog posts, products, settings)
- Heavy CDN/edge caching requirements
- The team is small and consistency beats flexibility

---

### GraphQL

**How it works:** One endpoint (`POST /graphql`). The client writes a query declaring exactly what fields it needs, across any number of types, in one request.

```graphql
query GetUserDashboard($id: ID!) {
  user(id: $id) {
    name
    email
    orders(last: 5) {
      id
      total
      status
    }
  }
}
```

**Strengths:**
- Eliminates over/under-fetching — client gets exactly what it asks for
- Single round-trip for complex, multi-resource data
- Strongly typed schema = built-in documentation
- Ideal for multiple clients (mobile, web, TV) with different data needs
- Subscriptions for real-time out of the box

**Weaknesses:**
- **Caching is hard:** `POST` requests aren't cached by default. Persisted queries help but add complexity
- **N+1 problem:** Naive resolvers make one DB query per parent node. Requires DataLoader
- **Schema governance:** Evolving the schema in a large team requires careful deprecation discipline
- **Bundle size:** Apollo Client is heavy. Lighter alternatives (urql, SWR + raw fetch) exist

**When a senior engineer picks GraphQL:**
- Multiple client types consuming the same backend (iOS, Android, React)
- Product teams that iterate fast and hate asking backend for new endpoints
- Dashboards with complex, aggregated data needs
- You already run a BFF layer (GraphQL sits naturally there)

---

### gRPC

**How it works:** Define services and messages in `.proto` files. Code is generated for client and server in any language. Messages are serialized as binary (Protocol Buffers), not JSON.

```proto
service OrderService {
  rpc GetOrder (OrderRequest) returns (OrderResponse);
  rpc StreamOrders (OrderRequest) returns (stream OrderEvent);
}
```

**Strengths:**
- **Performance:** Protobuf is ~3–10x smaller and faster to serialize than JSON
- **Streaming:** Unary, server-side, client-side, and bidirectional streaming — first class
- **Strong contracts:** Proto schema IS the contract; drift is impossible
- **Code generation:** Clients generated automatically — no hand-rolled HTTP calls

**Weaknesses:**
- **Browser support:** Native fetch can't speak HTTP/2 framing. Requires `grpc-web` proxy (Envoy/nginx) which adds operational complexity
- **Debugging:** Binary payloads are not human-readable without tooling (grpcurl, Postman gRPC)
- **Schema evolution:** Proto field numbering is fragile if not disciplined

**When a senior engineer picks gRPC:**
- Internal microservice-to-microservice calls
- Mobile apps with tight bandwidth budgets
- Any scenario needing server-push streaming (live telemetry, event feeds)
- Polyglot environments where you want one schema, many languages

---

## Decision Matrix

```
Is this a public API consumed by unknown clients?
  └─ YES → REST (compatibility + HTTP caching wins)
  └─ NO ↓

Do multiple clients need radically different data shapes?
  └─ YES → GraphQL (client-driven flexibility wins)
  └─ NO ↓

Is this internal service-to-service, or latency/bandwidth critical?
  └─ YES → gRPC (performance + streaming wins)
  └─ NO → REST (simplicity wins for straightforward CRUD)
```

---

## Examples

### REST: User profile endpoint
```
GET /api/v1/users/123
Authorization: Bearer <token>

200 OK
{
  "id": "123",
  "name": "Priya Sharma",
  "email": "priya@example.com",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### GraphQL: Dashboard query (one request, three resource types)
```graphql
query Dashboard {
  me {
    name
    notifications(unread: true) { count }
    recentOrders(limit: 3) { id status total }
  }
}
```

### gRPC Proto: Bidirectional streaming chat
```proto
service ChatService {
  rpc Chat (stream ChatMessage) returns (stream ChatMessage);
}

message ChatMessage {
  string user_id = 1;
  string content = 2;
  int64 timestamp = 3;
}
```

---

## Best Practices

- **Don't mix without reason.** Using REST for CRUD + GraphQL for dashboards + gRPC for internal is fine — but document the boundary clearly.
- **REST:** Use `HATEOAS` selectively; links in responses help discoverability for public APIs.
- **GraphQL:** Always implement DataLoader to batch DB calls. Make query depth limiting and complexity scoring part of your first PR.
- **gRPC:** Use field numbers consistently and never reuse a retired field number. Mark deprecated fields with `[deprecated = true]`.
- **All three:** Version your contracts. REST uses URL or headers; GraphQL deprecates fields; gRPC uses reserved field numbers.

---

## Common Mistakes

❌ **Choosing GraphQL because "it's modern"** — GraphQL has real operational overhead. For a simple CRUD app with one client, REST is faster to ship and easier to debug.

❌ **Assuming gRPC works in browsers natively** — It doesn't. You need `grpc-web` and a proxy. Factor this into your architecture diagram.

❌ **REST without versioning** — Changing a response shape without a version strategy will break consumers. Always version from day one.

❌ **GraphQL without rate limiting** — A single deeply nested query can DOS your DB. Set query complexity limits before launch.

❌ **Treating REST as "just HTTP"** — Use the right status codes (`400` vs `422` vs `409`), correct verbs, and proper `Content-Type` headers. Interviewers notice sloppiness here.

---

## Interview Q&A

**Q: When would you choose GraphQL over REST?**  
A: "When multiple clients (web, mobile, TV) need different data shapes from the same backend, or when the UI is complex and making 3–4 REST calls per page load is becoming a performance problem. GraphQL's client-driven queries eliminate that. The trade-off is caching complexity and the N+1 problem, which I'd address with persisted queries and DataLoader."

**Q: Can you use REST and GraphQL together?**  
A: "Yes, and it's common. REST handles public, resource-centric endpoints and benefits from HTTP caching and CDN. GraphQL sits behind a BFF layer for internal UI consumption where flexibility matters more than caching. The key is drawing a clear boundary and not creating two ways to do the same thing."

**Q: Why not always use gRPC?**  
A: "Browser support requires a grpc-web proxy which adds operational complexity. JSON is also human-readable and much easier to debug without specialized tooling. gRPC's strengths are for internal service communication, not for client-facing APIs. The performance gains only justify the complexity at scale."

**Q: How does versioning differ across protocols?**  
A: "REST uses URL versioning (`/v1/`, `/v2/`) or header versioning (`Accept: application/vnd.api.v2+json`). URL versioning is easier to test and cache. GraphQL avoids versioning by deprecating individual fields and evolving the schema backwards-compatibly — you add fields, mark old ones deprecated, remove them after clients migrate. gRPC uses reserved field numbers in Proto files — you never reuse a number, so old clients can still deserialize new messages gracefully."

---

## Next Steps

- **BFF Pattern** → [03-bff-pattern.md](./03-bff-pattern.md) — how to wrap these protocols in a backend-for-frontend layer
- **Contract-First Design** → [04-contract-first-design.md](./04-contract-first-design.md) — enforcing the contract with OpenAPI and codegen
- **Error Handling** → [05-error-handling-and-resilience.md](./05-error-handling-and-resilience.md) — what happens when any of these fail
