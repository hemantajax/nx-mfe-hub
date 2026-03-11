# 10 — Testing Strategy (Unit, Integration, E2E)

> **TL;DR:** Test smart components with a mock store, dumb components in isolation, services with HttpTestingController, and NgRx with `provideMockStore`. Use Playwright or Cypress for E2E. Focus on testing behaviour, not implementation details.

---

## 1. Testing Philosophy

```
Unit Tests        → Fast, isolated, test one thing
Integration Tests → Test component + service interaction
E2E Tests         → Full user flow, slow but high confidence

                Test Pyramid
                    /\
                   /E2E\     (few — expensive)
                  /------\
                /Integrat. \  (some — medium)
               /-------------\
              /  Unit Tests    \  (many — fast)
             -------------------
```

**Angular testing principle:**
- Dumb components: test rendering behaviour with `@Input`/`@Output`
- Smart components: test with mock store, no real HTTP
- Services: test with `HttpClientTestingModule`
- NgRx: test reducers as pure functions, effects with `TestScheduler`

---

## 2. Component Testing — Dumb (Presentational)

```typescript
// orders-table.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrdersTableComponent } from './orders-table.component';
import { By } from '@angular/platform-browser';

describe('OrdersTableComponent', () => {
  let component: OrdersTableComponent;
  let fixture: ComponentFixture<OrdersTableComponent>;

  const mockOrders: Order[] = [
    { id: '1', customerName: 'Alice', total: 150, status: 'pending' },
    { id: '2', customerName: 'Bob', total: 280, status: 'shipped' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrdersTableComponent] // Standalone — just import it
    }).compileComponents();

    fixture = TestBed.createComponent(OrdersTableComponent);
    component = fixture.componentInstance;
  });

  it('should render orders in table rows', () => {
    component.orders = mockOrders;
    fixture.detectChanges();

    const rows = fixture.debugElement.queryAll(By.css('tr[data-order-row]'));
    expect(rows.length).toBe(2);
  });

  it('should display order customer name', () => {
    component.orders = mockOrders;
    fixture.detectChanges();

    const firstRow = fixture.debugElement.query(By.css('tr[data-order-row]:first-child'));
    expect(firstRow.nativeElement.textContent).toContain('Alice');
  });

  it('should emit orderSelected when row clicked', () => {
    component.orders = mockOrders;
    fixture.detectChanges();

    spyOn(component.orderSelected, 'emit');

    const firstRow = fixture.debugElement.query(By.css('tr[data-order-row]:first-child'));
    firstRow.triggerEventHandler('click', null);

    expect(component.orderSelected.emit).toHaveBeenCalledWith('1');
  });

  it('should show spinner when loading is true', () => {
    component.loading = true;
    fixture.detectChanges();

    const spinner = fixture.debugElement.query(By.css('.spinner-border'));
    expect(spinner).toBeTruthy();
  });

  it('should not render table when loading', () => {
    component.loading = true;
    fixture.detectChanges();

    const table = fixture.debugElement.query(By.css('table'));
    expect(table).toBeNull();
  });
});
```

---

## 3. Component Testing — Smart (With NgRx Mock Store)

```typescript
// orders-page.component.spec.ts
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrdersPageComponent } from './orders-page.component';
import { selectAllOrders, selectOrdersLoading } from '../store/orders.selectors';
import { OrdersActions } from '../store/orders.actions';

describe('OrdersPageComponent', () => {
  let component: OrdersPageComponent;
  let fixture: ComponentFixture<OrdersPageComponent>;
  let store: MockStore;

  const initialState = {
    orders: { orders: [], loading: false, error: null, selectedOrderId: null }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrdersPageComponent],
      providers: [
        provideMockStore({
          initialState,
          selectors: [
            { selector: selectAllOrders, value: [] },
            { selector: selectOrdersLoading, value: false }
          ]
        })
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(OrdersPageComponent);
    component = fixture.componentInstance;
  });

  it('should dispatch loadOrders on init', () => {
    spyOn(store, 'dispatch');
    fixture.detectChanges();

    expect(store.dispatch).toHaveBeenCalledWith(OrdersActions.loadOrders());
  });

  it('should render orders from store', () => {
    const mockOrders = [{ id: '1', customerName: 'Alice', total: 150 }];

    store.overrideSelector(selectAllOrders, mockOrders);
    store.refreshState();
    fixture.detectChanges();

    const tableComponent = fixture.debugElement.query(By.directive(OrdersTableComponent));
    expect(tableComponent.componentInstance.orders).toEqual(mockOrders);
  });

  it('should dispatch selectOrder when order clicked', () => {
    spyOn(store, 'dispatch');
    component.onOrderSelected('1');

    expect(store.dispatch).toHaveBeenCalledWith(
      OrdersActions.selectOrder({ id: '1' })
    );
  });
});
```

---

## 4. Testing Services with HTTP

