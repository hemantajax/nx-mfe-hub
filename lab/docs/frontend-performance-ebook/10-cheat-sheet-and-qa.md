# Chapter 10 — Cheat Sheet & Interview Q&A

> Your fast-reference sheet. Read the morning of your interview.

---

## Core Web Vitals — Quick Reference

| Metric | Measures | Good | Poor | Fix |
|--------|---------|------|------|-----|
| **LCP** | Largest Contentful Paint | ≤ 2.5s | > 4s | SSR, preload hero image, CDN, WebP |
| **INP** | Interaction to Next Paint | ≤ 200ms | > 500ms | OnPush, break long tasks, defer JS |
| **CLS** | Cumulative Layout Shift | ≤ 0.1 | > 0.25 | width/height on images, reserved space |
| **TBT** | Total Blocking Time (lab INP proxy) | < 200ms | > 600ms | Code split, defer JS, Web Workers |
| **TTFB** | Time to First Byte | < 600ms | > 1800ms | CDN, SSR caching, edge deployment |
| **FCP** | First Contentful Paint | < 1.8s | > 3s | Inline critical CSS, defer scripts |

---

## Rendering Strategy Decision Card

```
Content static (< daily changes)?
  └─ YES → SSG (CDN-served, best TTFB)
         → With hourly freshness? → ISR (revalidate on CDN TTL)

Content dynamic + SEO critical?
  └─ YES → SSR
         → Server > 600ms? → Streaming SSR (shell fast, data streams)
         → Server fast? → Full SSR

Auth-gated? No SEO needed?
  └─ YES → CSR (simpler, no hydration)

Mixed fast/slow data on one page?
  └─ YES → Streaming SSR with Suspense / @defer boundaries
```

---

## LCP Diagnosis Flowchart

```
LCP > 2.5s
  ↓
Check TTFB
  > 600ms → Fix server: CDN, caching, SSR optimization, edge deployment
  < 600ms ↓

Check resource load delay
  Large → LCP image discovered late → <link rel="preload"> in <head>

Check resource load duration
  Large → Image too big → WebP/AVIF, srcset, CDN image transforms

Check element render delay
  Large → Render-blocking CSS/JS → defer scripts, inline critical CSS

LCP image lazy-loaded?
  YES → Remove loading="lazy" from LCP element
```

---

## Angular Performance — Quick Stack

| Problem | Solution |
|---------|---------|
| Components re-render too often | `ChangeDetectionStrategy.OnPush` + immutable inputs |
| Complex state causes re-renders | Signals + `computed()` |
| Zone.js overhead | `provideExperimentalZonelessChangeDetection()` |
| Heavy components in initial bundle | `@defer (on viewport)` |
| Modal/panel in initial bundle | `@defer (on interaction)` |
| Images without optimization | `NgOptimizedImage` + `priority` on LCP |
| SSR double fetch | `TransferState` |
| Slow lists | `@for (... track item.id)` (always use `track`) |
| Profiling re-renders | Angular DevTools Profiler |

**Angular performance hierarchy:**
```
1. OnPush everywhere (biggest INP win)
2. Signals for reactive state
3. @defer for lazy components
4. Zoneless (when ready — needs full Signals adoption)
5. SSR/SSG for LCP
6. Bundle budgets in angular.json
```

---

## React Performance — Quick Stack

| Problem | Solution |
|---------|---------|
| Child re-renders when parent updates | `React.memo` + `useCallback` for function props |
| Expensive computation on every render | `useMemo` |
| UI blocks during heavy state update | `useTransition` / `startTransition` |
| Static components shipping JS | React Server Components (`async` Server Component) |
| Loading state for lazy routes | `React.lazy` + `Suspense` |
| Large lists (100+ items) | `@tanstack/react-virtual` |
| Multiple contexts causing re-renders | Split contexts by update frequency |
| Profiling re-renders | React DevTools Profiler → "Why did this render?" |

**React performance hierarchy:**
```
1. memo + useCallback (prevent re-renders)
2. useTransition (preserve INP during heavy updates)
3. RSC (eliminate JS for static content)
4. Code splitting with lazy + Suspense
5. Virtualization for large lists
6. useMemo (for genuinely expensive computations only)
```

