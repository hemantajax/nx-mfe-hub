# 01 — Enterprise Angular Architecture

> **TL;DR:** Use feature-based standalone architecture with lazy-loaded routes. Each feature owns its UI, services, and NgRx slice. Core = singleton services. Shared = reusable UI only. OnPush everywhere.

---

## 1. Architecture Mindset — Think Like an Architect

In a senior/architect round, the expectation is not just *how* to build something, but *why* you make each decision.

Key principles:
- **Scalability** — Does it work with 50 developers and 200 features?
- **Maintainability** — Can a new developer onboard in days?
- **Performance** — Does it remain fast as data grows?
- **Team ownership** — Can teams own separate feature slices independently?

---

## 2. Feature-Based vs Layer-Based Architecture

### Layer-Based (Avoid in Enterprise)

```
src/app/
  components/      ← ALL components here
  services/        ← ALL services here
  models/          ← ALL models here
  pipes/
```

**Problems:**
- Files from unrelated features sit side by side
- As app grows, these folders become thousands of files
- No clean team ownership
- Lazy loading becomes complex
- Feature can't be easily extracted or isolated

### Feature-Based (Enterprise Standard)

```
src/app/
  features/
    auth/
    dashboard/
    orders/
    products/
```

**Why it wins:**
- Each feature is self-contained
- Teams own specific feature folders
- Lazy loading is natural — each feature route loads independently
- Microfrontend extraction is straightforward later
- Onboarding is faster — developers know where to look

---

## 3. Ideal Enterprise Folder Structure

```
src/
└── app/
    ├── core/                        ← Singleton cross-cutting services
    │   ├── interceptors/
    │   │   ├── auth.interceptor.ts
    │   │   └── error.interceptor.ts
    │   ├── guards/
    │   │   └── auth.guard.ts
    │   ├── services/
    │   │   ├── auth.service.ts
    │   │   ├── logger.service.ts
    │   │   └── storage.service.ts
    │   ├── models/
    │   │   └── user.model.ts
    │   └── core.providers.ts        ← provideCore() function
    │
    ├── shared/                      ← Reusable UI only — NO business logic
    │   ├── ui/
    │   │   ├── button/
    │   │   ├── modal/
    │   │   └── table/
    │   ├── pipes/
    │   │   └── date-format.pipe.ts
    │   ├── directives/
    │   │   └── click-outside.directive.ts
    │   └── utils/
    │       └── validators.ts
    │
    ├── features/
    │   ├── auth/
    │   │   ├── components/
    │   │   │   └── login-form/
    │   │   ├── pages/
    │   │   │   └── login-page/
    │   │   ├── store/
    │   │   │   ├── auth.actions.ts
    │   │   │   ├── auth.reducer.ts
    │   │   │   ├── auth.effects.ts
    │   │   │   └── auth.selectors.ts
    │   │   ├── services/
    │   │   │   └── auth-api.service.ts
    │   │   └── auth.routes.ts
    │   │
    │   ├── dashboard/
    │   │   └── (same pattern)
    │   │
    │   └── orders/
    │       └── (same pattern)
    │
    ├── app.config.ts               ← Application providers (standalone)
    ├── app.routes.ts               ← Root routes
    └── app.component.ts
```

---

## 4. Core vs Shared — The Most Common Confusion

This distinction trips up most mid-level developers. Know it cold.

### Core — Singleton Services

```typescript
// core/services/auth.service.ts
@Injectable({ providedIn: 'root' })
export class AuthService {
  // ONE instance across entire app
}
```

What belongs in Core:
- `AuthService` — token management, login, logout
- `LoggerService` — centralized error/event logging
- `StorageService` — localStorage/sessionStorage abstraction
- HTTP interceptors — auth headers, error handling
- Global error handler
- App initializers (`APP_INITIALIZER`)

> Rule: If only ONE instance should ever exist → Core

### Shared — Reusable UI

```typescript
// shared/ui/button/button.component.ts
@Component({
  standalone: true,
  selector: 'app-button',
  template: `<button class="btn btn-primary"><ng-content /></button>`
})
export class ButtonComponent {}
```

