# 03 — `@defer` and Lazy Loading (Component-Level Code Splitting)

> **TL;DR:** Route-level lazy loading splits at page boundaries. `@defer` splits within a page. Together they create a layered loading strategy — critical UI loads immediately, everything else loads exactly when needed.

---

## 1. The Two Levels of Lazy Loading

### Level 1 — Route Lazy Loading (Page Boundary)

```typescript
// app.routes.ts
{
  path: 'orders',
  loadChildren: () => import('./features/orders/orders.routes')
    .then(m => m.ordersRoutes)
}
```

This loads the entire orders feature bundle only when the user navigates to `/orders`.

**Problem:** Once the route loads, ALL components in that route's bundle are downloaded together — even heavy charts, PDFs, admin panels, or analytics tools that the user may never interact with.

### Level 2 — @defer (Component Boundary)

```html
<!-- Inside the already-loaded orders page -->
@defer (on viewport) {
  <app-revenue-chart />
}
```

This downloads `app-revenue-chart` (and its dependencies) only when it scrolls into view. The chart's code is a separate chunk, not in the orders bundle.

**Together:**
```
Initial load  →  App shell only (tiny)
Navigate /orders  →  Orders feature bundle (critical UI only)
Scroll down  →  Revenue chart chunk
Idle  →  Analytics panel chunk
Click "Export"  →  PDF export library chunk
```

---

## 2. The Problem @defer Solves

### Before @defer — ES6 Dynamic Import (Old Pattern)

Many developers did this manually:

```typescript
// component.ts — old approach
async openDialog() {
  const { UserDialogComponent } = await import('./user-dialog.component');
  this.dialog.open(UserDialogComponent);
}
```

**Problems with this approach:**
- Repeated boilerplate in every component
- No declarative loading state (have to manage spinner manually)
- No standardized error handling
- Hard to test
- Imperative and scattered across TS files
- No `@placeholder`, `@loading`, `@error` lifecycle blocks

### After @defer — Declarative Template Syntax

```html
@defer (on interaction(openBtn)) {
  <app-user-dialog />
} @placeholder {
  <span>Click to load</span>
} @loading (minimum 200ms) {
  <app-spinner />
} @error {
  <p class="text-danger">Failed to load. Please retry.</p>
}

<button #openBtn class="btn btn-primary">Open Dialog</button>
```

**Angular handles:**
- Code splitting automatically
- Chunk download on interaction
- Loading state display
- Error state display
- No TypeScript boilerplate needed

---

## 3. All Trigger Types

### Default (No Trigger) — After Initial Render Stabilizes

```html
@defer {
  <app-non-critical-widget />
}
```
Loads after the initial rendering pass is complete. Good for below-fold content that doesn't need a specific trigger.

### `on idle` — When Browser Is Free

```html
@defer (on idle) {
  <app-analytics-panel />
}
```
Loads when the browser's `requestIdleCallback` fires. Perfect for non-visible, non-urgent components that should preload silently.

Use for:
- Analytics widgets
- Pre-warming recommendation sections
- Background data panels

### `on viewport` — When Element Enters View

```html
@defer (on viewport) {
  <app-revenue-chart />
} @placeholder {
  <div class="chart-skeleton" style="height: 300px;"></div>
}
```
Loads when the placeholder element scrolls into the viewport (uses `IntersectionObserver`). Best for:
- Charts and graphs
- Below-fold content sections
- Infinite scroll items
- Landing page sections

### `on interaction` — On User Action

```html
<!-- Using a template reference -->
@defer (on interaction(exportBtn)) {
  <app-export-panel />
}
<button #exportBtn class="btn btn-outline-secondary">Export Options</button>
```

```html
<!-- Using the deferred block itself as the trigger -->
@defer (on interaction) {
  <app-advanced-filters />
} @placeholder {
  <button class="btn btn-link">Show Advanced Filters</button>
}
```

Use for:
- Dialogs and modals
- Advanced filter panels
- Settings drawers
- Help tooltips with heavy content

### `on timer` — After a Delay

```html
@defer (on timer(3s)) {
  <app-promotional-banner />
}
```
Loads after 3 seconds regardless of user action. Use sparingly — usually for non-critical promotional content.

### `when` — Conditional Expression

```html
@defer (when isAdminPanelReady) {
  <app-admin-controls />
} @placeholder {
  <div class="placeholder-glow"><span class="placeholder col-6"></span></div>
}
```

```typescript
isAdminPanelReady = false;

ngOnInit() {
  this.authService.role$.pipe(
    filter(role => role === 'admin')
  ).subscribe(() => {
    this.isAdminPanelReady = true;
  });
}
```

Use for:
- Role-based UI (admin features)
- Feature flag controlled components
- Data-dependent rendering

### Combining Triggers

```html
<!-- Load when EITHER idle OR in viewport — whichever comes first -->
@defer (on idle; on viewport) {
  <app-heavy-widget />
}
```

