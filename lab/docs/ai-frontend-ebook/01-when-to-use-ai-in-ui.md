## 01 — When to Use AI in the UI

> **TL;DR:** Use AI in the UI when it adds clear user value (chat, copilots, summarization, form assist) and when deterministic logic is insufficient or costly to maintain. Avoid using LLMs for simple rules, validation, or anything that must be 100% correct and auditable. In interviews, lead with "when" and "why" before "how."

---

## 1. Core Idea: AI as a Capability, Not a Default

AI (especially LLMs) is a **tool** for specific problems:

- **Good fit:** Open-ended language tasks, personalization, drafting, explanation, search over natural language.
- **Poor fit:** Strict business rules, validation, calculations, access control, anything that must be reproducible and explainable.

Interview phrase:

> "I use AI where it improves the experience in ways that are hard to achieve with traditional logic — like natural-language search, summarization, or in-app assistance. I don't use it for anything that has to be deterministic or legally auditable without human review."

---

## 2. High-Value Use Cases for the UI

| Use case | What the user gets | Why AI helps |
|----------|--------------------|--------------|
| **Chat / support** | Answers in context of the product | Handles varied questions without hard-coding every FAQ path |
| **Copilots** | Suggestions while writing (email, code, forms) | Completions and rewrites that feel natural |
| **Summarization** | Short version of long content (threads, docs) | One model call instead of hand-written heuristics |
| **Form assist** | Auto-fill, suggestions, error explanation in plain language | Reduces friction and support load |
| **Search / discovery** | "Find things like this" or natural-language queries | Semantic search when keyword search falls short |
| **Localization / tone** | Rewrite in another language or tone | Single integration instead of many rule sets |

In interviews, pick one or two and explain the **user outcome** and **why traditional logic is limiting**.

---

## 3. When Not to Use AI

- **Validation:** Email format, required fields, business rules → use deterministic validation.
- **Access control:** Who can see what → use auth and permissions, not LLMs.
- **Pricing / calculations:** Money, quotas → use exact logic and audit trails.
- **Safety-critical or legal:** Content moderation can use AI as a signal but should have human review and clear policy.

Interview soundbite:

> "We keep validation, auth, and anything that affects money or compliance outside the LLM. AI informs the experience; it doesn't replace our core business logic."

---

## 4. Trade-offs to Mention

- **Latency:** LLM calls are slower than local logic; need loading states and sometimes streaming.
- **Cost:** Per-token pricing; you need budgets and fallbacks for high traffic.
- **Unpredictability:** Output can vary; need guardrails, retries, and fallback UX.
- **Privacy:** Data sent to providers; need policies and filtering for PII.

Showing you think in trade-offs signals seniority.

---

## 5. Common Mistakes

| Mistake | Better approach |
|---------|-----------------|
| "We'll use AI everywhere" | Use AI only where it clearly improves outcomes and you can handle cost/latency/errors |
| Using LLMs for simple if/else or validation | Prefer deterministic code for rules and validation |
| No fallback when the model is slow or down | Always design fallbacks (e.g. hide feature, show cached result, or non-AI path) |
| Ignoring cost at scale | Model usage per user/session and set budgets and limits |

---

## 6. Interview Q&A

**Q: When would you use AI in a frontend product?**  
**A:**  
> "Where it clearly improves the experience and is hard to do with traditional logic: in-app chat or copilots, summarization, natural-language search, or form assistance. I avoid using it for validation, auth, pricing, or anything that must be deterministic and auditable."

**Q: How do you decide between building a feature with AI vs traditional logic?**  
**A:**  
> "I ask whether the problem is open-ended and language-heavy — like answering varied questions or rewriting text — and whether we can accept some variability and latency. If yes, AI can add value. If the problem is rules, validation, or exact outcomes, I keep it deterministic and leave AI for enhancing the experience around that."

---

## 7. Next Topic

→ **[02-integrating-llm-apis.md](./02-integrating-llm-apis.md)** — How to call LLM APIs from Angular and React: streaming, error handling, and loading states.
