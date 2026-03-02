# 04 — NgRx Deep Dive (Enterprise State Management)

> **TL;DR:** NgRx is for shared, business-critical, persistent state only. Use feature-level slices, memoized selectors, the Facade pattern for abstraction, and Entity adapter for collections. Never put UI state or ephemeral data in the store.

---

## 1. State Classification — The Foundation

Before writing a single NgRx line, classify your state.

| Type | Examples | Where It Lives |
|------|----------|---------------|
| UI State (local) | modal open, active tab, hover state, form dirty | Component signal or service |
| Ephemeral | search input value, scroll position | Component |
| Feature State | orders list, products, customers | Feature NgRx slice |
| Global Cross-App | logged-in user, theme, language, permissions | Root NgRx slice |

**Rule:** If only ONE component needs it → component state.  
**Rule:** If multiple components in ONE feature need it → feature NgRx slice.  
**Rule:** If multiple features need it → root NgRx slice.

---

## 2. Store Setup (Standalone Application)

### App-Level (Root)

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideStore(),                    // Empty root store
    provideEffects(),                  // Empty root effects
    provideStoreDevtools({
      maxAge: 25,
      logOnly: !isDevMode(),
      autoPause: true
    }),
    provideRouterStore()               // Router state in store (optional)
  ]
};
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

Feature state is registered when the route loads and can be cleaned up when the route destroys (optional config).

---

## 3. Complete NgRx Feature Slice (Orders Example)

### State Shape

```typescript
// features/orders/store/orders.state.ts
export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  total: number;
  createdAt: string;
}

export interface OrdersState {
  orders: Order[];
  selectedOrderId: string | null;
  loading: boolean;
  error: string | null;
}

export const initialState: OrdersState = {
  orders: [],
  selectedOrderId: null,
  loading: false,
  error: null
};
```

### Actions

```typescript
// features/orders/store/orders.actions.ts
import { createActionGroup, emptyProps, props } from '@ngrx/store';

export const OrdersActions = createActionGroup({
  source: 'Orders',
  events: {
    'Load Orders': emptyProps(),
    'Load Orders Success': props<{ orders: Order[] }>(),
    'Load Orders Failure': props<{ error: string }>(),
    'Select Order': props<{ id: string }>(),
    'Create Order': props<{ order: Omit<Order, 'id'> }>(),
    'Create Order Success': props<{ order: Order }>(),
    'Delete Order': props<{ id: string }>(),
    'Delete Order Success': props<{ id: string }>()
  }
});
```

`createActionGroup` generates typed actions:
- `OrdersActions.loadOrders()`
- `OrdersActions.loadOrdersSuccess({ orders })`
- `OrdersActions.loadOrdersFailure({ error })`
- Type-safe, no boilerplate duplication

### Reducer

```typescript
// features/orders/store/orders.reducer.ts
export const ordersReducer = createReducer(
  initialState,

  on(OrdersActions.loadOrders, state => ({
    ...state,
    loading: true,
    error: null
  })),

  on(OrdersActions.loadOrdersSuccess, (state, { orders }) => ({
    ...state,
    orders,            // New reference — OnPush will detect this
    loading: false
  })),

  on(OrdersActions.loadOrdersFailure, (state, { error }) => ({
    ...state,
    error,
    loading: false
  })),

  on(OrdersActions.selectOrder, (state, { id }) => ({
    ...state,
    selectedOrderId: id
  })),

  on(OrdersActions.createOrderSuccess, (state, { order }) => ({
    ...state,
    orders: [...state.orders, order]  // Immutable push
  })),

  on(OrdersActions.deleteOrderSuccess, (state, { id }) => ({
    ...state,
    orders: state.orders.filter(o => o.id !== id)  // Immutable remove
  }))
);
```

**Key rule:** Reducers must be **pure functions** — no side effects, no API calls, always return new state object.

### Selectors

