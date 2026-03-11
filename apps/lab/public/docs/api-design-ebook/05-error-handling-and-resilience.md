# Chapter 05 — Error Handling & Resilience on the Client

## TL;DR

Good error handling means: **classifying errors correctly**, **not retrying what won't recover**, **communicating meaningfully to users**, and **never letting one failure cascade into a broken page**.

> **One-liner for interviews:** "Classify errors by recoverability — transient errors retry with backoff, permanent errors surface to the user, and unhandled errors fall back to a safe degraded state."

---

## Core Concept

### Error Taxonomy

Not all errors are equal. How you respond to an error depends on its *class*:

| Class | HTTP Status | Cause | Response |
|-------|-------------|-------|----------|
| **Transient** | 429, 503, 502, 504 | Server overload, network blip | Retry with backoff |
| **Client error** | 400, 422 | Bad input, validation failure | Show error to user, don't retry |
| **Auth error** | 401 | Token expired | Refresh token, then retry once |
| **Forbidden** | 403 | Insufficient permissions | Tell user, don't retry |
| **Not found** | 404 | Resource doesn't exist | Show "not found" UI |
| **Server error** | 500 | Bug in backend | Log, show generic error, maybe retry once |
| **Network error** | (no response) | Offline, DNS failure | Check connectivity, retry when online |

**The key insight:** Retrying a 400 is pointless and wasteful. Retrying a 503 is correct. Retrying a 401 without refreshing the token just fills your logs with auth errors.

---

## Deep Dive

### Structured Error Responses

A good error response tells the client *what went wrong*, *where*, and *with what code*. This enables programmatic handling, not just string matching.

**Recommended error shape (RFC 9457 / Problem Details):**
```json
{
  "type": "https://api.example.com/errors/validation-error",
  "title": "Validation Error",
  "status": 422,
  "detail": "One or more fields failed validation.",
  "instance": "/api/orders",
  "errors": [
    { "field": "quantity", "code": "out_of_range", "message": "Must be between 1 and 100" },
    { "field": "address.zip", "code": "invalid_format", "message": "Invalid ZIP code" }
  ]
}
```

**Why machine-readable codes matter:**
```typescript
// DON'T: String matching (brittle, breaks on translation)
if (error.message === "Out of stock") { ... }

// DO: Code matching (stable)
if (error.code === "PRODUCT_OUT_OF_STOCK") { ... }
```

Define an error code enum in your OpenAPI spec. Generate it. Use it on both sides.

---

### Retry Logic

**When to retry:**
- Network errors (no response)
- `429 Too Many Requests` (with `Retry-After` header)
- `502`, `503`, `504` (transient server/gateway failures)

**When NOT to retry:**
- `400 Bad Request` — your payload is wrong, same request will fail again
- `401 Unauthorized` — retry only after refreshing the token
- `403 Forbidden` — permissions won't change between retries
- `404 Not Found` — the resource is gone
- `422 Unprocessable Entity` — validation failed, input won't fix itself

#### Exponential Backoff with Jitter

Never retry with a fixed delay. If 1000 clients all retry after 1 second, you cause a thundering herd. Add jitter:

```typescript
function retryWithBackoff<T>(
  fn: () => Promise<T>,
  {
    maxAttempts = 3,
    baseDelayMs = 200,
    maxDelayMs = 10_000,
  } = {}
): Promise<T> {
  async function attempt(n: number): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (!isRetryable(err) || n >= maxAttempts) throw err;

      // Exponential backoff + jitter
      const exp = Math.min(baseDelayMs * 2 ** n, maxDelayMs);
      const jitter = Math.random() * exp * 0.5;
      await sleep(exp + jitter);

      return attempt(n + 1);
    }
  }

  return attempt(0);
}

function isRetryable(err: unknown): boolean {
  if (err instanceof NetworkError) return true;
  if (err instanceof ApiError) return [429, 502, 503, 504].includes(err.status);
  return false;
}
```

#### Respecting `Retry-After`

When you get a `429`, the server tells you when to retry:
```typescript
if (err.status === 429) {
  const retryAfter = err.headers.get('Retry-After');
  const delayMs = retryAfter
    ? parseInt(retryAfter) * 1000   // seconds → ms
    : exponentialDelay(attempt);
  await sleep(delayMs);
}
```

---

### Circuit Breaker Pattern

If a service is consistently failing, stop calling it immediately rather than hammering it with retries. A circuit breaker tracks failure rate and "opens" when it exceeds a threshold.

**States:**
- **Closed (normal):** Requests flow through
- **Open (failing):** Requests fail immediately — no network call made
- **Half-open (recovery):** One test request allowed through; if it succeeds, circuit closes

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold = 5,
    private readonly timeoutMs = 30_000
  ) {}

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.timeoutMs) {
        this.state = 'half-open';
      } else {
        throw new CircuitOpenError('Service unavailable — circuit is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.threshold) this.state = 'open';
  }
}
```

In practice, use a battle-tested library (`cockatiel`, `opossum`, `resilience4j`).

---

### Optimistic UI & Rollback

Optimistic UI updates the UI immediately on user action, before the server confirms, then rolls back if the request fails. This makes the UI feel instant.

```typescript
function useToggleLike(postId: string) {
  const [liked, setLiked] = useState(false);

  async function toggle() {
    const previous = liked;
    setLiked(!liked);  // Optimistic update — instant UI feedback

    try {
      await api.toggleLike(postId);
    } catch (err) {
      setLiked(previous);  // Rollback on failure
      toast.error('Failed to update. Please try again.');
    }
  }

  return { liked, toggle };
}
```

**Golden rules for optimistic UI:**
1. Store the previous state before the optimistic update
2. Always have a rollback path
3. Show a subtle indicator during the pending state
4. For destructive actions (delete, payment), prefer confirmation + loading over optimistic updates

---

### Error Boundary (React)

Unhandled errors in components can crash the whole app. Error boundaries catch rendering errors and show a fallback UI:

```typescript
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('Unhandled render error', { error, info });
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// Usage — wrap at feature boundaries, not just the root
<ErrorBoundary fallback={<OrdersError />}>
  <OrdersSection />
