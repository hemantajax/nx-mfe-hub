# 05 — RxJS Deep Dive (Async Composition)

> **TL;DR:** RxJS is the backbone of Angular's async model. Master the four flattening operators (`switchMap`, `mergeMap`, `concatMap`, `exhaustMap`), avoid `shareReplay` pitfalls, always clean up subscriptions, and know when to replace RxJS with Signals.

---

## 1. Hot vs Cold Observables

This is a common interview question with real architectural implications.

### Cold Observable — Lazy, Per-Subscriber

```typescript
// Each subscriber gets its own independent execution
const cold$ = new Observable(observer => {
  console.log('Execution started'); // Runs per subscriber
  observer.next(Math.random());
  observer.complete();
});

cold$.subscribe(v => console.log('Sub 1:', v)); // Execution started, Sub 1: 0.42
cold$.subscribe(v => console.log('Sub 2:', v)); // Execution started, Sub 2: 0.87
// Two different values — two independent executions
```

**Examples of cold observables:**
- `HttpClient.get()` — each subscribe makes a new HTTP request
- `of()`, `from()`, `interval()` (when not shared)
- Any `new Observable()` constructor

### Hot Observable — Shared Execution

```typescript
// All subscribers share the same execution
const subject = new Subject<number>();
const hot$ = subject.asObservable();

hot$.subscribe(v => console.log('Sub 1:', v));
hot$.subscribe(v => console.log('Sub 2:', v));

subject.next(42);
// Sub 1: 42
// Sub 2: 42
// Both get same value — shared execution
```

**Examples of hot observables:**
- `Subject`, `BehaviorSubject`, `ReplaySubject`
- DOM events (`fromEvent`)
- WebSocket connections
- `shareReplay()` converted cold → hot

### Making Cold Hot with `shareReplay`

```typescript
// Without shareReplay — 3 HTTP requests
const data$ = this.http.get('/api/config');
data$.subscribe(d => (this.headerConfig = d)); // Request 1
data$.subscribe(d => (this.footerConfig = d)); // Request 2
data$.subscribe(d => (this.sidebarConfig = d)); // Request 3

// With shareReplay — 1 HTTP request, shared result
const data$ = this.http.get('/api/config').pipe(
  shareReplay(1)
);
data$.subscribe(d => (this.headerConfig = d)); // Request 1
data$.subscribe(d => (this.footerConfig = d)); // From cache
data$.subscribe(d => (this.sidebarConfig = d)); // From cache
```

---

## 2. The Four Flattening Operators (Most Important)

These operators handle the "observable of observables" problem — when each emission needs to trigger an async operation.

### The Common Scenario

```typescript
// Search: user types → trigger API call
this.searchInput.valueChanges.pipe(
  // Which flattening operator? → depends on behaviour needed
  ???Map(term => this.api.search(term))
);
```

### `switchMap` — Cancel Previous, Use Latest

```typescript
// When: latest value matters, previous is obsolete
// Use for: search, autocomplete, route params, navigation

this.searchInput.valueChanges.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(term => this.api.search(term))
  // If user types 'a', then 'ab' before 'a' response arrives:
  // → cancels 'a' request, uses 'ab' result
).subscribe(results => this.results = results);
```

```typescript
// Route param changes — load new data, cancel previous load
this.route.params.pipe(
  switchMap(params => this.ordersApi.getOrder(params['id']))
).subscribe(order => this.order = order);
```

### `mergeMap` — Run All, In Parallel

```typescript
// When: all results matter, order doesn't matter
// Use for: parallel requests, fire-and-forget, independent operations

this.selectedIds$.pipe(
  mergeMap(id => this.api.deleteItem(id))
  // If ids [1, 2, 3] emit: all 3 DELETE requests run concurrently
  // Results arrive in whatever order server responds
).subscribe(() => this.toast.success('Deleted'));
```

```typescript
// Parallel data loading — all run simultaneously
const dashboard$ = merge(
  this.api.getStats().pipe(mergeMap(stats => of({ type: 'stats', stats }))),
  this.api.getOrders().pipe(mergeMap(orders => of({ type: 'orders', orders }))),
  this.api.getUsers().pipe(mergeMap(users => of({ type: 'users', users })))
);
```

### `concatMap` — Queue, Preserve Order

```typescript
// When: order matters, no parallel execution
// Use for: create/update operations, sequential steps, uploads

this.saveActions$.pipe(
  concatMap(data => this.api.save(data))
  // If 3 saves fire: save 1 completes → save 2 starts → save 3 starts
  // Guaranteed order, no race conditions
).subscribe(result => this.saved.push(result));
```

```typescript
// Sequential wizard steps — each must complete before next
this.stepActions$.pipe(
  concatMap(step => this.processStep(step))
).subscribe();
```

### `exhaustMap` — Ignore New While Busy

```typescript
// When: ignore subsequent events while processing
// Use for: login button, form submit, any "once at a time" operation

this.loginButton$.pipe(
  exhaustMap(credentials => this.auth.login(credentials))
  // If user clicks login 5 times rapidly:
  // → Only first click triggers login
  // → All subsequent clicks are IGNORED until first completes
).subscribe(user => this.router.navigate(['/dashboard']));
```

