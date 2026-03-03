# React 19 Step-by-Step — UI Architect Interview Vault

> **Target:** React 19, TypeScript, Next.js App Router, TanStack Query, Zustand  
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
02-rendering             ← Fiber, Virtual DOM, Concurrent — everything depends on this
  │
  ▼
03-react-19              ← New paradigm — Actions, use(), forms, metadata
  │
  ▼
04-react-compiler        ← Automatic optimization — the future of React perf
  │
  ▼
05-hooks-deep-dive       ← Every built-in hook, custom hooks, closure traps
  │
  ▼
06-state-management      ← Local, global, server, URL, form state
  │
  ▼
07-server-components     ← RSC, streaming SSR, Next.js App Router
  │
  ▼
08-performance           ← Core Web Vitals, splitting, profiling, Workers
  │
  ▼
09-routing-data          ← React Router v7, TanStack Router, data fetching
  │
  ▼
10-security              ← XSS, auth, CSRF, CSP, server actions
  │
  ▼
11-testing               ← Testing Library, Vitest, Playwright, MSW
  │
  ▼
12-interview-qa          ← Architect-level Q&A cheat sheet
```

---

## Topic Index

| # | File | Topic | Read Time | Priority |
|---|------|-------|-----------|----------|
| 01 | [01-architecture.md](01-architecture.md) | Enterprise Architecture | ~20 min | Critical |
| 02 | [02-rendering.md](02-rendering.md) | Rendering & Reconciliation | ~20 min | Critical |
| 03 | [03-react-19.md](03-react-19.md) | React 19 Deep Dive | ~25 min | Critical |
| 04 | [04-react-compiler.md](04-react-compiler.md) | React Compiler | ~15 min | High |
| 05 | [05-hooks-deep-dive.md](05-hooks-deep-dive.md) | Hooks Deep Dive | ~25 min | Critical |
| 06 | [06-state-management.md](06-state-management.md) | State Management | ~25 min | Critical |
| 07 | [07-server-components.md](07-server-components.md) | Server Components & SSR | ~20 min | High |
| 08 | [08-performance.md](08-performance.md) | Performance Optimization | ~25 min | Critical |
| 09 | [09-routing-data.md](09-routing-data.md) | Routing & Data Fetching | ~20 min | High |
| 10 | [10-security.md](10-security.md) | Security & Authentication | ~15 min | High |
| 11 | [11-testing.md](11-testing.md) | Testing Strategy | ~20 min | Medium |
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
Code Examples (Typed, Runnable TSX)
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

**"Design a React architecture for enterprise"**
→ See [01-architecture.md](01-architecture.md) Section 10 — Interview Answer Template

**"How does React Fiber work?"**
→ See [02-rendering.md](02-rendering.md) Section 3 — Fiber Architecture

**"What's new in React 19?"**
→ See [03-react-19.md](03-react-19.md) — Complete feature breakdown

**"Do I still need useMemo and useCallback?"**
→ See [04-react-compiler.md](04-react-compiler.md) Section 2

**"When would you use Zustand vs TanStack Query vs Redux?"**
→ See [06-state-management.md](06-state-management.md) Section 8 — Decision Tree

**"Explain Server Components vs Client Components"**
→ See [07-server-components.md](07-server-components.md) Section 2

**"How do you optimize a slow React app?"**
→ See [08-performance.md](08-performance.md) — Full optimization playbook

---

## Prerequisites

- React 18 basics (components, hooks, JSX)
- TypeScript intermediate level
- Basic understanding of HTTP, REST, async/await
- npm / Node.js installed

---

## Tools Referenced

| Tool | Purpose |
|------|---------|
| React 19 | Core library |
| Next.js 15+ | Meta-framework (App Router, RSC) |
| TypeScript 5+ | Type safety |
| TanStack Query v5 | Server state management |
| Zustand v5 | Global state management |
| Vitest | Unit / integration testing |
| Playwright | E2E testing |
| React DevTools | Performance profiling |
| React Compiler | Automatic optimization |

---

> Start with [01-architecture.md](01-architecture.md)
