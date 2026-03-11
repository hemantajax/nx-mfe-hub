## 08 — Cost, Rate Limiting & Budgets

> **TL;DR:** LLM calls are **costly** (per token or per request). The backend should **count tokens** (or requests), enforce **per-user or per-tenant limits**, and set **budgets** so you don’t overspend. Use **rate limiting** to smooth traffic and return clear errors when limits are hit so the frontend can show a message or retry later.

---

## 1. Why Backend Owns Cost Control

- **Single place:** All LLM calls go through your API, so you can count and limit in one place.
- **Per user/tenant:** You can enforce quotas (e.g. N requests per day, or M tokens per month) and return a clear error when exceeded.
- **Budgets:** Set an overall or per-feature budget and alert or throttle when approaching it.

---

## 2. Token Counting

- Most providers return **token usage** in the response (input + output). Use it to:
  - **Accumulate** per user/session/tenant.
  - **Enforce** a limit (e.g. 10k tokens per user per day).
- For streaming, providers often return usage at the end of the stream; you can also estimate from length if needed for soft limits.

---

## 3. Rate Limiting

- **Request rate:** Limit requests per user (or per IP) per minute/hour (e.g. 10 req/min for chat).
- **Concurrent requests:** Limit how many concurrent LLM calls one user can have to avoid one user exhausting capacity.
- Return **429** with `Retry-After` when the client is over limit so the frontend can show "Too many requests" or retry later.

---

## 4. Budgets and Alerts

- Set **monthly or daily budgets** (per environment or per feature). When usage approaches the budget, trigger alerts or throttle.
- Optionally **degrade** (e.g. switch to a cheaper model or disable non-essential features) instead of hard failure.

---

## 5. Common Mistakes

| Mistake | Better approach |
|---------|-----------------|
| No per-user or per-tenant limits | Enforce quotas and return a clear error when exceeded |
| Ignoring token usage | Track and limit tokens; use provider usage in responses |
| No budgets or alerts | Set budgets and get alerted before overspend |

---

## 6. Interview Q&A

**Q: How do you control cost when offering LLM features?**  
**A:**  
> "We track token usage per user or tenant from the provider’s response and enforce limits — for example a daily token or request cap. We rate limit requests per user so one user can’t burst the provider or our budget. When a limit is hit we return 429 with Retry-After so the client can show a message or retry. We also set overall budgets and get alerts so we can throttle or adjust before overspending."

**Q: How do you implement rate limiting for AI endpoints?**  
**A:**  
> "We apply rate limits at the API layer — for example per user or per API key — with a sliding window or token bucket. We limit both request count and, where possible, concurrent in-flight requests. When over limit we return 429 and optionally Retry-After so the frontend can handle it gracefully."

---

## 7. Next Topic

→ **[09-security-privacy-and-observability.md](./09-security-privacy-and-observability.md)** — Keys, PII redaction, audit, and logging.
