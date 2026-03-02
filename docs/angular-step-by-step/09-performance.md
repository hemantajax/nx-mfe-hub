# 09 — Performance Optimization

> **TL;DR:** Performance is a system — not one trick. Layer: OnPush change detection + memoized selectors + @defer + lazy routes + bundle analysis + Core Web Vitals monitoring. Fix the big wins first (bundle size, CD cycles), then tune the details.

---

## 1. Performance Mental Model

```
Level 1 — Change Detection  (reduce unnecessary renders)
Level 2 — Bundle Size       (reduce JS to download + parse)
Level 3 — Loading Strategy  (load what's needed, when needed)
Level 4 — Runtime Speed     (fast data structures, workers)
Level 5 — Network           (caching, CDN, compression)
Level 6 — Measurement       (can't optimize what you don't measure)
```

Apply in this order. Level 1 and 2 give the highest ROI.

---

## 2. Bundle Size Optimization

### Analyze Current Bundle

```bash
# Build with source maps
ng build --source-map

# Analyze with source-map-explorer
npx source-map-explorer dist/*/main.*.js

# Or use webpack-bundle-analyzer
ng build --stats-json
npx webpack-bundle-analyzer dist/*/stats.json
```

This shows you exactly which packages occupy space in your bundle.

### Tree Shaking — Import Precisely

```typescript
// WRONG — imports entire lodash (~70KB)
import _ from 'lodash';
const result = _.sortBy(items, 'name');

// CORRECT — imports only the function needed (~1KB)
import sortBy from 'lodash/sortBy';
const result = sortBy(items, 'name');
```

```typescript
// WRONG — imports all Angular Material components
import { MatButtonModule } from '@angular/material/button';
// This is fine actually — Angular Material is tree-shakeable

// WRONG — barrel file that prevents tree shaking
// shared/index.ts re-exports everything
export * from './button.component';
export * from './table.component';
export * from './modal.component';
// If you import one thing, all three are included

// CORRECT — import directly
import { ButtonComponent } from './shared/ui/button/button.component';
```

### Lazy Load Third-Party Libraries

```typescript
// WRONG — heavy library in main bundle
import jsPDF from 'jspdf'; // ~250KB always downloaded

// CORRECT — load only when needed
async generatePdf() {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  doc.text('Report', 10, 10);
  doc.save('report.pdf');
}
```

Or with `@defer`:
```html
@defer (on interaction(exportBtn)) {
  <app-pdf-generator />  <!-- jsPDF is only in this chunk -->
}
<button #exportBtn>Generate PDF</button>
```

### Set Bundle Size Budgets

```json
// angular.json — fail build if budgets exceeded
"budgets": [
  {
    "type": "initial",
    "maximumWarning": "500kb",
    "maximumError": "1mb"
  },
  {
    "type": "anyComponentStyle",
    "maximumWarning": "4kb",
    "maximumError": "8kb"
  }
]
```

This prevents bundle regressions automatically in CI.

---

## 3. Route Preloading Strategies

Lazy loading reduces initial bundle but adds delay when navigating. Preloading solves this.

### `PreloadAllModules` — Preload Everything After Initial Load

```typescript
provideRouter(
  routes,
  withPreloading(PreloadAllModules)
)
```

Behaviour: After initial route loads, Angular downloads all lazy feature bundles in the background. When the user navigates → chunk already cached.

Good for: Small-medium apps where preloading all is fine.

### Custom Preload Strategy — Selective

```typescript
// Only preload routes marked with data.preload = true
@Injectable({ providedIn: 'root' })
export class SelectivePreloadStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    return route.data?.['preload'] ? load() : EMPTY;
  }
}

// Routes
const routes: Routes = [
  {
    path: 'dashboard',
    data: { preload: true },  // Preload this
    loadChildren: () => import('./features/dashboard/dashboard.routes')
  },
  {
    path: 'reports',
    data: { preload: false }, // Don't preload — rarely visited
    loadChildren: () => import('./features/reports/reports.routes')
  }
];

// Register
provideRouter(routes, withPreloading(SelectivePreloadStrategy))
```

### Quicklink Preload Strategy (Third-Party)

Preloads only routes linked from the current page (visible `<a>` links):

```bash
npm install ngx-quicklink
```

```typescript
import { QuicklinkStrategy } from 'ngx-quicklink';
provideRouter(routes, withPreloading(QuicklinkStrategy))
```

---

## 4. Core Web Vitals — Angular Impact

