# Chapter 01 — Core Web Vitals & Performance Architecture

## TL;DR

Core Web Vitals are Google's three user-experience metrics that directly affect Search ranking and define "fast" in measurable terms. Every performance decision should trace back to improving one of them.

| Metric | Measures | Good | Needs Work | Poor |
|--------|---------|------|-----------|------|
| **LCP** — Largest Contentful Paint | Loading — when main content appears | ≤ 2.5s | 2.5–4s | > 4s |
| **INP** — Interaction to Next Paint | Responsiveness — reaction to all interactions | ≤ 200ms | 200–500ms | > 500ms |
| **CLS** — Cumulative Layout Shift | Visual stability — unexpected layout jumps | ≤ 0.1 | 0.1–0.25 | > 0.25 |

> **One-liner for interviews:** "LCP is load speed, INP is responsiveness, CLS is visual stability. Every optimization traces back to moving one of these three numbers."

---

## Core Concept

### Why Core Web Vitals Matter for Architecture

CWV are not just SEO metrics — they directly drive architectural decisions:

- **LCP > 2.5s** → You need SSR, preloading, CDN, or critical CSS inlining
- **INP > 200ms** → You need to break up long tasks, defer non-critical JS, or move work off the main thread
- **CLS > 0.1** → You need reserved space for dynamic content, no layout-shifting ads or images without dimensions

The right architecture question is always: "Which metric does this decision move, and by how much?"

---

## Deep Dive

### LCP — Largest Contentful Paint

**What it measures:** The time from navigation start until the largest visible content element (image, video poster, block-level text) is rendered.

**Common LCP elements:** Hero images, H1 headlines, above-the-fold images, video poster frames.

**Root causes of poor LCP:**

| Cause | Fix |
|-------|-----|
| Slow server response (TTFB > 600ms) | CDN, SSR caching, edge deployment |
| Render-blocking CSS/JS | Inline critical CSS, defer non-critical JS |
| LCP image not preloaded | `<link rel="preload">` for hero image |
| LCP image lazy-loaded | Remove `loading="lazy"` from LCP element |
| Large uncompressed image | WebP/AVIF, correct sizing, CDN image transform |
| No CDN | Move static assets to CDN close to users |

**Diagnosing LCP sub-parts:**
```
Navigation start
  ↓ TTFB (Time to First Byte)          — server response time
  ↓ Resource load delay                 — when browser starts fetching LCP resource
  ↓ Resource load duration              — time to download LCP resource
  ↓ Element render delay                — time from resource loaded to painted
= LCP
```

Fix the largest sub-part first. Tools: Chrome DevTools Performance panel, PageSpeed Insights waterfall.

---

### INP — Interaction to Next Paint

**What it measures:** The 98th percentile latency of all interactions (click, tap, keyboard) a user makes during a page visit. Replaced FID in March 2024.

**Why INP is harder than FID:** FID measured only the first interaction. INP measures every interaction across the session. A page that's fast initially but slow after data loads will have a poor INP.

**Root causes of poor INP:**

| Cause | Fix |
|-------|-----|
| Long tasks blocking main thread | Break with `setTimeout`, `scheduler.yield`, or Web Workers |
| Heavy event handlers | Debounce, throttle, move computation off thread |
| Large DOM (> 1500 nodes) | Virtualize lists, lazy-render off-screen content |
| Synchronous layout/style recalc | Batch DOM reads and writes, avoid forced reflow |
| Third-party scripts | Load async, use Partytown for third-party in workers |

**Measuring INP:**
```javascript
// Using web-vitals library
import { onINP } from 'web-vitals';

onINP(({ value, rating, entries }) => {
  console.log(`INP: ${value}ms (${rating})`);
  // entries[0].target tells you which element caused it
  console.log('Culprit element:', entries[0]?.target);
});
```

**Long task detection:**
```javascript
// PerformanceObserver for long tasks
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) {  // Tasks > 50ms block the main thread
      console.warn(`Long task: ${entry.duration}ms`, entry);
    }
  }
}).observe({ type: 'longtask', buffered: true });
```

---

### CLS — Cumulative Layout Shift

**What it measures:** Sum of all unexpected layout shift scores. Each shift = (impact fraction × distance fraction).

**Common causes:**

| Cause | Fix |
|-------|-----|
| Images without dimensions | Always set `width` and `height` attributes |
| Ads/embeds without reserved space | CSS `min-height` on ad slots |
| Dynamic content injected above existing content | Append below, or reserve space |
| Web fonts causing FOUT/FOIT | `font-display: optional` or preload fonts |
| Animations that trigger layout | Use `transform` and `opacity` only |

**The CSS fix for images:**
```css
/* aspect-ratio preserves space before image loads */
img {
  aspect-ratio: attr(width) / attr(height);
  width: 100%;
  height: auto;
}
```

