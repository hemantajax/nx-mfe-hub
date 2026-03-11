## 04 — Prompt Engineering & API Design for AI

> **TL;DR:** Prompts are usually built and owned by the **backend**; the frontend sends user input and optional context. Design your **API** so the frontend gets **structured outputs** (JSON) when you need to drive UI (e.g. form suggestions, choices). Use clear contracts, schemas, and error shapes so the frontend can render and handle failures safely.

---

## 1. Who Owns the Prompt?

- **Backend** (or a dedicated prompt service) owns:
  - System prompts, few-shot examples, and RAG context injection.
- **Frontend** sends:
  - User message, conversation ID, locale, and any scope (e.g. product ID).

Frontend does not construct full prompts; it sends structured request payloads.

Interview phrase:

> "Prompt design lives on the backend. The frontend sends the user’s message and context; the backend builds the full prompt, including system instructions and RAG context, so we can change prompts without shipping a new frontend."

---

## 2. Structured Outputs When the UI Depends on It

When the UI needs to **act** on the model output (e.g. fill fields, show choices), prefer **structured output** (JSON) instead of free text:

- Backend asks the LLM for JSON (e.g. OpenAI `response_format: { type: "json_object" }`) or uses a schema.
- API returns that JSON; frontend parses and renders (buttons, forms, etc.).

Example API contract:

```json
POST /api/chat/structured
Request:  { "message": "I want to return my order", "context": { "orderId": "123" } }
Response: {
  "reply": "Here are your options:",
  "actions": [
    { "type": "refund", "label": "Full refund" },
    { "type": "exchange", "label": "Exchange item" }
  ]
}
```

Frontend then renders `actions` as buttons or links without parsing free text.

---

## 3. Tool Use / Function Calling

When the model can trigger **actions** (e.g. "book a meeting," "search products"):

- Backend defines **tools** (name, description, parameters) and sends them to the LLM.
- LLM returns a **tool call** (e.g. `search_products(query)`); backend executes and sends results back to the LLM.
- Frontend may only see the final assistant message, or the API can expose "suggested actions" as structured data.

Frontend’s role: call the API, show loading/streaming, and render any structured actions or tool results the backend exposes.

---

## 4. API Design Best Practices

- **Versioning:** e.g. `/api/v1/chat` so you can change prompts and response shape without breaking clients.
- **Idempotency / request IDs:** For retries and support, especially for mutations.
- **Clear errors:** e.g. `{ "code": "RATE_LIMITED", "retryAfter": 60 }` so the frontend can show a message or retry.
- **Timeouts:** Backend and frontend should agree on max wait; frontend should cancel or show fallback after timeout.

---

## 5. Common Mistakes

| Mistake | Better approach |
|---------|-----------------|
| Building prompts in the frontend | Keep prompt construction on the backend; frontend sends messages and context |
| Parsing free text in the UI to drive actions | Use structured outputs (JSON) and defined schemas for UI-critical responses |
| No error or timeout contract | Define error codes and timeout behavior so the frontend can handle them |

---

## 6. Interview Q&A

**Q: How do you design the API for an AI feature?**  
**A:**  
> "The backend owns the prompt and calls the LLM. The API accepts the user message and context and returns either streamed text or structured JSON when the UI needs to act on the response. We use clear error codes and timeouts so the frontend can show appropriate messages and retry or fallback. For actions like buttons or form suggestions, we prefer structured output over parsing free text."

**Q: What’s the frontend’s role in prompt engineering?**  
**A:**  
> "The frontend sends the user input and any context the backend needs — like locale or selected entity IDs. It doesn’t build prompts. That keeps prompt changes and model switches on the server and avoids leaking implementation details to the client."

---

## 7. Next Topic

→ **[05-mcp-and-ai-agents.md](./05-mcp-and-ai-agents.md)** — MCP and AI agents, and how they plug into Angular/React apps.
