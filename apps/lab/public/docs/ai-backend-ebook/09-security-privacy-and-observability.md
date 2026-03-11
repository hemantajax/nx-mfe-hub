## 09 — Security, Privacy & Observability

> **TL;DR:** **Security:** Keep provider keys in a secret store; never log or expose them. **Privacy:** Redact or omit PII before sending to the LLM; have a clear policy. **Observability:** Log requests and responses in a **sanitized** way (no raw PII or full prompts in logs), track latency and token usage, and monitor errors so you can debug and alert.

---

## 1. Keys and Secrets

- Store **provider API keys** in a secret manager (e.g. env vars in a secure runtime, or cloud secret store). Never commit them or log them.
- Rotate keys periodically; use separate keys per environment (dev/stage/prod) so a leak is scoped.
- If the client ever called the provider directly (don’t), keys would be exposed; that’s why **all** calls go through your backend.

---

## 2. PII and Privacy

- **Don’t send** unnecessary PII to the LLM. Strip or redact before building the prompt (e.g. replace email with "USER_EMAIL" or omit it if not needed).
- Have a **policy** for what you send and retain; comply with regulations (e.g. GDPR) and provider terms. Optionally allow users to opt out of AI features that process their data.
- **Audit:** Log that a request was made (e.g. user ID, feature, timestamp) without logging the full prompt or response if they contain PII.

---

## 3. Prompt Injection and Output Safety

- **Prompt injection:** User input can try to override instructions. Mitigate with a strong system prompt, clear separation of user content, and **never** trusting raw model output for auth or payments. Validate and authorize in your code.
- **Output:** Don’t forward unsanitized model output to the client as HTML (XSS). Your API can return plain text or structured data; the frontend should sanitize or render safely.

---

## 4. Observability

- **Logging:** Log request IDs, user/tenant ID, feature, latency, token usage, and errors. **Do not** log full prompts or responses if they contain PII; log hashes or lengths if needed for debugging.
- **Metrics:** Track request count, latency (p50/p95), token usage, error rate, and rate-limit hits. Use for capacity planning and alerts.
- **Alerts:** Alert on error spikes, latency degradation, or budget thresholds.

---

## 5. Common Mistakes

| Mistake | Better approach |
|---------|-----------------|
| Logging full prompts or responses | Log metadata only; sanitize or omit PII |
| Sending PII to the provider without need | Redact or omit; have a policy |
| Trusting model output for auth or money | Use model output for UX only; enforce rules in code |
| No metrics or alerts | Track latency, usage, errors; set alerts |

---

## 6. Interview Q&A

**Q: How do you secure an AI backend?**  
**A:**  
> "We keep provider keys in a secret store and never log them. We redact or omit PII before sending anything to the LLM and have a clear policy. We don’t trust raw model output for auth or payments — we validate and authorize in our code. We log requests in a sanitized way — metadata and token usage, not full prompts — and we monitor latency, errors, and usage so we can debug and alert."

**Q: How do you observe and debug AI endpoints?**  
**A:**  
> "We log request IDs, user/tenant, feature, latency, and token usage. We don’t log full prompts or responses if they contain PII. We have metrics for request count, latency percentiles, and error rate, and we alert on anomalies or budget thresholds. For debugging we can correlate by request ID and inspect sanitized logs or replay with redacted data in a test environment."

---

## 7. Next Topic

→ **[10-cheat-sheet-and-qa.md](./10-cheat-sheet-and-qa.md)** — Cheat sheet and interview answer templates.
