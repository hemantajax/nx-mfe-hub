# Chapter 06 — Angular Performance

## TL;DR

Angular's performance toolkit: `OnPush` change detection eliminates unnecessary renders, zoneless removes Zone.js overhead, deferrable views lazily load components declaratively, `NgOptimizedImage` automates image best practices, and the Angular DevTools profiler pinpoints exactly which component re-rendered and why.

> **One-liner for interviews:** "OnPush change detection + signals + deferrable views + zoneless is the Angular performance stack. Each addresses a different bottleneck: CPU, re-renders, bundle size, and INP."

---

## Core Concept

Angular's default change detection (`CheckAlways`) runs on every event, timer, and async operation — checking every component in the tree for changes. At scale, this destroys INP. Every optimization in this chapter reduces the work Angular does on the main thread.

---

## Deep Dive

### 1. OnPush Change Detection

**Default (`CheckAlways`):**
```
User clicks anywhere → Zone.js triggers change detection
  → Angular checks EVERY component in the tree
  → 200 components × 10ms = 2000ms main thread time
  → INP: terrible
```

**`OnPush`:**
```
User clicks → Angular checks ONLY:
  - Components with new @Input() references
  - Components that called markForCheck()
  - Components with async pipe updates
  → 5 components × 10ms = 50ms
  → INP: excellent
```

```typescript
@Component({
  selector: 'app-order-item',
  changeDetection: ChangeDetectionStrategy.OnPush,  // ← add this
  template: `
    <div class="order">
      <h3>{{ order.id }}</h3>
      <p>{{ order.total | currency }}</p>
    </div>
  `
})
export class OrderItemComponent {
  @Input() order!: Order;  // OnPush: only re-renders when order reference changes
}
```

**Critical rule with OnPush: always use immutable updates.**

```typescript
// ❌ OnPush won't detect this — same object reference
this.order.status = 'shipped';

// ✅ New reference → OnPush detects change
this.order = { ...this.order, status: 'shipped' };

// ✅ With arrays:
this.orders = [...this.orders, newOrder];  // spread, not push()
```

**async pipe + OnPush = zero manual subscriptions:**

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (orders$ | async; as orders) {
      @for (order of orders; track order.id) {
        <app-order-item [order]="order" />
      }
    }
  `
})
export class OrdersListComponent {
  orders$ = this.ordersService.getOrders();  // Observable
  // No subscribe(), no unsubscribe(), no manual markForCheck()
}
```

---

### 2. Angular Signals (v16+)

Signals give Angular fine-grained reactivity without Zone.js or OnPush boilerplate:

```typescript
import { signal, computed, effect } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p>Count: {{ count() }}</p>
    <p>Double: {{ double() }}</p>
    <button (click)="increment()">+</button>
  `
})
export class CounterComponent {
  count = signal(0);                          // writable signal
  double = computed(() => this.count() * 2); // computed — auto-updates

  increment() {
    this.count.update(c => c + 1);
  }
}
```

**Signals in services (global state):**
```typescript
@Injectable({ providedIn: 'root' })
export class CartService {
  private items = signal<CartItem[]>([]);

  // Exposed as read-only to consumers
  readonly cartItems = this.items.asReadonly();
  readonly itemCount = computed(() => this.items().length);
  readonly total = computed(() =>
    this.items().reduce((sum, item) => sum + item.price * item.qty, 0)
  );

  addItem(item: CartItem) {
    this.items.update(items => [...items, item]);
  }
}
```

```typescript
// Component uses signals — no async pipe needed
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span>{{ cartService.itemCount() }} items</span>
    <span>{{ cartService.total() | currency }}</span>
  `
})
export class CartIconComponent {
  cartService = inject(CartService);
  // Angular only re-renders this component when cartService.itemCount or total changes
}
```

---

### 3. Zoneless Angular (v18+)

Zone.js patches every browser async API to trigger change detection. It's 12KB+ and adds overhead to every setTimeout, Promise, and event handler.

Zoneless mode removes Zone.js entirely — Angular only re-renders when signals or explicit triggers say so:

```typescript
// main.ts — opt-in to zoneless
import { bootstrapApplication } from '@angular/platform-browser';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

bootstrapApplication(AppComponent, {
  providers: [
    provideExperimentalZonelessChangeDetection()  // ← removes Zone.js
  ]
});
```

```json
// angular.json — remove zone.js polyfill
{
  "polyfills": ["zone.js"]  // ← remove this line
}
```

**Requirements for zoneless:**
- All state must use Signals, AsyncPipe, or explicit `markForCheck()`
- Third-party libs that expect Zone.js may break — check compatibility

**Benefits:**
- ~12KB bundle reduction (Zone.js removed)
- Reduced main thread overhead — no Zone.js monkey-patching
- Better INP — interactions don't trigger global change detection

---

### 4. Deferrable Views (`@defer`)

Angular 17's `@defer` replaces manual lazy loading with a declarative template syntax:

```typescript
@Component({
  template: `
    <!-- Always rendered — part of initial bundle -->
    <app-header />
    <app-product-grid [products]="products" />

    <!-- Loaded only when scrolled into viewport -->
    @defer (on viewport) {
      <app-recommendations />
    } @placeholder {
      <div class="recommendations-skeleton" style="height: 300px"></div>
    } @loading (minimum 200ms) {
      <app-spinner />
    } @error {
      <p>Failed to load recommendations</p>
    }

    <!-- Loaded only when user interacts with trigger -->
    <button #filterBtn>Show Filters</button>
    @defer (on interaction(filterBtn)) {
      <app-filter-panel />
    } @placeholder {
      <span>Click to show filters</span>
    }

    <!-- Loaded after idle (browser's requestIdleCallback) -->
    @defer (on idle) {
      <app-recently-viewed />
    }

    <!-- Timer-based — load 2s after initial render -->
    @defer (on timer(2s)) {
      <app-chat-widget />
    }

    <!-- Conditional — load only for premium users -->
    @defer (when user.isPremium) {
      <app-premium-dashboard />
    }
  `
})
export class ProductPageComponent {
  products = input<Product[]>([]);
  user = inject(UserService).currentUser;
}
```

**`@defer` trigger cheat sheet:**

| Trigger | When it loads | Use for |
|---------|--------------|---------|
| `on viewport` | Element enters viewport | Below-fold heavy components |
| `on interaction` | User interacts with trigger | Modals, panels, tooltips |
| `on idle` | Browser idle | Non-critical widgets |
| `on timer(Xs)` | After X seconds | Chat widgets, upsells |
| `on hover` | Mouse hovers trigger | Dropdown menus |
| `when condition` | Boolean expression is true | Feature-flagged, role-based |
| `prefetch on hover` | Prefetches on hover, loads on click | Next step in a flow |

---

### 5. Angular Build Optimizations

```bash
# Production build — all optimizations enabled
ng build --configuration=production

# What it does:
# - Tree shaking (removes unused code)
# - Minification (Terser)
# - AOT compilation (compile templates at build, not runtime)
# - Bundle budgets (fail if exceeded)
# - CSS optimization
```

**Bundle budgets in `angular.json`:**
```json
{
  "configurations": {
    "production": {
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
    }
  }
}
```

**esbuild (default from Angular 17+):**
Angular switched from Webpack to esbuild as the default builder — 2–5x faster builds and smaller outputs.

```json
// angular.json — already the default for new projects
{
  "architect": {
    "build": {
      "builder": "@angular-devkit/build-angular:application"  // uses esbuild
    }
  }
}
```

---

### 6. Angular SSR Performance

```typescript
// Transfer State — avoid double data fetching (server + client)
import { TransferState, makeStateKey } from '@angular/core';

const PRODUCTS_KEY = makeStateKey<Product[]>('products');

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private transferState = inject(TransferState);
  private http = inject(HttpClient);

  getProducts(): Observable<Product[]> {
    // Server: fetch from DB, store in transfer state
    // Client: read from transfer state (no second HTTP call)
    if (this.transferState.hasKey(PRODUCTS_KEY)) {
      const products = this.transferState.get(PRODUCTS_KEY, []);
      this.transferState.remove(PRODUCTS_KEY);
      return of(products);
    }

    return this.http.get<Product[]>('/api/products').pipe(
      tap(products => this.transferState.set(PRODUCTS_KEY, products))
    );
  }
}
```

---

### 7. Angular DevTools Profiler

```
1. Open Chrome DevTools
2. Angular tab → Profiler
3. Click "Record"
4. Perform interaction
5. Stop recording
6. See: which components changed, why, and how long it took
```

**What to look for:**
- Components that re-render when they shouldn't → add `OnPush`
- Components with long render times → optimize template, use `trackBy`
- Change detection cycles that shouldn't happen → eliminate Zone.js triggers

**`trackBy` in `@for` loops:**
```typescript
// Without trackBy — Angular destroys and recreates all DOM nodes on any array change
@for (order of orders; track order.id) {   // ← track by stable ID
  <app-order-item [order]="order" />
}

// Angular only updates the DOM nodes that actually changed
```

---

## Best Practices

- **Default to `OnPush` on every component.** Make `CheckAlways` the exception, not the rule. Many teams add a linting rule to enforce this.
- **Use Signals for all new state.** Signals + `OnPush` gives fine-grained updates without manual `markForCheck()` calls.
- **`@defer on viewport` for all below-fold heavy components.** Recommendations, reviews, chat widgets — none of these need to be in the initial bundle.
- **Use `trackBy` (or `track`) on every `@for` loop.** Without it, Angular re-creates DOM nodes on every array change.
- **Run `ng build --stats-json` + bundle analyzer before optimizing.** Measure first; the biggest wins are often surprising.
- **Enable HTTP/2 for SSR.** Angular's streaming SSR requires HTTP/2 to send chunks before the response completes.

---

## Common Mistakes

❌ **Mutating `@Input()` objects with `OnPush`** — `this.order.status = 'X'` doesn't change the reference. `OnPush` won't detect it. Always create new objects/arrays.

❌ **Using `markForCheck()` as a crutch** — If you find yourself calling `markForCheck()` everywhere, you've negated `OnPush`. Fix the root cause instead.

❌ **`@defer` without a `@placeholder`** — A deferred component that loads and causes layout shift is worse than not deferring. Always reserve space with a skeleton.

❌ **Subscribing manually instead of using async pipe** — Manual subscriptions require manual unsubscription. `async pipe` + `OnPush` handles both automatically.

❌ **Not using `provideClientHydration()` with SSR** — Without it, Angular discards server-rendered DOM and re-renders from scratch, causing a visible flash (CLS).

---

## Interview Q&A

**Q: How does Angular's OnPush change detection improve performance?**  
A: "By default, Angular checks every component in the tree on every event. `OnPush` tells Angular to skip a component unless its `@Input()` references change, an `async pipe` emits, or `markForCheck()` is called explicitly. On a page with 100 components, this can reduce the work done per interaction by 95%. The key constraint is that inputs must be immutable — you replace objects and arrays rather than mutating them, so Angular sees a reference change."

**Q: What are Angular Signals and why are they important for performance?**  
A: "Signals are Angular's reactive primitive — a value that components can track. When a signal changes, only the components that read that signal re-render — nothing else. This is fine-grained reactivity compared to `OnPush`, which still re-checks the component on every input change. Signals also enable zoneless mode: without Zone.js, change detection only runs when signals explicitly notify Angular, eliminating the global overhead of Zone.js patching every async operation."

**Q: What are deferrable views and how do they help?**  
A: "Angular 17's `@defer` lets you declare in the template that a component should be lazy-loaded — and exactly when. `on viewport` loads when the element enters the viewport, `on interaction` when the user engages with a trigger, `on idle` during browser idle time. This keeps heavy components out of the initial bundle without writing any routing or dynamic import code. The placeholder ensures space is reserved so there's no CLS when the component loads."

---

## Next Steps

- **React Performance** → [07-react-performance.md](./07-react-performance.md) — equivalent patterns in React
- **Monitoring** → [08-monitoring-rum-synthetic.md](./08-monitoring-rum-synthetic.md) — measuring Angular INP improvements
- **Performance Budgets** → [09-performance-budgets-ci.md](./09-performance-budgets-ci.md) — enforcing Angular bundle budgets in CI