What belongs in Shared:
- Generic UI components (Button, Modal, Table, Spinner)
- Structural pipes (`DateFormat`, `TruncateText`)
- Generic directives (`ClickOutside`, `Tooltip`)
- Pure utility functions

> Rule: If it has NO business logic and can be used in any feature → Shared

### What NEVER Goes in Shared
- Business logic
- API calls
- State management code
- Feature-specific logic

---

## 5. Standalone Architecture (Angular 17+)

Modern Angular is fully standalone. Avoid NgModules unless you have a specific reason.

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(appRoutes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideStore(),
    provideEffects(),
    provideStoreDevtools({ maxAge: 25 }),
    provideAnimationsAsync(),
    ...coreProviders
  ]
};
```

```typescript
// main.ts
bootstrapApplication(AppComponent, appConfig);
```

**Why standalone wins:**
- Better tree shaking — Angular only includes what you import
- Better lazy loading — feature chunks are more granular
- No NgModule boilerplate
- Future-proof — Angular's official direction
- Faster compilation

> **Interview answer:** "Do you still use NgModules?"  
> "Only for library boundaries or legacy migration compatibility."

---

## 6. Smart vs Dumb Components — Critical Pattern

This is the foundation of testable, maintainable Angular code.

### Smart Component (Container)

```typescript
// features/orders/pages/orders-page.component.ts
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-orders-table
      [orders]="orders$ | async"
      [loading]="loading$ | async"
      (orderSelected)="onOrderSelected($event)"
    />
  `
})
export class OrdersPageComponent {
  orders$ = this.store.select(selectAllOrders);
  loading$ = this.store.select(selectOrdersLoading);

  constructor(private store: Store) {
    this.store.dispatch(OrdersActions.loadOrders());
  }

  onOrderSelected(id: string) {
    this.store.dispatch(OrdersActions.selectOrder({ id }));
  }
}
```

Smart component responsibilities:
- Connects to NgRx store (or service)
- Dispatches actions
- Passes data down via `@Input()`
- Listens to outputs and dispatches
- Handles routing

### Dumb Component (Presentational)

```typescript
// features/orders/components/orders-table/orders-table.component.ts
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-orders-table',
  template: `
    <div *ngIf="loading" class="spinner-border"></div>
    <table class="table" *ngIf="!loading">
      <tbody>
        @for (order of orders; track order.id) {
          <tr (click)="orderSelected.emit(order.id)">
            <td>{{ order.name }}</td>
          </tr>
        }
      </tbody>
    </table>
  `
})
export class OrdersTableComponent {
  @Input() orders: Order[] | null = [];
  @Input() loading: boolean | null = false;
  @Output() orderSelected = new EventEmitter<string>();
}
```

Dumb component rules:
- Only `@Input()` and `@Output()` — no store injection
- Pure rendering logic only
- Highly reusable and testable
- Always `OnPush`

> **Why this matters:** Dumb components can be unit tested in complete isolation. Smart components can be tested by mocking the store.

---

## 7. NgRx Placement Strategy

Each feature owns its state slice. Never dump everything in a root store file.

```
features/orders/store/
  orders.actions.ts
  orders.reducer.ts
  orders.effects.ts
  orders.selectors.ts
  orders.state.ts      ← interface for the state shape
  index.ts             ← re-exports for clean imports
```

### App-Level Setup

```typescript
// app.config.ts
providers: [
  provideStore(),          // root store (empty)
  provideEffects(),        // root effects (empty)
  provideStoreDevtools()
]
```

### Feature-Level (Lazy Loaded)

```typescript
// features/orders/orders.routes.ts
export const ordersRoutes: Routes = [
  {
    path: '',
    providers: [
      provideState('orders', ordersReducer),
      provideEffects([OrdersEffects])
    ],
    component: OrdersPageComponent
  }
];
```

**Why feature-level state?**
- Lazy loaded — not in initial bundle
- Isolated — orders feature owns its data
- Cleaned up when route is destroyed (optional with `provideState`)
- Easier to test in isolation

---

## 8. Dependency Injection Scope Strategy

