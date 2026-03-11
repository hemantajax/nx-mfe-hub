# Chapter 06 — Cheat Sheet & Interview Q&A

> Print this. Read it the morning of your interview. Every key decision in this ebook on one page.

---

## Protocol Selection — Decision Card

```
Is this a PUBLIC API for unknown clients?
  └─ YES → REST + OpenAPI (caching, compatibility, documentation)
  └─ NO ↓

Does the UI need data from multiple services in one request?
  └─ YES, multiple clients with different shapes → GraphQL BFF
  └─ YES, one client / simple aggregation → REST BFF
  └─ NO ↓

Is this internal service-to-service with latency/bandwidth constraints?
  └─ YES → gRPC (binary, streaming, generated clients)
  └─ NO → REST (simpler is better)
```

---

## Pagination — Quick Reference

| Need | Use | SQL Pattern |
|------|-----|-------------|
| Infinite scroll / feed / real-time | **Cursor** | `WHERE id > :cursor LIMIT n` |
| "Page 5 of 30" admin UI | **Offset** | `LIMIT n OFFSET (page-1)*n` |
| Deep archive retrieval | **Cursor** | Offset too slow at depth |

**Cursor response shape:**
```json
{
  "data": [...],
  "pagination": {
    "nextCursor": "<opaque base64 token>",
    "hasMore": true,
    "limit": 20
  }
}
```

**Rules:**
- Always bound `limit` server-side (max 100 or similar)
- Always have a deterministic sort + tiebreaker (`ORDER BY createdAt DESC, id DESC`)
- Treat cursors as opaque — don't let clients build them

---

## Versioning — Decision Card

| API Type | Strategy | Example |
|----------|----------|---------|
| Public REST | URL prefix | `/api/v1/`, `/api/v2/` |
| Internal REST | Header or URL | `API-Version: 2024-01-15` |
| GraphQL | Schema evolution (no versions) | `@deprecated(reason: "Use newField")` |
| gRPC Proto | Reserved field numbers | `reserved 3, 4;` |

**Breaking vs Non-Breaking:**
```
✅ Non-breaking: add optional field, add endpoint, relax validation
❌ Breaking: remove field, rename field, change type, make optional required
```

---

## BFF — Decision Card

**Use BFF when:**
- Multiple clients (web, mobile, TV) need different data shapes
- Aggregating 3+ microservices per page
- Frontend team needs to move independently of backend teams
- You want HTTP-only cookie sessions for the browser (security)

**Don't use BFF when:**
- Monolith backend + one client type (just add an endpoint)
- Small team — extra service = extra ops burden
- Public API product

**BFF golden rules:**
- One BFF per distinct client type
- BFF is owned and deployed by the frontend team
- BFF transforms, doesn't contain business logic
- Use `Promise.allSettled`, not `Promise.all` — partial responses beat 500s

---

## Contract-First — Checklist

Before writing code:
- [ ] API schema written (OpenAPI YAML / GraphQL SDL / Proto)
- [ ] Schema reviewed by both frontend and backend
- [ ] Schema committed to version control
- [ ] Codegen configured and running in CI
- [ ] Frontend mocks set up from schema (MSW or similar)
- [ ] Error response shapes defined in schema (not just success)
- [ ] Breaking change policy documented

---

## Error Classification — Cheat Sheet

| HTTP Status | Retryable? | Action |
|-------------|-----------|--------|
| 400 Bad Request | ❌ No | Show validation errors to user |
| 401 Unauthorized | 🔄 After refresh | Refresh token, retry once |
| 403 Forbidden | ❌ No | Tell user they lack permission |
| 404 Not Found | ❌ No | Show "not found" UI state |
| 409 Conflict | ❌ No | Show conflict message |
| 422 Unprocessable | ❌ No | Show field-level errors |
| 429 Too Many Requests | ✅ Yes | Wait `Retry-After`, then retry |
| 500 Server Error | ✅ Once | Log, show generic error |
| 502/503/504 | ✅ Yes | Retry with exponential backoff + jitter |
| Network Error | ✅ Yes | Check connectivity, retry |

