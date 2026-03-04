# 04b — NgRx Data (Zero-Boilerplate CRUD)

> **TL;DR:** NgRx Data sits on top of NgRx Entity and eliminates 90%+ of the boilerplate for standard CRUD operations. You define the entity, configure a metadata map, and get a fully-functional `EntityCollectionService` with loading, error handling, caching, and optimistic/pessimistic update strategies — all without writing actions, reducers, effects, or selectors.

---

## 1. The Problem — CRUD Boilerplate Explosion

For **every** entity in a standard NgRx setup, you must write:

| Artifact | Files / Lines |
|----------|--------------|
| Actions | `loadX`, `loadXSuccess`, `loadXFailure`, `addX`, `updateX`, `deleteX` — ~12 actions |
| Reducer | `on()` handler for each action — ~60 lines |
| Effects | HTTP call + map/catchError per action — ~80 lines |
| Selectors | `selectAll`, `selectById`, `selectLoading`, `selectError` — ~30 lines |
| Facade | Wrapping store dispatch + select — ~40 lines |

**Per entity: ~220+ lines across 5 files.**

If your app has 10 entities (users, orders, products, categories, invoices, etc.), that's **2,200+ lines of near-identical boilerplate** before you write any feature logic.

NgRx Data reduces each entity to **~10 lines of config**.

---

## 2. What NgRx Data Gives You for Free

For each registered entity, NgRx Data auto-generates:

- **Actions** — `QUERY_ALL`, `QUERY_BY_KEY`, `SAVE_ADD_ONE`, `SAVE_UPDATE_ONE`, `SAVE_DELETE_ONE`, and 40+ more
- **Reducer** — handles loading, loaded, error, and entity collection state
- **Effects** — `EntityEffects` handles all HTTP calls via `DefaultDataService`
- **Selectors** — `entities$`, `loading$`, `loaded$`, `errors$`, `count$`, `entityMap$`, and more
- **HTTP service** — `DefaultDataService<T>` with configurable base URL
- **Change tracking** — tracks original values for undo/revert
- **Optimistic & pessimistic strategies** — configurable per entity or per operation

---

## 3. Setup

### Install

```bash
npm install @ngrx/data
```

### Register in App Config

```typescript
// app.config.ts
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideEntityData, withEffects } from '@ngrx/data';
import { entityConfig } from './entity-metadata';

export const appConfig: ApplicationConfig = {
  providers: [
    provideStore(),
    provideEffects(),
    provideEntityData(entityConfig, withEffects())
  ]
};
```

### Entity Metadata Map

```typescript
// entity-metadata.ts
import { EntityMetadataMap, EntityDataModuleConfig } from '@ngrx/data';

const entityMetadata: EntityMetadataMap = {
  Product: {
    sortComparer: (a, b) => a.name.localeCompare(b.name),
    filterFn: (entities, pattern) =>
      entities.filter(e => e.name.toLowerCase().includes(pattern.toLowerCase()))
  },
  Order: {
    sortComparer: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  },
  Customer: {},
  Category: {}
};

const pluralNames = {
  Category: 'Categories'  // Override default pluralization (Category → Categorys → Categories)
};

export const entityConfig: EntityDataModuleConfig = {
  entityMetadata,
  pluralNames
};
```

That's it. Four entities registered in **~20 lines**. Manually, this would be 800+ lines.

---

## 4. EntityCollectionService — The Core API

Every entity gets a service that extends `EntityCollectionServiceBase<T>`.

### Auto-Generated Service (Zero Code)

```typescript
// product-list.component.ts
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading$ | async) {
      <div class="spinner-border text-primary"></div>
    }
    @for (product of products$ | async; track product.id) {
      <div class="card mb-2 p-3">
        <h5>{{ product.name }}</h5>
        <p>{{ product.price | currency }}</p>
        <button class="btn btn-sm btn-danger" (click)="delete(product)">Delete</button>
      </div>
    } @empty {
      <p class="text-muted">No products found.</p>
    }
  `
})
export class ProductListComponent implements OnInit {
  private productService = inject(EntityCollectionService<Product>);

