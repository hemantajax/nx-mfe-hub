# 08 — Performance Optimization

> **TL;DR:** Performance in React means optimizing Core Web Vitals — LCP, INP, and CLS. Use code splitting (`React.lazy` + Suspense) to reduce initial bundle, `startTransition` for non-blocking updates, virtual scrolling for large lists, and the React Compiler for automatic memoization. Measure before optimizing — the Profiler and bundle analyzer tell you where time is spent.

---

## 1. Core Web Vitals — The Metrics That Matter

Google uses these metrics for search ranking. Users feel them directly.

| Metric | What It Measures | Good | React Strategy |
|--------|--|---|--|
| **LCP** (Largest Contentful Paint) | Time to largest visible element | < 2.5s | SSR/streaming, preload images, code split |
| **INP** (Interaction to Next Paint) | Responsiveness to user input | < 200ms | `startTransition`, avoid blocking renders |
| **CLS** (Cumulative Layout Shift) | Visual stability | < 0.1 | Set image dimensions, font-display, skeleton UI |

### Measuring in React

```tsx
import { onLCP, onINP, onCLS } from 'web-vitals';

onLCP(({ value }) => sendToAnalytics('LCP', value));
onINP(({ value }) => sendToAnalytics('INP', value));
onCLS(({ value }) => sendToAnalytics('CLS', value));
```

---

## 2. Code Splitting — Load Only What You Need

### Route-Based Splitting with React.lazy

```tsx
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

const Dashboard = lazy(() => import('./pages/dashboard'));
const Orders = lazy(() => import('./pages/orders'));
const Settings = lazy(() => import('./pages/settings'));

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

**Impact:** Each route is a separate chunk. Users only download the JS for the page they visit.

### Component-Based Splitting

```tsx
const HeavyEditor = lazy(() => import('./components/rich-text-editor'));

function PostForm() {
  const [showEditor, setShowEditor] = useState(false);

  return (
    <div>
      <button onClick={() => setShowEditor(true)}>Write Post</button>
      {showEditor && (
        <Suspense fallback={<EditorSkeleton />}>
          <HeavyEditor />
        </Suspense>
      )}
    </div>
  );
}
```

### Named Exports with Lazy

```tsx
// React.lazy only supports default exports — use a wrapper for named exports
const OrdersTable = lazy(() =>
  import('./components/orders-table').then((m) => ({ default: m.OrdersTable }))
);
```

### Next.js Dynamic Import

```tsx
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('./components/chart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,  // Skip SSR for browser-only components
});
```

---

## 3. Bundle Analysis

### Analyzing Bundle Size

```bash
# Next.js
ANALYZE=true next build

# Vite
npx vite-bundle-visualizer

# Generic webpack
npx webpack-bundle-analyzer stats.json
```

### Budget Enforcement in CI

```json
// package.json
{
  "scripts": {
    "check-bundle": "bundlesize"
  },
  "bundlesize": [
    { "path": "dist/assets/index-*.js", "maxSize": "150 kB" },
    { "path": "dist/assets/vendor-*.js", "maxSize": "200 kB" }
  ]
}
```

### Common Bundle Bloat Sources

| Library | Size | Alternative |
|---------|------|-------------|
| `moment` | 67 KB gzipped | `date-fns` (tree-shakable, 3-8 KB) |
| `lodash` | 25 KB gzipped | `lodash-es` (tree-shakable) or native |
| Full `@mui/material` | 80+ KB | Import specific: `@mui/material/Button` |
| `chart.js` full | 60 KB | Load on demand with `lazy()` |

### Tree Shaking Checklist

- Use ESM imports (`import { x }` not `require`)
- Mark libraries as side-effect-free in `package.json`
- Avoid barrel files that re-export everything
- Check with `npx webpack-stats --json` and analyze

---

## 4. Image Optimization

### next/image (Next.js)

```tsx
import Image from 'next/image';