```typescript
// features/orders/store/orders.selectors.ts
import { createFeatureSelector, createSelector } from '@ngrx/store';

// Feature selector
const selectOrdersState = createFeatureSelector<OrdersState>('orders');

// Simple selectors
export const selectAllOrders = createSelector(
  selectOrdersState,
  state => state.orders
);

export const selectOrdersLoading = createSelector(
  selectOrdersState,
  state => state.loading
);

export const selectOrdersError = createSelector(
  selectOrdersState,
  state => state.error
);

export const selectSelectedOrderId = createSelector(
  selectOrdersState,
  state => state.selectedOrderId
);

// Derived/computed selectors — memoized
export const selectSelectedOrder = createSelector(
  selectAllOrders,
  selectSelectedOrderId,
  (orders, id) => orders.find(o => o.id === id) ?? null
  // Only recomputes when orders OR selectedOrderId changes
);

export const selectPendingOrders = createSelector(
  selectAllOrders,
  orders => orders.filter(o => o.status === 'pending')
  // Memoized: same input array → same output → no re-render
);

export const selectOrdersViewModel = createSelector(
  selectAllOrders,
  selectOrdersLoading,
  selectOrdersError,
  (orders, loading, error) => ({ orders, loading, error })
  // Combine multiple slices into one clean ViewModel
);
```

**Why memoization matters:**
- Selector only recomputes when its input selectors produce new values
- If NgRx state changes in unrelated slice → selector returns same reference → `async` pipe doesn't emit → no CD triggered

### Effects

```typescript
// features/orders/store/orders.effects.ts
@Injectable()
export class OrdersEffects {
  loadOrders$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OrdersActions.loadOrders),
      switchMap(() =>
        this.ordersApi.getOrders().pipe(
          map(orders => OrdersActions.loadOrdersSuccess({ orders })),
          catchError(error =>
            of(OrdersActions.loadOrdersFailure({ error: error.message }))
          )
        )
      )
    )
  );

  createOrder$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OrdersActions.createOrder),
      concatMap(({ order }) =>  // concatMap: preserve order
        this.ordersApi.createOrder(order).pipe(
          map(created => OrdersActions.createOrderSuccess({ order: created })),
          catchError(error =>
            of(OrdersActions.loadOrdersFailure({ error: error.message }))
          )
        )
      )
    )
  );

  // Non-dispatching effect — side effect only
  showSuccessToast$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OrdersActions.createOrderSuccess),
      tap(() => this.toastService.success('Order created successfully'))
    ),
    { dispatch: false }  // Must specify — no action dispatched
  );

  constructor(
    private actions$: Actions,
    private ordersApi: OrdersApiService,
    private toastService: ToastService
  ) {}
}
```

**Operator choice in effects:**
- `switchMap` — cancel previous request (load, search)
- `concatMap` — queue requests in order (create, update — order matters)
- `mergeMap` — parallel execution (delete multiple, fire and forget)
- `exhaustMap` — ignore new while processing (login button)

---

## 4. Entity Adapter (For Collections)

When managing a collection of items (products, orders, users), `EntityAdapter` eliminates boilerplate and provides normalized state.

### Setup

```typescript
// features/products/store/products.state.ts
import { EntityState, createEntityAdapter } from '@ngrx/entity';

export interface Product {
  id: string;
  name: string;
  price: number;
  categoryId: string;
}

export interface ProductsState extends EntityState<Product> {
  // EntityState adds: ids: string[], entities: { [id: string]: Product }
  loading: boolean;
  selectedId: string | null;
}

export const productsAdapter = createEntityAdapter<Product>({
  selectId: product => product.id,
  sortComparer: (a, b) => a.name.localeCompare(b.name)
});

export const initialState: ProductsState = productsAdapter.getInitialState({
  loading: false,
  selectedId: null
});
```

### Reducer with Entity Adapter

```typescript
export const productsReducer = createReducer(
  initialState,

  on(ProductsActions.loadProductsSuccess, (state, { products }) =>
    productsAdapter.setAll(products, { ...state, loading: false })
  ),

  on(ProductsActions.addProduct, (state, { product }) =>
    productsAdapter.addOne(product, state)
  ),

  on(ProductsActions.updateProduct, (state, { product }) =>
    productsAdapter.updateOne(
      { id: product.id, changes: product },
      state
    )
  ),

  on(ProductsActions.removeProduct, (state, { id }) =>
    productsAdapter.removeOne(id, state)
  )
);
```

### Entity Adapter Methods

