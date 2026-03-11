# 01 — Enterprise React Architecture

> **TL;DR:** Use feature-based architecture with co-located components, hooks, and types. Compose via compound components and custom hooks — not HOCs. Enforce boundaries with a monorepo (Nx/Turborepo). Separate smart containers from dumb presentational components. Keep shared UI generic and business-logic-free.

---

## 1. Architecture Mindset — Think Like an Architect

In a senior/architect interview, you are expected to justify *why* you chose a structure, not just describe it.

Key principles:
- **Scalability** — Does it work with 40 developers and 300 features?
- **Maintainability** — Can a new developer ship on day 3?
- **Performance** — Does bundle size stay flat as features grow?
- **Team ownership** — Can squads own features end-to-end?
- **Extractability** — Can a feature become a micro-frontend tomorrow?

---

## 2. Feature-Based vs Layer-Based Architecture

### Layer-Based (Avoid in Enterprise)

```
src/
  components/      ← ALL components dumped here
  hooks/           ← ALL hooks here
  services/        ← ALL API calls here
  types/           ← ALL types here
  utils/
```

**Problems:**
- Unrelated features live side by side
- Folders grow into 200+ files — unnavigable
- No team ownership boundary
- Code splitting becomes manual and error-prone
- Extracting a feature requires touching every folder

### Feature-Based (Enterprise Standard)

```
src/
  features/
    auth/
    dashboard/
    orders/
    products/
```

**Why it wins:**
- Each feature is self-contained
- Teams own specific feature folders
- Lazy loading is natural — each route maps to a feature
- Micro-frontend extraction is straightforward
- Onboarding is faster — developers know where to look

---

## 3. Ideal Enterprise Folder Structure

```
src/
├── app/                            ← App shell (Next.js App Router or Vite entry)
│   ├── layout.tsx                  ← Root layout
│   ├── page.tsx                    ← Home page
│   ├── (auth)/                     ← Route group
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── dashboard/
│   │   ├── page.tsx
│   │   └── layout.tsx
│   └── orders/
│       ├── page.tsx
│       ├── [id]/page.tsx
│       └── layout.tsx
│
├── features/                       ← Business logic, co-located by domain
│   ├── auth/
│   │   ├── components/
│   │   │   ├── login-form.tsx
│   │   │   └── auth-guard.tsx
│   │   ├── hooks/
│   │   │   ├── use-login.ts
│   │   │   └── use-session.ts
│   │   ├── api/
│   │   │   └── auth-api.ts
│   │   ├── types/
│   │   │   └── auth.types.ts
│   │   └── index.ts                ← Public barrel export
│   │
│   ├── orders/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api/
│   │   ├── store/                  ← Feature-specific Zustand slice (if needed)
│   │   ├── types/
│   │   └── index.ts
│   │
│   └── dashboard/
│       └── (same pattern)
│
├── shared/                         ← Reusable UI — NO business logic
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── modal.tsx
│   │   ├── data-table.tsx
│   │   └── spinner.tsx
│   ├── hooks/
│   │   ├── use-debounce.ts
│   │   ├── use-media-query.ts
│   │   └── use-local-storage.ts
│   ├── utils/
│   │   ├── cn.ts                   ← className merge utility
│   │   ├── format-date.ts
│   │   └── validators.ts
│   └── types/
│       └── common.types.ts
│
├── core/                           ← Singleton cross-cutting concerns
│   ├── providers/
│   │   ├── query-provider.tsx      ← TanStack Query setup
│   │   ├── auth-provider.tsx
│   │   └── theme-provider.tsx
│   ├── config/
│   │   ├── env.ts
│   │   └── api-client.ts          ← Axios/fetch wrapper
│   ├── interceptors/
│   │   └── auth-interceptor.ts
│   └── constants.ts
│
└── lib/                            ← Third-party wrappers / adapters
    ├── analytics.ts
    └── sentry.ts
```

---

## 4. Core vs Shared vs Features — Know the Boundaries

This distinction separates senior from mid-level developers.

### Core — Singleton Infrastructure

```typescript
// core/config/api-client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10_000,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

What belongs in Core:
- API client configuration
- Auth provider / session management
- TanStack Query provider setup
- Environment config
- Error boundary wrappers
- Analytics / logging initialization

> Rule: If only ONE instance should exist across the app → Core

### Shared — Reusable UI

```tsx
// shared/ui/button.tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
}