---

## Angular vs React — Side-by-Side

| Concern | Angular | React |
|---------|---------|-------|
| Prevent re-renders | `OnPush` | `React.memo` |
| Fine-grained reactivity | Signals | Atom libs (Jotai, Recoil) or Zustand |
| Lazy component | `@defer (on viewport)` | `React.lazy` + `Suspense` + IntersectionObserver |
| Lazy route | `loadChildren: () => import(...)` | `React.lazy(() => import(...))` |
| SSR | Angular Universal / `@angular/ssr` | Next.js / Remix |
| Static generation | Angular prerender | Next.js SSG / Astro |
| Image optimization | `NgOptimizedImage` | `next/image` (Next.js) |
| Change detection profiler | Angular DevTools | React DevTools Profiler |
| Bundle analyzer | `ng build --stats-json` + webpack-bundle-analyzer | `source-map-explorer` / `vite-bundle-visualizer` |

---

## Caching Strategy Card

```
Static assets (JS, CSS, images with content hash):
  Cache-Control: max-age=31536000, immutable

HTML files:
  Cache-Control: no-cache

API responses (non-sensitive, tolerate staleness):
  Cache-Control: max-age=60, stale-while-revalidate=600

API responses (sensitive / real-time):
  Cache-Control: no-store

CDN:
  s-maxage=3600 (CDN caches longer than browser)
```

---

## Image Checklist

- [ ] LCP image: `fetchpriority="high"` + no `loading="lazy"`
- [ ] LCP image in CSS/JS: `<link rel="preload" as="image">` in `<head>`
- [ ] All images: `width` and `height` attributes set (CLS prevention)
- [ ] All images: `loading="lazy"` except above-fold
- [ ] Formats: AVIF → WebP → JPEG via `<picture>` or CDN `format=auto`
- [ ] Animated GIFs: converted to `<video autoplay loop muted playsinline>`
- [ ] Responsive: `srcset` + `sizes` on all non-icon images
- [ ] Angular: using `NgOptimizedImage` with `priority` on LCP

---

## Performance Budget CI Pipeline

```
PR opened
  ├─ Angular build (ng build --configuration=production)
  │   └─ angular.json budgets: initial < 1MB, component styles < 8KB
  │
  ├─ size-limit (npm run size)
  │   └─ main.js < 200KB, lazy chunks < 80KB each
  │   └─ PR comment with before/after diff
  │
  └─ Lighthouse CI (lhci autorun)
      ├─ 3 runs per URL (median used)
      ├─ LCP < 2500ms ❌ fails build
      ├─ TBT < 200ms  ❌ fails build
      ├─ CLS < 0.1    ❌ fails build
      └─ Reports uploaded to LHCI server (historical trending)
```

---

## Monitoring Tools Quick Reference

| Tool | Type | Best For | Cost |
|------|------|---------|------|
| **Chrome UX Report (CrUX)** | Field | Real user p75 CWV for any public URL | Free |
| **PageSpeed Insights** | Field + Lab | Quick CrUX + Lighthouse for a URL | Free |
| **Lighthouse CLI** | Lab | Local/CI performance audits | Free |
| **Lighthouse CI (LHCI)** | Lab | CI integration, historical trending | Free (self-hosted) |
| **web-vitals library** | Field | Custom RUM from your app | Free |
| **Google Analytics 4** | Field | CWV from GA users | Free |
| **Sentry Performance** | Field + Lab | CWV + traces + session replay | Freemium |
| **Datadog RUM** | Field | APM + frontend correlation | Paid |
| **WebPageTest** | Lab | Real device testing (Moto G4, iPhone) | Free + Paid API |
| **SpeedCurve / Calibre** | Lab + Field | Dedicated perf monitoring, budgets | Paid |

---

## 25 Interview Q&A — Fast Reference

**Q: What are the Core Web Vitals?**  
A: LCP (loading — main content visible ≤ 2.5s), INP (responsiveness — all interactions ≤ 200ms), CLS (stability — layout shifts ≤ 0.1).

