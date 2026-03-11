# Chapter 07 — React Performance

## TL;DR

React's performance toolkit: `memo` prevents unnecessary re-renders, `useMemo`/`useCallback` memoize expensive values and stable references, `useTransition` marks updates as non-urgent (preserving INP), React Server Components (RSC) eliminate client-side JS for static content, and Suspense enables streaming and progressive loading.

> **One-liner for interviews:** "memo + useCallback prevent re-renders, useTransition keeps UI responsive during heavy updates, and RSC moves static components to the server — eliminating their JS from the client bundle entirely."

---

## Core Concept

React re-renders a component when its state or props change. The problem: re-renders cascade. A parent re-render causes all child re-renders — even children whose props didn't change. React's performance tools are fundamentally about controlling which components re-render and when.

---

## Deep Dive

### 1. React.memo — Prevent Unnecessary Re-renders

```tsx
// Without memo: OrderItem re-renders every time OrdersList renders
function OrderItem({ order }: { order: Order }) {
  return <div>{order.id}: {order.status}</div>;
}

// With memo: OrderItem only re-renders when order prop changes (shallow equality)
const OrderItem = React.memo(function OrderItem({ order }: { order: Order }) {
  return <div>{order.id}: {order.status}</div>;
});

// With custom comparison (for deep comparison or specific fields)
const OrderItem = React.memo(
  function OrderItem({ order }: { order: Order }) {
    return <div>{order.id}: {order.status}</div>;
  },
  (prevProps, nextProps) => prevProps.order.id === nextProps.order.id &&
                            prevProps.order.status === nextProps.order.status
);
```

**When `memo` is worth it:**
- Component renders frequently
- Component is expensive to render (complex DOM, heavy calculations)
- Props are usually the same between renders

**When `memo` is NOT worth it:**
- Component is trivial (a `<span>` or simple `<div>`)
- Props change every render anyway — memo comparison overhead for no gain
- Component is at the leaf of a rarely-updated tree

---

### 2. useCallback — Stable Function References

Functions defined inside a component are recreated on every render. If passed as props to `memo`-ized children, the memo is defeated because the function reference is always "new."

```tsx
// ❌ handleDelete is new on every OrdersList render → OrderItem's memo is useless
function OrdersList({ orders }: { orders: Order[] }) {
  const handleDelete = (id: string) => {
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  return orders.map(o => (
    <OrderItem key={o.id} order={o} onDelete={handleDelete} />
  ));
}

// ✅ useCallback memoizes handleDelete — same reference between renders
function OrdersList({ orders }: { orders: Order[] }) {
  const handleDelete = useCallback((id: string) => {
    setOrders(prev => prev.filter(o => o.id !== id));
  }, []);  // empty deps — no external deps, uses functional updater

  return orders.map(o => (
    <OrderItem key={o.id} order={o} onDelete={handleDelete} />
  ));
}
```

**Rule:** `useCallback` only makes sense on functions passed to `memo`-ized children or used in `useEffect`/`useMemo` dependency arrays. Don't use it everywhere.

---

### 3. useMemo — Memoize Expensive Computations

```tsx
// ❌ Expensive filter/sort runs on every render
function OrdersDashboard({ orders, filter }: Props) {
  const filteredOrders = orders
    .filter(o => o.status === filter)
    .sort((a, b) => b.total - a.total);

  return <OrdersList orders={filteredOrders} />;
}

// ✅ Only recalculates when orders or filter changes
function OrdersDashboard({ orders, filter }: Props) {
  const filteredOrders = useMemo(
    () => orders
      .filter(o => o.status === filter)
      .sort((a, b) => b.total - a.total),
    [orders, filter]
  );

  return <OrdersList orders={filteredOrders} />;
}
```

**When to use `useMemo`:**
- Genuinely expensive computation (sorting/filtering large arrays, complex transforms)
- Stable reference needed for `memo`-ized children or `useEffect` deps

**When NOT to use `useMemo`:**
- Cheap operations (`const value = a + b`) — the memoization overhead exceeds the savings
- Arrays/objects that aren't passed to memo-ized children — creating the object each render is fine

---

### 4. useTransition — Keep UI Responsive

`useTransition` marks a state update as "non-urgent" — React can interrupt it to handle urgent interactions first. This is the primary tool for keeping INP low during heavy renders.

