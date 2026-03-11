## 04 — Prompt Construction & Management

> **TL;DR:** **Prompts are built on the backend** from system instructions, optional few-shot examples, and (for RAG) retrieved context. Keep them in code, config, or a database depending on how often they change. Never let the client supply the full prompt; the client sends the user message and context; the backend assembles the final prompt and calls the LLM.

---

## 1. Who Builds the Prompt

- **Backend** assembles: system prompt + few-shot examples (if any) + RAG context (if any) + user message.
- **Client** sends: user message and optional context (e.g. locale, entity IDs). Client does not send system prompt or raw RAG chunks.

Interview phrase:

> "Prompt construction is entirely server-side. We combine a system prompt, any few-shot examples, retrieved context for RAG, and the user’s message. The client only sends the message and scoping context."

---

## 2. System Prompt

- Defines **role, tone, and guardrails** (e.g. "You are a support assistant. Do not reveal internal systems. Answer in the user’s language.").
- Stored in config or code; can be versioned and A/B tested. Keep it out of client control to avoid prompt injection bypassing your instructions.

---

## 3. Few-Shot Examples

- Optional **example exchanges** in the prompt to steer format or behavior (e.g. always end with a question, or use a specific JSON shape).
- Can live in config or code. Don’t overstuff; they consume tokens and can make the prompt slow or expensive.

---

## 4. Where Prompts Live

- **Code:** Good for stable, versioned prompts and easy review.
- **Config/DB:** Good for non-engineers to edit or for per-tenant variants. Ensure proper access control and audit.
- **Hybrid:** System prompt in code, per-feature or per-tenant overrides in config.

---

## 5. Injection and Safety

- **User input** is always part of the prompt. Separate it clearly from system instructions (e.g. distinct message roles) so the model doesn’t confuse instructions with content.
- **Prompt injection** (user tries to override instructions): mitigate with strong system prompts, input validation, and not trusting raw model output for security-sensitive decisions.

---

## 6. Common Mistakes

| Mistake | Better approach |
|---------|-----------------|
| Letting the client send the system prompt | Backend only; client sends user message and context |
| Huge few-shot sets | Keep few-shot small and relevant to avoid cost and latency |
| No separation between user content and instructions | Use clear message roles and structure so the model sees the difference |

---

## 7. Interview Q&A

**Q: Where do you build prompts and who owns them?**  
**A:**  
> "We build prompts on the backend. We have a system prompt that defines role and guardrails, optional few-shot examples, and we inject RAG context when we have it. The client only sends the user message and context like locale or entity IDs. We keep prompts in code or config so we can version and change them without a frontend release."

**Q: How do you protect against prompt injection?**  
**A:**  
> "We use a clear system prompt and separate user content into the user message role so the model sees the distinction. We don’t use raw model output for auth or payments. We validate and sometimes sanitize user input, and we monitor for abuse."

---

## 8. Next Topic

→ **[05-rag-implementation.md](./05-rag-implementation.md)** — Implementing RAG: embeddings, vector stores, chunking, and retrieval.
