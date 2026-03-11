## 03 — Calling LLM Providers

> **TL;DR:** The backend calls one or more **LLM providers** (OpenAI, Anthropic, etc.) via their SDK or HTTP API. Use **streaming** for chat, **retries** with backoff for transient failures, and **timeouts** so requests don’t hang. Abstract the provider behind an interface so you can switch or fallback without changing the rest of the app.

---

## 1. Provider Abstraction

- Don’t hard-code provider-specific logic everywhere. Use a **service or adapter** that implements a common interface (e.g. `complete(messages, options)`, `stream(messages, options)`).
- Lets you swap providers, use fallbacks, or A/B test models with minimal code change.

Interview phrase:

> "We wrap the LLM provider behind an internal interface. That way we can switch providers, add retries and timeouts in one place, and keep the rest of the app provider-agnostic."

---

## 2. Streaming

- For chat, use the provider’s **streaming API** (e.g. server-sent events or chunked response).
- Read the stream and forward it to your client (or buffer and send in chunks). Handle backpressure so a slow client doesn’t block the server.
- On error mid-stream, send a clear error event or close the stream and return a proper status so the client can show a message or retry.

---

## 3. Retries and Timeouts

- **Retries:** Use exponential backoff for transient errors (rate limit, 5xx). Limit max retries so you don’t amplify load.
- **Timeouts:** Set a max time for the call to the provider (e.g. 30–60s). If exceeded, abort and return a timeout error to the client so it can show a fallback or retry.

---

## 4. Keys and Config

- Store **provider API keys** in secrets (env vars, secret manager). Never log or expose them.
- Prefer **one key per environment** (dev/stage/prod) and rotate periodically. Use provider dashboards to revoke if leaked.

---

## 5. Common Mistakes

| Mistake | Better approach |
|---------|-----------------|
| No timeout on provider calls | Set a timeout and return a clear error to the client |
| No retries for transient errors | Retry with backoff; distinguish retryable vs non-retryable errors |
| Provider-specific code scattered across the app | Centralize in an adapter/service with a simple interface |

---

## 6. Interview Q&A

**Q: How do you integrate with an LLM provider from the backend?**  
**A:**  
> "We use a dedicated service that talks to the provider’s API, with streaming for chat and retries with backoff for transient failures. We set timeouts so we don’t hang, and we keep keys in a secret store. The rest of the app depends on an abstract interface so we can switch providers or add fallbacks without changing business logic."

**Q: How do you handle provider rate limits?**  
**A:**  
> "We retry with exponential backoff when we get rate-limit responses, and we enforce our own per-user or per-tenant limits so we don’t burst the provider. We also surface rate-limit errors to the client with a retry-after when appropriate."

---

## 7. Next Topic

→ **[04-prompt-construction-and-management.md](./04-prompt-construction-and-management.md)** — Where prompts live and how to build them (system prompt, few-shot, RAG injection).
