# 02 — Change Detection (Architect-Level Deep Dive)

> **TL;DR:** Angular uses Zone.js to detect async events, then walks the component tree comparing old vs new values. `OnPush` restricts checks to reference changes only — dramatically reducing work. Signals replace Zone.js-based detection with fine-grained reactive updates.

---

## 1. How Change Detection Works Internally

Angular's fundamental job: keep the DOM in sync with component data.

### The Internal Loop

```
1. Async event fires (click, HTTP, setTimeout, etc.)
        │
        ▼
2. Zone.js intercepts it
        │
        ▼
3. Angular's NgZone.onMicrotaskEmpty fires
        │
        ▼
4. ApplicationRef.tick() is called
        │
        ▼
5. Change Detection traverses component tree (top to bottom)
        │
        ▼
6. Each component: compare old binding values vs new
        │
        ▼
7. If changed → update DOM
```

### The Dirty Checking Mechanism

Angular maintains a **Change Detector** per component. Each detector stores the previous values of all template bindings.

```typescript
// Conceptually what Angular does internally:
if (previousTitle !== currentTitle) {
  updateDOM('title', currentTitle);
}
previousTitle = currentTitle;
```

This is called **dirty checking** — it doesn't use `Object.observe` or proxies. It just compares values every cycle.

### What Zone.js Patches

Zone.js monkey-patches all async APIs:
- `setTimeout` / `setInterval`
- `Promise.then`
- `addEventListener`
- `XMLHttpRequest`
- `fetch`
- `requestAnimationFrame`

Any of these firing = Angular runs change detection across the full tree.

---

## 2. Default Strategy vs OnPush

### Default Strategy — The Problem

```typescript
@Component({
  // changeDetection: ChangeDetectionStrategy.Default  ← implicit
  template: `{{ title }}`
})
export class MyComponent {
  title = 'Hello';
}
```

With Default:
- **Every async event triggers a check on every component**
- Even if the component's data hasn't changed
- App with 200 components = 200 checks per click/HTTP call
- At scale: noticeable performance degradation

```
Click anywhere in app
        ↓
Zone.js fires
        ↓
Angular checks ALL 200 components
        ↓
Most find nothing changed
        ↓
Wasted CPU
```

### OnPush — The Enterprise Standard

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ title }}`
})
export class OrdersTableComponent {
  @Input() orders: Order[] = [];
}
```

With OnPush, Angular ONLY checks a component when:

1. **`@Input()` reference changes** — passing a new object/array reference
2. **An event originates inside the component** — click, input events
3. **`async` pipe emits a new value** — RxJS observable in template
4. **`markForCheck()` is called** — manual trigger
5. **Signal updates** (Angular 17+) — signal reads in template auto-track

```
Click anywhere in app
        ↓
Zone.js fires
        ↓
Angular checks ONLY affected components (OnPush chain)
        ↓
Skip unchanged branches of the tree
        ↓
Dramatically less work
```

---

## 3. The Reference vs Value Problem (Critical)

This is the most common OnPush bug.

### Mutation Does NOT Trigger OnPush

```typescript
// WRONG — mutating array
this.orders.push(newOrder);
// Angular sees: same reference → no check triggered → UI not updated
```

### Immutable Update DOES Trigger OnPush

```typescript
// CORRECT — new reference
this.orders = [...this.orders, newOrder];
// Angular sees: different reference → triggers OnPush check → UI updated
```

### Why NgRx Works Perfectly with OnPush

NgRx reducers always return new objects — they are required to be pure functions:

```typescript
// NgRx reducer — returns NEW state object
export const ordersReducer = createReducer(
  initialState,
  on(OrdersActions.loadOrdersSuccess, (state, { orders }) => ({
    ...state,           // spread = new reference
    orders,             // new array from API
    loading: false
  }))
);
```

New state object → new reference → selector emits → `async` pipe triggers → OnPush detects change → DOM updates.

This is why **NgRx + OnPush + async pipe** is the golden combo.

---

## 4. Change Detector API (Advanced)