**Q: Why did Google replace FID with INP?**  
A: FID measured only the first interaction's input delay. INP measures the 98th percentile latency of all interactions across the session — far more representative of real interactivity.

**Q: A page has poor LCP. Where do you start?**  
A: TTFB first (> 600ms = server/CDN problem). Then check if LCP image is lazy-loaded (remove it). Then check if it's discovered late (add preload). Then check if it's too large (WebP/AVIF, CDN transforms).

**Q: What causes CLS and how do you fix it?**  
A: Images without dimensions (always set width/height), dynamic content injected above existing content (reserve space with min-height), web fonts causing FOUT (font-display: optional or preload fonts), CSS animations that affect layout (use transform/opacity only).

**Q: What is the critical rendering path?**  
A: HTML → parse → CSS → CSSOM → combine with DOM → render tree → layout → paint. JavaScript blocks this if synchronous. Fix: defer scripts, inline critical CSS, preload late-discovered resources.

**Q: preload vs prefetch — difference?**  
A: Preload fetches immediately at high priority for the current page. Prefetch fetches at idle priority for likely next navigation. Overusing preload is counterproductive — competes with true critical resources.

**Q: What rendering strategy for an e-commerce product page?**  
A: ISR — pre-render at build time for CDN speed, revalidate on a TTL (e.g., 5 minutes) so price and inventory stay reasonably fresh without full SSR overhead.

**Q: What rendering strategy for a dashboard behind auth?**  
A: CSR — no SEO concern, simpler architecture, no hydration complexity. Optimize with code splitting and skeleton screens.

**Q: Angular OnPush — what does it do and what do you need to change?**  
A: OnPush tells Angular to skip change detection for a component unless its @Input() reference changes, an async pipe emits, or markForCheck() is called. You must use immutable updates — spread objects/arrays instead of mutating them — or Angular won't detect the change.

**Q: What are Angular Signals?**  
A: Fine-grained reactive primitives — a value whose consumers automatically re-render when it changes. Unlike OnPush which re-checks the whole component on any input change, Signals update only the template expressions that read them. They also enable zoneless Angular.

**Q: What is Angular's @defer?**  
A: Declarative lazy loading in templates. `@defer (on viewport)` loads a component when it enters the viewport; `on interaction` when a user engages; `on idle` during browser idle. Keeps heavy components out of the initial bundle without dynamic import code.

**Q: React.memo vs useMemo?**  
A: React.memo is a component wrapper — prevents re-rendering if props haven't changed. useMemo is a hook — memoizes a computed value inside a component. memo is for components; useMemo is for computations.

**Q: When does React.memo NOT help?**  
A: When function props are recreated every render (without useCallback), when props change every render anyway, or when the component is cheap enough that the comparison overhead costs more than the render.

**Q: What is useTransition?**  
A: Marks a state update as non-urgent. React renders high-priority updates (typing, clicking) immediately, then processes the transition in the background, interruptibly. Keeps INP low during expensive renders like filtering large lists.

**Q: What are React Server Components?**  
A: Components rendered entirely on the server — they can be async, fetch data directly, and send zero JS to the client. Only Client Components (marked `'use client'`) ship JS. RSC dramatically reduces client bundle size for content-heavy pages.

**Q: Content-hash vs query string cache busting?**  
A: Content hash in the filename (app.a3f9b2c1.js) is preferred — CDNs treat it as a new resource. Query strings (?v=2) are often ignored by CDNs and proxies.

**Q: What is stale-while-revalidate?**  
A: A Cache-Control directive that serves a cached (possibly stale) response immediately, then revalidates in the background. Users get zero-latency responses; the cache stays fresh for the next request. Don't use for financial or inventory data.

**Q: What's the right image format strategy?**  
A: AVIF for best compression (50% smaller than JPEG), WebP as fallback, JPEG as last resort. Use `<picture>` with `<source>` elements or a CDN with `format=auto` to serve the best format per browser.