---

## 4. The Lifecycle Blocks

### `@placeholder` — Shown Before Load

```html
@defer (on viewport) {
  <app-chart />
} @placeholder (minimum 100ms) {
  <!-- Shown until defer triggers, minimum 100ms to prevent flash -->
  <div class="bg-light rounded" style="height: 250px;"></div>
}
```

The `minimum` parameter prevents flickering when the component loads instantly.

### `@loading` — Shown During Download

```html
@defer (on interaction(btn)) {
  <app-heavy-dialog />
} @loading (after 100ms; minimum 500ms) {
  <!-- "after 100ms" = don't show spinner for fast loads -->
  <!-- "minimum 500ms" = if spinner shows, keep it visible at least 500ms -->
  <div class="d-flex justify-content-center">
    <div class="spinner-border text-primary"></div>
  </div>
}
```

### `@error` — Shown If Chunk Fails to Load

```html
@defer {
  <app-feature />
} @error {
  <div class="alert alert-danger">
    Failed to load this section. 
    <button (click)="retry()">Retry</button>
  </div>
}
```

### Full Production Example

```html
@defer (on viewport; prefetch on idle) {
  <app-revenue-chart [data]="chartData" />
} @placeholder (minimum 100ms) {
  <div class="card" style="height: 300px;">
    <div class="card-body d-flex align-items-center justify-content-center">
      <span class="text-muted">Chart loading...</span>
    </div>
  </div>
} @loading (after 150ms; minimum 400ms) {
  <div class="d-flex justify-content-center p-5">
    <div class="spinner-border text-primary" role="status"></div>
  </div>
} @error {
  <div class="alert alert-warning">
    Chart unavailable. <a href="#" (click)="reload()">Reload</a>
  </div>
}
```

---

## 5. Prefetching

You can prefetch a deferred block (download it early) with a different trigger than when to show it:

```html
<!-- Show on viewport, but start downloading on idle -->
@defer (on viewport; prefetch on idle) {
  <app-chart />
}

<!-- Show on interaction, but prefetch when hovering -->
@defer (on interaction(btn); prefetch on hover(btn)) {
  <app-dialog />
}
<button #btn>Open</button>
```

This is powerful: the chunk is already cached when the user triggers it — zero perceived wait time.

---

## 6. Layered Architecture with @defer (Enterprise Pattern)

```
App
├── Route: /dashboard  (lazy loaded feature bundle)
│   ├── Summary cards          → immediate (critical above-fold)
│   ├── Revenue chart          → @defer (on viewport)
│   ├── AI insights panel      → @defer (on idle)
│   ├── Export to PDF          → @defer (on interaction(exportBtn))
│   └── Admin controls         → @defer (when isAdmin)
│
├── Route: /orders  (lazy loaded feature bundle)
│   ├── Orders table           → immediate
│   ├── Order detail dialog    → @defer (on interaction)
│   └── Analytics breakdown    → @defer (on idle)
```

```typescript
// dashboard-page.component.ts
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Critical: loads with route bundle -->
    <app-summary-cards [stats]="stats$ | async" />

    <!-- Below fold: load when scrolled to -->
    @defer (on viewport; prefetch on idle) {
      <app-revenue-chart />
    } @placeholder {
      <div class="chart-placeholder bg-light rounded" style="height:300px"></div>
    }

    <!-- Non-urgent: load when browser free -->
    @defer (on idle) {
      <app-ai-insights />
    }

    <!-- On-demand only: load when user clicks -->
    @defer (on interaction(exportBtn)) {
      <app-pdf-export />
    } @loading {
      <span class="spinner-border spinner-border-sm"></span>
    }
    <button #exportBtn class="btn btn-secondary">Export PDF</button>

    <!-- Role-based: only admin downloads this code -->
    @if (isAdmin()) {
      @defer {
        <app-admin-panel />
      }
    }
  `
})
export class DashboardPageComponent {
  stats$ = this.store.select(selectDashboardStats);
  isAdmin = this.authService.isAdmin;
}
```

---

## 7. Lazy Dialogs Pattern (Replacing ES6 Dynamic Imports)

### Old Pattern (Imperative — Avoid)

```typescript
async openUserDialog(userId: string) {
  // Repeated in every component that opens dialogs
  const { UserDialogComponent } = await import(
    '../dialogs/user-dialog/user-dialog.component'
  );
  this.matDialog.open(UserDialogComponent, { data: { userId } });
}
```

### New Pattern — @defer with Interaction Trigger

For embedded dialogs (rendered in-place, not via MatDialog overlay):

```html
<!-- Parent template -->
<button #editBtn class="btn btn-sm btn-outline-primary">Edit User</button>

