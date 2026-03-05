# Node.js / Express / MongoDB — Backend Architect Interview Vault

> **Target:** Node.js 22+, Express 5, MongoDB 8 / Mongoose 8, TypeScript 5.5+  
> **Level:** Senior / Architect  
> **Purpose:** Deep, structured learning — each file is a self-contained topic, interview-ready

---

## Learning Path

```
START
  │
  ▼
01-architecture             ← Foundation — project structure, layered design (read first)
  │
  ▼
02-express-deep-dive        ← Express 5 internals, router, request lifecycle
  │
  ▼
03-mongodb-mongoose         ← Schema design, indexing, aggregation, transactions
  │
  ▼
04-middleware-patterns       ← Middleware chain, custom middleware, error middleware
  │
  ▼
05-authentication-authz     ← JWT, OAuth 2.0, RBAC, session management
  │
  ▼
06-validation-error-handling ← Zod/Joi validation, global error handler, custom errors
  │
  ▼
07-logging-observability    ← Pino/Winston, structured logging, APM, health checks
  │
  ▼
08-security                 ← OWASP Top 10, Helmet, rate limiting, injection prevention
  │
  ▼
09-performance              ← Clustering, caching, query optimization, profiling
  │
  ▼
10-testing                  ← Unit, integration, E2E, mocking, test containers
  │
  ▼
11-configuration            ← Env vars, secrets management, config validation
  │
  ▼
12-deployment-devops        ← Docker, CI/CD, PM2, graceful shutdown, health probes
  │
  ▼
13-advanced-patterns        ← CQRS, event-driven, microservices, job queues
  │
  ▼
14-interview-qa             ← Architect-level Q&A cheat sheet
```

---

## Topic Index

| # | File | Topic | Read Time | Priority |
|---|------|--------|-----------|----------|
| 01 | [01-architecture.md](01-architecture.md) | Project Architecture & Structure | ~25 min | Critical |
| 02 | [02-express-deep-dive.md](02-express-deep-dive.md) | Express 5 Deep Dive | ~20 min | Critical |
| 03 | [03-mongodb-mongoose.md](03-mongodb-mongoose.md) | MongoDB & Mongoose Deep Dive | ~25 min | Critical |
| 04 | [04-middleware-patterns.md](04-middleware-patterns.md) | Middleware Patterns | ~15 min | High |
| 05 | [05-authentication-authz.md](05-authentication-authz.md) | Authentication & Authorization | ~20 min | Critical |
| 06 | [06-validation-error-handling.md](06-validation-error-handling.md) | Validation & Error Handling | ~20 min | Critical |
| 07 | [07-logging-observability.md](07-logging-observability.md) | Logging & Observability | ~15 min | High |
| 08 | [08-security.md](08-security.md) | Security Best Practices | ~20 min | Critical |
| 09 | [09-performance.md](09-performance.md) | Performance Optimization | ~20 min | High |
| 10 | [10-testing.md](10-testing.md) | Testing Strategy | ~20 min | High |
| 11 | [11-configuration.md](11-configuration.md) | Environment & Configuration | ~15 min | High |
| 12 | [12-deployment-devops.md](12-deployment-devops.md) | Deployment & DevOps | ~20 min | High |
| 13 | [13-advanced-patterns.md](13-advanced-patterns.md) | Advanced Patterns | ~25 min | Medium |
| 14 | [14-interview-qa.md](14-interview-qa.md) | Interview Q&A Cheat Sheet | ~30 min | Critical |

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
Code Examples (TypeScript, Runnable)
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

## Framework Comparison — Why These Choices

| Framework | Use Case | Performance | Learning Curve | Enterprise |
|-----------|----------|-------------|----------------|------------|
| **Express 5** | General-purpose, massive ecosystem | Good | Low | Proven |
| **Fastify** | High-perf APIs, schema-driven | Excellent | Medium | Growing |
| **NestJS** | Enterprise, Angular-like DI + decorators | Good | High | Excellent |
| **Hono** | Edge/serverless, ultra-lightweight | Excellent | Low | Emerging |
| **Koa** | Minimal, modern async middleware | Good | Low | Stable |

> This ebook uses **Express 5** as the primary framework (most interview questions target Express) but highlights **Fastify** and **NestJS** alternatives where relevant.

---

## Quick Reference — Most Asked Interview Topics

**"Design a REST API architecture for a large app"**
→ See [01-architecture.md](01-architecture.md) Section 3 — Layered Architecture

**"How does Express middleware work internally?"**
→ See [02-express-deep-dive.md](02-express-deep-dive.md) Section 3 and [04-middleware-patterns.md](04-middleware-patterns.md)

**"Schema design for MongoDB — embed vs reference?"**
→ See [03-mongodb-mongoose.md](03-mongodb-mongoose.md) Section 4

**"How do you handle authentication securely?"**
→ See [05-authentication-authz.md](05-authentication-authz.md) and [08-security.md](08-security.md)

**"How do you validate request data?"**
→ See [06-validation-error-handling.md](06-validation-error-handling.md) Section 2

**"How would you scale a Node.js app?"**
→ See [09-performance.md](09-performance.md) and [12-deployment-devops.md](12-deployment-devops.md)

---

## Prerequisites

- Node.js 20+ installed (22 LTS recommended)
- TypeScript intermediate level
- Basic MongoDB / NoSQL understanding
- Basic REST API concepts
- npm / pnpm package management

---

## Tech Stack Referenced

| Tool | Purpose |
|------|---------|
| Node.js 22+ | Runtime (ES modules, native fetch, test runner) |
| Express 5 | HTTP framework |
| MongoDB 8 / Mongoose 8 | Database & ODM |
| TypeScript 5.5+ | Type safety |
| Zod | Schema validation |
| Pino | Structured logging |
| Vitest + Supertest | Testing |
| Docker | Containerization |
| PM2 | Process management |
| Redis | Caching / sessions / queues |

---

> Start with [01-architecture.md](01-architecture.md)