```typescript
// orders-api.service.spec.ts
import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import { OrdersApiService } from './orders-api.service';

describe('OrdersApiService', () => {
  let service: OrdersApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [OrdersApiService]
    });

    service = TestBed.inject(OrdersApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Ensure no unexpected requests
  });

  it('should fetch orders', () => {
    const mockOrders: Order[] = [
      { id: '1', customerName: 'Alice', total: 150, status: 'pending' }
    ];

    service.getOrders().subscribe(orders => {
      expect(orders).toEqual(mockOrders);
    });

    const req = httpMock.expectOne('/api/orders');
    expect(req.request.method).toBe('GET');
    req.flush(mockOrders); // Respond with mock data
  });

  it('should send auth header', () => {
    service.getOrders().subscribe();

    const req = httpMock.expectOne('/api/orders');
    expect(req.request.headers.has('Authorization')).toBeTrue();
  });

  it('should handle HTTP error', () => {
    service.getOrders().subscribe({
      error: (err) => expect(err.status).toBe(500)
    });

    const req = httpMock.expectOne('/api/orders');
    req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
  });
});
```

---

## 5. Testing NgRx Reducers

Reducers are pure functions — easiest to test:

```typescript
// orders.reducer.spec.ts
import { ordersReducer } from './orders.reducer';
import { OrdersActions } from './orders.actions';
import { initialState } from './orders.state';

describe('ordersReducer', () => {
  it('should set loading to true on loadOrders', () => {
    const action = OrdersActions.loadOrders();
    const state = ordersReducer(initialState, action);

    expect(state.loading).toBeTrue();
    expect(state.error).toBeNull();
  });

  it('should populate orders on loadOrdersSuccess', () => {
    const orders = [{ id: '1', customerName: 'Alice', total: 150 }];
    const action = OrdersActions.loadOrdersSuccess({ orders });
    const state = ordersReducer(initialState, action);

    expect(state.orders).toEqual(orders);
    expect(state.loading).toBeFalse();
  });

  it('should set error on loadOrdersFailure', () => {
    const action = OrdersActions.loadOrdersFailure({ error: 'Not found' });
    const state = ordersReducer(initialState, action);

    expect(state.error).toBe('Not found');
    expect(state.loading).toBeFalse();
  });

  it('should be immutable — return new reference', () => {
    const action = OrdersActions.loadOrders();
    const state = ordersReducer(initialState, action);

    expect(state).not.toBe(initialState); // Different reference
  });
});
```

---

## 6. Testing NgRx Selectors

```typescript
// orders.selectors.spec.ts
import { selectPendingOrders, selectSelectedOrder } from './orders.selectors';

describe('ordersSelectors', () => {
  const state = {
    orders: {
      orders: [
        { id: '1', status: 'pending', total: 100 },
        { id: '2', status: 'shipped', total: 200 },
        { id: '3', status: 'pending', total: 300 }
      ],
      selectedOrderId: '2',
      loading: false,
      error: null
    }
  };

  it('should select only pending orders', () => {
    const result = selectPendingOrders.projector(state.orders.orders);
    expect(result.length).toBe(2);
    expect(result.every(o => o.status === 'pending')).toBeTrue();
  });

  it('should select order by selectedOrderId', () => {
    const result = selectSelectedOrder.projector(
      state.orders.orders,
      state.orders.selectedOrderId
    );
    expect(result?.id).toBe('2');
  });

  it('should return null if no order selected', () => {
    const result = selectSelectedOrder.projector(state.orders.orders, null);
    expect(result).toBeNull();
  });
});
```

---

## 7. Testing NgRx Effects

```typescript
// orders.effects.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError } from 'rxjs';
import { OrdersEffects } from './orders.effects';
import { OrdersApiService } from '../services/orders-api.service';
import { OrdersActions } from './orders.actions';

describe('OrdersEffects', () => {
  let effects: OrdersEffects;
  let actions$ = new Observable<Action>();
  let ordersApi: jasmine.SpyObj<OrdersApiService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OrdersEffects,
        provideMockActions(() => actions$),
        {
          provide: OrdersApiService,
          useValue: jasmine.createSpyObj('OrdersApiService', ['getOrders'])
        }
      ]
    });

    effects = TestBed.inject(OrdersEffects);
    ordersApi = TestBed.inject(OrdersApiService) as any;
  });

  it('should dispatch loadOrdersSuccess on successful load', done => {
    const mockOrders = [{ id: '1', customerName: 'Alice' }];
    ordersApi.getOrders.and.returnValue(of(mockOrders));
    actions$ = of(OrdersActions.loadOrders());

    effects.loadOrders$.subscribe(action => {
      expect(action).toEqual(OrdersActions.loadOrdersSuccess({ orders: mockOrders }));
      done();
    });
  });

  it('should dispatch loadOrdersFailure on error', done => {
    ordersApi.getOrders.and.returnValue(throwError(() => new Error('API Error')));
    actions$ = of(OrdersActions.loadOrders());

    effects.loadOrders$.subscribe(action => {
      expect(action).toEqual(
        OrdersActions.loadOrdersFailure({ error: 'API Error' })
      );
      done();
    });
  });
});
```

---

## 8. Testing Signals