  products$ = this.productService.entities$;
  loading$ = this.productService.loading$;

  constructor(private serviceFactory: EntityCollectionServiceFactory) {
    this.productService = serviceFactory.create<Product>('Product');
  }

  ngOnInit() {
    this.productService.getAll();   // HTTP GET /api/products
  }

  delete(product: Product) {
    this.productService.delete(product.id);  // HTTP DELETE /api/products/:id
  }
}
```

### Custom Service (Recommended Pattern)

```typescript
// services/product-entity.service.ts
@Injectable({ providedIn: 'root' })
export class ProductEntityService extends EntityCollectionServiceBase<Product> {
  constructor(factory: EntityCollectionServiceElementsFactory) {
    super('Product', factory);
  }

  // Add domain-specific methods
  getByCategory(categoryId: string): Observable<Product[]> {
    return this.entities$.pipe(
      map(products => products.filter(p => p.categoryId === categoryId))
    );
  }

  getExpensiveProducts(threshold: number): Observable<Product[]> {
    return this.entities$.pipe(
      map(products => products.filter(p => p.price > threshold))
    );
  }
}
```

### Full EntityCollectionService API

| Method | HTTP Verb | Description |
|--------|-----------|-------------|
| `getAll()` | GET `/api/products` | Fetch all entities |
| `getByKey(id)` | GET `/api/products/:id` | Fetch single entity |
| `getWithQuery(params)` | GET `/api/products?status=active` | Fetch with query params |
| `add(entity)` | POST `/api/products` | Create new entity |
| `update(entity)` | PUT `/api/products/:id` | Full update |
| `delete(id)` | DELETE `/api/products/:id` | Remove entity |
| `upsert(entity)` | PUT | Add or update |

### Observable Properties

| Property | Type | Description |
|----------|------|-------------|
| `entities$` | `Observable<T[]>` | All entities as array |
| `entityMap$` | `Observable<Dictionary<T>>` | Entities as ID-keyed map |
| `count$` | `Observable<number>` | Total count |
| `loading$` | `Observable<boolean>` | True during any HTTP operation |
| `loaded$` | `Observable<boolean>` | True after first successful load |
| `errors$` | `Observable<EntityAction>` | Error actions stream |
| `filter$` | `Observable<string>` | Current filter pattern |
| `filteredEntities$` | `Observable<T[]>` | Entities filtered by `filterFn` |

---

## 5. Custom DataService — Control the HTTP Layer

By default, NgRx Data uses `DefaultDataService<T>` which maps entities to REST endpoints:

```
GET    /api/products          → getAll()
GET    /api/products/:id      → getById()
POST   /api/products          → add()
PUT    /api/products/:id      → update()
DELETE /api/products/:id      → delete()
```

### Override When Your API Doesn't Follow REST Conventions

```typescript
// services/product-data.service.ts
@Injectable()
export class ProductDataService extends DefaultDataService<Product> {
  constructor(
    http: HttpClient,
    httpUrlGenerator: HttpUrlGenerator
  ) {
    super('Product', http, httpUrlGenerator);
  }

  // Your API returns { data: Product[] } instead of Product[]
  override getAll(): Observable<Product[]> {
    return this.http.get<{ data: Product[] }>('/api/v2/products').pipe(
      map(response => response.data)
    );
  }

  // Your API uses PATCH instead of PUT
  override update(update: Update<Product>): Observable<Product> {
    return this.http.patch<Product>(
      `/api/v2/products/${update.id}`,
      update.changes
    );
  }

  // Custom endpoint for filtered queries
  override getWithQuery(params: QueryParams | string): Observable<Product[]> {
    return this.http.get<{ data: Product[] }>('/api/v2/products/search', {
      params: params as any
    }).pipe(
      map(response => response.data)
    );
  }
}
```

### Register Custom DataService

```typescript
// app.config.ts or feature providers
providers: [
  {
    provide: ENTITY_DATA_SERVICE_TOKEN,
    useClass: ProductDataService,
    multi: true
  }
]