export function Button({ variant = 'primary', loading, children, ...props }: ButtonProps) {
  return (
    <button className={`btn btn-${variant}`} disabled={loading} {...props}>
      {loading ? <Spinner size="sm" /> : children}
    </button>
  );
}
```

What belongs in Shared:
- Generic UI components (Button, Modal, Table, Spinner)
- Generic hooks (`useDebounce`, `useMediaQuery`, `useLocalStorage`)
- Pure utility functions (`cn`, `formatDate`, `slugify`)
- Common TypeScript types

> Rule: If it has NO business logic and can be used in ANY feature → Shared

### What NEVER Goes in Shared
- API calls
- Business logic
- Feature-specific state
- Domain types (Order, User, Product)

---

## 5. Co-location Principle

Keep related code together. If a hook is only used by one feature, it lives inside that feature — not in a global `hooks/` folder.

```
features/orders/
  hooks/use-orders.ts       ← Only used by orders feature
  hooks/use-order-filters.ts

shared/hooks/
  use-debounce.ts           ← Used by 5+ features → promote to shared
```

**Promotion rule:** Code starts inside a feature. When 3+ features need it, promote to shared. Never pre-optimize placement.

---

## 6. Smart vs Dumb Components — Critical Pattern

### Smart Component (Container)

```tsx
// features/orders/components/orders-page.tsx
'use client';

import { useOrders } from '../hooks/use-orders';
import { OrdersTable } from './orders-table';
import { OrdersFilters } from './orders-filters';

export function OrdersPage() {
  const { data: orders, isLoading, error } = useOrders();
  const [filters, setFilters] = useState<OrderFilters>(defaultFilters);

  if (error) return <ErrorFallback error={error} />;

  return (
    <div>
      <OrdersFilters value={filters} onChange={setFilters} />
      <OrdersTable orders={orders ?? []} loading={isLoading} />
    </div>
  );
}
```

Smart component responsibilities:
- Fetches data (via hooks / TanStack Query)
- Manages local state
- Handles side effects (navigation, mutations)
- Passes data down as props
- Composes dumb components

### Dumb Component (Presentational)

```tsx
// features/orders/components/orders-table.tsx
interface OrdersTableProps {
  orders: Order[];
  loading: boolean;
}

