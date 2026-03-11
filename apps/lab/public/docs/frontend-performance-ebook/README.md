# Frontend Performance & Core Web Vitals — Interview Prep Ebook

> **Target:** Mid-to-senior frontend engineers, Angular/React architects, anyone preparing for system design or frontend-focused interviews  
> **Focus:** Core Web Vitals, loading strategy, caching, images, rendering, Angular performance, React performance, monitoring, budgets, and CI integration  
> **Format:** Short, deep chapters — each one is an interview-ready topic.

---

## Chapter Map

| # | Chapter | Key Topics |
|---|---------|-----------|
| 01 | [Core Web Vitals & Performance Architecture](./01-core-web-vitals.md) | LCP, INP, CLS — what they mean for architecture decisions |
| 02 | [Loading Strategy](./02-loading-strategy.md) | Critical path, code splitting, lazy loading, preload/prefetch |
| 03 | [Caching](./03-caching.md) | Browser cache, CDN, stale-while-revalidate, cache busting |
| 04 | [Images & Media](./04-images-and-media.md) | Formats (WebP/AVIF), responsive images, priority, lazy loading |
| 05 | [Rendering Strategies](./05-rendering-strategies.md) | CSR, SSR, SSG, ISR, streaming — decision framework |
| 06 | [Angular Performance](./06-angular-performance.md) | OnPush, zoneless, deferrable views, SSR, build optimizations |
| 07 | [React Performance](./07-react-performance.md) | Memo, useMemo, useCallback, RSC, Suspense, Concurrent Mode |
| 08 | [Monitoring, RUM & Synthetic Testing](./08-monitoring-rum-synthetic.md) | Lighthouse, CrUX, RUM tools, synthetic CI, field vs lab data |
| 09 | [Performance Budgets & CI Integration](./09-performance-budgets-ci.md) | Budget types, Lighthouse CI, Bundlesize, webpack-bundle-analyzer, pipeline gates |
| 10 | [Cheat Sheet & Interview Q&A](./10-cheat-sheet-and-qa.md) | Decision cards, 25+ Q&A templates, quick reference |

---

## How to Use This Ebook

**Night before the interview:**  
Read **Chapter 10 (Cheat Sheet)** and **Chapter 01 (Core Web Vitals)** — framing every perf answer around CWV signals immediately shows seniority.

**Focused 3–4 hour session:**  
Chapters 01–05 for general web performance fundamentals. Chapter 06 for Angular-specific depth. Chapter 07 for React-specific depth. Chapters 08–09 for monitoring and pipeline integration.

**For system design rounds:**  
Every chapter ends with interview Q&A. Chapter 10 has the complete fast-reference sheet.

---

## Quick Reference — Common Interview Prompts

**"How would you make this page faster?"**  
→ **[01-core-web-vitals.md](./01-core-web-vitals.md)** + **[02-loading-strategy.md](./02-loading-strategy.md)**

**"What rendering strategy would you use?"**  
→ **[05-rendering-strategies.md](./05-rendering-strategies.md)**

**"How do you optimize an Angular app?"**  
→ **[06-angular-performance.md](./06-angular-performance.md)**

**"How do you prevent performance regressions?"**  
→ **[09-performance-budgets-ci.md](./09-performance-budgets-ci.md)**

**"How do you measure real user performance?"**  
→ **[08-monitoring-rum-synthetic.md](./08-monitoring-rum-synthetic.md)**