**Q: Why use fetchpriority=high on the LCP image?**  
A: The browser deprioritizes images relative to scripts and CSS. `fetchpriority=high` signals that this image is critical and should be fetched at the same priority as render-blocking resources — directly improving LCP.

**Q: What's a performance budget?**  
A: A hard threshold on a metric that fails a build if exceeded. Prevents gradual degradation from individually-small but cumulatively-significant additions. Enforced automatically in CI via size-limit, angular.json budgets, or Lighthouse CI.

**Q: What tools for CI performance enforcement?**  
A: Three layers: Angular's built-in bundle budgets (fast, build-time), size-limit (gzipped per-chunk budgets with PR diff comments), Lighthouse CI (CWV thresholds on the served app). Optional: WebPageTest or Calibre for real-device synthetic tests on staging.

**Q: Field data vs lab data — which do you act on?**  
A: Both, for different purposes. Field data (CrUX, GA4, Sentry) tells you what real users experience — it's the ground truth. Lab data (Lighthouse) tells you why and lets you prevent regressions in CI. Never set priorities based solely on Lighthouse; always validate against field data.

**Q: How do you measure INP?**  
A: `onINP()` from the web-vitals library — reports on page unload with the 98th percentile of all interaction latencies and the specific element that caused it. In lab environments, TBT (Total Blocking Time) correlates well with INP and is Lighthouse-measurable. For profiling specific interactions, Chrome DevTools Performance panel with CPU 4x throttle.

**Q: What makes a Lighthouse score unreliable?**  
A: High variance between runs (single runs can vary ±10 points), desktop vs mobile mismatch (default is mobile, but lab conditions differ from real mobile hardware), extensions injecting scripts, and pages that require auth or dynamic content. Run 3+ times, use median, test on mobile preset, use incognito.

**Q: How do you investigate a CLS regression?**  
A: Enable "Layout Shift Regions" in Chrome DevTools (Rendering panel) to highlight shifting elements. Or use the web-vitals library's `onCLS()` — the `entries[0].sources` property lists specific DOM elements. Most common causes: images without dimensions, dynamic content above the fold, font FOUT.

---

## Vocabulary Fast Reference

| Term | Definition |
|------|-----------|
| **LCP** | Largest Contentful Paint — main content visible |
| **INP** | Interaction to Next Paint — all-interaction responsiveness |
| **CLS** | Cumulative Layout Shift — visual stability score |
| **TBT** | Total Blocking Time — lab proxy for INP |
| **TTFB** | Time to First Byte — server response speed |
| **FCP** | First Contentful Paint — first pixel on screen |
| **CrUX** | Chrome User Experience Report — Google's field data dataset |
| **RUM** | Real User Monitoring — collecting metrics from actual users |
| **Synthetic** | Lab-based testing in controlled conditions (Lighthouse, WebPageTest) |
| **OnPush** | Angular change detection strategy — only checks on input/signal change |
| **Signals** | Angular's fine-grained reactive primitive |
| **Zoneless** | Angular without Zone.js — change detection driven by signals only |
| **@defer** | Angular's declarative lazy loading with viewport/interaction triggers |
| **RSC** | React Server Components — rendered server-side, zero client JS |
| **useTransition** | React hook marking updates as non-urgent, preserving INP |
| **ISR** | Incremental Static Regeneration — SSG + background revalidation |
| **Streaming SSR** | Sending HTML in chunks — shell first, content as data resolves |
| **Content hash** | Filename includes hash of contents — enables immutable caching |
| **SWR** | Stale-While-Revalidate — serve stale immediately, update in background |
| **Bundle budget** | Hard size limit on compiled JS/CSS — fails build if exceeded |
| **Lighthouse CI** | Tool for running Lighthouse in CI with pass/fail thresholds |
| **size-limit** | Tool for enforcing per-chunk gzipped JS size budgets in CI |
| **LHCI** | Lighthouse CI — full workflow with historical storage and assertions |
| **Preload** | Fetch resource immediately for current page — `<link rel="preload">` |
| **Prefetch** | Fetch resource at idle for likely next page — `<link rel="prefetch">` |
