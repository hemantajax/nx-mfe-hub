# Chapter 03 — State & Auth Across Micro-Frontends

## TL;DR

State and auth are the hardest cross-cutting concerns in MFE architecture. The golden rules: **the shell owns auth**, **each remote owns its own feature state**, **cross-app communication uses a shared event bus or shared library — never direct imports between remotes**.

> **One-liner for interviews:** "Shell provides auth context. Remotes own their state. Cross-app communication goes through a typed event bus or URL — never direct remote-to-remote imports."

---

## Core Concept

### State Ownership Model

```
Shell (Auth Owner)
│
├─ Auth token, user identity, session ← Shell owns, provides to all
│
├─ Checkout Remote
│    └─ Cart state, payment flow state ← Checkout owns, not shared
│
├─ Profile Remote
│    └─ Profile form state, preferences ← Profile owns, not shared
│
└─ Notifications Remote
     └─ Notification list, read state ← Notifications owns
```

**The principle:** State lives as close to where it's consumed as possible. Only state that genuinely needs to be shared lives at the shell level or in a shared library.

Problems arise when teams try to share too much state — you end up with a distributed monolith where deploying checkout requires coordination with profile because they share a global store.

---

## Deep Dive

### Auth — The Shell's Responsibility

Authentication is the one thing that must be centralized. The shell:

1. Handles the login flow (redirect to IdP, receive callback)
2. Stores and refreshes the access token
3. Provides auth context to all remotes via a shared mechanism

#### Pattern 1: Shared Auth Library

The most robust approach. The shell and all remotes import from `@company/shared-auth`.

```typescript
// libs/shared/auth/src/index.ts
// This library is loaded once (as a singleton via Module Federation shared config)

let _token: string | null = null;
let _user: User | null = null;
const listeners = new Set<() => void>();

export const authStore = {
  setToken(token: string, user: User) {
    _token = token;
    _user = user;
    listeners.forEach(fn => fn());
  },

  getToken(): string | null {
    return _token;
  },

  getUser(): User | null {
    return _user;
  },

  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);  // Returns unsubscribe
  },
};
```

```typescript
// Shell — sets auth after login
import { authStore } from '@company/shared-auth';

async function handleLoginCallback(code: string) {
  const { token, user } = await exchangeCodeForToken(code);
  authStore.setToken(token, user);   // All remotes now have access
}
```

```typescript
// Any remote — reads auth
import { authStore } from '@company/shared-auth';

function useAuth() {
  const [user, setUser] = useState(authStore.getUser());

  useEffect(() => {
    return authStore.subscribe(() => setUser(authStore.getUser()));
  }, []);

  return user;
}
```

Because `@company/shared-auth` is a singleton in the Module Federation shared config, the same in-memory state is accessible everywhere.

#### Pattern 2: Auth via URL / Cookies

For session-cookie-based auth (via a BFF), there's no JS coordination needed. The BFF sets an HTTP-only cookie. Every MFE's API calls hit the same domain and the cookie is attached automatically.

```
Browser
  │
  ├─ GET /api/profile   → BFF reads cookie, validates, proxies to ProfileService
  ├─ POST /api/orders   → BFF reads cookie, validates, proxies to OrderService
  └─ GET /api/checkout  → BFF reads cookie, validates, proxies to CheckoutService
```

This is the simplest auth architecture for MFEs — no JS token passing, no shared library needed. The cookie IS the shared auth state.

#### Token Refresh

If using JWTs, the token refresh must happen in one place — the shell. If two remotes both try to refresh simultaneously, you get a race condition and one gets an invalid token.

```typescript
// libs/shared/auth/src/token-refresh.ts

let refreshPromise: Promise<string> | null = null;

export async function getValidToken(): Promise<string> {
  const token = authStore.getToken();

  if (!isExpired(token)) return token;

  // If a refresh is already in flight, wait for it — don't start a second one
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}
```

This deduplication pattern (one in-flight refresh at a time) is critical in MFE environments.

---

### Cross-App Communication

Remotes must never import from each other. But sometimes they need to communicate:

- Checkout completes → Profile updates order history badge
- User changes language in Profile → All remotes update locale
- Notifications receives a push → Shell updates the notification badge

#### Pattern 1: Custom Event Bus (Window Events)

```typescript
// libs/shared/events/src/index.ts

type AppEvent =
  | { type: 'ORDER_COMPLETED'; orderId: string; total: number }
  | { type: 'LOCALE_CHANGED'; locale: string }
  | { type: 'CART_UPDATED'; itemCount: number };

export const eventBus = {
  emit<T extends AppEvent>(event: T) {
    window.dispatchEvent(new CustomEvent('app:event', { detail: event }));
  },

  on<T extends AppEvent['type']>(
    type: T,
    handler: (event: Extract<AppEvent, { type: T }>) => void
  ): () => void {
    const listener = (e: Event) => {
      const detail = (e as CustomEvent<AppEvent>).detail;
      if (detail.type === type) handler(detail as any);
    };
    window.addEventListener('app:event', listener);
    return () => window.removeEventListener('app:event', listener);
  },
};
```

```typescript
// Checkout remote — emits after order success
eventBus.emit({ type: 'ORDER_COMPLETED', orderId: 'o_123', total: 249.99 });

// Profile remote — listens for the event
useEffect(() => {
  return eventBus.on('ORDER_COMPLETED', ({ orderId }) => {
    refetchOrderHistory();
  });
}, []);
```

