# Chapter 05 — Rendering Strategies: CSR, SSR, SSG, ISR & Streaming

## TL;DR

| Strategy | LCP | TTFB | Interactivity | Best For |
|----------|-----|------|--------------|----------|
| **CSR** | ❌ Slow | ✅ Fast | ✅ Fast after hydration | Dashboards, auth-gated apps |
| **SSR** | ✅ Fast | ⚠️ Depends on server | ⚠️ Hydration delay | Dynamic, SEO-critical pages |
| **SSG** | ✅ Fastest | ✅ Fastest (CDN) | ⚠️ Hydration delay | Marketing, docs, blogs |
| **ISR** | ✅ Fast | ✅ Fast | ⚠️ Hydration delay | E-commerce, semi-static content |
| **Streaming SSR** | ✅ Fast (progressive) | ✅ Fast (shell) | ✅ Progressive | Complex pages with slow data |

> **One-liner for interviews:** "Use SSG for static content, SSR for dynamic SEO pages, CSR for auth-gated dashboards, and streaming SSR for pages with mixed fast/slow data."

---

## Core Concept

### The Fundamental Trade-off

Every rendering strategy trades off:

```
CSR:  Fast initial download → slow meaningful content (JS must run first)
SSR:  Slow-ish TTFB (server works) → fast meaningful content (HTML arrives ready)
SSG:  Instant TTFB (CDN) → fast content → stale risk for dynamic data
```

The decision maps directly to CWV:
- Poor LCP on a CSR app → add SSR or SSG
- Poor TTFB on an SSR app → add caching, optimize DB queries, or switch to SSG
- CLS during hydration → fix hydration mismatches

---

## Deep Dive

### CSR — Client-Side Rendering

```
Browser → fetch index.html (empty shell) → fetch JS bundle → execute → render DOM
```

```html
<!-- CSR: what the server sends -->
<html>
  <body>
    <div id="root"></div>          <!-- empty! -->
    <script src="/app.js"></script> <!-- all the work happens here -->
  </body>
</html>
```

**LCP timeline:** TTFB (fast) + JS download + JS parse + JS execute + data fetch + render = 3–6s on slow connections.

**When CSR is correct:**
- Auth-gated dashboards (no SEO needed; LCP after login is acceptable)
- Highly interactive apps (design tools, spreadsheets, real-time collaboration)
- Apps behind a login where TTFB and SEO don't matter

**Performance techniques for CSR:**
- Route-based code splitting (reduce initial JS)
- Skeleton screens (reduce perceived CLS/loading)
- Data preloading (fetch data in parallel with JS download)
- Edge-cached HTML shell (even a static shell reduces TTFB)

---

### SSR — Server-Side Rendering

```
Browser → fetch URL → Server fetches data + renders HTML → Browser gets content-filled HTML
```

```html
<!-- SSR: what the server sends -->
<html>
  <body>
    <div id="root">
      <h1>Orders</h1>          <!-- already here! -->
      <ul>
        <li>Order #123</li>    <!-- real data! -->
      </ul>
    </div>
    <script src="/app.js"></script>  <!-- hydrates the existing HTML -->
  </body>
</html>
```

**Angular Universal (SSR):**
```typescript
// angular.json — enable SSR
{
  "architect": {
    "build": {
      "options": { "server": "src/main.server.ts" }
    }
  }
}
```

```typescript
// app.config.server.ts
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { appConfig } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [provideServerRendering()]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
```

**Hydration mismatch (the SSR pitfall):**
```typescript
// ❌ Produces different HTML on server vs client → hydration error + CLS
@Component({
  template: `<p>{{ new Date().toLocaleString() }}</p>`  // different every render
})

// ✅ Deferred to client only
@Component({
  template: `
    @if (isBrowser) {
      <p>{{ currentTime }}</p>
    }
  `
})
export class TimeComponent {
  isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
}
```

**TTFB warning:** SSR TTFB depends entirely on how fast the server can fetch data and render. A slow DB query on the server = slow TTFB = slow LCP. SSR is only beneficial if TTFB stays < 600ms.

---

### SSG — Static Site Generation

```
Build time → server fetches data + renders HTML → uploads to CDN
Request    → CDN serves pre-built HTML instantly
```

**TTFB:** Typically 20–50ms (CDN edge). The fastest possible.

**When SSG is correct:**
- Marketing pages, landing pages, blogs, documentation
- Content that changes infrequently (daily or less)
- Maximum SEO and performance priority

**Angular + SSG:**
```typescript
// Generate static pages at build time
import { provideClientHydration } from '@angular/platform-browser';

// In app.config.ts — prerendering is configured in angular.json
{
  "prerender": {
    "routesFile": "routes.txt"   // list of routes to pre-render
  }
}
```

```
// routes.txt
/
/about
/products/shoes
/products/bags
```

---

### ISR — Incremental Static Regeneration

ISR is SSG + background revalidation. Pages are pre-rendered at build time but revalidated in the background after a TTL expires. New visitors get the freshened version.

```
Build time → pre-render all pages → CDN
User hits /products/shoes at 10:00 → gets cached HTML (0ms)
Page TTL expires at 10:01
Next user at 10:02 → gets cached HTML (still 0ms)
                   → background: re-render with fresh data
Next user at 10:03 → gets freshened HTML
```

