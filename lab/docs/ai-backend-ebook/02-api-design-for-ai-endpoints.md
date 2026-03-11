## 02 — API Design for AI Endpoints

> **TL;DR:** Expose **chat** and **completion** via clear REST or streaming endpoints. Support **streaming** for long replies, **structured output** when the frontend needs to act on the response, and **consistent error and timeout contracts**. Version your API so you can change prompts and response shapes without breaking clients.

---

## 1. Core Endpoints

Typical patterns:

- **POST /api/chat** — Send messages; get back full or streamed reply. Used for conversational UI.
- **POST /api/chat/stream** — Same input, response is SSE or chunked body for streaming.
- **POST /api/complete** or **POST /api/chat/structured** — When the UI needs JSON (e.g. suggested actions, form fields). Backend asks the LLM for JSON and returns it.

Frontend only sees these; it doesn’t know which provider or model you use.

---

## 2. Request Shape

Common request body:

```json
{
  "messages": [ { "role": "user", "content": "..." } ],
  "context": { "userId": "...", "locale": "en", "productId": "..." },
  "stream": true
}
```

- **messages:** Conversation history (and optional system message if you allow override).
- **context:** For scoping, RAG, or personalization; backend uses it to build the prompt.
- **stream:** Whether to stream the response (or use a separate stream endpoint).

---

## 3. Response: Full vs Stream

- **Full:** Return JSON `{ "content": "..." }` or `{ "content": "...", "sources": [...] }` after the model finishes. Simpler for the client; higher latency.
- **Stream:** Return SSE or chunked transfer; client reads the body stream. Better for chat UX; requires client to handle incremental updates.

Always document timeout (e.g. 60s) and what the client should do on timeout or 5xx.

---

## 4. Structured Output for UI Actions

When the frontend needs to **act** (buttons, links, form suggestions), return JSON instead of free text:

```json
{
  "reply": "Here are your options:",
  "actions": [
    { "type": "refund", "label": "Full refund" },
    { "type": "exchange", "label": "Exchange item" }
  ]
}
```

Backend uses provider’s structured-output or tool-calling support so the model returns JSON; you validate and return it. Frontend doesn’t parse free text.

---

## 5. Errors and Versioning

- **Errors:** Use clear codes (e.g. `RATE_LIMITED`, `PROVIDER_ERROR`, `TIMEOUT`) and optional `retryAfter`. Frontend can show a message or retry.
- **Versioning:** e.g. `/api/v1/chat` so you can change prompts or response shape without breaking existing clients.

---

## 6. Common Mistakes

| Mistake | Better approach |
|---------|-----------------|
| No streaming option for chat | Offer streaming so the client can show progress |
| Exposing provider-specific fields to the client | Keep API provider-agnostic; hide model names and token counts unless needed |
| No error contract | Define error codes and timeout behavior so the frontend can handle them |

---

## 7. Interview Q&A

**Q: How do you design the API for an AI chat feature?**  
**A:**  
> "We expose a POST /api/chat or /api/chat/stream that accepts messages and optional context. The backend builds the prompt, calls the LLM, and returns either a full JSON body or a stream. We use consistent error codes and timeouts so the frontend can show errors and retry. When the UI needs to render actions like buttons, we return structured JSON from a dedicated endpoint instead of parsing free text."

**Q: Why version AI endpoints?**  
**A:**  
> "So we can change prompts, add RAG, or change the response shape without breaking existing clients. We version the path or header and support at least one previous version during migration."

---

## 8. Next Topic

→ **[03-calling-llm-providers.md](./03-calling-llm-providers.md)** — How to call LLM providers from the backend: streaming, retries, and timeouts.
