# JavaScript & TypeScript Deep Dive — Senior Interview Vault

> **Target:** ES2024+, TypeScript 5+, V8 internals, OOP & Prototypes, Design Patterns  
> **Level:** Senior / Architect  
> **Purpose:** Deep, structured learning — each file is a self-contained topic with interview-ready answers

---

## Learning Path

```
START
  │
  ▼
01-execution-context       ← Foundation — how JS actually runs code
  │
  ▼
02-scope-closures          ← Lexical scope, closure patterns, memory
  │
  ▼
03-this-keyword            ← 5 binding rules, arrow vs regular, traps
  │
  ▼
04-prototypes-deep-dive    ← [[Prototype]], chain, property lookup (heavy visuals)
  │
  ▼
05-oop-javascript          ← Classes, inheritance, SOLID, composition
  │
  ▼
06-oop-design-patterns     ← Singleton, Factory, Observer, Strategy, Decorator
  │
  ▼
07-async-javascript        ← Event loop, microtasks, Promises internals, async/await
  │
  ▼
08-functional-patterns     ← Pure functions, currying, composition, monads
  │
  ▼
09-modern-es2024           ← ES2020–2024+ features every senior must know
  │
  ▼
10-memory-performance      ← GC, memory leaks, WeakRef, Workers
  │
  ▼
11-modules-bundling        ← CJS vs ESM, tree shaking, import maps
  │
  ▼
12-typescript-foundations  ← Type system, generics, utility types, narrowing
  │
  ▼
13-typescript-advanced     ← Conditional types, mapped types, infer, branded types
  │
  ▼
14-typescript-patterns     ← Builder pattern, exhaustive checks, Zod, strict APIs
  │
  ▼
15-error-handling-debugging ← Custom errors, structured handling, source maps
  │
  ▼
16-interview-qa            ← 30+ architect-level Q&A cheat sheet
```

---

## Topic Index

| # | File | Topic | Read Time | Priority |
|---|------|-------|-----------|----------|
| 01 | [01-execution-context.md](01-execution-context.md) | Execution Context & Call Stack | ~20 min | Critical |
| 02 | [02-scope-closures.md](02-scope-closures.md) | Scope & Closures | ~20 min | Critical |
| 03 | [03-this-keyword.md](03-this-keyword.md) | The `this` Keyword | ~20 min | Critical |
| 04 | [04-prototypes-deep-dive.md](04-prototypes-deep-dive.md) | Prototypes Deep Dive | ~25 min | Critical |
| 05 | [05-oop-javascript.md](05-oop-javascript.md) | OOP in JavaScript | ~25 min | Critical |
| 06 | [06-oop-design-patterns.md](06-oop-design-patterns.md) | OOP Design Patterns | ~25 min | Critical |
| 07 | [07-async-javascript.md](07-async-javascript.md) | Async JavaScript | ~25 min | Critical |
| 08 | [08-functional-patterns.md](08-functional-patterns.md) | Functional Patterns | ~20 min | High |
| 09 | [09-modern-es2024.md](09-modern-es2024.md) | Modern JavaScript (ES2020–2024+) | ~20 min | High |
| 10 | [10-memory-performance.md](10-memory-performance.md) | Memory & Performance | ~20 min | High |
| 11 | [11-modules-bundling.md](11-modules-bundling.md) | Modules & Bundling | ~15 min | High |
| 12 | [12-typescript-foundations.md](12-typescript-foundations.md) | TypeScript Foundations | ~25 min | Critical |
| 13 | [13-typescript-advanced.md](13-typescript-advanced.md) | TypeScript Advanced | ~25 min | Critical |
| 14 | [14-typescript-patterns.md](14-typescript-patterns.md) | TypeScript Patterns in Practice | ~20 min | High |
| 15 | [15-error-handling-debugging.md](15-error-handling-debugging.md) | Error Handling & Debugging | ~15 min | Medium |
| 16 | [16-interview-qa.md](16-interview-qa.md) | Interview Q&A Cheat Sheet | ~30 min | Critical |

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
Code Examples (Runnable JS/TS)
↓
Visual Diagrams (Mermaid)
↓
Common Mistakes
↓
Interview-Ready Answers
↓
Next Topic →
```

---

## Quick Reference — Most Asked Interview Topics

**"Explain closures and give a real-world use case"**
→ See [02-scope-closures.md](02-scope-closures.md) Section 4 — Closure Patterns

**"How does prototypal inheritance work?"**
→ See [04-prototypes-deep-dive.md](04-prototypes-deep-dive.md) — Full chain diagrams

**"Explain the `this` keyword and all binding rules"**
→ See [03-this-keyword.md](03-this-keyword.md) — 5 Rules with examples

**"What is the event loop? Explain microtasks vs macrotasks"**
→ See [07-async-javascript.md](07-async-javascript.md) Section 2 — Event Loop Diagrams

**"Class vs prototype — what does `class` actually do?"**
→ See [05-oop-javascript.md](05-oop-javascript.md) Section 3 — Classes Are Syntactic Sugar

**"Implement a Singleton / Observer / Factory pattern"**
→ See [06-oop-design-patterns.md](06-oop-design-patterns.md) — All major patterns

**"What TypeScript utility types do you use daily?"**
→ See [12-typescript-foundations.md](12-typescript-foundations.md) Section 6

**"Explain conditional types and `infer`"**
→ See [13-typescript-advanced.md](13-typescript-advanced.md) Section 2

**"What's new in ES2024?"**
→ See [09-modern-es2024.md](09-modern-es2024.md) — Full feature breakdown

---

## Prerequisites

- JavaScript fundamentals (variables, functions, arrays, objects)
- Basic understanding of HTML/DOM
- Familiarity with npm / Node.js
- For TypeScript chapters: basic TS syntax helpful but not required

---

## Tools Referenced

| Tool | Purpose |
|------|---------|
| JavaScript ES2024+ | Core language |
| TypeScript 5+ | Type safety and advanced patterns |
| Node.js | Runtime for examples |
| V8 | Engine internals reference |
| Chrome DevTools | Debugging and profiling |
| Mermaid | Visual diagrams throughout |

---

> Start with [01-execution-context.md](01-execution-context.md)
