# Chapter 03 — Shell, Remotes & Routing

## TL;DR

The shell owns the URL and mounts remotes. Each remote owns its sub-routes. Routing is a two-tier contract: the shell routes to a remote, the remote routes internally. Never let a remote touch the top-level router.

> **One-liner for interviews:** "Shell owns top-level routes and mounts remotes. Each remote owns its own sub-routes. The URL is the contract between them."

---

## Core Concept

### The Two-Tier Routing Model

```
Browser URL: /orders/123/items

Tier 1 — Shell router:
  /orders/*  →  mount OrdersRemote

Tier 2 — Orders remote router (internal):
  /orders/        →  OrdersListPage
  /orders/:id     →  OrderDetailPage
  /orders/:id/items →  OrderItemsPage
```

The shell says "everything under `/orders` belongs to the Orders team." The Orders team handles everything after that. Neither reaches into the other's routing logic.

---

## Deep Dive

### Shell Responsibilities

The shell is the app's skeleton. It provides:

1. **Global chrome** — navigation, header, footer
2. **Authentication context** — validates session, provides user object
3. **Top-level routing** — maps URL prefixes to remotes
4. **Error boundaries** — catches remote load failures, shows fallback
5. **Global services** — analytics, feature flags, event bus
6. **Loading orchestration** — shows skeleton while remote loads

**What the shell does NOT do:**
- Business logic for any product domain
- Reach into remote component internals
- Hold domain-specific state (orders, profile, checkout)

---

### Shell Implementation (React + Module Federation)