```html
<!-- Always include width + height — browser reserves space -->
<img src="hero.webp" width="1200" height="630" alt="Hero" />
```

**Reserve space for dynamic content:**
```css
.ad-slot {
  min-height: 250px;  /* Reserve before ad loads */
  contain: layout;    /* Prevent shifts from propagating */
}
```

---

### Supporting Metrics (Not CWV, But Important)

| Metric | What It Measures | Target |
|--------|-----------------|--------|
| **TTFB** | Server response time | < 600ms |
| **FCP** | First Contentful Paint — first pixel | < 1.8s |
| **TBT** | Total Blocking Time — lab proxy for INP | < 200ms |
| **TTI** | Time to Interactive — fully interactive | < 3.8s |
| **Speed Index** | Visual completeness over time | < 3.4s |

TBT is the most actionable lab metric — it correlates strongly with INP and is measurable in CI (unlike INP, which requires real users).

---

### Performance as Architecture: The Mental Model

```
User visits page
  ↓
  DNS + TCP + TLS                     → Affects TTFB
  ↓
  Server responds (HTML)              → Affects TTFB, FCP
  ↓
  Browser parses HTML, loads CSS/JS   → Affects LCP (render-blocking)
  ↓
  LCP element renders                 → LCP ✓
  ↓
  JS hydrates / app becomes interactive → TTI, TBT
  ↓
  User interacts                      → INP ✓
  ↓
  Dynamic content loads               → CLS ✓
```

Every architectural choice sits at one of these steps. SSR improves TTFB → LCP. Code splitting reduces parse time → TBT → INP. Reserved image dimensions fix CLS.

---

## Best Practices

- **Measure field data, not just lab data.** Lab (Lighthouse) is reproducible but not real. Chrome UX Report (CrUX) reflects actual users. Both matter.
- **Fix TTFB first.** Everything else is downstream of server response time. A 1s TTFB makes LCP ≤ 2.5s nearly impossible.
- **Never lazy-load the LCP element.** If the LCP is an image, `loading="lazy"` delays it. Only lazy-load below-the-fold images.
- **Use `rel="preload"` for LCP resources discovered late.** If your hero image is referenced in CSS, not HTML, the browser discovers it late. Preloading it closes the gap.
- **Profile INP with real devices.** Long tasks on a MacBook Pro may not appear on a mid-range Android. Test on real devices or use CPU throttling (4x slowdown in DevTools).

---

## Common Mistakes

❌ **Optimizing for Lighthouse score, not field data** — A 100 Lighthouse score on a fast machine with no content doesn't mean real users have a good experience.

❌ **Lazy-loading the hero image** — The single most common LCP killer. `loading="lazy"` tells the browser to defer — don't use it on above-the-fold images.

❌ **Injecting content above the fold dynamically** — Banners, cookie notices, and personalized content injected above existing content cause CLS spikes.

❌ **Ignoring INP for SPA routes** — After the initial load, navigating to a new route in a SPA triggers JS execution. Heavy route components cause high INP on navigation.

❌ **Treating TBT as a CWV** — TBT is a lab metric useful for diagnosing INP root causes. It doesn't appear in field data reports directly.

---

## Interview Q&A

**Q: What are the Core Web Vitals and what does each measure?**  
A: "LCP — Largest Contentful Paint — measures when the main content is visible, targeting ≤ 2.5 seconds. INP — Interaction to Next Paint — measures the latency of every user interaction across the session, targeting ≤ 200ms. CLS — Cumulative Layout Shift — measures unexpected visual movement, targeting ≤ 0.1. Each maps to a distinct user experience: load speed, responsiveness, and visual stability."

**Q: A page has poor LCP. Walk me through your diagnosis.**  
A: "I'd start with the LCP sub-parts in the waterfall: TTFB, resource load delay, resource load duration, and element render delay. If TTFB is > 600ms, the problem is server-side — CDN, caching, or SSR. If the resource load delay is large, the LCP image is being discovered late — I'd add a `<link rel="preload">`. If load duration is large, the image is too big — I'd convert to WebP/AVIF and add responsive srcset. If render delay is large, there's render-blocking CSS or JS I need to defer."

**Q: Why did Google replace FID with INP?**  
A: "FID only measured the delay before the browser first processes an interaction — and only the very first interaction on the page. INP measures the full response latency of every interaction across the entire session, at the 98th percentile. A page could have a great FID but terrible INP if it becomes sluggish after initial load. INP is a much better proxy for real interactivity."

---

## Next Steps

- **Loading Strategy** → [02-loading-strategy.md](./02-loading-strategy.md) — fixing LCP and TBT via code splitting and preloading
- **Rendering Strategies** → [05-rendering-strategies.md](./05-rendering-strategies.md) — fixing TTFB and LCP via SSR/SSG
- **Angular Performance** → [06-angular-performance.md](./06-angular-performance.md) — fixing INP via OnPush and zoneless