// OR register via EntityDataService in a component/service constructor
export class AppComponent {
  constructor(
    entityDataService: EntityDataService,
    productDataService: ProductDataService
  ) {
    entityDataService.registerService('Product', productDataService);
  }
}
```

### Configure Base URL

```typescript
// Globally
@Injectable()
export class CustomHttpUrlGenerator extends DefaultHttpUrlGenerator {
  constructor(pluralizer: Pluralizer) {
    super(pluralizer);
  }

  protected override getBaseUrl(entityName: string, root: string): string {
    return 'https://api.myapp.com/v2/';
  }
}

// Register
providers: [
  { provide: HttpUrlGenerator, useClass: CustomHttpUrlGenerator }
]
```

---

## 6. Optimistic vs Pessimistic Strategies

NgRx Data supports two update strategies that control **when** the cache is updated relative to the HTTP call.

### Pessimistic (Default)

```
User clicks "Save" → HTTP PUT sent → Wait for server response → Update cache → UI reflects change
```

- Cache updates **after** the server confirms success
- Safer — no inconsistency between client and server
- Slower perceived performance — user sees spinner while waiting

### Optimistic

```
User clicks "Save" → Cache updated immediately → UI reflects change → HTTP PUT sent in background
                                                                     ↳ If fails → revert cache + show error
```

- Cache updates **before** the server responds
- Faster perceived performance — instant UI feedback
- Riskier — requires rollback logic if server fails

### Configure Per Entity

```typescript
const entityMetadata: EntityMetadataMap = {
  Product: {
    entityDispatcherOptions: {
      optimisticAdd: false,      // Pessimistic create (wait for server-generated ID)
      optimisticUpdate: true,    // Optimistic update (instant UI feedback)
      optimisticDelete: true     // Optimistic delete (remove from list immediately)
    }
  }
};
```

### When to Use Which

| Operation | Recommended Strategy | Reason |
|-----------|---------------------|--------|
| **Add** | Pessimistic | Server generates ID; optimistic add creates temp ID complications |
| **Update** | Optimistic | User expects instant feedback; server rarely rejects valid updates |
| **Delete** | Optimistic | Immediate removal feels responsive; easy to re-add on failure |
| **Load** | Always pessimistic | You're fetching from server, nothing to "optimistically" cache |

---

## 7. Entity Cache Structure (DevTools View)

When you open Redux DevTools, the NgRx Data cache looks like:

```json
{
  "entityCache": {
    "Product": {
      "ids": ["p1", "p2", "p3"],
      "entities": {
        "p1": { "id": "p1", "name": "Widget", "price": 29.99 },
        "p2": { "id": "p2", "name": "Gadget", "price": 49.99 },
        "p3": { "id": "p3", "name": "Thingamajig", "price": 19.99 }
      },
      "filter": "",
      "loaded": true,
      "loading": false,
      "changeState": {}
    },
    "Order": {
      "ids": ["o1"],
      "entities": {
        "o1": { "id": "o1", "total": 99.98, "status": "pending" }
      },
      "filter": "",
      "loaded": true,
      "loading": false,
      "changeState": {}
    }
  }
}
```

Each entity collection maintains its own `ids`, `entities` dictionary (normalized), `loading`/`loaded` flags, `filter`, and `changeState` for tracking pending changes.

---

## 8. Change Tracking & Undo

NgRx Data tracks **original values** of entities that have been modified but not yet saved.

```typescript
@Injectable({ providedIn: 'root' })
export class ProductEntityService extends EntityCollectionServiceBase<Product> {
  constructor(factory: EntityCollectionServiceElementsFactory) {
    super('Product', factory);
  }

  // Check for unsaved changes
  hasUnsavedChanges(): Observable<boolean> {
    return this.changeState$.pipe(
      map(changeState => Object.keys(changeState).length > 0)
    );
  }

