## 01 — When to Use AI on the Backend

> **TL;DR:** The backend is the **gatekeeper** for LLM access: it holds keys, enforces rate limits, and decides when to call the model vs when to use rules or cached results. Use AI on the server when the task is open-ended and language-heavy; keep validation, auth, and exact business logic deterministic. In interviews, position the backend as the single place that talks to providers.

---

## 1. Backend as Gatekeeper

- **Frontend** never calls the LLM provider directly. It calls **your API**.
- **Your backend** decides when to call the LLM, builds prompts, enforces limits, and returns streamed or structured responses.

Benefits: key security, cost control, rate limiting, audit, and the ability to add RAG or tools without changing the client.

Interview phrase:

> "The backend is the only layer that talks to the LLM provider. It owns keys, rate limits, prompt construction, and optional RAG or tool use. The frontend just calls our chat or completion API."

---

## 2. When to Call the LLM vs When Not To

**Call the LLM when:**
- The task is **open-ended** (e.g. answer a question, summarize, suggest).
- You accept **some variability** in the output and have guardrails or human review where needed.

**Don’t call the LLM for:**
- **Validation** (format, required fields) — use schema/rules.
- **Auth / authorization** — use your auth system.
- **Exact calculations or pricing** — use deterministic code.
- **Decisions that must be auditable and reproducible** — use business logic, not model output.

Interview soundbite:

> "We call the LLM for language-heavy, open-ended tasks. We keep validation, auth, and anything that affects money or compliance in deterministic backend logic."

---

## 3. Proxy-Only vs Value-Add Backend

- **Proxy-only:** Backend forwards requests to the provider with auth and rate limiting. Minimal logic.
- **Value-add:** Backend adds RAG, tool use, prompt templates, PII redaction, and structured output. This is the common production pattern.

In interviews, say you prefer a value-add layer so you can change prompts, add RAG, and enforce security without changing the frontend.

---

## 4. Common Mistakes

| Mistake | Better approach |
|---------|-----------------|
| Letting the frontend call the provider | Backend proxies all LLM calls and holds keys |
| Using the LLM for validation or auth | Use deterministic validation and auth |
| No clear ownership of who builds prompts | Backend owns prompt construction and RAG context |

---

## 5. Interview Q&A

**Q: Why does the backend need to sit between the frontend and the LLM?**  
**A:**  
> "So we can keep API keys and cost on the server, enforce rate limits and quotas, build prompts and inject RAG context in one place, and audit what we send. The frontend stays a thin client that calls our API."

**Q: When do you call the LLM from the backend vs use traditional logic?**  
**A:**  
> "We call the LLM for open-ended, language-heavy tasks like chat, summarization, or suggestions. We use traditional logic for validation, auth, pricing, and anything that must be deterministic and auditable."

---

## 6. Next Topic

→ **[02-api-design-for-ai-endpoints.md](./02-api-design-for-ai-endpoints.md)** — Designing chat, stream, and structured-output endpoints.
