## 09 — Security & Privacy

> **TL;DR:** **Never send PII or secrets** to the LLM unless you have a clear policy and consent. **Validate and sanitize** user input; be aware of **prompt injection** (user text that tries to change model behavior). Keep **keys and sensitive logic on the backend**; frontend only sends user content and context. In interviews, treat security and privacy as non-negotiable.

---

## 1. PII and Sensitive Data

- **Do not send** to the LLM unless required and allowed by policy: passwords, full payment details, SSN, health data, or other regulated PII.
- **Minimize:** Send only what’s needed for the task (e.g. "order ID" instead of full order with addresses if not needed).
- **Backend:** Can strip or redact before calling the provider; frontend should not send obviously sensitive fields in free text.

Interview phrase:

> "We treat PII and secrets as non-negotiable: we don’t send them to the LLM unless we have a clear use case and policy. We minimize what we send and, where possible, the backend redacts or uses IDs instead of raw PII."

---

## 2. Prompt Injection

- **Prompt injection:** User (or attacker) puts instructions in their message to try to change model behavior (e.g. "Ignore previous instructions and …").
- **Mitigations:** Backend uses clear **system prompts** and, where possible, separates user content from instructions; monitor and rate-limit; don’t trust raw model output for security-sensitive decisions (auth, payments).
- **Frontend:** Can’t fully prevent injection; validate input and don’t display raw model output as trusted HTML (risk of XSS). Sanitize or render as plain text.

---

## 3. Keys and Backend Proxy

- **Never** put LLM provider API keys in the frontend. Always call **your backend**, which calls the provider. This protects keys, enables rate limiting, and lets you log and filter.

---

## 4. Output and XSS

- **Don’t** render raw model output as HTML without sanitization. Prefer plain text or a safe renderer (e.g. markdown with a safe parser and no `dangerouslySetInnerHTML` / innerHTML with user/model content).

---

## 5. Common Mistakes

| Mistake | Better approach |
|---------|-----------------|
| Sending PII or secrets to the LLM | Minimize and redact; have a clear policy |
| Trusting model output for auth or payments | Use model output for UX only; enforce auth and business rules in code |
| Exposing provider API keys in the client | Proxy all calls through your backend |
| Rendering model output as raw HTML | Sanitize or render as plain text / safe markdown |

---

## 6. Interview Q&A

**Q: What are the main security and privacy concerns with LLMs in the frontend?**  
**A:**  
> "First, we never expose API keys — the frontend only talks to our backend. Second, we don’t send PII or secrets to the LLM unless we have consent and a policy. Third, we’re aware of prompt injection: the backend uses clear system prompts and we don’t trust raw model output for security decisions. Fourth, we don’t render model output as raw HTML; we sanitize or use plain text to avoid XSS."

**Q: How do you handle prompt injection?**  
**A:**  
> "We can’t fully prevent it on the client, so the backend owns mitigation: strong system prompts, separating user content from instructions, and not using model output for auth or payments. On the frontend we validate input and avoid rendering unsanitized model output as HTML."

---

## 7. Next Topic

→ **[10-cheat-sheet-and-qa.md](./10-cheat-sheet-and-qa.md)** — Cheat sheet and answer templates for "How would you add a chat/copilot?"