Google uses these for SEO ranking:

| Metric | Measures | Target | Angular Impact |
|--------|----------|--------|----------------|
| LCP (Largest Contentful Paint) | Loading performance | < 2.5s | SSR, @defer, lazy loading |
| FID/INP (Interaction to Next Paint) | Responsiveness | < 200ms | OnPush, Web Workers |
| CLS (Cumulative Layout Shift) | Visual stability | < 0.1 | Reserve space with @placeholder |

### Improving LCP

```html
<!-- Add loading="eager" + fetchpriority="high" to hero image -->
<img
  src="/hero.jpg"
  loading="eager"
  fetchpriority="high"
  width="1200"
  height="600"
  alt="Hero"
/>

<!-- Preload critical fonts -->
<!-- In index.html -->
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
```

```typescript
// Preload critical route's data before navigation
{
  path: 'products',
  resolve: { products: productsResolver },
  loadComponent: () => import('./products.component')
}
```

### Improving INP

```typescript
// Heavy computation on main thread → INP suffers
processLargeDataset(data: any[]) {
  // BAD — blocks main thread
  return data.map(item => heavyTransform(item));
}

// CORRECT — offload to Web Worker
processLargeDataset(data: any[]) {
  return this.worker.process(data); // Non-blocking
}
```

### Preventing CLS

```html
<!-- Reserve space for @defer content to prevent layout shift -->
@defer (on viewport) {
  <app-banner />
} @placeholder {
  <!-- SAME HEIGHT as the real component -->
  <div style="height: 120px; width: 100%;"></div>
}

<!-- Always specify image dimensions -->
<img src="product.jpg" width="300" height="300" />
<!-- Without dimensions: image loads → layout shifts → CLS hit -->
```

---

## 5. Web Workers for Heavy Computation

Move CPU-intensive work off the main thread so the UI stays responsive.

### Generate a Web Worker

```bash
ng generate web-worker app
```

This creates `app.worker.ts`.

### Worker Setup

```typescript
// app.worker.ts
/// <reference lib="webworker" />

addEventListener('message', ({ data }) => {
  // This runs in a separate thread
  const result = heavyComputation(data);
  postMessage(result);
});

function heavyComputation(data: number[]): number[] {
  return data
    .map(x => x * x)
    .filter(x => x % 2 === 0)
    .sort((a, b) => a - b);
}
```

### Using Worker in Component/Service

```typescript
// data-processing.service.ts
@Injectable({ providedIn: 'root' })
export class DataProcessingService {
  private worker = new Worker(
    new URL('../app.worker', import.meta.url)
  );

  processData(data: number[]): Promise<number[]> {
    return new Promise((resolve, reject) => {
      this.worker.onmessage = ({ data }) => resolve(data);
      this.worker.onerror = (error) => reject(error);
      this.worker.postMessage(data);
    });
  }
}

// Or as Observable
processData$(data: number[]): Observable<number[]> {
  return new Observable(observer => {
    const worker = new Worker(new URL('../app.worker', import.meta.url));
    worker.onmessage = ({ data }) => {
      observer.next(data);
      observer.complete();
      worker.terminate();
    };
    worker.onerror = err => observer.error(err);
    worker.postMessage(data);
  });
}
```

**Use cases for Web Workers:**
- Large dataset sorting/filtering
- CSV/Excel parsing
- Image manipulation
- Cryptographic operations
- Complex chart data preparation
- PDF generation prep work

---

## 6. Change Detection Performance

### Profiling with Angular DevTools

1. Open Chrome DevTools → Angular DevTools tab
2. Go to Profiler → Record
3. Perform user action
4. Stop recording
5. See which components checked and how long each took

Look for:
- Components checked with `Default` strategy (red flag)
- Components with many check cycles
- Deep component trees re-rendering unnecessarily

### Virtual Scrolling (Large Lists)

```bash
npm install @angular/cdk
```

```typescript
// Without CDK virtual scroll: 10,000 DOM nodes
// With CDK virtual scroll: only ~20 DOM nodes visible at a time

@Component({
  standalone: true,
  imports: [ScrollingModule],
  template: `
    <cdk-virtual-scroll-viewport
      itemSize="60"
      class="list-container"
      style="height: 400px;"
    >
      <div *cdkVirtualFor="let item of items; trackBy: trackByFn"
           class="list-item"
           style="height: 60px;">
        {{ item.name }}
      </div>
    </cdk-virtual-scroll-viewport>
  `
})
export class LargeListComponent {
  @Input() items: Item[] = [];
  trackByFn = (index: number, item: Item) => item.id;
}
```

