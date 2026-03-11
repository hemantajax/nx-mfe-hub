## 08 — Cost, Latency & UX

> **TL;DR:** LLM calls are **slower** and **costly** at scale. Improve UX with **streaming** (so users see progress), **skeletons** and loading states, and **fallbacks** when the model is slow or fails. Set **budgets** and **limits** (e.g. per user or per session) and design the UI to degrade gracefully. In interviews, show you think about perceived performance and cost control.

---

## 1. Latency and Perceived Performance

- **Time to first token (TTFT)** matters more than total time for chat: users tolerate a short "Thinking…" then expect to see text quickly.
- **Streaming** improves perceived performance: show a skeleton or spinner until the first chunk, then stream so the answer "grows" instead of appearing in one block after a long wait.
- **Timeout:** Set a max wait (e.g. 30–60s); if exceeded, show a message and optional retry or fallback (e.g. link to search or support).

---

## 2. Loading and Skeleton UX

- **Before first token:** Skeleton in the message area or a clear "Thinking…" / typing indicator.
- **During stream:** Show partial content; avoid blocking the whole UI.
- **On error:** Clear message (e.g. "Something went wrong") and a "Try again" or alternative path (e.g. search, contact support).

Interview phrase:

> "We use streaming so the first token appears quickly and the answer builds in place. Before that we show a skeleton or typing indicator. We also set a timeout and show a fallback or retry if the request takes too long."

---

## 3. Cost and Limits

- **Per-token pricing:** Backend should track usage and enforce limits (per user, per session, or per feature).
- **Frontend:** Can show "X uses left" or disable after limit; avoid sending huge context (e.g. entire documents) unless the backend is designed for it.
- **Fallback:** When over limit or on error, offer a non-AI path (search, form, link to docs) so the feature still adds value.

---

## 4. Budgets and Monitoring

- Backend: budget per user/session/feature and monitor spend.
- Frontend: if the API returns rate-limit or quota info, show it in the UI (e.g. "You’ve reached your limit for this session").

---

## 5. Common Mistakes

| Mistake | Better approach |
|---------|-----------------|
| No loading state or single long wait | Skeleton + streaming so user sees progress |
| No timeout or fallback | Set timeout; show retry or non-AI fallback |
| Ignoring cost at scale | Enforce limits and budgets; design UI for "limit reached" |
| Sending huge context from frontend | Let backend control context size and RAG; frontend sends minimal needed |

---

## 6. Interview Q&A

**Q: How do you handle latency and UX for AI features?**  
**A:**  
> "We use streaming so the user sees the answer as it’s generated instead of waiting for the full response. We show a skeleton or typing indicator until the first token, set a timeout with a clear fallback or retry, and on errors we show a message and an alternative path like search or support. That keeps perceived performance acceptable even when the model is slow."

**Q: How do you think about cost when adding AI?**  
**A:**  
> "We treat it as a backend concern: we track usage and set per-user or per-session limits and budgets. The frontend can show when the user is near or at the limit and offer a fallback so the feature still helps. We also avoid sending unnecessary context from the client so we don’t burn tokens on things the backend can retrieve via RAG."

---

## 7. Next Topic

→ **[09-security-and-privacy.md](./09-security-and-privacy.md)** — What not to send to LLMs, PII, and prompt injection basics.