### Quick Decision Guide

```
Is the previous request still valid when new one arrives?
├── NO (search, route change) → switchMap
└── YES
    ├── Order matters? YES → concatMap
    ├── Already processing? Ignore new → exhaustMap
    └── Run in parallel, all matter → mergeMap
```

---

## 3. Subject Types

### `Subject` — No Initial Value, No Replay

```typescript
const subject = new Subject<string>();
subject.subscribe(v => console.log('Late sub:', v));
subject.next('hello');
// Subscriber gets: 'hello'

// Late subscriber misses previous values:
subject.subscribe(v => console.log('Very late:', v));
// Gets nothing until new next() call
```

### `BehaviorSubject` — Current Value Available

```typescript
// Must be initialized with a value
const state$ = new BehaviorSubject<User | null>(null);

// New subscriber IMMEDIATELY gets current value
state$.subscribe(user => console.log(user)); // null (immediately)

state$.next({ id: '1', name: 'Hemant' });
// Subscriber gets: { id: '1', name: 'Hemant' }

// Another late subscriber:
state$.subscribe(u => console.log('Late:', u)); // { id: '1', name: 'Hemant' }

// Get current value synchronously
const currentUser = state$.getValue();
```

Use in services for state management without NgRx:

```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  private user$ = new BehaviorSubject<User | null>(null);
  
  readonly currentUser$ = this.user$.asObservable(); // Expose read-only
  readonly isLoggedIn$ = this.user$.pipe(map(u => u !== null));

  setUser(user: User) { this.user$.next(user); }
  clearUser() { this.user$.next(null); }
}
```

### `ReplaySubject` — Buffer N Values

```typescript
const replay$ = new ReplaySubject<number>(3); // Buffer last 3

replay$.next(1);
replay$.next(2);
replay$.next(3);
replay$.next(4);

// Late subscriber gets last 3 buffered values immediately
replay$.subscribe(v => console.log(v)); // 2, 3, 4
```

### `AsyncSubject` — Only Last Value on Complete

```typescript
const async$ = new AsyncSubject<number>();

async$.next(1);
async$.next(2);
async$.next(3);
async$.complete();

async$.subscribe(v => console.log(v)); // Only: 3
```

---

## 4. `shareReplay` — Pitfalls and Correct Usage

### The Problem Without `shareReplay`

```typescript
// Multiple subscriptions = multiple HTTP calls
const config$ = this.http.get<Config>('/api/config');

// Template
<div>{{ config$ | async | json }}</div>  // HTTP call 1
<div>{{ config$ | async | json }}</div>  // HTTP call 2 — DUPLICATE!
```

### Basic Usage

```typescript
const config$ = this.http.get<Config>('/api/config').pipe(
  shareReplay(1)
);
```

### The Memory Leak Pitfall

```typescript
// WRONG — refCount: false (default before RxJS 6.4)
// Observable never completes → stays in memory forever
const data$ = this.http.get('/api/data').pipe(
  shareReplay(1)  // bufferSize: 1, refCount: false by default
);
```

```typescript
// CORRECT — shareReplay with refCount: true
// Completes subscription when all subscribers unsubscribe
const data$ = this.http.get('/api/data').pipe(
  shareReplay({ bufferSize: 1, refCount: true })
);
```

`refCount: true` means:
- Reference count tracks subscribers
- When count drops to 0 → unsubscribes from source
- No memory leak

For HTTP (completes automatically): `shareReplay(1)` is safe.  
For long-lived streams (WebSocket, intervals): always use `{ bufferSize: 1, refCount: true }`.

---

## 5. Memory Leak Prevention

### The Problem

```typescript
@Component({ template: `{{ value }}` })
export class BadComponent implements OnInit {
  value: string;

  ngOnInit() {
    // MEMORY LEAK — never unsubscribed
    this.dataService.data$.subscribe(v => this.value = v);
  }
}
```

When component is destroyed, the subscription lives on. The component stays in memory.

### Solution 1 — `async` Pipe (Best for templates)

```typescript
@Component({
  template: `{{ data$ | async }}`
})
export class GoodComponent {
  data$ = this.service.data$;
  // Angular auto-unsubscribes when component destroys
}
```

### Solution 2 — `takeUntilDestroyed` (Angular 16+)

```typescript
@Component({ template: '' })
export class GoodComponent implements OnInit {
  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    this.service.data$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.value = v);
  }
}
```

### Solution 3 — `takeUntil` with Subject (Pre-Angular 16)

```typescript
@Component({ template: '' })
export class LegacyComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.service.data$
      .pipe(takeUntil(this.destroy$))
      .subscribe(v => this.value = v);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

### Solution 4 — `toSignal` (Signals — Angular 16+)

```typescript
@Component({ template: `{{ data() }}` })
export class SignalsComponent {
  // Auto-unsubscribes when component destroys
  data = toSignal(this.service.data$, { initialValue: null });
}
```

---

## 6. Essential Operators Reference

### Transformation

```typescript
// map — synchronous transform
prices$.pipe(map(price => price * 1.2))

