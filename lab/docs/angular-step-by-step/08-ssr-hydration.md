# 08 — SSR & Hydration (Angular Universal)

> **TL;DR:** SSR renders Angular on the server, sending fully populated HTML to the browser — improving SEO and First Contentful Paint. Hydration reuses that server-rendered DOM instead of destroying and re-rendering it. Incremental hydration (Angular 18+) defers hydration of non-critical sections.

---

## 1. What SSR Solves

### Without SSR (CSR — Client-Side Rendering)

```
Browser requests /products
        ↓
Server sends: <html><body><app-root></app-root></body></html>
        ↓
Browser downloads main.js (~500KB)
        ↓
Angular bootstraps
        ↓
Angular fetches /api/products
        ↓
Angular renders product list
        ↓
User finally sees content
```

Problems:
- Googlebot and other crawlers see empty `<app-root>`
- High Time to First Contentful Paint (FCP)
- Poor SEO for content-heavy pages
- Poor perceived performance on slow networks

### With SSR

```
Browser requests /products
        ↓
Node.js server renders Angular
        ↓
Server sends fully-populated HTML (products already in markup)
        ↓
Browser displays immediately (FCP = fast)
        ↓
Angular JS downloads in background
        ↓
Angular "hydrates" the existing DOM
        ↓
Page becomes interactive
```

Benefits:
- Search engines see full content — SEO-friendly
- Fast FCP — users see content before JS loads
- Better Core Web Vitals (LCP, FCP)

---

## 2. Setting Up SSR

```bash
# Add SSR to existing Angular app
ng add @angular/ssr

# Or create new app with SSR
ng new my-app --ssr
```

This generates:
- `server.ts` — Express server
- `app.config.server.ts` — Server-specific providers

### File Structure

```
src/
├── app/
│   ├── app.config.ts            ← Browser providers
│   ├── app.config.server.ts     ← Server providers (extends browser)
│   └── app.routes.ts
├── main.ts                      ← Browser bootstrap
└── main.server.ts               ← Server bootstrap

server.ts                        ← Express server
```

### `app.config.server.ts`

```typescript
// app.config.server.ts
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { appConfig } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering()
    // Server-only providers here
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
```

---

## 3. Hydration (Angular 16+)

Before Angular 16: SSR destroyed the server-rendered DOM and re-created everything → "flash" on page load.

With hydration: Angular reuses the server-rendered DOM, attaches event listeners without re-rendering.

```typescript
// app.config.ts — enable hydration
export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration()  // Enable hydration
    // ... other providers
  ]
};
```

### What Hydration Does

```
Server renders HTML → sends to browser
        ↓
Browser shows HTML immediately (fast FCP)
        ↓
Angular JS downloads
        ↓
Angular "hydrates" — matches components to existing DOM
        ↓
Attaches event listeners, activates bindings
        ↓
NO DOM destruction, NO re-render flicker
```

### Hydration Constraints

Your components must be **hydration-compatible**:

```typescript
// PROBLEM — direct DOM manipulation breaks hydration
@Component({ template: `<div #container></div>` })
export class BadComponent implements AfterViewInit {
  @ViewChild('container') container!: ElementRef;

  ngAfterViewInit() {
    // WRONG — modifies DOM that server rendered
    this.container.nativeElement.innerHTML = '<p>Added by JS</p>';
  }
}

// CORRECT — let Angular control the DOM
@Component({
  template: `
    @if (showContent) {
      <p>Added by Angular</p>
    }
  `
})
export class GoodComponent {
  showContent = true;
}
```

Skip hydration for components with unavoidable direct DOM access:

```typescript
import { NgSkipHydration } from '@angular/common';

@Component({
  template: `
    <!-- Skip hydration for this component only -->
    <app-chart ngSkipHydration />
  `
})
export class DashboardComponent {}
```

---

## 4. TransferState — Avoid Duplicate API Calls

**Problem without TransferState:**
1. Server fetches `/api/products` → renders HTML
2. Client bootstraps → fetches `/api/products` AGAIN
3. Duplicate request, data flicker

**Solution — TransferState:**

```typescript
// products.service.ts
@Injectable({ providedIn: 'root' })
export class ProductsService {
  private transferState = inject(TransferState);
  private http = inject(HttpClient);

  private PRODUCTS_KEY = makeStateKey<Product[]>('products');

  getProducts(): Observable<Product[]> {
    // Check if state was transferred from server
    if (this.transferState.hasKey(this.PRODUCTS_KEY)) {
      const products = this.transferState.get(this.PRODUCTS_KEY, []);
      this.transferState.remove(this.PRODUCTS_KEY); // Use once
      return of(products);
    }

    return this.http.get<Product[]>('/api/products').pipe(
      tap(products => {
        // If running on server, store in transfer state
        if (isPlatformServer(inject(PLATFORM_ID))) {
          this.transferState.set(this.PRODUCTS_KEY, products);
        }
      })
    );
  }
}
```

With `withHttpTransferCache()` (Angular 16+), this is automatic for HTTP:

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withHttpTransferCache()) // Auto-caches HTTP calls
  ]
};
```

---

## 5. Incremental Hydration (Angular 18+)