@defer (on interaction(editBtn)) {
  <app-user-edit-dialog
    [userId]="selectedUserId"
    (saved)="onSaved($event)"
    (cancelled)="selectedUserId = null"
  />
} @loading (after 100ms) {
  <div class="spinner-border spinner-border-sm text-primary"></div>
}
```

### Enterprise Pattern — Reusable LazyDialogHost

For many dialogs across a large app:

```typescript
// shared/ui/lazy-dialog/lazy-dialog.component.ts
@Component({
  standalone: true,
  selector: 'app-lazy-dialog',
  template: `
    @defer (when visible()) {
      <ng-content />
    } @loading {
      <div class="d-flex justify-content-center p-3">
        <div class="spinner-border text-primary"></div>
      </div>
    }
  `
})
export class LazyDialogComponent {
  visible = input.required<boolean>();
}
```

```html
<!-- Usage: standardized lazy loading for any dialog -->
<app-lazy-dialog [visible]="showUserDialog">
  <app-user-dialog
    [user]="selectedUser"
    (close)="showUserDialog = false"
  />
</app-lazy-dialog>

<app-lazy-dialog [visible]="showOrderDialog">
  <app-order-detail-dialog
    [orderId]="selectedOrderId"
    (close)="showOrderDialog = false"
  />
</app-lazy-dialog>
```

Benefits:
- Zero repetitive import boilerplate
- Standardized loading state across all dialogs
- All dialog code is in separate chunks
- Easy to audit which dialogs are lazy

### Nested Defer — Heavy Content Inside Dialogs

```html
@defer (on interaction(editBtn)) {
  <app-user-dialog>
    <!-- Even heavier content inside the dialog is further deferred -->
    @defer (on viewport) {
      <app-activity-chart [userId]="selectedUserId" />
    } @placeholder {
      <div class="bg-light" style="height:200px"></div>
    }
  </app-user-dialog>
}
<button #editBtn>Edit User</button>
```

---

## 8. @defer vs Route Lazy Loading — Decision Table

| Use Case | Solution |
|----------|----------|
| Load feature on navigation | Route `loadChildren` |
| Load heavy component below fold | `@defer (on viewport)` |
| Load dialog on button click | `@defer (on interaction)` |
| Preload background widgets | `@defer (on idle)` |
| Load admin-only features | `@defer (when isAdmin)` |
| Load heavy 3rd-party (charts, maps) | `@defer (on viewport)` |
| Load PDF/export tools | `@defer (on interaction)` |
| Load rich text editor | `@defer (when editorOpen)` |

---

## 9. SSR + @defer — Important Caveat

When using Angular SSR (Server-Side Rendering):
- By default, deferred content is **NOT rendered on the server**
- The server sends the placeholder HTML
- Client hydrates and loads the deferred chunk

**Implication:**
- Deferred content is NOT indexed by search engines (unless specifically handled)
- Do NOT defer SEO-critical content (product descriptions, article text, prices)
- Defer only user-interaction content, admin tools, charts, analytics

```html
<!-- GOOD — user interactions, not SEO critical -->
@defer (on interaction) {
  <app-checkout-extras />
}

<!-- BAD — product description should be SSR rendered, not deferred -->
@defer {
  <app-product-description />  <!-- Google won't see this -->
}
```

---

## 10. Performance Impact

Measured improvements from proper `@defer` usage:

| Metric | Impact |
|--------|--------|
| Initial bundle size | -20% to -60% (depends on deferred content) |
| Time to Interactive (TTI) | Significant improvement |
| Largest Contentful Paint (LCP) | Improved (fewer render-blocking resources) |
| First Contentful Paint (FCP) | Improved |
| Lighthouse Performance score | Measurable increase |

---

## 11. When NOT to Use @defer

| Scenario | Reason |
|----------|--------|
| Above-the-fold critical UI | Users see placeholder, bad UX |
| SEO-critical content | Not rendered server-side |
| Very small components | Network overhead not worth the split |
| Components needed immediately on route load | Just import them normally |
| Auth-required pages where user always sees content | No benefit |

---

## 12. Interview-Ready Answer

**"How would you use @defer in a large-scale app?"**

> I use route-level lazy loading for feature separation, and within each feature page I use `@defer` for heavy, below-the-fold, or interaction-based components. Charts load on viewport, admin tools load via feature flags using `when`, dialogs load on interaction. This creates a layered loading strategy — minimal initial bundle, fast TTI, and precise chunk delivery. I carefully avoid deferring SEO-critical content when using SSR.

**"If route is already lazy loaded, why use @defer inside it?"**

> Route lazy loading splits at page boundaries — once the route loads, all components in that route bundle load together. If that page has heavy charts, analytics panels, or export tools, they still inflate the route bundle and delay Time to Interactive. `@defer` enables component-level splitting within the already-lazy-loaded route, ensuring each heavy widget has its own chunk and loads only when triggered.

---

## Next Topic

→ [04-ngrx-deep-dive.md](04-ngrx-deep-dive.md) — Store architecture, Facade pattern, Entity adapter, memoized selectors, and when NOT to use NgRx.