Sometimes you need manual control.

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyComponent {
  constructor(private cdr: ChangeDetectorRef) {}

  // Mark this component and ancestors as dirty — check next cycle
  triggerManually() {
    this.cdr.markForCheck();
  }

  // Completely detach from change detection tree
  detachForPerformance() {
    this.cdr.detach();
    // Now Angular NEVER checks this component automatically
  }

  // Reattach when you need updates again
  reattach() {
    this.cdr.reattach();
  }

  // Force immediate synchronous check
  forceImmediate() {
    this.cdr.detectChanges();
  }
}
```

### When to Use `detach()`

Real-world use case: a real-time dashboard receiving 100 WebSocket updates per second.

```typescript
@Component({ changeDetection: ChangeDetectionStrategy.OnPush })
export class LiveChartComponent implements OnInit, OnDestroy {
  private data: number[] = [];

  constructor(
    private cdr: ChangeDetectorRef,
    private ws: WebSocketService
  ) {}

  ngOnInit() {
    this.cdr.detach(); // Detach — we control when to render

    this.ws.messages$.pipe(
      bufferTime(500),   // Batch updates every 500ms
      takeUntilDestroyed()
    ).subscribe(batch => {
      this.data = [...this.data, ...batch];
      this.cdr.detectChanges(); // Render every 500ms, not 100x/sec
    });
  }
}
```

---

## 5. Zone.js and Its Future

### What Zone.js Costs

- Adds ~30KB to bundle
- Patches every async API globally
- Causes false positives — any third-party library's async code triggers Angular CD
- Makes debugging harder (async stack traces change)

### Running Outside NgZone

When you have a tight loop or heavy computation that shouldn't trigger CD:

```typescript
constructor(private ngZone: NgZone) {}

startHeavyAnimation() {
  this.ngZone.runOutsideAngular(() => {
    // This animation loop does NOT trigger change detection
    requestAnimationFrame(() => this.animate());
  });
}

updateUI(value: string) {
  this.ngZone.run(() => {
    // Explicitly bring back into zone to trigger CD
    this.displayValue = value;
  });
}
```

### Zoneless Applications (Angular 18+)

Angular is progressively enabling zoneless mode using Signals:

```typescript
// app.config.ts — opt-in to experimental zoneless
export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(), // Angular 18+
    // Zone.js NOT needed in angular.json polyfills
  ]
};
```

In zoneless mode:
- No Zone.js in bundle
- Only Signals drive change detection
- Angular checks components only when their signals change
- Fine-grained, surgical DOM updates

---

## 6. Signals vs RxJS for Reactivity

| Feature | RxJS Observables | Angular Signals |
|---------|-----------------|-----------------|
| Nature | Push-based streams | Pull-based reactive values |
| Template use | Requires `async` pipe | Direct binding `{{ mySignal() }}` |
| Subscription | Manual / `async` pipe | Automatic tracking |
| Cleanup | `takeUntilDestroyed` / unsubscribe | Automatic |
| CD integration | Triggers via `async` pipe | Triggers directly — no Zone.js needed |
| Best for | Async streams, HTTP, events | Local state, derived values |
| Error handling | Built-in operators | Via `effect()` or computed |

```typescript
// RxJS approach
@Component({
  template: `{{ orders$ | async | json }}`
})
export class OrdersComponent {
  orders$ = this.store.select(selectOrders);
}
```

```typescript
// Signals approach
@Component({
  template: `{{ orders() | json }}`
})
export class OrdersComponent {
  orders = toSignal(this.store.select(selectOrders), { initialValue: [] });
}
```

> **Interview answer:** "Should we replace NgRx with Signals?"  
> "No — they serve different purposes. Signals are great for local reactive state and deriving values. NgRx is better for predictable, auditable, globally shared business-critical state. They can coexist — use `toSignal()` to bridge NgRx selectors into signal-based templates."

---

## 7. Common Performance Mistakes

### Mistake 1 — Function Calls in Templates

```html
<!-- WRONG — called on every CD cycle -->
<div>{{ getFormattedName() }}</div>

<!-- CORRECT — pure pipe, memoized -->
<div>{{ name | formatName }}</div>