| Method | Action |
|--------|--------|
| `setAll(entities, state)` | Replace entire collection |
| `addOne(entity, state)` | Add one item |
| `addMany(entities, state)` | Add multiple |
| `updateOne({ id, changes }, state)` | Partial update |
| `upsertOne(entity, state)` | Add or replace |
| `removeOne(id, state)` | Remove by ID |
| `removeAll(state)` | Clear collection |

### Entity Selectors

```typescript
const { selectAll, selectEntities, selectIds, selectTotal } =
  productsAdapter.getSelectors();

const selectProductsState = createFeatureSelector<ProductsState>('products');

export const selectAllProducts = createSelector(selectProductsState, selectAll);
export const selectProductEntities = createSelector(selectProductsState, selectEntities);
export const selectTotalProducts = createSelector(selectProductsState, selectTotal);

export const selectProductById = (id: string) => createSelector(
  selectProductEntities,
  entities => entities[id] ?? null
);
```

---

## 5. The Facade Pattern

The Facade pattern wraps store access behind a service. Components never directly inject `Store`.

### Why Use Facade?

Without Facade:
- Every component imports `Store`, `selectAllOrders`, `OrdersActions`
- Changing store structure = updating every component
- Components are tightly coupled to NgRx implementation

With Facade:
- Components inject `OrdersFacade` — a clean API
- If you switch from NgRx to Signals store later → only Facade changes
- Components are completely decoupled from state implementation

### Implementation

```typescript
// features/orders/store/orders.facade.ts
@Injectable({ providedIn: 'root' })
export class OrdersFacade {
  // Selectors as Observable properties
  orders$ = this.store.select(selectAllOrders);
  loading$ = this.store.select(selectOrdersLoading);
  error$ = this.store.select(selectOrdersError);
  selectedOrder$ = this.store.select(selectSelectedOrder);
  pendingOrders$ = this.store.select(selectPendingOrders);

  // Signals version (Angular 17+)
  orders = toSignal(this.orders$, { initialValue: [] });
  loading = toSignal(this.loading$, { initialValue: false });

  constructor(private store: Store) {}

  // Action dispatchers as methods
  loadOrders(): void {
    this.store.dispatch(OrdersActions.loadOrders());
  }

  selectOrder(id: string): void {
    this.store.dispatch(OrdersActions.selectOrder({ id }));
  }

  createOrder(order: Omit<Order, 'id'>): void {
    this.store.dispatch(OrdersActions.createOrder({ order }));
  }

  deleteOrder(id: string): void {
    this.store.dispatch(OrdersActions.deleteOrder({ id }));
  }
}
```

### Component Using Facade

```typescript
// Component is completely decoupled from NgRx
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (facade.loading()) {
      <div class="spinner-border text-primary"></div>
    } @else {
      <app-orders-table
        [orders]="facade.orders()"
        (orderSelected)="facade.selectOrder($event)"
        (orderDeleted)="facade.deleteOrder($event)"
      />
    }
  `
})
export class OrdersPageComponent implements OnInit {
  facade = inject(OrdersFacade);

  ngOnInit() {
    this.facade.loadOrders();
  }
}
```

**Interview discussion:** "Facade vs direct Store?"
- Facade = abstraction + testability + decoupling
- Direct Store = simpler, less indirection, fine for small apps
- Product company with large team → Facade is preferred

---

## 6. Memoized Selectors — Deep Internals

```typescript
export const selectFilteredOrders = createSelector(
  selectAllOrders,           // Input 1
  selectStatusFilter,        // Input 2
  (orders, filter) => {      // Projector function
    console.log('Selector ran'); // Only logs when inputs change
    return orders.filter(o => o.status === filter);
  }
);
```

**How memoization works:**
1. Selector caches last input values (`orders`, `filter`)
2. On each state change, it checks: "did these inputs change?"
3. If no → return cached output (same reference)
4. If yes → run projector, cache new result

**Why the same reference matters:**
- `async` pipe uses `distinctUntilChanged` internally
- Same reference = no emit = no CD triggered
- Prevents unnecessary renders even when state changes in unrelated parts

---

## 7. NgRx with Router State

```typescript
// app.config.ts
providers: [
  provideRouter(routes),
  provideStore({ router: routerReducer }),
  provideRouterStore()
]
```

```typescript
// Select current URL
export const selectCurrentUrl = createSelector(
  selectRouter,
  router => router?.state?.url
);