// switchMap — async transform (most common)
productId$.pipe(switchMap(id => this.api.getProduct(id)))

// scan — accumulate values (like reduce, but streaming)
clicks$.pipe(scan((count, _) => count + 1, 0))

// pluck — extract property (deprecated, use map)
users$.pipe(map(u => u.email))
```

### Filtering

```typescript
// filter — conditional pass-through
actions$.pipe(filter(a => a.type === 'LOGIN_SUCCESS'))

// distinctUntilChanged — skip duplicate emissions
search$.pipe(distinctUntilChanged())

// debounceTime — wait for pause in emissions
search$.pipe(debounceTime(300))

// throttleTime — at most one per interval
scroll$.pipe(throttleTime(100))

// take — complete after N emissions
interval(1000).pipe(take(5))  // 0,1,2,3,4 then complete

// first — take only first matching emission
actions$.pipe(first(a => a.type === 'INIT'))
```

### Combination

```typescript
// combineLatest — emit when ANY source emits (with latest from others)
combineLatest([user$, permissions$]).pipe(
  map(([user, permissions]) => ({ user, permissions }))
)

// forkJoin — wait for ALL to complete (parallel HTTP)
forkJoin({
  user: this.api.getUser(id),
  orders: this.api.getUserOrders(id),
  address: this.api.getUserAddress(id)
}).subscribe(({ user, orders, address }) => {
  // All three available here
});

// withLatestFrom — combine but only trigger from primary
clicks$.pipe(
  withLatestFrom(currentUser$),
  map(([click, user]) => ({ click, user }))
)

// merge — interleave multiple streams
merge(wsMessages$, httpPolling$).subscribe(msg => this.process(msg));

// zip — pair emissions by index
zip(questionIds$, answers$).pipe(
  map(([id, answer]) => ({ id, answer }))
)
```

### Error Handling

```typescript
// catchError — handle error, return fallback observable
this.api.getData().pipe(
  catchError(error => {
    this.logger.error(error);
    return of([]); // Return empty array as fallback
  })
)

// retry — retry N times on error
this.api.getData().pipe(
  retry(3) // Retry up to 3 times
)

// retryWhen — retry with custom logic (delays, conditions)
this.api.getData().pipe(
  retryWhen(errors => errors.pipe(
    delayWhen((_, index) => timer(1000 * Math.pow(2, index))) // Exponential backoff
  ))
)
```

---

## 7. Real-World Patterns

### HTTP with Loading State (Without NgRx)

```typescript
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (vm$ | async; as vm) {
      @if (vm.loading) { <div class="spinner-border"></div> }
      @if (vm.error) { <div class="alert alert-danger">{{ vm.error }}</div> }
      @if (vm.data) { <app-orders-list [orders]="vm.data" /> }
    }
  `
})
export class OrdersComponent {
  vm$ = this.ordersApi.getOrders().pipe(
    map(data => ({ data, loading: false, error: null })),
    startWith({ data: null, loading: true, error: null }),
    catchError(error => of({ data: null, loading: false, error: error.message }))
  );
}
```

### Polling with Retry

```typescript
const polledData$ = timer(0, 30000).pipe( // Poll every 30s
  switchMap(() =>
    this.api.getStatus().pipe(
      retry(2),
      catchError(() => of(null)) // Don't stop polling on error
    )
  ),
  filter(Boolean),
  shareReplay({ bufferSize: 1, refCount: true })
);
```

### Type-Ahead Search (Complete Pattern)

```typescript
search$ = this.searchControl.valueChanges.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  filter(term => term.length >= 2),
  switchMap(term =>
    this.api.search(term).pipe(
      catchError(() => of([]))
    )
  ),
  shareReplay({ bufferSize: 1, refCount: true })
);
```

---

## 8. Interview-Ready Answers

**"Explain switchMap vs mergeMap vs concatMap vs exhaustMap"**

> They all flatten inner observables but differ in concurrency behaviour. `switchMap` cancels the previous inner observable when a new outer emission arrives — ideal for search where only the latest result matters. `mergeMap` runs all inner observables concurrently — ideal for parallel independent operations like deleting multiple items. `concatMap` queues inner observables sequentially — ideal for create/update where order matters. `exhaustMap` ignores new emissions while an inner observable is active — ideal for login or form submit to prevent double execution.

**"What is a memory leak in RxJS and how do you prevent it?"**

> A memory leak occurs when a subscription is never unsubscribed after the subscribing component is destroyed. The observable keeps emitting, the callback keeps running, and the component stays referenced in memory. Prevention: use `async` pipe in templates (auto-unsubscribes), use `takeUntilDestroyed(destroyRef)` for imperative subscriptions in Angular 16+, or `toSignal()` which handles cleanup automatically.

---

## Next Topic

→ [06-signals.md](06-signals.md) — Angular's modern reactive primitive: `signal()`, `computed()`, `effect()`, and how they replace Zone.js-based change detection.