<!-- CORRECT — precompute in component -->
<div>{{ formattedName }}</div>
```

### Mistake 2 — Impure Pipes

```typescript
// WRONG — impure pipe called every CD cycle
@Pipe({ name: 'filter', pure: false })
export class FilterPipe implements PipeTransform {
  transform(items: any[], search: string) { /* ... */ }
}
```

```typescript
// CORRECT — pure pipe, only called when inputs change
@Pipe({ name: 'filter', pure: true })
export class FilterPipe implements PipeTransform {
  transform(items: any[], search: string) { /* ... */ }
}
```

### Mistake 3 — Missing `track` in `@for`

```html
<!-- WRONG — Angular re-renders all DOM on any array change -->
@for (item of items) {
  <app-item [data]="item" />
}

<!-- CORRECT — Angular patches only changed items -->
@for (item of items; track item.id) {
  <app-item [data]="item" />
}
```

### Mistake 4 — Manual Subscribe Without Cleanup

```typescript
// WRONG — memory leak
ngOnInit() {
  this.service.data$.subscribe(d => this.data = d);
}
```

```typescript
// CORRECT — modern Angular 16+ approach
data$ = this.service.data$;
private destroyRef = inject(DestroyRef);

ngOnInit() {
  this.service.data$
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(d => this.data = d);
}
```

---

## 8. Change Detection with NgRx Selectors

This is the full high-performance pipeline:

```typescript
// Memoized selector — only recomputes when slice changes
export const selectActiveOrders = createSelector(
  selectAllOrders,
  selectActiveFilter,
  (orders, filter) => orders.filter(o => o.status === filter)
  // Only runs when selectAllOrders OR selectActiveFilter changes
  // If same result value is returned → does NOT emit → no CD triggered
);
```

```typescript
// Component using it
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (order of orders$ | async; track order.id) {
      <app-order-row [order]="order" />
    }
  `
})
export class OrdersListComponent {
  orders$ = this.store.select(selectActiveOrders);
  constructor(private store: Store) {}
}
```

The chain:
1. Action dispatched → reducer runs → **new state reference**
2. Selector recomputes if its slice changed
3. Selector returns same reference if output unchanged (**memoization**)
4. `async` pipe emits only on distinct values
5. OnPush triggers only when `async` pipe emits
6. `@for` with `track` patches only changed list items

This is maximum efficiency. No wasted work.

---

## 9. Interview-Ready Answers

**"Why do you prefer OnPush?"**
> OnPush reduces unnecessary change detection cycles by checking components only when their inputs change by reference, or when explicitly triggered via async pipe or markForCheck. This improves performance significantly in large applications and ensures predictable rendering behavior that prevents subtle bugs.

**"Why does mutating an array not update UI in OnPush?"**
> In OnPush, Angular compares input references, not values. Mutating an array with `push()` keeps the same reference, so Angular doesn't see a change. The correct approach is to create a new array reference with spread syntax — `[...items, newItem]`. NgRx reducers enforce this immutability pattern by design, which is why NgRx and OnPush work perfectly together.

**"What is Zone.js and why is Angular moving away from it?"**
> Zone.js patches all async APIs to notify Angular when to run change detection. It adds bundle size, causes false positive change detection cycles from third-party libraries, and makes debugging harder. Angular is moving toward Signals-based zoneless change detection, where only signal reads in a component template create a reactive dependency — Angular only re-renders when those specific signals change, making it far more precise and performant.

---

## Common Mistakes — Avoid These

| Mistake | Impact |
|---------|--------|
| `Default` strategy on heavy list components | Full tree checks on every event |
| Mutating objects/arrays in OnPush components | Silent bugs — UI doesn't update |
| Function calls in templates | Called on every CD cycle |
| Impure pipes | Called on every CD cycle |
| Missing `track` on `@for` | Full list DOM re-render on any change |
| Manual subscriptions without cleanup | Memory leaks |

---

## Next Topic

→ [03-defer-lazy-loading.md](03-defer-lazy-loading.md) — How `@defer` gives you component-level code splitting inside already-lazy-loaded routes.
