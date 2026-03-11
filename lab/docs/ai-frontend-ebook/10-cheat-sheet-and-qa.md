## 10 — Cheat Sheet & Interview Q&A

> Quick-reference patterns and interview-ready answers for AI/GenAI in the frontend (Angular & React).

---

## 1. Design Checklist

- [ ] **When to use AI:** Open-ended, language-heavy tasks (chat, copilots, summarization); not validation, auth, or exact calculations.
- [ ] **Architecture:** Frontend → your API/BFF → LLM provider; never expose provider keys in the client.
- [ ] **Streaming:** Use for chat so users see progress; show skeleton until first token.
- [ ] **Loading & errors:** Skeleton, clear error message, retry or fallback (e.g. search, support).
- [ ] **Structured output:** When the UI must act on the answer (buttons, forms), API returns JSON; avoid parsing free text.
- [ ] **RAG:** Backend does retrieval and prompt building; frontend sends query and optional context, displays answer and sources.
- [ ] **Security:** No PII/secrets to the LLM without policy; no raw HTML from model; backend proxies and enforces limits.
- [ ] **Cost/latency:** Timeouts, per-user/session limits, and fallbacks when over limit or slow.

---

## 2. High-Value Interview Answers

### "How would you add a chat/copilot to our app?"

> "I’d start by clarifying the use case — support, in-app assist, or something else — and whether we have the backend and data (e.g. RAG) to support it. Then I’d design the frontend to call our backend chat API, not the LLM provider directly, so we keep keys and cost server-side. I’d use streaming so the user sees the reply as it’s generated, with a loading skeleton and clear error and timeout handling. In Angular I’d put the API and stream logic in a service with signals; in React I’d use a custom hook. I’d make sure we don’t send PII or secrets to the model and that we have rate limits and fallbacks. For actions like suggested buttons or links, I’d prefer structured API responses over parsing free text."

### "When would you use AI in the UI vs traditional logic?"

> "I use AI where it adds clear value and is hard to do with rules: chat, copilots, summarization, natural-language search, or form assist. I keep validation, auth, pricing, and anything that must be deterministic and auditable in traditional code. AI enhances the experience; it doesn’t replace core business logic."

### "How do you integrate an LLM into our Angular/React app?"

> "The frontend calls our backend, which talks to the LLM provider. We use streaming for chat and expose the stream via a service in Angular (signals) or a hook in React. We handle loading, errors, and timeouts and show a skeleton until the first token. We don’t send PII or secrets, and we use structured output when the UI needs to act on the response."

### "What about RAG?"

> "RAG is implemented on the backend: it retrieves relevant chunks and injects them into the prompt. The frontend calls our chat or search API with the user’s message and optional context, and we display the answer and any sources the API returns. The frontend doesn’t do retrieval or embedding."

### "How do you handle security and privacy with LLMs?"

> "We never expose provider keys — the frontend only talks to our API. We don’t send PII or secrets unless we have a clear policy and consent. We’re aware of prompt injection and don’t trust model output for auth or payments. We don’t render model output as raw HTML; we sanitize or use plain text. The backend enforces rate limits and can redact or minimize data before calling the provider."

---

## 3. Rapid-Fire Q&A

- **Q:** Where do prompts live?  
  **A:** On the backend. Frontend sends user message and context; backend builds the full prompt.

- **Q:** Who calls the LLM provider?  
  **A:** The backend only. Frontend calls our API.

- **Q:** Why streaming?  
  **A:** Better perceived performance; user sees progress. We still show a skeleton until the first token.

- **Q:** Angular vs React for AI features?  
  **A:** Angular: service + signals + OnPush. React: custom hook + useState/useReducer + optional Suspense. Both: backend proxy, streaming, loading/error UX.

- **Q:** What’s MCP’s role in the frontend?  
  **A:** MCP is used server-side. Frontend calls our API; the backend may use MCP to give the agent tools. Frontend just displays the agent’s output.

---

## 4. Study Order (Night Before)

1. Re-read **01 (When to Use AI)** and **10 (this cheat sheet)**.
2. Memorize the "How would you add a chat/copilot?" and "When AI vs traditional logic?" answers.
3. Be ready to describe: backend proxy, streaming, loading/error UX, no PII in the prompt, and structured output when the UI must act on the response.
