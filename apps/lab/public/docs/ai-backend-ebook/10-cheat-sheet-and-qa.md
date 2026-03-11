## 10 — Cheat Sheet & Interview Q&A

> Quick-reference patterns and interview-ready answers for AI/GenAI on the backend.

---

## 1. Design Checklist

- [ ] **Backend as gatekeeper:** Only the backend calls the LLM provider; frontend calls your API.
- [ ] **When to call LLM:** Open-ended, language-heavy tasks; not validation, auth, or exact business logic.
- [ ] **API:** Clear chat/stream and optional structured-output endpoints; versioned; consistent errors and timeouts.
- [ ] **Provider:** Abstract behind an interface; use streaming, retries, and timeouts.
- [ ] **Prompts:** Built on the backend (system + few-shot + RAG + user message); client sends only message and context.
- [ ] **RAG:** Backend does chunking, embedding, retrieval, and prompt injection; return sources when possible.
- [ ] **Tool use:** Define tools, validate and authorize execution, limit iterations; MCP optional for pluggable tools.
- [ ] **Cost:** Track tokens and requests; enforce per-user/tenant limits and budgets; rate limit.
- [ ] **Security:** Keys in secret store; redact PII; don’t trust model output for auth/payments; sanitized logging and metrics.

---

## 2. High-Value Interview Answers

### "How do you expose LLM features to the frontend?"

> "We expose backend APIs — for example POST /api/chat and POST /api/chat/stream — that accept the user’s message and optional context. The backend holds the provider keys, builds the prompt, and optionally runs RAG or tool use. It returns either a full response or a stream and never exposes the provider or keys to the client. We use consistent error codes and timeouts so the frontend can handle errors and retries."

### "How would you implement RAG?"

> "We chunk documents and embed them, store vectors in a vector store, and at request time embed the query and run similarity search to get the top-k chunks. We inject those into the prompt and call the LLM. The whole pipeline runs on the backend; we return the answer and optionally source IDs or snippets for citations. We tune chunk size and top-k for our context window and quality."

### "How do you control cost and abuse?"

> "We track token usage from the provider response and enforce per-user or per-tenant limits. We rate limit requests and optionally concurrent calls. When limits are hit we return 429 with Retry-After. We set budgets and get alerts so we can throttle or adjust before overspending."

### "How do you secure an AI backend?"

> "We keep provider keys in a secret store and never log them. We redact or omit PII before sending to the LLM and don’t trust model output for auth or payments. We log requests in a sanitized way and monitor latency, errors, and usage. We validate and authorize all tool executions."

### "What’s the backend’s role vs the frontend’s in an AI feature?"

> "The backend is the only layer that talks to the LLM. It owns keys, prompts, RAG, tool use, rate limits, and cost. The frontend sends the user message and context and displays the streamed or final response. The frontend doesn’t build prompts or call the provider; it’s a thin client to our API."

---

## 3. Rapid-Fire Q&A

- **Q:** Where do prompts live?  
  **A:** On the backend; built from system prompt, few-shot, RAG context, and user message. Client sends only message and context.

- **Q:** Who calls the LLM provider?  
  **A:** The backend only. Frontend calls our API.

- **Q:** How do you handle rate limits?  
  **A:** We enforce per-user/tenant limits and return 429 with Retry-After when exceeded. We may also rate limit at the provider with retries and backoff.

- **Q:** How do you keep RAG secure?  
  **A:** RAG runs entirely on the backend; we only retrieve data the user is allowed to see and we don’t send raw PII in the prompt when avoidable.

- **Q:** What’s MCP’s role?  
  **A:** MCP is server-side: we run or connect to MCP servers so our agent can discover and call tools in a standard way. The frontend doesn’t use MCP.

---

## 4. Study Order (Night Before)

1. Re-read **01 (When to Use AI on the Backend)** and **10 (this cheat sheet)**.
2. Memorize the "How do you expose LLM features?" and "How do you control cost?" answers.
3. Be ready to describe: backend as gatekeeper, API design (stream + errors), RAG pipeline, tool use safety, and security/observability in one sentence each.