```tsx
import { useState, useTransition, startTransition } from 'react';

function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;

    // Urgent: update the input immediately (high priority)
    setQuery(value);

    // Non-urgent: updating results can be deferred/interrupted
    startTransition(() => {
      setResults(searchProducts(value));  // expensive filter operation
    });
  }

  return (
    <>
      <input value={query} onChange={handleSearch} placeholder="Search..." />

      {isPending && <Spinner />}  {/* Show while transition is processing */}

      <ProductGrid products={results} />
    </>
  );
}
```

**`useDeferredValue` — for when you can't wrap the setter:**

```tsx
function SearchPage({ query }: { query: string }) {
  // Deferred value lags behind query during transitions
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(
    () => searchProducts(deferredQuery),
    [deferredQuery]
  );

  const isStale = query !== deferredQuery;  // true while transition is pending

  return (
    <div style={{ opacity: isStale ? 0.7 : 1 }}>
      <ProductGrid products={results} />
    </div>
  );
}
```

---

### 5. React Server Components (RSC)

RSC renders components on the server and sends HTML (or a serialized component tree) to the client — **without any JavaScript for that component in the client bundle**.

```
Traditional React (CSR):     Server → HTML shell → client downloads ALL JS → renders
RSC (Next.js App Router):    Server → renders server components → sends HTML + minimal JS
                                       Client components hydrate with their own JS only
```

```tsx
// app/orders/page.tsx — Server Component (default in App Router)
// This component: zero JS in client bundle, fetches on the server
async function OrdersPage() {
  // Direct DB or API call — no useEffect, no loading state
  const orders = await db.orders.findMany({ userId: currentUser.id });

  return (
    <div>
      <h1>Your Orders</h1>
      {/* OrdersSummary is also a Server Component — no JS sent to client */}
      <OrdersSummary orders={orders} />

      {/* 'use client' marks this as a Client Component — JS is sent to client */}
      <OrderFilters />
    </div>
  );
}

export default OrdersPage;
```

```tsx
// components/OrderFilters.tsx — Client Component (has interactivity)
'use client';

import { useState } from 'react';

export function OrderFilters() {
  const [activeFilter, setActiveFilter] = useState('all');
  // useState, useEffect, event handlers — all require 'use client'
  return (
    <div>
      <button onClick={() => setActiveFilter('shipped')}>Shipped</button>
    </div>
  );
}
```

**Key RSC rules:**
- Server Components: no hooks, no event handlers, no browser APIs — can be `async`
- Client Components: `'use client'` at top, can use all React features
- Server Components can import Client Components (boundary flows one way)
- Client Components CANNOT import Server Components

**RSC performance impact:**
- Server Component's JS is never shipped to the client
- Data fetching happens on the server — no client-side loading state needed
- Reduces hydration overhead significantly

---

### 6. Suspense — Streaming & Code Splitting

```tsx
// Suspense + lazy = code splitting with loading state
const OrderDetails = lazy(() => import('./OrderDetails'));

function App() {
  return (
    <Suspense fallback={<OrderDetailsSkeleton />}>
      <OrderDetails orderId={id} />
    </Suspense>
  );
}
```

**Suspense for data fetching (with RSC / libraries like SWR/React Query):**

```tsx
// Next.js App Router — Suspense as a streaming boundary
export default function Dashboard() {
  return (
    <>
      <h1>Dashboard</h1>

      {/* Fast component — renders immediately */}
      <QuickStats />

      {/* Slow component — streams in when its data resolves */}
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />   {/* async Server Component — slow DB query */}
      </Suspense>

      <Suspense fallback={<TableSkeleton />}>
        <RecentOrders />   {/* async Server Component — separate slow query */}
      </Suspense>
    </>
  );
}
```

Each `Suspense` boundary is an independent streaming boundary. `RevenueChart` and `RecentOrders` stream in independently — one fast DB query doesn't wait for a slow one.

---

### 7. Virtualization — Large Lists