// Select route params
export const selectOrderIdFromRoute = createSelector(
  selectRouteParams,
  params => params['id']
);
```

Use router state in store when:
- Effects need current route info to load data
- You want browser back/forward to dispatch actions
- Deep linking with state

---

## 8. Performance Pitfalls in NgRx

### Pitfall 1 — Storing Derived Data

```typescript
// WRONG — storing computed data
interface BadState {
  orders: Order[];
  totalRevenue: number;     // Should be a selector
  pendingCount: number;     // Should be a selector
  processedOrders: Order[]; // Should be a selector
}

// CORRECT — store raw data, derive via selectors
interface GoodState {
  orders: Order[];
}
export const selectTotalRevenue = createSelector(
  selectAllOrders,
  orders => orders.reduce((sum, o) => sum + o.total, 0)
);
```

### Pitfall 2 — Large Normalized State Without Entity Adapter

```typescript
// WRONG — flat array for large collections
orders: Order[];  // O(n) lookup for each find/update

// CORRECT — normalized with Entity Adapter
// entities: { [id: string]: Order }  — O(1) lookup
```

### Pitfall 3 — Deeply Nested State

```typescript
// WRONG — hard to update immutably, hard to select
interface BadState {
  user: {
    profile: {
      address: {
        city: string;  // Deep nesting
      }
    }
  }
}

// CORRECT — flat, normalized
interface GoodState {
  userId: string;
  userProfile: UserProfile;  // Flat
  userAddress: Address;      // Separate
}
```

### Pitfall 4 — Dispatching Actions in Loops

```typescript
// WRONG — dispatches 100 actions, triggers 100 CD cycles
items.forEach(item => this.store.dispatch(updateItem({ item })));

// CORRECT — one action, one CD cycle
this.store.dispatch(updateItems({ items }));
```

---

## 9. When NOT to Use NgRx

| Scenario | Better Solution |
|----------|----------------|
| Single component UI state | Component signal |
| Form values | ReactiveFormsModule |
| Small app (< 5 features) | Service + BehaviorSubject |
| Temporary loading state per API call | Component signal or service |
| Non-shared feature-local state | Service with signal |

> **Interview answer:** "When would you NOT use NgRx?"  
> For small apps, local UI state, form state, or scenarios where only one component needs the data. NgRx overhead is only worth it for shared, business-critical, auditable state that multiple features need.

---

## 10. NgRx DevTools Usage

```typescript
provideStoreDevtools({
  maxAge: 25,              // Keep last 25 actions
  logOnly: !isDevMode(),   // Production: log only, no time travel
  autoPause: true,         // Pause recording when window hidden
  trace: false,            // Expensive — enable only when debugging
  traceLimit: 75
})
```

Key DevTools features:
- **Time travel** — replay any previous state
- **Action log** — see every dispatched action
- **State diff** — see exactly what changed
- **Import/Export** — share state snapshots for debugging

---

## 11. Interview-Ready Answers

**"Why shouldn't we put everything in NgRx global store?"**

> Putting everything in the global store creates unnecessary coupling, increases memory usage, and makes change detection more expensive. Not all state needs to be globally shared — UI-only or ephemeral state should remain local to components. Overusing global store increases action noise, reducer complexity, and makes feature isolation harder. In large-scale applications, this reduces maintainability and slows development velocity. The right approach is: UI state in components, feature state in feature slices, cross-app state in root store.

**"What is the Facade pattern and when would you use it?"**

> The Facade pattern wraps NgRx store access behind a service that components inject instead of Store directly. It decouples components from the state management implementation — if I change from NgRx to Signals store, I only update the Facade, not every component. It also makes components easier to test since I mock the Facade rather than setting up a full store. I use it in team environments where multiple developers work on different features.

---

## Next Topic

→ [05-rxjs-deep-dive.md](05-rxjs-deep-dive.md) — Operator comparison, hot/cold observables, memory leak prevention, and modern patterns.
