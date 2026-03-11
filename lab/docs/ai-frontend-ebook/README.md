# AI / GenAI for Frontend (Angular & React) — Interview Prep Ebook

> **Target:** Senior engineers / UI architects  
> **Focus:** When and how to use AI in the UI, LLM integration, RAG, prompts, MCP/agents, and best practices in Angular & React  
> **Format:** Short, deep chapters — each one is an interview-ready topic

---

## Part 1: Foundations & Integration

| # | Chapter | Key Topics |
|---|---------|-----------|
| 01 | [When to Use AI in the UI](./01-when-to-use-ai-in-ui.md) | Chat, copilots, summarization, form assist vs traditional logic |
| 02 | [Integrating LLM APIs from Angular & React](./02-integrating-llm-apis.md) | Streaming, error handling, loading states, fetch/HTTP patterns |
| 03 | [RAG and AI + Your Data](./03-rag-and-ai-with-your-data.md) | Backend RAG vs frontend role, when frontend calls RAG APIs |
| 04 | [Prompt Engineering & API Design for AI](./04-prompt-engineering-and-api-design.md) | Structured outputs, tool use, API contracts for AI features |
| 05 | [MCP & AI Agents in Frontend](./05-mcp-and-ai-agents.md) | MCP, agents, how they plug into Angular/React apps |

## Part 2: Framework Best Practices

| # | Chapter | Key Topics |
|---|---------|-----------|
| 06 | [Angular Best Practices for AI](./06-angular-best-practices-for-ai.md) | Signals, async, services, lazy loading, streaming in Angular |
| 07 | [React Best Practices for AI](./07-react-best-practices-for-ai.md) | Hooks, Suspense, Server Components, streaming in React |

## Part 3: Production & Interview Arsenal

| # | Chapter | Key Topics |
|---|---------|-----------|
| 08 | [Cost, Latency & UX](./08-cost-latency-and-ux.md) | Skeletons, streaming, fallbacks, budgets, perceived performance |
| 09 | [Security & Privacy](./09-security-and-privacy.md) | What not to send to LLMs, PII, prompt injection basics |
| 10 | [Cheat Sheet & Interview Q&A](./10-cheat-sheet-and-qa.md) | Answer templates, "How would you add a chat/copilot?" |

---

## How to Use This Ebook

**Night before the interview:**  
Read **Chapter 10 (Cheat Sheet & Interview Q&A)** and **Chapter 01 (When to Use AI in the UI)** so you can clearly say when AI helps vs when it doesn’t.

**Focused 2–3 hour session:**  
Read **Chapters 01–04** for mental model and integration patterns, then **Chapters 06–07** for Angular/React specifics.

**Full-day deep dive:**  
Work through all chapters in order. Each chapter is self-contained and maps to common interview questions.

**During interviews:**  
- Lead with **user value** and **when AI is appropriate**, not with model names.  
- Show you understand **streaming, errors, and UX** (skeletons, fallbacks).  
- Mention **security and privacy** (PII, prompt injection) as non-negotiables.

---

## Chapter Structure (What to Expect)

Every chapter follows a consistent structure:

1. **TL;DR** — short, interview-ready summary  
2. **Core Concept** — mental models and clean narratives  
3. **Deep Dive** — trade-offs, real-world constraints  
4. **Examples** — Angular/React code or API patterns  
5. **Best Practices** — how to ship AI features in production  
6. **Common Mistakes** — red flags to avoid  
7. **Interview Q&A** — direct question/answer templates  
8. **Next Steps** — where to go in this ebook next

---

## Quick Reference — Common Interview Prompts

**"When would you use AI in a frontend product?"**  
→ See **[01-when-to-use-ai-in-ui.md](./01-when-to-use-ai-in-ui.md)**.

**"How would you integrate an LLM chat into our Angular/React app?"**  
→ See **[02-integrating-llm-apis.md](./02-integrating-llm-apis.md)** and **[06/07](./06-angular-best-practices-for-ai.md)**.

**"How would you add a chat/copilot to our app?"**  
→ See **[10-cheat-sheet-and-qa.md](./10-cheat-sheet-and-qa.md)** — full answer template.

**"What about security and privacy with LLMs?"**  
→ See **[09-security-and-privacy.md](./09-security-and-privacy.md)**.