For 10,000 items:
- Without virtual scroll: 10,000 DOM nodes created
- With virtual scroll: ~10-20 DOM nodes at any time

### Memoize Expensive Functions

```typescript
// Without memoization — runs on every CD cycle
get expensiveValue() {
  return this.items.filter(/* complex logic */).map(/* transform */);
}

// WRONG — called on every template evaluation
// <div>{{ expensiveValue }}</div>

// CORRECT — computed signal (memoized)
expensiveValue = computed(() =>
  this.items().filter(/* complex logic */).map(/* transform */)
);

// Or pure pipe (memoized by Angular)
// <div>{{ items | expensiveTransform }}</div>
```

---

## 7. Image Optimization

### NgOptimizedImage (Angular 15+)

```typescript
import { NgOptimizedImage } from '@angular/common';

@Component({
  standalone: true,
  imports: [NgOptimizedImage],
  template: `
    <!-- Automatically:
      - Lazy loads (loading="lazy")
      - Prevents CLS (width/height required)
      - Generates srcset for responsive images
      - Priority loading for LCP images
    -->
    <img
      ngSrc="/images/product.jpg"
      width="400"
      height="300"
      alt="Product"
    />

    <!-- LCP image: set priority -->
    <img
      ngSrc="/images/hero.jpg"
      width="1200"
      height="600"
      priority
      alt="Hero"
    />
  `
})
export class ProductComponent {}
```

---

## 8. Service Worker (PWA)

```bash
ng add @angular/pwa
```

```typescript
// ngsw-config.json — cache Angular app assets
{
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",
      "resources": {
        "files": ["/favicon.ico", "/index.html", "/manifest.webmanifest", "/*.css", "/*.js"]
      }
    },
    {
      "name": "assets",
      "installMode": "lazy",
      "updateMode": "prefetch",
      "resources": {
        "files": ["/assets/**", "/*.(svg|cur|jpg|jpeg|png|apng|webp|avif|gif|otf|ttf|woff|woff2)"]
      }
    }
  ],
  "dataGroups": [
    {
      "name": "api-cache",
      "urls": ["/api/config", "/api/static-data"],
      "cacheConfig": {
        "strategy": "performance",
        "maxSize": 100,
        "maxAge": "1d"
      }
    }
  ]
}
```

---

## 9. Performance Checklist

### Build-Time Checklist

- [ ] Production build: `ng build --configuration production`
- [ ] Analyze bundle: `source-map-explorer`
- [ ] Bundle budgets set in `angular.json`
- [ ] No unused imports/dependencies
- [ ] Tree-shakeable imports only

### Component-Level Checklist

- [ ] `ChangeDetectionStrategy.OnPush` on every component
- [ ] `track` expression on every `@for`
- [ ] No function calls in template bindings
- [ ] Pure pipes only (no impure pipes)
- [ ] `async` pipe instead of manual subscribe
- [ ] `toSignal()` for NgRx selectors in templates

### Loading Strategy Checklist

- [ ] All feature routes lazy loaded
- [ ] `@defer` for below-fold and interaction-based components
- [ ] Preloading strategy configured
- [ ] Images use `NgOptimizedImage` or explicit dimensions
- [ ] Heavy 3rd-party libraries lazy imported

### Monitoring Checklist

- [ ] Lighthouse CI in build pipeline
- [ ] Core Web Vitals tracking (Real User Monitoring)
- [ ] Bundle size CI checks
- [ ] Error tracking (Sentry)
- [ ] Angular DevTools profiling done for complex pages

---

## 10. Interview-Ready Answers

**"How would you optimize a slow Angular application?"**

> I approach performance systematically. First, I profile with Angular DevTools and Lighthouse to identify the real bottleneck. Usually the wins come from: switching to OnPush change detection (reduces render cycles), implementing proper route-level lazy loading and `@defer` for intra-page splitting (reduces bundle and parse time), adding `track` to all `@for` lists (prevents full DOM re-renders), memoizing expensive computations with `computed()` or selectors, and offloading heavy work to Web Workers. I also set bundle size budgets in angular.json to prevent regressions. Performance is a system — not a single fix.

---

## Next Topic

→ [10-testing.md](10-testing.md) — Unit testing, component testing, NgRx testing with mock store, and E2E strategy.