**Retry formula:**
```
delay = min(baseMs * 2^attempt, maxMs) + random(0, delay * 0.5)
```

---

## Resilience Patterns — One-Liners

| Pattern | When to Use | Key Detail |
|---------|-------------|------------|
| **Retry + Backoff** | Transient failures (503, network) | Add jitter; respect `Retry-After` |
| **Circuit Breaker** | Non-critical dependent service | Fail fast when threshold exceeded; half-open for recovery |
| **Optimistic UI** | User actions that rarely fail | Store previous state; always implement rollback |
| **Error Boundary** | Component tree errors | Wrap at feature boundaries, not just root |
| **Idempotency Key** | Retryable mutations (POST) | UUID per action; server deduplicates |

---

## API Design Checklist (Use in System Design Rounds)

### General
- [ ] REST vs GraphQL vs gRPC chosen with justification
- [ ] Versioning strategy defined
- [ ] Authentication mechanism specified (JWT, OAuth, API key)
- [ ] Rate limiting in place

### Endpoints
- [ ] Nouns for resources, verbs for HTTP methods
- [ ] Consistent naming convention (camelCase vs snake_case — pick one)
- [ ] Pagination on all list endpoints
- [ ] Filtering documented with an explicit allowlist of fields
- [ ] Default sort defined (with tiebreaker)

### Responses
- [ ] Consistent success shape
- [ ] Structured error shape with machine-readable codes
- [ ] HTTP status codes semantically correct

### Contract
- [ ] OpenAPI / SDL / Proto file in version control
- [ ] Codegen in CI
- [ ] Breaking change policy documented
- [ ] Change communication plan (Sunset headers, changelog, migration guide)

---

## 20 Interview Q&A — Fast Reference

**Q: REST vs GraphQL — how do you choose?**  
A: REST for public APIs and heavy caching; GraphQL when multiple clients need different data shapes or the UI aggregates many resources per page.

**Q: What's the problem with offset pagination at scale?**  
A: Deep offsets force the DB to scan millions of rows before returning results. Inserts during pagination also cause duplicate or skipped items. Use cursor pagination instead.

