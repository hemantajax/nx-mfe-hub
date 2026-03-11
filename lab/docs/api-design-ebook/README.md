# API Design & Frontend–Backend Contract 

## Chapter Map

| # | Chapter | Key Topics |
|---|---------|-----------|
| 01 | [REST vs GraphQL vs gRPC — A Frontend Perspective](./01-rest-vs-graphql-vs-grpc.md) | Protocol trade-offs, when to choose each, real-world decision matrix |
| 02 | [Pagination, Filtering & Versioning](./02-pagination-filtering-versioning.md) | Cursor vs offset, filter patterns, URL versioning vs headers |
| 03 | [The BFF Pattern](./03-bff-pattern.md) | What BFF is, when to use it, pitfalls, monolith vs microservice BFFs |
| 04 | [Contract-First Design](./04-contract-first-design.md) | OpenAPI, codegen, shared types, Zod/tRPC, design-time contracts |
| 05 | [Error Handling & Resilience on the Client](./05-error-handling-and-resilience.md) | Error taxonomy, retry logic, circuit breakers, optimistic UI rollback |
| 06 | [Cheat Sheet & Interview Q&A](./06-cheat-sheet-and-qa.md) | Design checklist, 20+ interview Q&A templates |

---

## How to Use This Ebook

**Night before the interview:**  
Read **Chapter 06 (Cheat Sheet)** then **Chapter 01 (REST vs GraphQL vs gRPC)** to frame your API design vocabulary.

**Focused 2–3 hour session:**  
Chapters 01–03 cover protocol and architecture choices. Chapters 04–05 cover contract rigor and client resilience. Finish with Chapter 06 for rapid recall.

**With other ebooks in this series:**  
The AI Backend ebook covers LLM API design. This ebook covers the general frontend–backend contract layer that every system design question assumes you understand.

---

## Chapter Structure (What to Expect)

1. **TL;DR** — short, interview-ready summary  
2. **Core Concept** — mental models and clean narratives  
3. **Deep Dive** — trade-offs, real-world constraints  
4. **Examples** — API shapes, pseudocode, or config patterns  
5. **Best Practices** — how senior engineers think about this  
6. **Common Mistakes** — red flags to avoid  
7. **Interview Q&A** — direct question/answer templates  
8. **Next Steps** — where to go in this ebook next

---

## Quick Reference — Common Interview Prompts

**"REST vs GraphQL — which do you choose and why?"**  
→ See **[01-rest-vs-graphql-vs-grpc.md](./01-rest-vs-graphql-vs-grpc.md)**

**"How do you handle pagination at scale?"**  
→ See **[02-pagination-filtering-versioning.md](./02-pagination-filtering-versioning.md)**

**"What's a BFF and when would you use one?"**  
→ See **[03-bff-pattern.md](./03-bff-pattern.md)**

**"How do you ensure the frontend and backend don't drift?"**  
→ See **[04-contract-first-design.md](./04-contract-first-design.md)**

**"How do you handle API errors gracefully on the client?"**  
→ See **[05-error-handling-and-resilience.md](./05-error-handling-and-resilience.md)**