Defers hydration of specific sections — the DOM is there (for SEO), but Angular doesn't activate it until needed.

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(
      withIncrementalHydration()  // Enable incremental hydration
    )
  ]
};
```

```html
<!-- Server renders this HTML (SEO-friendly) -->
<!-- But Angular doesn't hydrate/activate it until it's in viewport -->
@defer (hydrate on viewport) {
  <app-product-reviews />
}

<!-- Hydrate on idle -->
@defer (hydrate on idle) {
  <app-recommended-products />
}

<!-- Hydrate on interaction -->
@defer (hydrate on interaction) {
  <app-add-to-cart-form />
}

<!-- Never hydrate — pure static HTML, no Angular activation -->
@defer (hydrate never) {
  <app-static-footer />
}
```

**The difference from `@defer`:**

| Feature | `@defer` | Incremental Hydration |
|---------|----------|----------------------|
| Server renders content | No (placeholder only) | Yes (full HTML) |
| SEO | Not indexed | Indexed by search engines |
| Download timing | Chunk downloaded when triggered | Already in bundle |
| Activation timing | When triggered | When triggered |
| Best for | Non-SEO content | SEO content that's below fold |

---

## 6. Platform Detection

Always check if you're on server or browser for platform-specific APIs:

```typescript
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class LocalStorageService {
  private platformId = inject(PLATFORM_ID);

  get(key: string): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(key);
    }
    return null; // Server has no localStorage
  }

  set(key: string, value: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(key, value);
    }
  }
}
```

```typescript
// Avoid window, document, navigator on server
@Component({ template: `` })
export class BrowserOnlyComponent implements AfterViewInit {
  private platformId = inject(PLATFORM_ID);

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      // Safe to use browser APIs here
      window.scrollTo(0, 0);
    }
  }
}
```

---

## 7. `afterRender` and `afterNextRender` (Angular 17+)

Replace `ngAfterViewInit` browser-side DOM access:

```typescript
import { afterRender, afterNextRender } from '@angular/core';

@Component({ template: `<canvas #chart></canvas>` })
export class ChartComponent {
  @ViewChild('chart') canvas!: ElementRef<HTMLCanvasElement>;

  constructor() {
    // Runs after EVERY render — on browser only (safe for SSR)
    afterRender(() => {
      this.drawChart();
    });

    // Runs after NEXT render ONCE — like ngAfterViewInit but SSR-safe
    afterNextRender(() => {
      this.initializeLibrary();
    });
  }
}
```

---

## 8. SSR Performance Patterns

### Cache SSR Output at Edge

```typescript
// server.ts — Express with cache headers
app.get('*', (req, res) => {
  // Cache rendered HTML at CDN edge
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');

  commonEngine.render({
    bootstrap,
    documentFilePath: indexHtml,
    url: `${protocol}://${headers.host}${originalUrl}`,
    publicPath: distFolder,
    providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }]
  }).then(html => res.send(html));
});
```

### Defer Non-Critical API Calls to Client

```typescript
// products.component.ts
@Component({
  template: `
    <!-- Critical data: SSR renders this (for SEO, FCP) -->
    <app-product-list [products]="products" />

    <!-- Non-critical: defer to client (recommendations, reviews) -->
    @defer (on idle) {
      <app-recommendations />
    }
  `
})
export class ProductsComponent {
  // This data is SSR-rendered + TransferState cached
  products = toSignal(
    inject(ProductsService).getProducts(),
    { initialValue: [] }
  );
}
```

---

## 9. When to Use SSR

| Scenario | Use SSR? |
|----------|---------|
| Public-facing content site | Yes — SEO critical |
| E-commerce product pages | Yes — SEO + performance |
| Marketing/landing pages | Yes |
| SaaS dashboard (login required) | No — CSR is fine (not indexed) |
| Admin panels | No — CSR is fine |
| Mobile app wrapped in WebView | No — CSR |
| Blog/documentation | Yes — SEO critical |

---

## 10. Interview-Ready Answers

**"What is the difference between SSR and hydration?"**

> SSR (Server-Side Rendering) means Angular runs on the Node.js server and sends fully rendered HTML to the browser — improving FCP and SEO. Hydration is what happens next: instead of throwing away the server-rendered DOM and re-rendering everything in the browser (which causes a flash), Angular 16+ "hydrates" the existing DOM by attaching event listeners and activating bindings without DOM manipulation. Incremental hydration in Angular 18 takes this further — specific sections can be deferred for hydration until the user needs them, reducing initial JavaScript execution.

**"What is TransferState and why is it needed?"**

> Without TransferState, a server-rendered Angular app would fetch API data on the server to render the HTML, then the client-side Angular would bootstrap and fetch the same data again — causing duplicate requests and a data-loading flicker. TransferState serializes the server-fetched data into the HTML payload. When Angular hydrates on the client, it reads this transferred state instead of making a new HTTP request. Angular 16+ automates this for HTTP calls with `withHttpTransferCache()`.

---

## Next Topic

→ [09-performance.md](09-performance.md) — Bundle analysis, Core Web Vitals, preloading strategies, Web Workers, and profiling tools.