  // Revert all unsaved changes
  undoAll(): void {
    this.setChangeState({});
    this.getAll();  // Re-fetch from server
  }
}
```

The `changeState` map stores:

```typescript
{
  "p1": {
    changeType: ChangeType.Updated,
    originalValue: { id: "p1", name: "Old Name", price: 19.99 }
  }
}
```

This enables "discard changes" or "revert" functionality without extra code.

---

## 9. Guards & Resolvers with NgRx Data

### Preload Data Before Route Activation

```typescript
// guards/products.guard.ts
export const productsGuard: CanActivateFn = () => {
  const productService = inject(ProductEntityService);

  return productService.loaded$.pipe(
    take(1),
    switchMap(loaded => {
      if (!loaded) {
        productService.getAll();
        return productService.loaded$.pipe(
          filter(loaded => loaded),
          take(1),
          map(() => true)
        );
      }
      return of(true);
    })
  );
};

// routes
export const productRoutes: Routes = [
  {
    path: 'products',
    canActivate: [productsGuard],
    component: ProductsPageComponent
  }
];
```

The guard ensures data is loaded exactly once. Subsequent navigations skip the HTTP call because `loaded$` is already `true`.

---

## 10. Complete CRUD Example — Side-by-Side Comparison

### Without NgRx Data (Manual NgRx) — ~220 lines across 5 files

```typescript
// 1. actions (30 lines)
export const ProductsActions = createActionGroup({
  source: 'Products',
  events: {
    'Load Products': emptyProps(),
    'Load Products Success': props<{ products: Product[] }>(),
    'Load Products Failure': props<{ error: string }>(),
    'Add Product': props<{ product: Product }>(),
    'Add Product Success': props<{ product: Product }>(),
    'Add Product Failure': props<{ error: string }>(),
    'Update Product': props<{ product: Update<Product> }>(),
    'Update Product Success': props<{ product: Product }>(),
    'Delete Product': props<{ id: string }>(),
    'Delete Product Success': props<{ id: string }>(),
  }
});

// 2. reducer (40 lines)
export const productsReducer = createReducer(
  initialState,
  on(ProductsActions.loadProducts, state => ({ ...state, loading: true })),
  on(ProductsActions.loadProductsSuccess, (state, { products }) =>
    adapter.setAll(products, { ...state, loading: false })
  ),
  on(ProductsActions.loadProductsFailure, (state, { error }) =>
    ({ ...state, error, loading: false })
  ),
  on(ProductsActions.addProductSuccess, (state, { product }) =>
    adapter.addOne(product, state)
  ),
  on(ProductsActions.updateProductSuccess, (state, { product }) =>
    adapter.updateOne({ id: product.id, changes: product }, state)
  ),
  on(ProductsActions.deleteProductSuccess, (state, { id }) =>
    adapter.removeOne(id, state)
  )
);

// 3. effects (60 lines)
@Injectable()
export class ProductsEffects {
  load$ = createEffect(() => this.actions$.pipe(
    ofType(ProductsActions.loadProducts),
    switchMap(() => this.api.getAll().pipe(
      map(products => ProductsActions.loadProductsSuccess({ products })),
      catchError(e => of(ProductsActions.loadProductsFailure({ error: e.message })))
    ))
  ));
  add$ = createEffect(() => this.actions$.pipe(
    ofType(ProductsActions.addProduct),
    concatMap(({ product }) => this.api.create(product).pipe(
      map(p => ProductsActions.addProductSuccess({ product: p })),
      catchError(e => of(ProductsActions.addProductFailure({ error: e.message })))
    ))
  ));
  // ... update, delete effects ...
  constructor(private actions$: Actions, private api: ProductsApiService) {}
}

// 4. selectors (20 lines)
const selectProductsState = createFeatureSelector<ProductsState>('products');
export const selectAllProducts = createSelector(selectProductsState, selectAll);
export const selectProductsLoading = createSelector(selectProductsState, s => s.loading);
// ... more selectors ...

