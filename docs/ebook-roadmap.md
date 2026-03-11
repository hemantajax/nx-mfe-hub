
Planned ebooks to add to the lab docs (`apps/lab/public/docs/`) for interview readiness and professional depth. Use this as a backlog; implement when ready.

**Existing ebooks (as of this doc):** Angular Step by Step, System Design, Node/Express/MongoDB, React Step by Step, JavaScript & TypeScript Deep Dive, Docker for System Design, Kubernetes for System Design, AI/GenAI for Frontend.

---

## 1. AI / GenAI for Frontend (Angular & React) — **Implemented**

**Why:** Directly supports "AI with Angular/React" and "best use of Angular" in interviews; high demand in senior/architect roles.

**Suggested chapters:**
- When to use AI in the UI (chat, copilots, summarization, form assist) vs keeping logic traditional
- Integrating LLM APIs from Angular/React (streaming, error handling, loading states)
- RAG and "AI + your data" in frontend flows (backend RAG vs frontend role)
- Prompt engineering and API design for AI features (structured outputs, tool use)
- MCP, AI agents, and how they plug into Angular/React apps
- Best use of Angular for AI features (signals, async, services, lazy loading)
- Best use of React for AI features (hooks, suspense, server components where relevant)
- Cost, latency, and UX (skeletons, streaming, fallbacks)
- Security and privacy (what not to send to LLMs, PII, prompt injection basics)
- Cheat sheet & interview Q&A ("How would you add a chat/copilot to our app?")

**Slug suggestion:** `ai-frontend-ebook` or `genai-frontend-ebook`

---

## 2. AI / GenAI for Backend — **Implemented**

**Why:** Pairs with the AI Frontend ebook; covers server-side LLM integration, RAG, prompts, tool use, MCP, cost control, and security. Essential for full-stack and backend interview prep.

**Suggested chapters:**
- When to use AI on the backend (proxy vs rules, when to call LLMs)
- API design for AI endpoints (chat, stream, structured output)
- Calling LLM providers (streaming, retries, timeouts)
- Prompt construction and management (system prompts, few-shot, where they live)
- RAG implementation (embeddings, vector stores, chunking, retrieval)
- Tool use and function calling (defining tools, executing, returning)
- MCP server-side (exposing tools/resources for agents)
- Cost, rate limiting and budgets (per-user limits, token counting)
- Security, privacy and observability (keys, PII redaction, audit, logging)
- Cheat sheet and interview Q&A

**Slug suggestion:** `ai-backend-ebook`

---

## 3. Frontend Testing Strategy

**Why:** Testing is a standard interview topic; no single "testing vault" exists yet.

**Suggested chapters:**
- Testing pyramid/trophy and what to automate at each level
- Unit testing components and services (Angular + React)
- Integration tests (API, routing, state)
- E2E with Playwright/Cypress and CI
- Visual regression and snapshot testing
- Contract testing (frontend–backend)
- Accessibility testing (automated + manual)
- Testability by design (dependency injection, ports/adapters)
- Cheat sheet & interview Q&A

**Slug suggestion:** `frontend-testing-ebook`

---

## 4. Accessibility (a11y) for UI Architects

**Why:** Common in senior/frontend architect interviews (WCAG, inclusive design, legal risk).

**Suggested chapters:**
- WCAG 2.1 levels, principles, and how to talk about them in interviews
- Semantic HTML, ARIA, and when to use which
- Keyboard navigation and focus management
- Screen readers and testing with real users/tools
- Design systems and a11y (tokens, components, docs)
- Angular/React patterns (routing, modals, forms)
- Compliance, audits, and "how we prioritize a11y"
- Cheat sheet & interview Q&A

**Slug suggestion:** `accessibility-ebook`

---

## 5. Frontend Performance & Core Web Vitals

**Why:** Complements system design and framework ebooks; "how would you make this fast?" is a common question.

**Suggested chapters:**
- Core Web Vitals (LCP, INP/FID, CLS) and what they mean for architecture
- Loading strategy (critical path, code splitting, lazy loading)
- Caching (browser, CDN, stale-while-revalidate)
- Images and media (formats, responsive, priority)
- Rendering strategies (CSR, SSR, SSG, ISR, streaming) and when to use which
- Monitoring (RUM, synthetic) and setting budgets
- Cheat sheet & interview Q&A

**Slug suggestion:** `frontend-performance-ebook`

---

## 6. API Design & Frontend–Backend Contract

**Why:** System Design touches API design; a dedicated "contract + frontend" ebook helps for "how do you work with backend?" and BFF.

**Suggested chapters:**
- REST vs GraphQL vs gRPC from a frontend perspective
- Pagination, filtering, and versioning
- BFF pattern and when to use it
- Contract-first (OpenAPI, codegen, types in Angular/React)
- Error handling and resilience on the client
- Cheat sheet & interview Q&A

**Slug suggestion:** `api-contract-ebook`

---

## 7. Micro-Frontends Deep Dive

**Why:** System Design has a micro-frontends chapter; a full ebook makes "design a micro-frontend platform" interview-ready (aligns with this repo's Module Federation setup).

**Suggested chapters:**
- Module Federation (Webpack), single-spa, and other approaches
- Shell vs remotes, routing, and shared dependencies
- State and auth across apps
- Deployment and versioning (independent deployability)
- When (not) to use micro-frontends
- Cheat sheet & interview Q&A

**Slug suggestion:** `micro-frontends-ebook`

---

## 8. Frontend Security

**Why:** Security appears in Angular and System Design; a focused "frontend security" ebook helps for "how do you secure the UI?"

**Suggested chapters:**
- XSS, CSRF, CSP, and secure coding patterns
- Auth in the browser (tokens, storage, PKCE, refresh)
- Secure communication (HTTPS, headers, CORS)
- Dependency and supply chain (audit, SRI)
- Cheat sheet & interview Q&A

**Slug suggestion:** `frontend-security-ebook`

---

## Suggested implementation order

1. **AI / GenAI for Frontend** — Implemented
2. **AI / GenAI for Backend** — Implemented (pairs with frontend)
3. **Frontend Testing Strategy** — High interview value, no dedicated book yet
4. **Accessibility** — Very common in senior/architect interviews
5. **Frontend Performance & Core Web Vitals** — Complements system design and framework ebooks
6. **API Design & Frontend–Backend Contract**
7. **Micro-Frontends Deep Dive**
8. **Frontend Security**

---

## How to add a new ebook

1. Create folder: `apps/lab/public/docs/<slug>/`
2. Add `README.md` with TOC and study guidance (mirror `docker-ebook` or `kubernetes-ebook`)
3. Add chapter files: `01-title.md` … `NN-cheat-sheet-and-qa.md`
4. Register in `apps/lab/public/docs-manifest.json` under `books` with `slug`, `title`, `icon`, `description`, and `chapters` array

Chapter structure (consistent across ebooks): TL;DR → Core concept → Deep dive → Examples → Best practices → Common mistakes → Interview Q&A → Next topic.