function ProductCard({ product }: { product: Product }) {
  return (
    <Image
      src={product.imageUrl}
      alt={product.name}
      width={400}
      height={300}
      placeholder="blur"
      blurDataURL={product.blurHash}
      sizes="(max-width: 768px) 100vw, 400px"
      priority={false}  // Set true for above-the-fold images (LCP)
    />
  );
}
```

**What next/image does automatically:**
- Serves WebP/AVIF formats
- Generates responsive `srcset`
- Lazy loads off-screen images
- Prevents CLS (reserves space with width/height)

### Native Lazy Loading (No Framework)

```tsx
function Avatar({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      width={48}
      height={48}
    />
  );
}
```

### LCP Image Strategy

The largest image on the page drives LCP. Optimize it aggressively:
1. Use `priority` (next/image) or `fetchpriority="high"` for the hero image
2. Preload it: `<link rel="preload" as="image" href="hero.webp" />`
3. Serve from CDN with aggressive caching
4. Use responsive `srcset` — don't serve a 4K image on mobile

---

## 5. Virtual Scrolling — Rendering Large Lists

Rendering 10,000+ items causes jank. Virtual scrolling only renders visible items.

### TanStack Virtual

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,   // Estimated row height
    overscan: 5,              // Render 5 extra items above/below viewport
  });

  return (
    <div ref={parentRef} style={{ height: 600, overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: virtualRow.start,
              height: virtualRow.size,
              width: '100%',
            }}
          >
            <ItemRow item={items[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**When to use virtual scrolling:**
- 500+ items in a list or table
- Items have uniform or predictable heights
- Infinite scroll feeds
- Large data grids

**When NOT to use:**
- Short lists (< 100 items)
- SEO-critical content (crawlers see empty containers)
- Print layouts

---

## 6. startTransition for Non-Blocking Updates

Heavy renders block the main thread, making the UI feel frozen. `startTransition` marks updates as low priority.

```tsx
function SearchWithFilters() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);                    // Immediate — input stays responsive

    startTransition(() => {
      const filtered = filterProducts(allProducts, value);  // May take 50-100ms
      setResults(filtered);             // Deferred — can be interrupted
    });
  }

  return (
    <div>
      <input value={query} onChange={handleSearch} placeholder="Search products..." />
      <div style={{ opacity: isPending ? 0.7 : 1, transition: 'opacity 200ms' }}>
        <ProductGrid products={results} />
      </div>
    </div>
  );
}
```

### Before and After

| Without `startTransition` | With `startTransition` |
|---|---|
| User types → UI freezes during filter → input updates | User types → input updates instantly → filter happens in background |
| INP: 300ms+ (bad) | INP: 50ms (good) |

---

## 7. Memoization Strategies

### React Compiler (Preferred — React 19)

The compiler handles most memoization automatically. See [04-react-compiler.md](04-react-compiler.md).

### Manual Memoization (When Compiler Isn't Available)

```tsx
// Memoize expensive derived data
const sortedProducts = useMemo(
  () => [...products].sort((a, b) => a.price - b.price),
  [products]
);

// Memoize callback to prevent child re-renders
const handleSelect = useCallback(
  (id: string) => dispatch({ type: 'SELECT', payload: id }),
  [dispatch]
);

// Memoize component to skip re-render when props unchanged
const ProductCard = memo(function ProductCard({ product }: { product: Product }) {
  return <div className="card">{product.name}</div>;
});
```

### When NOT to Memoize

| Don't Memoize | Why |
|---|---|
| Simple boolean/string/number state | Comparison is faster than memoization overhead |
| Components that always receive new props | Memo check runs but never saves work |
| Cheap computations (< 1ms) | Overhead of `useMemo` exceeds the computation cost |
| Everything "just in case" | Pre-Compiler: adds noise; With Compiler: unnecessary |

---

## 8. Font Optimization

Fonts are a hidden LCP and CLS killer.

```tsx
// next/font — optimal loading
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',    // Show fallback font immediately, swap when loaded
  preload: true,
  variable: '--font-inter',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

**Font performance checklist:**
- Use `font-display: swap` (prevents invisible text)
- Subset fonts (latin only, not all glyphs)
- Self-host Google Fonts (avoid DNS + connection to fonts.googleapis.com)
- Preload critical fonts: `<link rel="preload" href="/font.woff2" as="font" />`
- Use variable fonts (one file for all weights)

---

## 9. Web Workers for Heavy Computation

Move CPU-intensive work off the main thread:

```tsx
// worker.ts
self.onmessage = (event: MessageEvent<{ data: RawData[] }>) => {
  const result = processLargeDataset(event.data.data);
  self.postMessage(result);
};

// useWorker.ts
function useWorker<T, R>(workerFactory: () => Worker) {
  const workerRef = useRef<Worker | null>(null);
  const [result, setResult] = useState<R | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    workerRef.current = workerFactory();
    workerRef.current.onmessage = (e: MessageEvent<R>) => {
      setResult(e.data);
      setLoading(false);
    };
    return () => workerRef.current?.terminate();
  }, []);

  const run = useCallback((data: T) => {
    setLoading(true);
    workerRef.current?.postMessage(data);
  }, []);

  return { result, loading, run };
}
```

**Use cases for Web Workers:**
- CSV/Excel parsing
- Image processing (resizing, filtering)
- Complex data transformations
- Search indexing
- Cryptographic operations

---

## 10. React Profiler — Measure Before Optimizing

### DevTools Profiler

1. Open React DevTools → Profiler tab
2. Click "Record" → interact with app → "Stop"
3. Flame chart shows each component's render time
4. Look for: frequent re-renders, long render times, unnecessary renders