**Equivalent to `stale-while-revalidate` but at the page level.**

**When ISR is correct:**
- E-commerce product pages (content changes but not per-second)
- News articles (update a few times per day)
- User profile pages (change rarely, but need to be accurate)

---

### Streaming SSR

Instead of waiting for all data before sending HTML, stream the page: send the shell first, then stream in content blocks as data arrives.

```
t=0ms:  Server sends: <html><head>...</head><body><nav>...</nav><main>  (shell)
t=50ms: User starts seeing content
t=200ms: Server streams: <section id="orders"><ul>...</ul></section>     (fast data)
t=800ms: Server streams: <section id="recommendations">...</section>    (slow data)
```

**Angular streaming (v17+ with HTTP 2/3):**
```typescript
// Angular defers slow components to after initial shell
@Component({
  template: `
    <app-shell />

    <!-- Fast data: renders with initial shell -->
    <app-orders-summary />

    <!-- Slow data: deferred — streams in after initial paint -->
    @defer {
      <app-recommendations />
    } @placeholder {
      <app-skeleton />
    }
  `
})
```

**React streaming (Next.js App Router):**
```tsx
// app/dashboard/page.tsx — Next.js streaming
import { Suspense } from 'react';

export default function Dashboard() {
  return (
    <>
      <Header />           {/* Renders immediately with shell */}
      <OrdersSummary />    {/* Fast — renders with shell */}

      {/* Suspense boundary = streaming boundary */}
      <Suspense fallback={<RecommendationsSkeleton />}>
        <Recommendations />  {/* Slow — streams in when ready */}
      </Suspense>
    </>
  );
}
```

**Key benefit:** LCP is the shell's first visible content (fast). Slow data doesn't block the initial paint. INP is good because the page is interactive before all data arrives.

---

### Decision Framework

```
Is content static (changes < daily)?
  └─ YES → SSG (CDN speed, zero server cost)
         → With frequent updates? → ISR

Is content dynamic AND SEO critical?
  └─ YES → SSR (with good TTFB — cache data aggressively)
         → Server slow? → Streaming SSR (shell fast, data streams)

Is content auth-gated (no SEO needed)?
  └─ YES → CSR (simpler, no hydration complexity)

Do you have a mix of fast and slow data on one page?
  └─ YES → Streaming SSR with Suspense boundaries
```

---

## Best Practices

- **Measure TTFB before choosing SSR.** If your server takes > 600ms to render, SSR hurts LCP instead of helping it. Cache aggressively or use SSG.
- **SSG for everything that can be.** Even if 80% of your app needs SSR, the marketing pages and docs can be SSG. Pre-render what you can.
- **Streaming SSR for complex pages.** Rather than block the whole page on slow data, identify which components are fast and which are slow, and stream them independently.
- **Use `provideClientHydration()` in Angular.** Angular 17+ non-destructive hydration reuses server-rendered DOM instead of discarding it — eliminates the CLS flash during hydration.
- **HTTP/2 is required for effective streaming.** Multiple parallel streams require HTTP/2 multiplexing. Verify your hosting supports it.

---

## Interview Q&A

**Q: How do you choose between SSR, SSG, and CSR?**  
A: "I map it to the content characteristics. Static content that rarely changes — marketing, docs, blogs — gets SSG: CDN-served pre-rendered HTML with near-zero TTFB. Dynamic content that needs SEO — product pages, news, user profiles — gets SSR or ISR. ISR if content changes at a cadence I can tolerate as stale (minutes to hours); full SSR if it needs to be real-time. Auth-gated dashboards where SEO doesn't matter get CSR — no hydration complexity, simpler infrastructure, and LCP after login is less critical."

**Q: What's the downside of SSR?**  
A: "TTFB. The server has to fetch data, render HTML, and respond — all before the user sees anything. If that pipeline is slow (> 600ms), SSR's LCP is actually worse than a well-optimized CSR app. SSR also introduces hydration: the server sends HTML, the browser renders it, then JS loads and 'hydrates' — attaching event listeners to server-rendered DOM. Hydration mismatches (server HTML differs from what the client would render) cause a full re-render, which is visible as a CLS flash. Angular's non-destructive hydration and React's concurrent hydration both mitigate this."

**Q: What is streaming SSR and when does it help?**  
A: "Streaming SSR sends the page incrementally: the shell (nav, layout) goes to the browser immediately, then content blocks stream in as their data resolves on the server. The browser can paint the shell and start hydrating it while slower data is still being fetched. The LCP is the shell's first visible content, which arrives fast. Suspense boundaries in React and `@defer` in Angular mark streaming boundaries. It's particularly valuable for pages with a mix of fast and slow data — a dashboard with real-time stats and historical charts."

---

## Next Steps

- **Angular Performance** → [06-angular-performance.md](./06-angular-performance.md) — Angular Universal, OnPush, and zoneless rendering
- **React Performance** → [07-react-performance.md](./07-react-performance.md) — React Server Components and Suspense
- **Monitoring** → [08-monitoring-rum-synthetic.md](./08-monitoring-rum-synthetic.md) — measuring rendering strategy impact with field data
