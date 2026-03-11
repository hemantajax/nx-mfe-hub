# AI / GenAI for Backend — Interview Prep Ebook

> **Target:** Senior engineers / backend architects  
> **Focus:** Server-side LLM integration, API design, RAG, prompts, tool use, MCP, cost control, and security  
> **Format:** Short, deep chapters — each one is an interview-ready topic. Pairs with the AI Frontend ebook.

---

## Part 1: Foundations & API Design

| # | Chapter | Key Topics |
|---|---------|-----------|
| 01 | [When to Use AI on the Backend](./01-when-to-use-ai-on-backend.md) | Proxy vs rules, when to call LLMs, backend as gatekeeper |
| 02 | [API Design for AI Endpoints](./02-api-design-for-ai-endpoints.md) | Chat, stream, structured output, versioning, errors |
| 03 | [Calling LLM Providers](./03-calling-llm-providers.md) | Streaming, retries, timeouts, provider abstraction |
| 04 | [Prompt Construction & Management](./04-prompt-construction-and-management.md) | System prompts, few-shot, where prompts live |

## Part 2: RAG, Tools & MCP

| # | Chapter | Key Topics |
|---|---------|-----------|
| 05 | [RAG Implementation](./05-rag-implementation.md) | Embeddings, vector stores, chunking, retrieval |
| 06 | [Tool Use & Function Calling](./06-tool-use-and-function-calling.md) | Defining tools, executing, returning to the model |
| 07 | [MCP Server-Side](./07-mcp-server-side.md) | Exposing tools/resources for agents |

## Part 3: Production & Interview Arsenal

| # | Chapter | Key Topics |
|---|---------|-----------|
| 08 | [Cost, Rate Limiting & Budgets](./08-cost-rate-limiting-and-budgets.md) | Per-user limits, token counting, backpressure |
| 09 | [Security, Privacy & Observability](./09-security-privacy-and-observability.md) | Keys, PII redaction, audit, logging, metrics |
| 10 | [Cheat Sheet & Interview Q&A](./10-cheat-sheet-and-qa.md) | Design checklist, answer templates |

---

## How to Use This Ebook

**Night before the interview:**  
Read **Chapter 10 (Cheat Sheet)** and **Chapter 01 (When to Use AI on the Backend)** so you can explain the backend’s role and when you call LLMs.

**Focused 2–3 hour session:**  
Read **Chapters 01–04** for API and provider integration, then **Chapters 05–07** for RAG and tools.

**With the AI Frontend ebook:**  
Frontend covers UI, streaming UX, and what the client sends. This ebook covers API design, prompts, RAG, and security on the server.

---

## Chapter Structure (What to Expect)

1. **TL;DR** — short, interview-ready summary  
2. **Core Concept** — mental models and clean narratives  
3. **Deep Dive** — trade-offs, real-world constraints  
4. **Examples** — API shapes, pseudocode, or config patterns  
5. **Best Practices** — how to ship AI backends in production  
6. **Common Mistakes** — red flags to avoid  
7. **Interview Q&A** — direct question/answer templates  
8. **Next Steps** — where to go in this ebook next

---

## Quick Reference — Common Interview Prompts

**"How do you expose LLM features to the frontend?"**  
→ See **[02-api-design-for-ai-endpoints.md](./02-api-design-for-ai-endpoints.md)**.

**"How would you implement RAG?"**  
→ See **[05-rag-implementation.md](./05-rag-implementation.md)**.

**"How do you control cost and abuse?"**  
→ See **[08-cost-rate-limiting-and-budgets.md](./08-cost-rate-limiting-and-budgets.md)**.

**"How do you secure an AI backend?"**  
→ See **[09-security-privacy-and-observability.md](./09-security-privacy-and-observability.md)**.