### Programmatic Profiler

```tsx
import { Profiler } from 'react';

function onRenderCallback(
  id: string,            // Profiler id
  phase: 'mount' | 'update',
  actualDuration: number,  // Time spent rendering
  baseDuration: number,    // Estimated time without memoization
  startTime: number,
  commitTime: number
) {
  if (actualDuration > 16) {  // > 16ms = dropped frame
    console.warn(`Slow render: ${id} took ${actualDuration.toFixed(1)}ms`);
  }
}

function App() {
  return (
    <Profiler id="Dashboard" onRender={onRenderCallback}>
      <Dashboard />
    </Profiler>
  );
}
```

### why-did-you-render (Development)

```tsx
// wdyr.ts — import BEFORE React
import React from 'react';

if (process.env.NODE_ENV === 'development') {
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, { trackAllPureComponents: true });
}
```

Logs to console when a component re-renders with the same props.

---

## 11. Memory Leak Prevention

### Common React Memory Leaks

| Source | Problem | Fix |
|--------|---------|-----|
| `useEffect` without cleanup | Event listeners accumulate | Return cleanup function |
| `setInterval` without clear | Timer runs after unmount | `clearInterval` in cleanup |
| Fetch without abort | setState on unmounted component | `AbortController` |
| WebSocket without close | Connection stays open | `ws.close()` in cleanup |
| Large closures in callbacks | References prevent GC | Use refs for large data |

### Proper Cleanup Pattern

```tsx
useEffect(() => {
  const controller = new AbortController();

  fetch('/api/data', { signal: controller.signal })
    .then((r) => r.json())
    .then(setData)
    .catch((e) => {
      if (e.name !== 'AbortError') setError(e);
    });

  return () => controller.abort();
}, []);
```

---

## 12. Performance Optimization Checklist

| Category | Action | Impact |
|----------|--------|--------|
| **Bundle** | Route-based code splitting | High — reduces initial load |
| **Bundle** | Dynamic imports for heavy components | High — loads on demand |
| **Bundle** | Tree shaking (ESM imports) | Medium — removes dead code |
| **Bundle** | Analyze and enforce size budgets | Medium — prevents regression |
| **Render** | React Compiler or manual memo | High — eliminates redundant renders |
| **Render** | `startTransition` for heavy updates | High — keeps UI responsive |
| **Render** | Virtual scrolling for long lists | High — renders only visible items |
| **Render** | Stable keys in lists | Medium — correct reconciliation |
| **Network** | Image optimization (WebP, srcset, lazy) | High — biggest LCP impact |
| **Network** | Font optimization (swap, subset, preload) | Medium — prevents CLS |
| **Network** | Preload critical resources | Medium — faster LCP |
| **Network** | CDN for static assets | High — reduces latency globally |
| **SSR** | Streaming SSR with Suspense | High — fast TTFB |
| **SSR** | Server Components for static content | High — zero client JS |
| **Runtime** | Web Workers for heavy computation | Medium — unblocks main thread |
| **Runtime** | Memory leak cleanup in effects | Medium — prevents degradation |

---

## Common Mistakes — Avoid Saying These

| Mistake | Why It's Wrong |
|---------|---------------|
| "I memoize everything for safety" | Memoization has overhead; React Compiler does this better |
| "Virtual DOM makes React fast" | It's fast enough — but the real perf gains come from avoiding unnecessary work |
| "SSR fixes all performance issues" | SSR fixes TTFB and LCP but can hurt INP if hydration is slow |
| "I'll optimize later" | Architecture decisions (code splitting, state placement) are hard to retrofit |
| "Bundle size doesn't matter with fast internet" | 3G users, low-end devices, and search rankings say otherwise |

---

## Interview-Ready Answer

> "How do you optimize a React application?"

**Strong answer:**

> I start by measuring — React Profiler for render performance, bundle analyzer for size, and Core Web Vitals (LCP, INP, CLS) for real-user experience. For bundle size, I use route-based code splitting with `React.lazy` and Suspense, dynamic imports for heavy components, and enforce size budgets in CI. For render performance, the React Compiler handles most memoization automatically. For slow interactions, I wrap heavy updates in `startTransition` to keep the UI responsive. Large lists use virtual scrolling with TanStack Virtual. Images use `next/image` with responsive `srcset`, lazy loading, and WebP format. Fonts are self-hosted with `font-display: swap`. For data-heavy pages, Server Components eliminate client JS entirely, and streaming SSR with Suspense delivers content progressively. CPU-intensive work like data processing runs in Web Workers. I always verify improvements with Lighthouse and real-user monitoring.

---

## Next Topic

→ [09-routing-data.md](09-routing-data.md) — React Router v7, TanStack Router, Next.js App Router, data fetching patterns, and the render-as-you-fetch paradigm.