**Q: What's the difference between 401 and 403?**  
A: 401 = not authenticated (who are you?), 403 = authenticated but not authorized (I know who you are; you can't do this). Retry a 401 after refreshing credentials. Never retry a 403.

**Q: What's a BFF?**  
A: A Backend for Frontend is a server-side layer, owned by the frontend team, that aggregates multiple microservice calls into one UI-optimized response per client type.

**Q: How does BFF differ from an API Gateway?**  
A: API Gateway = infrastructure (routing, rate limits, TLS) — platform team. BFF = UI composition (aggregation, transformation) — frontend team. They layer: gateway in front of BFF.

**Q: What's contract-first API design?**  
A: Write the schema (OpenAPI/SDL/Proto) before the code. Both teams generate types from it. Schema drift becomes a compile error, not a runtime surprise.

**Q: When would you use tRPC vs OpenAPI?**  
A: tRPC for full-stack TypeScript monorepos — no schema file needed, types flow directly. OpenAPI for multi-language, multi-repo, or public APIs that need documentation.

**Q: What's a breaking change?**  
A: Removing or renaming a field, changing a type, making an optional field required, or removing an endpoint. Adding optional fields is non-breaking.

**Q: How do you retry safely on mutations?**  
A: Idempotency keys — client sends a UUID per logical action in a header. Server stores key + result and deduplicates on retry. Prevents duplicate payments, orders, etc.

**Q: What's exponential backoff with jitter?**  
A: Increasing delay between retries (doubling each time) plus random jitter. Jitter prevents thundering herd where all clients retry simultaneously.

**Q: What's a circuit breaker?**  
A: Monitors failure rate for a dependency. Opens (fails fast) when failures exceed a threshold, stopping hammering. Half-opens periodically to probe recovery.

**Q: What's optimistic UI and what's the risk?**  
A: Update UI before server confirmation for instant feedback. Risk: server rejects the action and you must roll back. Always store previous state and implement rollback.

**Q: How do you handle partial failures in a BFF?**  
A: Use `Promise.allSettled` instead of `Promise.all`. If recommendations fail but user + orders succeed, return the page without recommendations. Partial response beats 500.

**Q: What's the difference between 400 and 422?**  
A: 400 = malformed request (wrong JSON, missing required header). 422 = syntactically valid but semantically wrong (quantity is a string when it should be a number, business rule violation).

**Q: How do you communicate API deprecations?**  
A: Add `@deprecated` annotations to the schema, set `Sunset` response headers with the end-of-life date, notify consumers via changelog and email, provide a migration guide with a timeline.

**Q: Should the BFF have its own database?**  
A: Typically no. BFFs are stateless aggregators. Persistent state = microservice. Redis for session caching is acceptable; a full DB means you've created a new domain service.

**Q: How do you unblock frontend dev before the backend is ready?**  
A: Contract-first + MSW mocking. Once the schema is agreed on, frontend mocks the API exactly matching the schema shape and builds in parallel. No backend required until integration.

**Q: What HTTP method do you use for a complex search?**  
A: `GET` with query params for simple filters. `POST` to `/search` with a JSON body for complex filter trees (AND/OR logic, nested conditions). Semantic `GET` is nice but impractical for complex queries.

**Q: How do you version a GraphQL API?**  
A: You generally don't version GraphQL. Instead, evolve the schema: add new fields freely, mark old ones `@deprecated`, remove only after all clients have migrated. Never change a field's type.

**Q: What should you never show users in an error message?**  
A: Raw server error messages, stack traces, SQL errors, internal service names, IP addresses, or HTTP status codes without context. Map everything to user-friendly strings with actionable guidance.

---

## Vocabulary Fast Reference

| Term | Definition |
|------|-----------|
| **BFF** | Backend for Frontend — UI-specific aggregation layer owned by frontend team |
| **Contract-first** | Schema defined before implementation; source of truth for both sides |
| **Cursor pagination** | Pagination using a position token; stable under inserts/deletes |
| **Offset pagination** | Skip N rows, return M; simple but unstable for high-write data |
| **Idempotency key** | Client-generated UUID preventing duplicate server-side actions on retry |
| **Circuit breaker** | Fails fast when a dependency exceeds failure threshold; enables recovery |
| **Optimistic UI** | Updates UI before server confirmation; rolls back on failure |
| **Breaking change** | API change that requires all consumers to update simultaneously |
| **Codegen** | Generating TypeScript types / validators from schema files automatically |
| **gRPC** | Google RPC — binary, typed, streaming, service-to-service protocol |
| **OpenAPI** | Standard schema format for REST APIs (YAML/JSON) |
| **GraphQL SDL** | Schema Definition Language — the contract for GraphQL APIs |
| **Error boundary** | React component that catches rendering errors and shows fallback UI |
| **Thundering herd** | All clients retrying simultaneously, overwhelming a recovering service |
| **Exponential backoff** | Doubling retry delay to spread load during recovery |

---

## System Design Talking Points

When asked an API system design question, structure your answer:

1. **Protocol choice** — REST / GraphQL / gRPC, with reason
2. **Versioning strategy** — URL prefix, headers, or schema evolution
3. **Pagination** — cursor or offset, with justification
4. **Authentication** — where tokens live, how they're validated
5. **Error contract** — status codes, machine-readable error codes, retry strategy
6. **Contract management** — OpenAPI/schema, codegen, how drift is prevented
7. **Resilience** — retries, circuit breakers, partial failure handling
8. **BFF consideration** — if multiple clients or microservices are involved

Mention trade-offs at every step. Interviewers want to hear you reason through decisions, not recite answers.