```tsx
// shell/src/App.tsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { GlobalNav } from './components/GlobalNav';
import { RemoteErrorBoundary } from './components/RemoteErrorBoundary';
import { PageSkeleton } from './components/PageSkeleton';

// Lazy-load remotes — each is a separate deployment
const OrdersApp   = lazy(() => import('orders/App'));
const CheckoutApp = lazy(() => import('checkout/App'));
const ProfileApp  = lazy(() => import('profile/App'));

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <GlobalNav />

        <main>
          <Routes>
            <Route path="/" element={<Navigate to="/orders" replace />} />

            {/* Each remote gets a wildcard route — it handles sub-routing */}
            <Route path="/orders/*" element={
              <RemoteErrorBoundary remoteName="orders">
                <Suspense fallback={<PageSkeleton />}>
                  <OrdersApp />
                </Suspense>
              </RemoteErrorBoundary>
            } />

            <Route path="/checkout/*" element={
              <RemoteErrorBoundary remoteName="checkout">
                <Suspense fallback={<PageSkeleton />}>
                  <CheckoutApp />
                </Suspense>
              </RemoteErrorBoundary>
            } />

            <Route path="/profile/*" element={
              <RemoteErrorBoundary remoteName="profile">
                <Suspense fallback={<PageSkeleton />}>
                  <ProfileApp />
                </Suspense>
              </RemoteErrorBoundary>
            } />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

---

### Remote Error Boundary

Every remote load can fail (network error, deploy issue, version mismatch). Never let this crash the shell:

```tsx
// shell/src/components/RemoteErrorBoundary.tsx
interface Props {
  remoteName: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State { hasError: boolean; error?: Error }

export class RemoteErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`Remote "${this.props.remoteName}" failed to load:`, error);
    analytics.track('remote_load_failure', {
      remote: this.props.remoteName,
      error: error.message,
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div role="alert" className="remote-error">
          <h2>This section is temporarily unavailable</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

---

### Remote Internal Routing

The remote uses a relative router. React Router v6 supports this cleanly with nested routes:

```tsx
// orders-remote/src/App.tsx
import { Routes, Route } from 'react-router-dom';

// The remote renders under /orders/* in the shell
// It only needs to handle paths relative to /orders
export default function OrdersApp() {
  return (
    <Routes>
      <Route index element={<OrdersListPage />} />
      <Route path=":orderId" element={<OrderDetailPage />} />
      <Route path=":orderId/items" element={<OrderItemsPage />} />
      <Route path="returns" element={<ReturnsPage />} />
    </Routes>
  );
}
```

**Important:** The remote does NOT use `<BrowserRouter>`. It inherits the router context from the shell. Only one `BrowserRouter` per app.

---

### Shell–Remote Interface Contract

The shell passes context to remotes via props or React context. Define this as an explicit contract:

```typescript
// shared/src/types/shell-context.ts (shared package)

export interface ShellContext {
  // Auth
  user: {
    id: string;
    email: string;
    roles: string[];
  } | null;
  authToken: string | null;

  // Navigation
  navigate: (to: string) => void;        // shell-level navigation

  // Events
  onEvent: (type: string, payload: unknown) => void;  // publish to shell event bus
}
```

```tsx
// Shell creates context
const shellContext: ShellContext = {
  user: currentUser,
  authToken: token,
  navigate: (to) => shellNavigate(to),
  onEvent: (type, payload) => eventBus.emit(type, payload),
};

// Passed via React context
<ShellContextProvider value={shellContext}>
  <OrdersApp />
</ShellContextProvider>
```

```tsx
// Remote consumes context
import { useShellContext } from '@company/shell-context';

function OrderDetailPage() {
  const { user, navigate, onEvent } = useShellContext();

  function handleCheckout(orderId: string) {
    onEvent('CHECKOUT_INITIATED', { orderId });
    navigate('/checkout');
  }
}
```

This interface is the API contract between shell and remote teams. Changes to it must be versioned.

---

### Dynamic Remote Loading (Runtime Manifest)

Hardcoding remote URLs in the shell breaks independent deployment — if the orders team deploys a new version, the shell URL must be updated. Use a remote manifest:

```json
// https://api.example.com/mfe-manifest.json
{
  "orders":   "https://cdn.example.com/orders/2.4.1/remoteEntry.js",
  "checkout": "https://cdn.example.com/checkout/1.9.0/remoteEntry.js",
  "profile":  "https://cdn.example.com/profile/3.1.2/remoteEntry.js"
}
```

```typescript
// shell/src/remotes/loadRemote.ts
let manifest: Record<string, string> | null = null;

async function getManifest() {
  if (!manifest) {
    manifest = await fetch('/api/mfe-manifest').then(r => r.json());
  }
  return manifest!;
}

export async function loadRemoteModule(remoteName: string, modulePath: string) {
  const m = await getManifest();
  const remoteUrl = m[remoteName];
  if (!remoteUrl) throw new Error(`Unknown remote: ${remoteName}`);

  // Dynamically inject the remoteEntry script
  await loadScript(remoteUrl);

  // @ts-ignore — webpack runtime global
  const container = window[remoteName];
  await container.init(__webpack_share_scopes__.default);
  const factory = await container.get(modulePath);
  return factory();
}
```

Now the orders team ships a new version → updates the manifest → zero shell rebuild needed.

---

### Cross-Remote Navigation

When the orders remote needs to navigate to checkout, it must not import checkout directly (that creates coupling):

```tsx
// ❌ Wrong — orders depends on checkout
import { CheckoutPage } from 'checkout/CheckoutPage';

// ✅ Correct — navigate via shell
const { navigate } = useShellContext();
navigate('/checkout?orderId=123');
```

For richer communication, use the event bus:

```tsx
// orders-remote publishes an event
const { onEvent } = useShellContext();
onEvent('ORDER_SELECTED_FOR_CHECKOUT', { orderId: '123', items });

// shell (or checkout-remote) handles it
eventBus.on('ORDER_SELECTED_FOR_CHECKOUT', ({ orderId, items }) => {
  checkoutStore.initiate(orderId, items);
  navigate('/checkout');
});
```

---

## Best Practices

- **One `BrowserRouter` in the shell.** Remotes inherit router context. Two routers = URL sync issues.
- **Wildcard routes for remotes.** `/orders/*` not `/orders`. The `*` lets the remote control its own sub-paths.
- **Every remote mount wrapped in an error boundary.** Remote load failures must never crash the shell.
- **Define the shell-remote interface as a typed, versioned contract.** Both teams must agree on and review changes to it.
- **Remote URL from a manifest, not hardcoded.** Enables zero-downtime independent deployment.
- **Remotes navigate via the shell context, not by importing each other.** Direct remote-to-remote imports create hidden coupling.

---

## Common Mistakes

❌ **Remote uses `<BrowserRouter>`** — Two history instances fight for URL control. Remotes must use the shell's router context.

❌ **Shell routes without wildcard** — `/orders` without `*` means `/orders/123` falls through to 404. Always use `/*` for remote-owned paths.

❌ **Remote imports from another remote** — `import('checkout/Store')` inside orders-remote creates a direct coupling between two teams' deployments. If checkout changes its API, orders breaks silently.

❌ **No error boundary around remote mount** — A JavaScript error in the remote or a failed chunk load crashes the whole shell. Always wrap.

❌ **Shell holds domain state** — If the shell stores the current order, the orders team depends on the shell for their data. Domain state lives in the remote.

---

## Interview Q&A

**Q: How does routing work in a micro-frontend architecture?**  
A: "Two-tier routing. The shell owns top-level routes and maps URL prefixes to remotes — `/orders/*` mounts the Orders remote, `/checkout/*` mounts Checkout, and so on. Each remote then owns its own sub-routing internally. There's only one `BrowserRouter` instance in the shell. Remotes inherit the router context and render their own `<Routes>` relative to their base path. This gives each team full control over their URLs without any coordination."

**Q: What happens if a remote fails to load?**  
A: "The remote mount must be wrapped in an error boundary. If the remote's `remoteEntry.js` fails to fetch, or a chunk fails to load, the error boundary catches it and renders a fallback — 'This section is temporarily unavailable' with a retry option. The rest of the shell and other remotes keep working. The failure is also logged to analytics for monitoring. A remote load failure should never be a full-page 500."

**Q: How do you navigate from one remote to another?**  
A: "Via the shell context, not by importing between remotes. The shell exposes a `navigate` function and an event bus through a shared context. The orders remote calls `navigate('/checkout')` or emits an `ORDER_SELECTED` event. The shell handles it and routes accordingly. Direct imports between remotes create coupling — if the checkout team changes their exposed module API, orders breaks. The shell context is the contract."

---

## Next Steps

- **Shared Dependencies** → [04-shared-dependencies-and-design-systems.md](./04-shared-dependencies-and-design-systems.md) — sharing React, Angular, and design system across remotes
- **State & Auth** → [05-state-and-auth-across-apps.md](./05-state-and-auth-across-apps.md) — passing auth context from shell to remotes
- **Nx Setup** → [08-nx-mfe-angular-react.md](./08-nx-mfe-angular-react.md) — practical implementation of this architecture with Nx