The event bus is typed — if you add a new event type to `AppEvent`, TypeScript enforces that all emitters and listeners use valid types.

#### Pattern 2: Shared State (Zustand / RxJS Subject)

For state that multiple remotes read and write:

```typescript
// libs/shared/state/src/notification-store.ts
import { create } from 'zustand';

interface NotificationState {
  unreadCount: number;
  increment: () => void;
  markAllRead: () => void;
}

// Singleton — shared via Module Federation
export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  increment: () => set(state => ({ unreadCount: state.unreadCount + 1 })),
  markAllRead: () => set({ unreadCount: 0 }),
}));
```

```typescript
// Shell nav — displays badge
const unreadCount = useNotificationStore(state => state.unreadCount);

// Notifications remote — increments on push
const increment = useNotificationStore(state => state.increment);
```

This works because `zustand` is a singleton in the shared config — same store instance across shell and all remotes.

#### Pattern 3: URL as State

The simplest cross-app communication: navigate. If Checkout needs Profile to show the shipping page, it navigates to `/profile/shipping`. No event bus needed.

```typescript
// Checkout remote — after payment, navigate to order confirmation in Profile
router.navigate('/profile/orders/o_123');
```

This is the most decoupled option. The receiving remote reads URL params and renders accordingly. No event, no shared store.

---

### Feature Flags Across MFEs

Feature flags need to be consistent — if the shell hides a nav item, the remote should also be inaccessible.

```typescript
// libs/shared/feature-flags/src/index.ts
let flags: Record<string, boolean> = {};

export const featureFlags = {
  async load(userId: string) {
    flags = await fetchFlags(userId);  // From your flag service (LaunchDarkly, etc.)
  },
  isEnabled(flag: string): boolean {
    return flags[flag] ?? false;
  },
};

// Shell — loads flags once after auth
await featureFlags.load(user.id);

// Any remote
if (featureFlags.isEnabled('new-checkout-flow')) {
  return <NewCheckoutFlow />;
}
```

---

## Best Practices

- **Shell owns auth, remotes read it.** No remote should trigger a login redirect independently — surface the unauth state and let the shell handle it.
- **Type your event bus.** Untyped `postMessage` or `CustomEvent` becomes unmaintainable. Define an `AppEvent` discriminated union and enforce it.
- **Prefer URL navigation over events for transitions.** If the cross-app communication is a page transition, navigate. Events are for background data updates.
- **Deduplicate token refresh.** Multiple remotes calling refresh simultaneously causes race conditions. One in-flight refresh, shared across all consumers.
- **Feature flags as singletons.** Load once in the shell after auth, share via the singleton pattern. Don't fetch per-remote.

---

## Common Mistakes

❌ **Each remote managing its own token refresh** — Race condition: two remotes refresh simultaneously, one gets an invalid token. Centralize refresh in the shared auth library.

❌ **Direct state imports between remotes** — `import { cartStore } from 'checkout/store'` creates a hidden deploy coupling. Extract to a shared lib or use events.

❌ **Using localStorage for cross-app state** — Readable by any script on the page (XSS risk). For auth tokens, use HTTP-only cookies or memory. For non-sensitive state, acceptable but prefer a shared in-memory store.

❌ **Event bus with string event names** — `eventBus.emit('ORDER_COMPELTED', ...)` (typo) fails silently. Type your events as a discriminated union.

❌ **Shell storing business state** — The shell should not know about cart contents, order history, or profile data. If business state is in the shell, you're rebuilding a monolith.

---

## Interview Q&A

**Q: How do you share authentication between micro-frontends?**  
A: "Two patterns depending on the auth mechanism. For cookie-based auth via a BFF, there's nothing to share — the BFF reads the HTTP-only cookie on every request, so all remotes get auth for free by calling the same API domain. For JWT-based auth, I use a shared auth library that's a singleton in the Module Federation shared config. The shell handles login and token refresh and writes to the shared store; remotes read from it. The key detail on refresh: I deduplicate it with a single in-flight promise so two remotes hitting an expired token at the same time don't trigger two refresh calls."

**Q: How do micro-frontends communicate without tight coupling?**  
A: "Three options depending on the use case. For background data events — like 'order completed, update the badge' — I use a typed custom event bus built on `window.dispatchEvent`, with a discriminated union type for all events so TypeScript catches typos and missing handlers. For shared reactive state — notification counts, locale — I use a Zustand or RxJS-based store as a singleton in the shared config. For page transitions — checkout complete, go to order history — I just navigate. URL is the simplest, most decoupled communication channel."

**Q: Should remotes share a global Redux store?**  
A: "I'd avoid it. A global Redux store shared across all remotes is effectively a distributed monolith — any remote can read or mutate any slice, and adding a new action in checkout requires coordinating with every other team. Better to keep each remote's state local, share only what's truly cross-cutting (auth, notifications, feature flags) via singleton libraries, and use a typed event bus for the rare cases where remotes need to react to each other's actions."

---

## Next Steps

- **Deployment & Versioning** → [04-deployment-and-versioning.md](./04-deployment-and-versioning.md) — deploying remotes independently without breaking auth
- **Nx Setup** → [06-nx-mfe-angular-react.md](./06-nx-mfe-angular-react.md) — structuring shared libs in an Nx monorepo
- **Cheat Sheet** → [07-cheat-sheet-and-qa.md](./07-cheat-sheet-and-qa.md) — quick reference for all communication patterns
