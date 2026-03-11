# Chapter 05 — State & Auth Across Apps

## TL;DR

Each MFE owns its own state. The shell owns auth and global cross-cutting state. Cross-MFE communication happens through a typed event bus or shared context — never through shared stores or direct imports.

> **One-liner for interviews:** "Shell owns auth. Each remote owns its domain state. Cross-MFE communication uses an event bus or shared context — never a shared Redux store."

---

## Core Concept

### The State Ownership Hierarchy

```
Shell (owns):
├── Authentication (current user, token, session)
├── Global UI state (theme, locale, global modals)
└── Event bus (cross-remote communication channel)

Each Remote (owns):
├── Domain state (orders list, checkout cart, profile data)
├── UI state (loading, errors, form values)
└── Can READ from shell context
└── Can EMIT events to shell bus
└── Cannot directly access other remotes' state
```

Remotes are like microservices: they own their data and expose it only through defined interfaces.

---

## Deep Dive

### Auth Propagation

Auth is the most critical shared concern. The shell authenticates once and propagates the identity to all remotes.

```typescript
// shell/src/auth/AuthContext.tsx
interface AuthContext {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<string>;
}

const AuthCtx = React.createContext<AuthContext | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // On mount: check session, validate token
  useEffect(() => {
    initializeSession().then(({ user, token }) => {
      setUser(user);
      setToken(token);
    });
  }, []);

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!token) return;
    const decoded = jwtDecode(token);
    const expiresIn = decoded.exp * 1000 - Date.now() - 60_000; // 1 min before expiry
    const timer = setTimeout(refreshToken, expiresIn);
    return () => clearTimeout(timer);
  }, [token]);

  return (
    <AuthCtx.Provider value={{ user, token, isLoading, login, logout, refreshToken }}>
      {children}
    </AuthCtx.Provider>
  );
}
```

```tsx
// Shell wraps all remotes with auth context
<AuthProvider>
  <Suspense fallback={<PageSkeleton />}>
    <OrdersApp />   {/* OrdersApp can call useAuth() */}
  </Suspense>
</AuthProvider>
```

Remotes consume it:
```tsx
// orders-remote/src/hooks/useAuth.ts
// Shared package: @company/shell-context
import { useAuth } from '@company/shell-context';

function OrdersPage() {
  const { user, token } = useAuth();
  // Use token for API calls
}
```

---

### Token Passing to API Calls

Each remote makes its own API calls using the shell-provided token:

```typescript
// orders-remote/src/api/ordersApi.ts
import { useAuth } from '@company/shell-context';

export function useOrdersApi() {
  const { token, refreshToken } = useAuth();

  async function fetchOrders(): Promise<Order[]> {
    const res = await fetch('/api/orders', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      // Token expired — refresh and retry once
      const newToken = await refreshToken();
      return fetchOrders(); // retry with new token (simplified)
    }

    return res.json();
  }

  return { fetchOrders };
}
```

---

### The Event Bus

The event bus is the primary communication mechanism between remotes that can't or shouldn't share state directly.

```typescript
// @company/shell-context/src/eventBus.ts

type EventHandler<T = unknown> = (payload: T) => void;

class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();

  emit<T>(event: string, payload: T): void {
    this.handlers.get(event)?.forEach(h => {
      try {
        h(payload);
      } catch (err) {
        console.error(`EventBus handler error for "${event}":`, err);
      }
    });
  }

  on<T>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler as EventHandler);

    // Return unsubscribe function
    return () => this.handlers.get(event)?.delete(handler as EventHandler);
  }
}

export const eventBus = new EventBus();
```

**Typed events (recommended):**

```typescript
// @company/shell-context/src/events.ts — shared type definitions
export interface MFEEvents {
  'CHECKOUT_INITIATED':  { orderId: string; items: CartItem[] };
  'ORDER_PLACED':        { orderId: string; total: number };
  'AUTH_TOKEN_REFRESHED': { token: string };
  'USER_PREFERENCE_CHANGED': { theme: 'light' | 'dark' };
}

// Typed wrapper
export function emit<K extends keyof MFEEvents>(
  event: K, payload: MFEEvents[K]
): void {
  eventBus.emit(event, payload);
}

export function on<K extends keyof MFEEvents>(
  event: K,
  handler: (payload: MFEEvents[K]) => void
): () => void {
  return eventBus.on(event, handler);
}
```

```tsx
// orders-remote: emits event
import { emit } from '@company/shell-context';

function handleProceedToCheckout(order: Order) {
  emit('CHECKOUT_INITIATED', { orderId: order.id, items: order.items });
}

// checkout-remote (or shell): receives event
import { on } from '@company/shell-context';

useEffect(() => {
  const unsub = on('CHECKOUT_INITIATED', ({ orderId, items }) => {
    cartStore.load(orderId, items);
    navigate('/checkout');
  });
  return unsub;   // cleanup on unmount
}, []);
```