| Scope | Syntax | Behaviour |
|-------|--------|-----------|
| Root singleton | `providedIn: 'root'` | One instance for entire app |
| Platform | `providedIn: 'platform'` | Shared across multiple Angular apps |
| Any (per lazy module) | `providedIn: 'any'` | New instance per lazy-loaded feature |
| Component-scoped | `providers: [MyService]` in `@Component` | New instance per component tree |

```typescript
// Feature-specific cache — new instance per feature
@Injectable({ providedIn: 'any' })
export class OrdersCacheService { }
```

> **Interview trick:** "When do you use `providedIn: 'any'`?"  
> Answer: "When I want a separate service instance per lazy-loaded feature — e.g., a feature-level cache that is independent for each feature."

---

## 9. Lazy Loading Strategy

Every feature route is lazy loaded. This is non-negotiable in enterprise.

```typescript
// app.routes.ts
export const appRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes')
      .then(m => m.authRoutes)
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./features/dashboard/dashboard.routes')
      .then(m => m.dashboardRoutes)
  },
  {
    path: 'orders',
    loadChildren: () => import('./features/orders/orders.routes')
      .then(m => m.ordersRoutes)
  }
];
```

**Impact:**
- Initial bundle contains ONLY shell + router
- Feature bundles download on demand
- Reduces TTI (Time to Interactive) significantly
- Users only download code for pages they visit

---

## 10. Performance Defaults for Every Component

These are non-negotiable. Apply them from day one.

```typescript
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,  // Always
  template: `
    @for (item of items; track item.id) {           // Always trackBy
      <app-item [data]="item" />
    }
  `
})
export class MyComponent {
  // Use pure pipes, not methods in templates
  // Use async pipe, not manual subscribe
  // Avoid heavy logic in template expressions
}
```

Checklist:
- [ ] `OnPush` on every component
- [ ] `track` expression in every `@for`
- [ ] Pure pipes (never impure unless forced)
- [ ] `async` pipe instead of manual `subscribe()`
- [ ] No function calls in template bindings
- [ ] Memoized selectors in NgRx

---

## 11. Scaling to 1M Users — Architect Answer

When asked "How would you design Angular for 1M concurrent users?":

**Frontend:**
- Lazy loading + `@defer` for intra-page splitting
- OnPush everywhere to reduce DOM thrashing
- SSR for first-paint performance + SEO
- CDN for static assets (JS, CSS, fonts)
- Edge caching for SSR output
- Service Worker for offline + asset caching
- Web Workers for heavy computation (PDF generation, data processing)

**State:**
- Feature-level state only — no global state explosion
- Memoized selectors — no redundant recomputation
- Normalized entity state — no duplicate data

**Monitoring:**
- Angular performance profiling (`ng.profiler`)
- Error tracking (Sentry)
- Real User Monitoring (Core Web Vitals)
- Bundle size CI checks (fail build if bundle exceeds threshold)

---

## 12. Interview-Ready Answer Template

> "How do you design Angular architecture?"

**Strong answer:**

> I prefer feature-based standalone architecture with lazy-loaded routes. Each feature owns its UI components, services, and NgRx state slice. The core module contains singleton cross-cutting concerns like interceptors and auth. Shared contains only reusable UI with no business logic. I use OnPush change detection everywhere, memoized NgRx selectors, and `@defer` for intra-page component splitting. This ensures scalability, team independence, maintainability, and performance from the start.

---

## Common Mistakes — Avoid Saying These

| Mistake | Why It's Wrong |
|---------|---------------|
| "I keep everything in a shared folder" | No isolation, grows into a dumping ground |
| "I don't use OnPush because it's complex" | Default strategy kills performance at scale |
| "I store all API responses in global NgRx" | Increases coupling, memory, reducer complexity |
| "I don't lazy load because the app is small" | Small apps grow; lazy loading is zero-cost habit |
| "I use NgModules for every feature" | Outdated — standalone is the modern Angular way |

---

## Next Topic

→ [02-change-detection.md](02-change-detection.md) — How Angular decides when to update the DOM, and how to control it precisely.
