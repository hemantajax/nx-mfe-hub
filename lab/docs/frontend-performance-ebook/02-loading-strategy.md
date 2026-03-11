# Chapter 02 — Loading Strategy: Critical Path, Code Splitting & Lazy Loading

## TL;DR

The critical path is everything the browser must process before showing anything. Minimize it ruthlessly. Code split everything else. Preload what the browser would otherwise discover late. Prefetch what users will need next.

> **One-liner for interviews:** "Eliminate render-blocking resources on the critical path, code split by route, preload late-discovered critical resources, and prefetch next likely navigations."

---

## Core Concept

### The Critical Rendering Path

```
HTML → CSS → DOM + CSSOM → Render Tree → Layout → Paint
               ↑
         JS blocks here (if not async/defer)
```

The browser cannot paint anything until it has the Render Tree, which requires both the DOM and CSSOM. Any CSS or synchronous JS in the `<head>` delays the first paint.

**The three rules of the critical path:**
1. **Minimize** — inline only critical CSS; defer everything else
2. **Prioritize** — preload resources the browser discovers late
3. **Eliminate** — remove render-blocking JS entirely (use `defer`/`async`)

---

## Deep Dive

### Script Loading Strategies

```html
<!-- ❌ Blocks HTML parsing — browser stops, downloads, executes -->
<script src="app.js"></script>

<!-- ✅ async — downloads in parallel, executes when ready (unordered) -->
<script async src="analytics.js"></script>

<!-- ✅ defer — downloads in parallel, executes after HTML parsed (ordered) -->
<script defer src="app.js"></script>

<!-- ✅ type="module" — deferred by default + scoped -->
<script type="module" src="app.js"></script>
```

**Rule:** All non-critical scripts get `defer`. Analytics and third-party scripts get `async`. Your app bundle is `type="module"` (modern build tools handle this automatically).

---

### Resource Hints

```html
<!-- preload — fetch this NOW, it's needed for current page -->
<!-- Use for: LCP image, critical fonts, hero CSS background -->
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/images/hero.webp" as="image">

<!-- prefetch — fetch when idle, needed for NEXT navigation -->
<!-- Use for: likely next route, next page in a flow -->
<link rel="prefetch" href="/checkout/bundle.js">

<!-- preconnect — establish connection early (DNS + TCP + TLS) -->
<!-- Use for: API domains, CDN, font providers -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://api.example.com">

<!-- dns-prefetch — just DNS, lighter than preconnect -->
<link rel="dns-prefetch" href="https://analytics.example.com">
```

**Priority matrix:**

| Hint | When to Use | Cost |
|------|------------|------|
| `preload` | Critical resource for current page, discovered late | High — fetches immediately |
| `prefetch` | Likely next route/resource | Low — fetches at idle |
| `preconnect` | Third-party origin you'll fetch from | Medium — connection only |
| `dns-prefetch` | Third-party origin, lower priority | Very low — DNS only |

⚠️ **Don't overuse `preload`.** Every preload competes for bandwidth. Only preload 1–3 critical resources.

---

### Code Splitting

**Route-based splitting (the default):**

```typescript
// Angular — lazy-loaded routes
const routes: Routes = [
  { path: '', component: HomeComponent },  // eager — in main bundle
  {
    path: 'orders',
    loadChildren: () => import('./orders/orders.module').then(m => m.OrdersModule),
  },
  {
    path: 'checkout',
    loadChildren: () => import('./checkout/checkout.routes').then(m => m.CHECKOUT_ROUTES),
  },
];
```

```tsx
// React — lazy-loaded routes
const OrdersPage   = lazy(() => import('./pages/OrdersPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/orders/*"   element={<OrdersPage />} />
        <Route path="/checkout/*" element={<CheckoutPage />} />
      </Routes>
    </Suspense>
  );
}
```

**Component-level splitting (for heavy, conditional UI):**

```typescript
// Angular — deferrable views (v17+)
@Component({
  template: `
    <app-header />
    <app-hero />

    <!-- Heavy chart only loads when scrolled into view -->
    @defer (on viewport) {
      <app-analytics-dashboard />
    } @placeholder {
      <div class="chart-skeleton" style="height: 400px"></div>
    }

    <!-- Modal only loads when triggered -->
    @defer (on interaction(triggerBtn)) {
      <app-export-modal />
    }
  `
})
export class DashboardComponent {}
```

```tsx
// React — manual component splitting
const HeavyChart = lazy(() => import('./HeavyChart'));
const [showChart, setShowChart] = useState(false);

{showChart && (
  <Suspense fallback={<ChartSkeleton />}>
    <HeavyChart />
  </Suspense>
)}
```

---

### Bundle Analysis

Before splitting, find what's in your bundle:

```bash
# Angular
ng build --stats-json
npx webpack-bundle-analyzer dist/stats.json

# React (CRA)
npx source-map-explorer 'build/static/js/*.js'

# Vite
npx vite-bundle-visualizer

# Generic
npx bundlephobia  # check npm package sizes before installing
```

**What to look for:**
- Packages duplicated at different versions (moment.js, lodash)
- Large dependencies used minimally (importing all of lodash for one function)
- Dependencies that should be split but aren't
- Third-party scripts in the main bundle

---

### Tree Shaking

Tree shaking removes unused exports. It only works with ES modules (`import`/`export`), not CommonJS (`require`).

```typescript
// ❌ Imports entire lodash — 70KB+
import _ from 'lodash';
const result = _.groupBy(items, 'category');

// ✅ Imports only groupBy — a few KB
import { groupBy } from 'lodash-es';
const result = groupBy(items, 'category');
```

```typescript
// ✅ Angular — standalone components tree-shake better than NgModules
@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],  // Only what this component uses
})
export class OrdersListComponent {}
```

---

### Dynamic Imports for Feature Detection

```typescript
// Only load polyfill if browser needs it
if (!('IntersectionObserver' in window)) {
  await import('intersection-observer-polyfill');
}

// Only load heavy library on user action
async function exportToPDF() {
  const { jsPDF } = await import('jspdf');  // 200KB — don't ship to all users
  const doc = new jsPDF();
  doc.save('report.pdf');
}
```

---

## Best Practices

- **Analyze your bundle before optimizing.** Run webpack-bundle-analyzer first. You may be surprised what's in there.
- **Route splitting is table stakes.** Every SPA should have route-based code splitting. If you don't have it, it's the first thing to add.
- **Preload LCP images unconditionally.** If the LCP image is in CSS or JS, the browser discovers it late. Preload it in `<head>`.
- **Prefetch on hover.** Prefetch the next route's bundle when the user hovers over a navigation link — a cheap signal of intent.
- **Set webpack `splitChunks` thoughtfully.** Auto vendor splitting is good, but explicitly splitting large third-party deps (chart.js, PDF libs) gives more control.
- **Check `sideEffects: false` in package.json.** Tells bundlers it's safe to tree-shake the entire package.

---

## Common Mistakes

❌ **Preloading too many resources** — More than 3–4 preloads compete for bandwidth and can actually hurt LCP by delaying the true critical resources.

❌ **Not providing a fallback for lazy components** — A `React.lazy()` or Angular `@defer` without a placeholder/skeleton causes layout shift (CLS) when the component loads.

❌ **Code splitting too granularly** — Splitting into 50 tiny chunks causes many parallel requests. Modern HTTP/2 handles this, but excessive splitting has overhead. Split at route and large feature boundaries.

❌ **Importing CommonJS packages that can't tree-shake** — Libraries that only ship CommonJS (`require`) can't be tree-shaken. Check `bundlephobia` before choosing a library.

❌ **Ignoring third-party scripts** — A single analytics or chat widget script can add 200–500ms of blocking time. Load them with `async`, `defer`, or via a facade (load only on interaction).

---

## Interview Q&A

**Q: What is the critical rendering path and how do you optimize it?**  
A: "The critical rendering path is the sequence of steps the browser must complete before showing the first pixel: parsing HTML, loading and parsing CSS, executing synchronous JavaScript, building the render tree, layout, and paint. To optimize it: inline critical above-the-fold CSS to avoid a render-blocking stylesheet request, use `defer` on all scripts so they don't block HTML parsing, and preload late-discovered critical resources like the LCP image or a font referenced in CSS."

**Q: What's the difference between preload and prefetch?**  
A: "Preload is for resources needed immediately on the current page — fetched at high priority as soon as the tag is parsed. Use it for the LCP hero image or a critical web font. Prefetch is for resources likely needed on the next navigation — fetched at low priority during browser idle time. Use it for the bundle of the route a user is likely to visit next. Using preload for everything defeats the purpose — it competes for bandwidth with actually critical resources."

**Q: How does code splitting improve performance?**  
A: "By reducing the amount of JavaScript the browser must parse and execute on the initial load. A 1MB single bundle forces the browser to parse all of it before the app is interactive. With route-based splitting, only the code for the current route loads initially — maybe 100KB. The orders, checkout, and profile routes load their own bundles only when the user navigates there. This directly reduces TBT and TTI, and by extension improves INP."

---

## Next Steps

- **Caching** → [03-caching.md](./03-caching.md) — making split bundles cache optimally
- **Angular Performance** → [06-angular-performance.md](./06-angular-performance.md) — deferrable views and Angular-specific splitting
- **Performance Budgets** → [09-performance-budgets-ci.md](./09-performance-budgets-ci.md) — enforcing bundle size limits in CI
