# Angular Step-by-Step — Enterprise Learning Vault

> **Target:** Angular 18/19+, Bootstrap 5, NgRx, Standalone Components  
> **Level:** Senior / Architect  
> **Purpose:** Deep, structured learning — each file is a self-contained topic

---

## Learning Path

```
START
  │
  ▼
01-architecture          ← Foundation (read this first)
  │
  ▼
02-change-detection      ← Core mechanism — everything depends on this
  │
  ▼
03-defer-lazy-loading    ← Modern performance strategy
  │
  ▼
04-ngrx-deep-dive        ← State management (heavy, important)
  │
  ▼
05-rxjs-deep-dive        ← Async patterns
  │
  ▼
06-signals               ← Modern reactive primitive
  │
  ▼
07-security-auth         ← Production readiness
  │
  ▼
08-ssr-hydration         ← SEO + performance
  │
  ▼
09-performance           ← Bundle, Vitals, Profiling
  │
  ▼
10-testing               ← Quality assurance strategy
  │
  ▼
11-ai-angular-mcp        ← Modern AI-assisted Angular development
  │
  ▼
12-interview-qa          ← Architect-level Q&A cheat sheet
```

---

## Topic Index

| # | File | Topic | Read Time | Priority |
|---|------|--------|-----------|----------|
| 01 | [01-architecture.md](01-architecture.md) | Enterprise Architecture | ~20 min | Critical |
| 02 | [02-change-detection.md](02-change-detection.md) | Change Detection & Zone.js | ~15 min | Critical |
| 03 | [03-defer-lazy-loading.md](03-defer-lazy-loading.md) | `@defer` & Lazy Loading | ~15 min | High |
| 04 | [04-ngrx-deep-dive.md](04-ngrx-deep-dive.md) | NgRx Deep Dive | ~25 min | Critical |
| 05 | [05-rxjs-deep-dive.md](05-rxjs-deep-dive.md) | RxJS Deep Dive | ~20 min | High |
| 06 | [06-signals.md](06-signals.md) | Angular Signals | ~15 min | High |
| 07 | [07-security-auth.md](07-security-auth.md) | Security & Authentication | ~15 min | High |
| 08 | [08-ssr-hydration.md](08-ssr-hydration.md) | SSR & Hydration | ~15 min | Medium |
| 09 | [09-performance.md](09-performance.md) | Performance Optimization | ~20 min | High |
| 10 | [10-testing.md](10-testing.md) | Testing Strategy | ~20 min | Medium |
| 11 | [11-ai-angular-mcp.md](11-ai-angular-mcp.md) | AI + Angular (MCP, llm.txt) | ~15 min | Modern |
| 12 | [12-interview-qa.md](12-interview-qa.md) | Interview Q&A Cheat Sheet | ~30 min | Critical |

---

## What Each File Contains

Every topic file follows the same structure:

```
TL;DR Summary
↓
Core Concept Explanation
↓
Internal Deep Dive (Senior Level)
↓
Code Examples (Typed, Runnable)
↓
Architecture Best Practices
↓
Common Mistakes
↓
Interview-Ready Answers
↓
Next Topic →
```

---

## Quick Reference — Most Asked Interview Topics

**"Design an Angular architecture for enterprise"**
→ See [01-architecture.md](01-architecture.md) Section 8 — Interview Answer Template

**"Explain OnPush and why it matters"**
→ See [02-change-detection.md](02-change-detection.md) Section 3

**"When would you use @defer vs lazy routing?"**
→ See [03-defer-lazy-loading.md](03-defer-lazy-loading.md) Section 4

**"Should we use Signals or NgRx?"**
→ See [06-signals.md](06-signals.md) Section 6 and [04-ngrx-deep-dive.md](04-ngrx-deep-dive.md) Section 9

**"Explain switchMap vs mergeMap"**
→ See [05-rxjs-deep-dive.md](05-rxjs-deep-dive.md) Section 2

---

## Prerequisites

- Angular 17+ basics (components, services, routing)
- TypeScript intermediate level
- Basic RxJS (subscribe, pipe, map)
- npm / Node.js installed

---

## Tools Referenced

| Tool | Purpose |
|------|---------|
| Angular CLI 18+ | Scaffolding, builds |
| NgRx 18+ | State management |
| RxJS 7+ | Async composition |
| Angular DevTools | Performance profiling |
| Nx | Monorepo management |
| Cursor + MCP | AI-assisted development |

---

> Start with [01-architecture.md](01-architecture.md)