Rendering 10,000 list items creates 10,000 DOM nodes — the DOM becomes slow to traverse and update.

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualOrdersList({ orders }: { orders: Order[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: orders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,    // estimated row height in px
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: virtualItem.start,
              height: virtualItem.size,
              width: '100%',
            }}
          >
            <OrderItem order={orders[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Rule of thumb:** Virtualize any list with more than 100 items that users scroll through.

---

### 8. React DevTools Profiler

```
1. Install React DevTools (Chrome extension)
2. Open DevTools → Profiler tab
3. Click Record
4. Perform the interaction you want to analyze
5. Stop recording
6. Examine:
   - Flamechart: which components rendered and how long
   - Ranked chart: sorted by render time
   - "Why did this render?" (hover a component) — shows which prop/state changed
```

**Using the Profiler API in code:**

```tsx
import { Profiler } from 'react';

function onRenderCallback(id, phase, actualDuration, baseDuration) {
  console.log(`${id} [${phase}] actual: ${actualDuration}ms, base: ${baseDuration}ms`);
  // Send to analytics: actualDuration > 16ms = potential jank
}

<Profiler id="OrdersList" onRender={onRenderCallback}>
  <OrdersList orders={orders} />
</Profiler>
```

---

## Best Practices

- **Profile before optimizing.** The React Profiler shows exactly which components re-render and why. Don't add `memo` everywhere blindly.
- **`memo` + `useCallback` are a pair.** `memo` on a component is useless if its function props are recreated every render. Always use `useCallback` for functions passed to `memo`-ized children.
- **Use `useTransition` for non-urgent state updates.** Any update that triggers an expensive re-render (filtering, sorting, navigating) should be wrapped in `startTransition`.
- **Prefer RSC for static/data-fetching components.** In Next.js App Router, default to Server Components. Add `'use client'` only when you need hooks or event handlers.
- **Virtualize early.** Adding virtualization to a 10,000-item list later is a refactor. Design for it upfront when you know the list is large.

---

## Common Mistakes

❌ **`useMemo` everywhere "for performance"** — Memoization has overhead. For cheap computations, the comparison cost exceeds the savings. Profile first.

❌ **Forgetting `useCallback` for memo to work** — `const MemoChild = memo(Child)` is useless if you pass `onClick={() => handler()}` — new function every render.

❌ **`key={index}` on reordering lists** — Using array index as key causes React to reuse DOM nodes incorrectly when the array reorders. Use stable, unique IDs.

❌ **Mixing Client and Server Components carelessly** — Once you add `'use client'`, that subtree is entirely client-rendered. Don't import heavy Server Components inside Client Components.

❌ **Large context values causing widespread re-renders** — Every context consumer re-renders when the context value changes. Split contexts by update frequency: `AuthContext`, `ThemeContext`, `CartContext` separately.

---

## Interview Q&A

**Q: When would you use useMemo vs useCallback?**  
A: "`useMemo` for memoizing a computed value — a filtered array, a transformed object. `useCallback` for memoizing a function reference — specifically, functions passed as props to `memo`-ized children or used as `useEffect` dependencies. The common trap is using `useMemo` for functions or `useCallback` for values. They're different: `useCallback(fn, deps)` is shorthand for `useMemo(() => fn, deps)`."

**Q: What are React Server Components and how do they help performance?**  
A: "RSC renders components on the server and sends the result to the client — without shipping that component's JavaScript to the browser. A `ProductList` that fetches data and renders HTML sends zero JS to the client. Only Client Components — marked with `'use client'` — ship JS. This dramatically reduces bundle size and hydration overhead for content-heavy pages. The data-fetching also moves to the server, eliminating client-side loading states for initial render."

**Q: How does useTransition improve INP?**  
A: "It marks a state update as low-priority. React renders high-priority updates (the input keystroke) immediately, then works on the transition update (filtering 5,000 results) in the background — and can interrupt it if a new high-priority update arrives. From a CWV perspective: the input responds in <16ms (great INP), and the results update a fraction of a second later. Without `useTransition`, the browser would block the input response while computing the filter results — causing INP spikes."

**Q: What's the difference between React.memo and useMemo?**  
A: "`React.memo` wraps a component and prevents it from re-rendering if its props haven't changed — it's a component-level optimization. `useMemo` is a hook that memoizes a computed value inside a component — it's a computation optimization. They're complementary: `memo` prevents the component from re-rendering; `useMemo` prevents expensive calculations inside a component from re-running unnecessarily."

---

## Next Steps

- **Monitoring** → [08-monitoring-rum-synthetic.md](./08-monitoring-rum-synthetic.md) — measuring React INP improvements with field data
- **Performance Budgets** → [09-performance-budgets-ci.md](./09-performance-budgets-ci.md) — React bundle analysis in CI
- **Cheat Sheet** → [10-cheat-sheet-and-qa.md](./10-cheat-sheet-and-qa.md) — side-by-side Angular vs React performance patterns