```typescript
// cart.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { CartComponent } from './cart.component';

describe('CartComponent with Signals', () => {
  let component: CartComponent;
  let fixture: ComponentFixture<CartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CartComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should update itemCount signal when item added', () => {
    expect(component.itemCount()).toBe(0);

    component.addItem({ id: '1', name: 'Product', price: 100, qty: 1 });
    fixture.detectChanges();

    expect(component.itemCount()).toBe(1);
  });

  it('should recompute total when quantity changes', () => {
    component.addItem({ id: '1', name: 'Product', price: 100, qty: 2 });
    fixture.detectChanges();

    expect(component.total()).toBe(200);
  });
});
```

---

## 9. Testing `@defer` Blocks

Angular provides `DeferBlockBehavior` to control defer in tests:

```typescript
import { DeferBlockBehavior, DeferBlockState } from '@angular/core/testing';

describe('DashboardComponent defer blocks', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual // Control manually
    }).compileComponents();
  });

  it('should show placeholder initially', async () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    // Check placeholder is showing
    expect(fixture.nativeElement.textContent).toContain('Loading chart...');
  });

  it('should show chart after defer completes', async () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    // Manually trigger the deferred block
    const deferBlocks = await fixture.getDeferBlocks();
    await deferBlocks[0].render(DeferBlockState.Complete);
    fixture.detectChanges();

    // Chart component should now be rendered
    const chart = fixture.debugElement.query(By.directive(RevenueChartComponent));
    expect(chart).toBeTruthy();
  });

  it('should show error state when defer fails', async () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    const deferBlocks = await fixture.getDeferBlocks();
    await deferBlocks[0].render(DeferBlockState.Error);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Failed to load');
  });
});
```

---

## 10. E2E Testing with Playwright

```bash
# Install Playwright
npm init playwright@latest

# Or with Nx
nx g @nx/playwright:init
```

```typescript
// e2e/orders.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Orders Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/auth/login');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-btn"]');
    await page.waitForURL('/dashboard');
  });

  test('should display orders list', async ({ page }) => {
    await page.goto('/orders');

    // Wait for orders to load
    await page.waitForSelector('[data-testid="orders-table"]');

    const rows = page.locator('[data-testid="order-row"]');
    await expect(rows).toHaveCount.greaterThan(0);
  });

  test('should navigate to order detail on click', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForSelector('[data-testid="order-row"]');

    await page.click('[data-testid="order-row"]:first-child');

    await expect(page).toHaveURL(/\/orders\/\w+/);
    await expect(page.locator('[data-testid="order-detail"]')).toBeVisible();
  });

  test('should create a new order', async ({ page }) => {
    await page.goto('/orders/new');

    await page.fill('[data-testid="customer-name"]', 'Test Customer');
    await page.selectOption('[data-testid="product-select"]', 'product-1');
    await page.fill('[data-testid="quantity"]', '2');
    await page.click('[data-testid="submit-btn"]');

    await expect(page.locator('.alert-success')).toBeVisible();
    await expect(page).toHaveURL('/orders');
  });
});
```

### Test Data Attributes Convention

```html
<!-- Use data-testid for stable test selectors (not classes/IDs that may change) -->
<table data-testid="orders-table">
  <tr
    *ngFor="let order of orders; track order.id"
    data-testid="order-row"
    [attr.data-order-id]="order.id"
  >
    <td>{{ order.customerName }}</td>
  </tr>
</table>
```

---

## 11. Testing Coverage Configuration

```json
// angular.json
"test": {
  "options": {
    "codeCoverage": true,
    "codeCoverageExclude": [
      "src/app/**/*.spec.ts",
      "src/app/app.config.ts",
      "src/app/app.routes.ts",
      "src/main.ts"
    ]
  }
}
```

**Sensible coverage targets:**
- Services: 90%+
- Reducers: 95%+ (pure functions, easy to test)
- Selectors: 90%+
- Components: 70-80% (avoid testing implementation details)
- Effects: 80%+

---

## 12. Interview-Ready Answers

**"How do you test a component that uses NgRx?"**

> I use `provideMockStore` from `@ngrx/store/testing`. It creates a mock store where I can override selector values with `overrideSelector()` and spy on `store.dispatch` to verify actions. Smart components are tested by providing initial state, verifying that `dispatch` is called on lifecycle hooks, and mocking selector emissions. Dumb components are tested in complete isolation with just `@Input()` values — no store needed.

**"What is your testing strategy for Angular applications?"**

> I follow the test pyramid: many fast unit tests for reducers, selectors, and services; integration tests for smart components with mock stores; and a focused set of E2E tests for critical user flows using Playwright. I avoid testing implementation details — instead I test observable behaviour: "given this input/state, does the component render correctly and emit the right events." I use `data-testid` attributes for stable E2E selectors and set coverage thresholds in CI to prevent regressions.

---

## Next Topic

→ [11-ai-angular-mcp.md](11-ai-angular-mcp.md) — How to use modern AI tools, MCP, and llm.txt to supercharge your Angular development workflow.