</ErrorBoundary>
```

Wrap at **feature boundaries**, not just the app root. If the orders section crashes, the nav and profile should still work.

---

### User-Facing Error Communication

| Situation | What to Show |
|-----------|-------------|
| Validation error (400, 422) | Field-level inline errors with actionable message |
| Auth expired (401) | Redirect to login or refresh silently |
| Not found (404) | "This page doesn't exist" — offer navigation |
| Server error (500) | Generic "Something went wrong" + retry button |
| Offline | "You're offline" banner — queue actions if possible |
| Partial failure | Show what loaded, indicate what failed separately |

**Never show:**
- Raw error messages from the server ("SQLSTATE[23000]: Integrity constraint violation")
- Stack traces
- Internal service names or IPs
- HTTP status codes without context

---

## Examples

### Typed API Client with Error Handling

```typescript
class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public detail: string,
    public fieldErrors?: FieldError[]
  ) {
    super(detail);
  }
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);

  if (res.ok) return res.json() as Promise<T>;

  const body = await res.json().catch(() => ({}));
  throw new ApiError(
    res.status,
    body.code ?? 'UNKNOWN_ERROR',
    body.detail ?? 'An unexpected error occurred',
    body.errors
  );
}

// Usage
try {
  const order = await apiFetch<Order>(`/api/orders/${id}`);
} catch (err) {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'ORDER_NOT_FOUND':   return showNotFound();
      case 'PAYMENT_REQUIRED':  return redirectToBilling();
      default:                  return showGenericError(err);
    }
  }
  throw err; // Re-throw unexpected errors to the error boundary
}
```

---

## Best Practices

- **Classify before handling.** Every error handler should first classify the error, then decide the action. Never handle all errors the same way.
- **Retry with backoff + jitter.** Fixed delays cause thundering herds. Randomized jitter spreads load.
- **Use idempotency keys for mutations.** If you retry a `POST`, you might create duplicates. Send an `Idempotency-Key` header so the server deduplicates.
- **Separate transient from permanent.** Transient = retry. Permanent = inform the user.
- **Log errors with context.** Log the request URL, status, error code, and correlation ID. Raw status codes in logs are not enough to debug.
- **Test error states explicitly.** Use MSW or other mocking to simulate 500s, 429s, and network failures in tests and Storybook. Don't discover your error UI only in production.

---

## Common Mistakes

❌ **Retrying 4xx errors** — A 400 will fail identically on every retry. Retrying wastes quota and delays the user seeing a useful error.

❌ **Catching errors and swallowing them** — `catch (err) {}` hides bugs. At minimum, log. At best, propagate to an error boundary.

❌ **Showing raw server error messages** — Internal messages expose system internals and confuse users. Always map to user-friendly strings.

❌ **No rollback on optimistic UI** — If the server rejects the action and the UI doesn't roll back, the UI is now showing data that doesn't exist on the server.

❌ **One global error handler for everything** — A single "Something went wrong" handler on every error provides no useful information. Classify and handle appropriately.

❌ **Retrying without idempotency keys** — POST retries can create duplicates. Always add idempotency keys on mutations you intend to retry.

---

## Interview Q&A

**Q: How do you handle API errors on the client?**  
A: "I classify errors first by recoverability. Transient errors — 429, 502, 503, 504, network failures — I retry with exponential backoff and jitter. Client errors — 400, 422 — I surface field-level validation messages to the user; retrying is pointless. 401s trigger a token refresh and one retry. 403 and 404 I handle with specific UI states. For anything unexpected, I log with context and show a generic error with a retry option."

**Q: What's a circuit breaker and when would you use it?**  
A: "A circuit breaker monitors failure rate for a service. When failures exceed a threshold, it 'opens' and immediately rejects requests without making network calls — preventing a degraded service from being flooded with traffic that can't succeed. After a timeout, it tries one probe request. If it succeeds, it closes and resumes normal operation. I'd use this for any non-critical service a BFF depends on — recommendations, analytics — where I can degrade gracefully rather than fail hard."

**Q: How does optimistic UI work and what can go wrong?**  
A: "Optimistic UI updates the UI immediately on user action without waiting for server confirmation, making the experience feel instant. The risk is that if the server rejects the action, you need to roll back. The pattern is: save the previous state, apply the optimistic update, await the API call, and restore previous state on failure with a user notification. The failure case is the easy part to forget — untested rollback logic leads to UIs showing data that doesn't match the server."

**Q: How do you make retries safe for non-idempotent operations?**  
A: "By using idempotency keys. The client generates a unique UUID per logical action and sends it as an `Idempotency-Key` header. The server stores the key and its result. If the same key arrives again (due to a retry), it returns the stored result instead of executing again. This means you can safely retry a payment POST without charging twice. Stripe pioneered this pattern and it's now considered standard for any mutable operation you might retry."

---

## Next Steps

- **Cheat Sheet** → [06-cheat-sheet-and-qa.md](./06-cheat-sheet-and-qa.md) — quick-access reference for all error handling patterns
- **Contract-First Design** → [04-contract-first-design.md](./04-contract-first-design.md) — how to type your error responses in the schema
- **BFF Pattern** → [03-bff-pattern.md](./03-bff-pattern.md) — how BFFs handle partial failures from downstream services