// 5. facade (40 lines)
@Injectable({ providedIn: 'root' })
export class ProductsFacade {
  products$ = this.store.select(selectAllProducts);
  loading$ = this.store.select(selectProductsLoading);
  constructor(private store: Store) {}
  loadProducts() { this.store.dispatch(ProductsActions.loadProducts()); }
  addProduct(p: Product) { this.store.dispatch(ProductsActions.addProduct({ product: p })); }
  // ... more methods ...
}
```

### With NgRx Data — ~25 lines total

```typescript
// 1. entity-metadata.ts (5 lines for this entity)
const entityMetadata: EntityMetadataMap = {
  Product: {
    sortComparer: (a, b) => a.name.localeCompare(b.name)
  }
};

// 2. product-entity.service.ts (10 lines)
@Injectable({ providedIn: 'root' })
export class ProductEntityService extends EntityCollectionServiceBase<Product> {
  constructor(factory: EntityCollectionServiceElementsFactory) {
    super('Product', factory);
  }
}

// 3. component uses it directly (10 lines of state logic)
export class ProductsPageComponent implements OnInit {
  private productService = inject(ProductEntityService);

  products$ = this.productService.filteredEntities$;
  loading$ = this.productService.loading$;

  ngOnInit() { this.productService.getAll(); }

  add(product: Product) { this.productService.add(product); }
  update(product: Product) { this.productService.update(product); }
  delete(id: string) { this.productService.delete(id); }
}
```

**Result:** ~25 lines vs ~220 lines. Same functionality. Same DevTools support. Same normalized cache.

---

## 11. Filtering & Sorting

### Client-Side Filtering

```typescript
// entity-metadata.ts
const entityMetadata: EntityMetadataMap = {
  Product: {
    filterFn: (entities: Product[], pattern: string) => {
      const lower = pattern.toLowerCase();
      return entities.filter(p =>
        p.name.toLowerCase().includes(lower) ||
        p.category.toLowerCase().includes(lower)
      );
    },
    sortComparer: (a: Product, b: Product) => a.name.localeCompare(b.name)
  }
};
```

```typescript
// component
export class ProductsPageComponent {
  private productService = inject(ProductEntityService);
  filteredProducts$ = this.productService.filteredEntities$;

  onSearch(term: string) {
    this.productService.setFilter(term);
    // filteredEntities$ automatically re-emits with filterFn applied
  }
}
```

### Server-Side Filtering

```typescript
loadByCategory(categoryId: string) {
  this.productService.getWithQuery({ categoryId });
  // GET /api/products?categoryId=electronics
}

loadPaginated(page: number, size: number) {
  this.productService.getWithQuery({ page: String(page), size: String(size) });
  // GET /api/products?page=2&size=20
}
```

---

## 12. Multiple Entity Services in One Component

A real-world page often needs data from multiple entities.

```typescript
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <select class="form-select mb-3" (change)="filterByCategory($event)">
      <option value="">All Categories</option>
      @for (cat of categories$ | async; track cat.id) {
        <option [value]="cat.id">{{ cat.name }}</option>
      }
    </select>

    @for (product of products$ | async; track product.id) {
      <app-product-card [product]="product" (deleted)="deleteProduct($event)" />
    }
  `
})
export class ProductCatalogComponent implements OnInit {
  private productService = inject(ProductEntityService);
  private categoryService = inject(CategoryEntityService);

  products$ = this.productService.filteredEntities$;
  categories$ = this.categoryService.entities$;

  ngOnInit() {
    this.productService.getAll();
    this.categoryService.getAll();
  }

  filterByCategory(event: Event) {
    const categoryId = (event.target as HTMLSelectElement).value;
    this.productService.setFilter(categoryId);
  }

  deleteProduct(id: string) {
    this.productService.delete(id);
  }
}
```

---

## 13. Error Handling

### Global Error Handler

```typescript
@Injectable({ providedIn: 'root' })
export class EntityErrorHandler {
  constructor(private toastService: ToastService) {}

  handleError(error: EntityAction): void {
    const message = error.payload?.error?.message || 'An error occurred';
    this.toastService.danger(`${error.payload.entityName}: ${message}`);
  }
}
```