export function OrdersTable({ orders, loading }: OrdersTableProps) {
  if (loading) return <Spinner />;

  return (
    <table className="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Customer</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id}>
            <td>{order.id}</td>
            <td>{order.customer}</td>
            <td>${order.total.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

Dumb component rules:
- Props in, JSX out — no data fetching, no side effects
- Highly testable in isolation
- Reusable across features
- Easy to snapshot / visual-regression test

> **Why this matters:** Dumb components are pure functions of their props. Smart components can be tested by mocking hooks.

---

## 7. Component Composition Patterns

### Compound Components

```tsx
// shared/ui/tabs.tsx
const TabsContext = createContext<TabsContextValue | null>(null);

export function Tabs({ defaultValue, children }: TabsProps) {
  const [active, setActive] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

Tabs.List = function TabsList({ children }: { children: ReactNode }) {
  return <div className="tabs-list" role="tablist">{children}</div>;
};

Tabs.Trigger = function TabsTrigger({ value, children }: TabsTriggerProps) {
  const { active, setActive } = useContext(TabsContext)!;
  return (
    <button
      role="tab"
      aria-selected={active === value}
      className={active === value ? 'tab active' : 'tab'}
      onClick={() => setActive(value)}
    >
      {children}
    </button>
  );
};

Tabs.Content = function TabsContent({ value, children }: TabsContentProps) {
  const { active } = useContext(TabsContext)!;
  if (active !== value) return null;
  return <div role="tabpanel">{children}</div>;
};
```

Usage:
```tsx
<Tabs defaultValue="details">
  <Tabs.List>
    <Tabs.Trigger value="details">Details</Tabs.Trigger>
    <Tabs.Trigger value="history">History</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="details"><OrderDetails /></Tabs.Content>
  <Tabs.Content value="history"><OrderHistory /></Tabs.Content>
</Tabs>
```

**Why compound components win:**
- Flexible composition — consumer controls layout
- Shared state via context — no prop drilling
- Each sub-component is independently testable

### Custom Hook Extraction (Preferred Over HOCs)

```tsx
// features/orders/hooks/use-orders.ts
export function useOrders(filters?: OrderFilters) {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: () => fetchOrders(filters),
    staleTime: 30_000,
  });
}
```

> **Interview answer:** "Do you use HOCs?"  
> "Rarely. Custom hooks compose better, are type-safe, and don't create wrapper hell. I reserve HOCs for cross-cutting decorator patterns like `withErrorBoundary`."

---

## 8. Monorepo Strategy

### When to Use a Monorepo

- 3+ apps sharing code (web, admin, mobile-web)
- Design system shared across teams
- Micro-frontend architecture
- Shared API types between frontend and backend

### Nx vs Turborepo

| Feature | Nx | Turborepo |
|---------|----|----|
| Task caching | Local + Nx Cloud | Local + Vercel Remote Cache |
| Dependency graph | Full project graph with visualization | Package-level task graph |
| Code generation | Built-in generators (`nx g`) | None (use tools like Plop) |
| Module boundaries | ESLint-based enforcement | None built-in |
| Framework support | Angular, React, Node, etc. | Framework-agnostic |
| Learning curve | Steeper | Minimal |
| Best for | Enterprise teams needing governance | Small-to-mid teams wanting speed |

### Nx Library Boundaries (Enforced)

```
libs/
  shared/
    ui/           ← type:ui, scope:shared
    utils/        ← type:util, scope:shared
    data-access/  ← type:data-access, scope:shared
  orders/
    feature/      ← type:feature, scope:orders
    ui/           ← type:ui, scope:orders
    data-access/  ← type:data-access, scope:orders
```

Rules:
- `scope:shared` → importable by everyone
- `scope:orders` → only importable by orders app and its own libs
- `type:ui` → cannot import `type:feature` or `type:data-access`
- `type:util` → leaf node, no upward imports

---

## 9. Barrel Exports — Public API per Feature

Every feature exposes a controlled public API via `index.ts`:

```typescript
// features/orders/index.ts
export { OrdersPage } from './components/orders-page';
export { useOrders } from './hooks/use-orders';
export type { Order, OrderFilters } from './types/order.types';
```

**Rules:**
- Only export what other features need
- Internal components stay internal
- Prevents deep imports like `features/orders/components/internal/order-row`
- ESLint can enforce barrel-only imports

---

## 10. Interview-Ready Answer Template

> "How do you design React architecture for a large enterprise app?"

**Strong answer:**

> I use feature-based architecture where each domain (orders, auth, dashboard) owns its components, hooks, API layer, and types — fully co-located. Shared UI lives separately with zero business logic. Core holds singleton infrastructure like API client config, auth providers, and TanStack Query setup. I enforce boundaries via Nx module boundary rules or ESLint import restrictions. Every feature is lazy-loaded at the route level. Components follow a smart/dumb split — containers fetch data and manage state, presentational components are pure props-in/JSX-out. For composition, I prefer compound components and custom hooks over HOCs. This gives us team independence, predictable bundle growth, and easy micro-frontend extraction when needed.

---

## 11. Scaling to 1M Users — Architect Answer

When asked "How would you design React for scale?":

**Frontend:**
- Route-based code splitting with `React.lazy` + Suspense
- Server Components for zero-JS initial payload on content pages
- CDN for static assets, edge rendering for dynamic pages
- Service Worker for offline + asset caching
- `startTransition` for non-blocking UI updates during heavy state changes
- Virtual scrolling for large data lists

**State:**
- Server state in TanStack Query — automatic caching, deduplication, background refresh
- Minimal global state (Zustand) — only truly cross-cutting concerns
- URL state for shareable / bookmarkable views

**Monitoring:**
- Error tracking (Sentry) with React error boundaries
- Real User Monitoring (Core Web Vitals via web-vitals library)
- Bundle size CI checks (fail build if chunk exceeds threshold)
- Lighthouse CI in pull requests

---

## Common Mistakes — Avoid Saying These

| Mistake | Why It's Wrong |
|---------|---------------|
| "I keep all components in one folder" | No isolation, grows into a dumping ground |
| "I use Redux for everything" | Overkill for most apps — server state belongs in TanStack Query |
| "I wrap everything in React.memo" | Premature optimization; React Compiler handles this now |
| "I don't lazy load because the app is small" | Small apps grow; lazy loading is a zero-cost habit |
| "I use HOCs for shared logic" | Outdated — custom hooks compose better and are type-safe |
| "I put all types in a global types folder" | Breaks co-location; domain types belong with their feature |

---

## Next Topic

→ [02-rendering.md](02-rendering.md) — How React decides when and what to render, Fiber architecture internals, and concurrent rendering.