---

### What Not to Share

#### ❌ Shared Redux / Zustand Store

```typescript
// ❌ WRONG — shared global store
// @company/shell-context/src/store.ts
export const globalStore = createStore({ orders: [], cart: null, user: null });

// remotes reach into global store
const orders = globalStore.getState().orders;
```

Problems:
- All remotes are coupled to the store's shape
- Any change to the store interface requires updating all remotes
- You've recreated the monolith at the state level
- Teams can't independently evolve their state

#### ✅ Remote-Owned State with Event Sync

```typescript
// orders-remote owns its state
const ordersStore = createStore({ orders: [], loading: false });

// When something cross-cutting happens, emit an event
ordersStore.subscribe((state) => {
  if (state.lastPlacedOrder) {
    emit('ORDER_PLACED', { orderId: state.lastPlacedOrder.id });
  }
});
```

---

### Shared URL State

For state that must survive navigation and be bookmarkable, use the URL:

```
/checkout?orderId=123&from=orders
```

```tsx
// checkout-remote reads from URL
function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const fromRoute = searchParams.get('from');
}
```

URL state is the most durable cross-MFE state: it survives page refreshes, is shareable, and requires no coordination beyond URL structure agreements.

---

### Session Storage for Transient Cross-MFE Data

For short-lived data that must cross a navigation (e.g., a redirect payload):

```typescript
// orders-remote: store before redirect
sessionStorage.setItem('checkout_context', JSON.stringify({
  orderId: '123',
  selectedItems: ['item_1', 'item_2'],
  returnUrl: '/orders',
}));
navigate('/checkout');

// checkout-remote: read on mount
const ctx = JSON.parse(sessionStorage.getItem('checkout_context') ?? 'null');
if (ctx) {
  sessionStorage.removeItem('checkout_context');  // consume once
  initCheckout(ctx);
}
```

---

## Best Practices

- **Shell owns auth, remotes consume it.** Never duplicate auth logic in a remote.
- **Event types are a shared contract.** Version and review them like an API.
- **Prefer URL state for navigation context.** It's durable and shareable — no extra storage needed.
- **Remotes unsubscribe from event bus on unmount.** Memory leaks from unsubscribed handlers accumulate as users navigate.
- **Event payloads are plain serializable objects.** No class instances, no functions. Events must be serializable to support future cross-origin postMessage transport.
- **Don't emit events in render.** Only emit in event handlers and effects to avoid infinite loops.

---

## Common Mistakes

❌ **Shared global store** — One Redux store for all MFEs recreates the monolith at the state layer. Teams can't evolve state independently.

❌ **Passing React components as props across MFE boundaries** — Component references from another MFE can fail if the remote is reloaded or version-mismatched. Use events or URL.

❌ **Storing auth token in a remote's local state** — If the token refreshes in the shell, the remote's stale copy causes 401s. Always read from the shell's auth context.

❌ **Not cleaning up event listeners** — A remote mounts, subscribes to events, unmounts (user navigates away), remounts. Without cleanup, you accumulate duplicate handlers.

---

## Interview Q&A

**Q: How do you share state between micro-frontends?**  
A: "Sparingly and by contract. The shell provides auth and a global user object via React context or a shared context package. Beyond that, MFEs communicate through a typed event bus — one MFE emits a domain event, another listens. For navigation-coupled state, the URL is the most durable option. What I avoid is a shared Redux store — that recreates the monolith at the state layer and couples teams to the same data shape."

**Q: How does auth work in a micro-frontend system?**  
A: "The shell handles auth end-to-end: session initialization, token storage, refresh logic. It exposes the current user and token via a shared context package that all remotes can import. Remotes use the token from context for their API calls. When the token refreshes, it happens in the shell and propagates to all remotes via context update. Remotes never store the token themselves — that would lead to stale token bugs."

**Q: What's wrong with using a shared global store?**  
A: "It couples every remote to the same state interface. If the orders team needs to change their slice shape, they must coordinate with every other team that might read from it. Every remote has to update. You've eliminated the independence that was the whole point of going to MFEs. A typed event bus gives you communication without coupling — remotes subscribe to events they care about and own their own state entirely."

---

## Next Steps

- **Deployment** → [06-deployment-and-versioning.md](./06-deployment-and-versioning.md) — deploying auth-token-aware MFEs independently
- **Nx Setup** → [08-nx-mfe-angular-react.md](./08-nx-mfe-angular-react.md) — implementing auth context in an Nx workspace
