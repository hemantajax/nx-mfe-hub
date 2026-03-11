# Chapter 02 — Shell, Remotes & Routing

## TL;DR

The **shell** (host) owns the page skeleton, global navigation, auth context, and routing. **Remotes** are independently deployed feature apps that the shell loads on demand. The shell routes to remotes; remotes own sub-routing within their domain.

> **One-liner for interviews:** "The shell owns the frame and routes traffic. Remotes own their domain and handle their own sub-routes. The boundary is the URL prefix."

---

## Core Concept

### The Host / Remote Model

```
Browser
  │
  ▼
Shell (Host)                          cdn.example.com
┌─────────────────────────────┐       ┌──────────────────┐
│  <nav>  Global Navigation   │       │  checkout/       │
│  <main>                     │──────►│  remoteEntry.js  │
│    [Remote mounted here]    │       └──────────────────┘
│  </main>                    │       ┌──────────────────┐
│  <footer>                   │       │  profile/        │
└─────────────────────────────┘  ────►│  remoteEntry.js  │
                                      └──────────────────┘
```

The shell is a **thin orchestrator**. It:
- Renders chrome (nav, footer, global modals)
- Validates auth and provides auth context
- Registers and activates remotes based on the URL
- Handles global error boundaries

Remotes are **feature domains**. They:
- Own their feature's UI end-to-end
- Deploy independently (their own CI/CD pipeline)
- Can use the same or different framework as the shell
- Import shared utilities from a shared library, not from each other

---

## Deep Dive

### Shell Responsibilities

#### 1. App Discovery & Registration

The shell must know which remotes exist and where to find them. Two common patterns:

**Static config (simple, fast):**
```typescript
// shell/src/remotes.config.ts
export const remotes = {
  checkout: 'checkout@https://checkout.cdn.com/remoteEntry.js',
  profile: 'profile@https://profile.cdn.com/remoteEntry.js',
  dashboard: 'dashboard@https://dashboard.cdn.com/remoteEntry.js',
};
```

**Dynamic config (runtime discovery):**
```typescript
// shell/src/bootstrap.ts
async function loadRemoteConfig() {
  const res = await fetch('/api/remote-config');
  // Returns: { checkout: 'https://...', profile: 'https://...' }
  const config = await res.json();
  
  // Dynamically register Module Federation remotes at runtime
  for (const [name, url] of Object.entries(config)) {
    await loadRemoteEntry(name, url);
  }
}
```

Dynamic config lets you **update remote URLs without redeploying the shell** — useful for blue/green deployments and A/B testing.

#### 2. Routing Architecture

The shell owns top-level routes. Remotes own sub-routes within their domain.

```
URL: /checkout/review/item-123

Shell router:    /checkout/*   → load Checkout remote
Checkout router:         /review/:itemId → render ReviewPage
```

**Shell-level routing (React Router):**
```tsx
// shell/src/App.tsx
const CheckoutApp = React.lazy(() => import('checkout/App'));
const ProfileApp  = React.lazy(() => import('profile/App'));

function Shell() {
  return (
    <Router>
      <GlobalNav />
      <Suspense fallback={<PageSpinner />}>
        <Routes>
          <Route path="/"          element={<HomePage />} />
          <Route path="/checkout/*" element={<CheckoutApp />} />
          <Route path="/profile/*"  element={<ProfileApp />} />
          <Route path="*"           element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
```

**Remote-level routing (React Router — receives the suffix):**
```tsx
// checkout/src/App.tsx — owns everything under /checkout/
function CheckoutApp() {
  return (
    <Routes>
      <Route path="/"         element={<CartPage />} />
      <Route path="/review"   element={<ReviewPage />} />
      <Route path="/payment"  element={<PaymentPage />} />
      <Route path="/confirm"  element={<ConfirmPage />} />
    </Routes>
  );
}
```

The key: the shell uses `/checkout/*` (wildcard) and the remote uses relative routes. React Router's nested routing handles the prefix automatically.

---

### Shared Dependencies

Sharing the wrong things at the wrong version is the #1 source of MFE runtime bugs.

#### The Singleton Problem

React, Angular, and most state libraries **must run as singletons** — one instance on the page. Two React instances = broken hooks. Two Angular zones = broken change detection.

```javascript
// Module Federation shared config — enforce singletons
shared: {
  react: {
    singleton: true,           // Only one instance allowed
    requiredVersion: '^18.0.0', // Version range
    eager: false,              // Lazy-load (default)
  },
  'react-dom': {
    singleton: true,
    requiredVersion: '^18.0.0',
  },
  '@tanstack/react-query': {
    singleton: true,           // Query client must be shared
    requiredVersion: '^5.0.0',
  }
}
```

When versions mismatch, Webpack emits a warning. If `singleton: true`, it uses the first-loaded version and ignores the rest — which might work, or might silently break features.

#### What to Share vs. Not Share

| Share | Don't Share |
|-------|------------|
| Framework (React, Angular) | Feature-specific components |
| Design system / UI lib | Business logic |
| Auth utilities | Remote-internal state |
| Logging / analytics wrapper | HTTP clients (each remote should own its own) |
| i18n config | CSS (scope it instead) |

#### Shared Library Pattern

Instead of importing directly from remotes, extract shared code to a library:

```
apps/
  shell/
  checkout/
  profile/
libs/
  shared/
    ui/          ← Design system components
    auth/        ← Auth utilities, token handling
    analytics/   ← Tracking wrappers
    types/       ← Shared TypeScript interfaces
```

Remotes import from `@company/shared-ui`, never from `checkout/` or `profile/`. This prevents tight coupling between remotes.

---

### Lazy Loading Strategy

Never block the shell's initial paint on remote JavaScript.

```tsx
// ❌ Bad — blocks entire shell render until checkout loads
import CheckoutApp from 'checkout/App';

// ✅ Good — lazy with Suspense
const CheckoutApp = React.lazy(() => import('checkout/App'));

// ✅ Better — lazy with error boundary + fallback
function CheckoutRoute() {
  return (
    <ErrorBoundary fallback={<RemoteErrorFallback name="Checkout" />}>
      <Suspense fallback={<RemoteLoadingSpinner />}>
        <CheckoutApp />
      </Suspense>
    </ErrorBoundary>
  );
}
```

**Prefetching** for anticipated navigation:
```tsx
// Prefetch checkout when user hovers the cart icon
function CartIcon() {
  const prefetchCheckout = () => {
    import('checkout/App');  // Triggers download, no render
  };

  return (
    <button onMouseEnter={prefetchCheckout} onClick={navigateToCheckout}>
      <CartSVG />
    </button>
  );
}
```

---

### Error Isolation

When a remote fails to load or throws, only that section should break — not the whole app.

```tsx
class RemoteErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    logger.error('Remote failed to render', {
      remote: this.props.name,
      error: error.message,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="remote-error">
          <p>The {this.props.name} section is temporarily unavailable.</p>
          <button onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

This means: if the Recommendations remote is broken, the user still sees Checkout and Profile. The shell stays up.

---

## Examples

### Complete Shell Router (Angular)

```typescript
// shell/src/app/app.routes.ts
import { Routes } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/module-federation';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home/home.component')
      .then(m => m.HomeComponent),
  },
  {
    path: 'checkout',
    loadChildren: () =>
      loadRemoteModule({
        type: 'module',
        remoteEntry: 'https://checkout.cdn.com/remoteEntry.js',
        exposedModule: './Routes',
      }).then(m => m.CHECKOUT_ROUTES),
  },
  {
    path: 'profile',
    loadChildren: () =>
      loadRemoteModule({
        type: 'module',
        remoteEntry: 'https://profile.cdn.com/remoteEntry.js',
        exposedModule: './Routes',
      }).then(m => m.PROFILE_ROUTES),
  },
];
```

```typescript
// checkout remote — exposes its own routes
// checkout/src/lib/checkout.routes.ts
export const CHECKOUT_ROUTES: Routes = [
  { path: '',        component: CartComponent },
  { path: 'review',  component: ReviewComponent },
  { path: 'payment', component: PaymentComponent },
];
```

---

## Best Practices

- **Shell should be the thinnest app.** If the shell goes down, everything goes down. Keep it simple, deploy it rarely.
- **Never import from a sibling remote.** `import { Button } from 'checkout/Button'` in the profile remote creates a hidden dependency. Use shared libs.
- **Use `/*` wildcard routes in the shell.** The shell should never know about the remote's internal URL structure.
- **Wrap every remote mount in an error boundary.** Remote load failures (CDN down, version mismatch) are runtime errors. Catch them gracefully.
- **Consistent route prefix ownership.** Each team owns a URL prefix end-to-end: `/checkout/*` belongs to the checkout team forever.

---

## Common Mistakes

❌ **Shell knowing remote routes** — If the shell has a route `/checkout/payment`, it's now coupled to checkout's internal structure. Use wildcards.

❌ **No fallback for remote load failure** — `import('checkout/App')` without a try/catch or error boundary will crash the shell if the CDN is down.

❌ **Two remotes importing from each other** — Creates hidden deploy order dependencies. Feature A can't deploy without Feature B. Extract to shared lib.

❌ **Eager loading all remotes** — Loading all `remoteEntry.js` files on shell boot adds seconds to initial load time. Lazy-load on route activation.

---

## Interview Q&A

**Q: How do you handle routing in a micro-frontend architecture?**  
A: "Two-level routing: the shell owns top-level URL prefixes using wildcard routes — `/checkout/*` activates the checkout remote, `/profile/*` activates the profile remote. Each remote then owns its own sub-routing completely. The shell never knows about `/checkout/review` or `/checkout/payment`. This means each team can add, rename, or restructure their routes without touching the shell."

**Q: What should the shell app contain?**  
A: "The shell should be a thin orchestrator — global navigation, auth context provision, the top-level router, global error boundaries, and remote loading logic. It should have almost no feature code. The thinner the shell, the less frequently it needs to deploy, which reduces risk for all teams."

---

## Next Steps

- **State & Auth** → [03-state-and-auth.md](./03-state-and-auth.md) — how auth context flows from shell to remotes
- **Deployment** → [04-deployment-and-versioning.md](./04-deployment-and-versioning.md) — how remotes deploy independently
- **Nx Setup** → [06-nx-mfe-angular-react.md](./06-nx-mfe-angular-react.md) — wiring this up with Nx