### Per-Operation Error Handling

```typescript
// In component
this.productService.add(newProduct).pipe(
  tap(() => this.toastService.success('Product created')),
  catchError(err => {
    this.toastService.danger('Failed to create product');
    return EMPTY;
  })
).subscribe();
```

NgRx Data operations return `Observable<T>` that completes on success or errors on failure — you can pipe onto them directly.

---

## 14. When to Use NgRx Data vs Manual NgRx

| Scenario | Use NgRx Data | Use Manual NgRx |
|----------|:---:|:---:|
| Standard CRUD entity | Yes | Overkill |
| Entity with complex side effects (workflows, multi-step) | Partial | Yes |
| Entity with server-generated IDs | Yes | Yes |
| Non-standard API (GraphQL, gRPC) | Custom DataService | Yes |
| State with no HTTP backing (UI state, local-only) | No | No (use signals) |
| 10+ CRUD entities in a large enterprise app | Absolutely | Boilerplate nightmare |
| Custom caching / polling logic | Custom DataService | Yes |
| Entity that needs WebSocket sync | Custom DataService | Yes |

**Rule of thumb:** If the entity follows a standard CRUD lifecycle backed by a REST API, use NgRx Data. If the entity has complex workflows, conditional logic, or non-standard persistence, use manual NgRx (or a hybrid).

---

## 15. Hybrid Approach — NgRx Data + Manual NgRx

You can use both in the same app. Standard CRUD entities use NgRx Data while complex domain entities use manual NgRx.

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideStore({ orders: ordersReducer }),       // Manual NgRx for complex entity
    provideEffects([OrdersEffects]),                // Manual effects
    provideEntityData(entityConfig, withEffects())  // NgRx Data for CRUD entities
  ]
};
```

The entity cache lives alongside your manual feature slices in the same store. DevTools shows both.

```
Store
├── orders (manual NgRx slice)
│   ├── ids, entities, loading, error
│   └── workflow-specific state (approval, fulfillment steps)
└── entityCache (NgRx Data)
    ├── Product { ids, entities, loaded, loading }
    ├── Customer { ids, entities, loaded, loading }
    └── Category { ids, entities, loaded, loading }
```

---

## 16. Interview-Ready Answers

**"What is NgRx Data and why would you use it?"**

> NgRx Data is a library built on top of NgRx Entity that auto-generates actions, reducers, effects, and selectors for standard CRUD entities. It eliminates the repetitive boilerplate of manual NgRx — instead of writing 200+ lines per entity, you configure ~10 lines of metadata and get a fully functional `EntityCollectionService` with loading states, error handling, caching, filtering, and both optimistic and pessimistic update strategies. I use it for standard REST-backed entities in enterprise apps and combine it with manual NgRx for entities that have complex workflows.

**"How does NgRx Data handle the HTTP layer?"**

> It provides a `DefaultDataService<T>` that maps entity operations to conventional REST endpoints. If my API doesn't follow REST conventions — returns wrapped responses, uses PATCH instead of PUT, or has a different URL structure — I create a custom data service that extends `DefaultDataService` and overrides specific methods. The entity collection service remains unchanged; only the HTTP layer is customized.

**"Optimistic vs pessimistic — when do you use which?"**

> Pessimistic updates wait for the server to confirm before updating the cache — safer but slower. Optimistic updates modify the cache immediately for instant UI feedback and revert on failure. I use pessimistic for creates (server generates the ID) and optimistic for updates and deletes where instant feedback improves UX. NgRx Data lets me configure this per entity and per operation type.

**"Can you mix NgRx Data with manual NgRx?"**

> Yes. In a large app, I use NgRx Data for standard CRUD entities like products, categories, and customers, while using manual NgRx for entities with complex domain logic like order workflows that have approval steps, state machines, or multi-entity side effects. Both share the same store and are visible in DevTools.

---

## Next Topic

→ [05-rxjs-deep-dive.md](05-rxjs-deep-dive.md) — Operator comparison, hot/cold observables, memory leak prevention, and modern patterns.
