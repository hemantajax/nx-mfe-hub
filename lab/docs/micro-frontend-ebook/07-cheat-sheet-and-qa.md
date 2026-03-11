# Chapter 07 — Cheat Sheet & Interview Q&A

> Read this the morning of your interview. Every key decision, pattern, and answer template from this ebook in one place.

---

## What Is a Micro-Frontend? (The 30-Second Explanation)

A micro-frontend is an **independently deployable UI slice** owned by an autonomous team. The core ideas:

- The UI is decomposed along **domain boundaries** (checkout, profile, search)
- Each domain is **owned end-to-end** by one team (backend + frontend)
- Each domain deploys **on its own schedule** without coordinating with other teams
- A **shell (host)** orchestrates them into one cohesive product

Think of it as microservices, applied to the frontend.

---

## Approach Decision Card

```
Multi-framework teams? (React + Angular + Vue coexist)
  └─ YES → single-spa

Hard isolation needed? (third-party, security boundary, legacy embed)
  └─ YES → iframes

Same framework, runtime composition, shared dependencies?
  └─ YES → Module Federation (Webpack/Rspack/Vite)

Framework-agnostic widgets for a design system?
  └─ YES → Web Components

None of the above?
  └─ Consider: is a monorepo with strong module boundaries enough?
```

---

## Module Federation — Mental Model

```
CDN
├── shell/latest/remoteEntry.js      ← Orchestrator
├── checkout/latest/remoteEntry.js   ← Checkout team deploys here
└── profile/latest/remoteEntry.js    ← Profile team deploys here

At runtime:
Shell downloads checkout/remoteEntry.js → manifest of exposed modules + deps
Shell resolves shared deps (React 18 used once, not twice)
Shell lazy-loads checkout/App on /checkout/* route navigation
```

**Key config terms:**

| Term | Meaning |
|------|---------|
| `name` | App's MF identifier |
| `exposes` | Modules this app makes available to hosts |
| `remotes` | Other apps this host pulls from |
| `shared` | Dependencies negotiated between host and remotes |
| `singleton: true` | Only one instance allowed (React, Angular) |
| `eager: false` | Lazy-load (default — don't change unless you know why) |

---

## Shell vs Remote — Responsibility Split

| Shell Owns | Remote Owns |
|-----------|-------------|
| Global nav, chrome, footer | Feature domain UI |
| Auth flow (login, token refresh) | Feature-level state |
| Top-level routing (`/checkout/*`) | Sub-routing (`/review`, `/payment`) |
| Global error boundaries | Remote-level error handling |
| Loading remotes lazily | Exposing modules via webpack config |
| Feature flag initialization | Reading feature flags |
| Event bus initialization | Emitting / listening to events |

---

## Routing — Two-Level Pattern

```
Shell: /checkout/*  →  loads Checkout remote
                              │
Checkout: /       →  CartPage
          /review  →  ReviewPage
          /payment →  PaymentPage
```

**Rule:** Shell uses `/*` wildcard. Shell NEVER knows checkout's internal routes.

---

## Auth — Pattern Selection

| Auth Mechanism | MFE Strategy |
|----------------|--------------|
| Cookie-based (BFF) | No JS coordination needed — cookie attaches to every request |
| JWT in memory | Shared auth singleton via Module Federation shared config |
| OAuth / PKCE | Shell handles flow; remotes read from shared auth store |

**Token refresh deduplication (must-implement):**
```typescript
let refreshPromise: Promise<string> | null = null;

export async function getValidToken() {
  if (!isExpired(getToken())) return getToken();
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}
```

---

## Cross-App Communication — When to Use What

| Scenario | Pattern |
|----------|---------|
| Page transition ("go to order history") | Navigate (URL) |
| Background data update ("order complete, refresh badge") | Typed event bus |
| Shared reactive state (notification count, locale) | Singleton store (Zustand/RxJS) |
| Auth & feature flags | Shared singleton lib |
| Real-time server events | Shell subscribes, broadcasts via event bus |

**Typed event bus pattern:**
```typescript
type AppEvent =
  | { type: 'ORDER_COMPLETED'; orderId: string }
  | { type: 'LOCALE_CHANGED'; locale: string };

eventBus.emit({ type: 'ORDER_COMPLETED', orderId: 'o_123' });
eventBus.on('ORDER_COMPLETED', ({ orderId }) => { ... });
```

---

## Deployment — Key Patterns

| Pattern | When |
|---------|------|
| Mutable `latest/` URL | Fast-moving teams; shell picks up on next load |
| Immutable versioned URLs | Regulated, stability-first; rollback is instant |
| Dynamic config API | Large platforms; rollback without CDN ops |

**Cache strategy:**
```
/checkout/v2.1.0/remoteEntry.js  →  max-age=31536000,immutable
/checkout/latest/remoteEntry.js  →  max-age=60
```

**Rollback = update config API or overwrite `latest/`** (no rebuild needed)

---

## When NOT to Use MFEs — Decision Filter

```
Number of autonomous frontend teams?
  └─ 1-2 → Nx monorepo with module boundaries. Stop.
  └─ 3+  → Continue.

Teams have different deployment cadences?
  └─ No  → Monorepo with CI gates. Stop.
  └─ Yes → Continue.

Teams have separate product domains?
  └─ No  → Monorepo. Stop.
  └─ Yes → MFEs justified.
```

**Rule:** MFEs solve organizational coupling, not technical debt.

---

## Nx Commands — Quick Reference

```bash
# Setup
nx g @nx/angular:setup-mf shell --mfType=host --port=4200
nx g @nx/angular:remote checkout --host=shell --port=4201
nx g @nx/react:setup-mf shell --mfType=host --port=3000
nx g @nx/react:remote checkout --host=shell --port=3001

# Dev
nx serve shell                         # All remotes
nx serve shell --devRemotes=checkout  # Only checkout live
nx serve checkout                      # Remote standalone

# Build
nx affected --target=build --base=origin/main  # CI: only changed

# Inspect
nx graph                               # Dependency visualization
nx affected:graph --base=origin/main  # Affected scope
```

---

## MFE System Design — Talking Points

When asked "Design a micro-frontend platform" in a system design interview, cover these in order:

1. **Decomposition** — How do you split the app? Along domain boundaries (Conway's Law). One remote per team.

2. **Approach selection** — Module Federation for same-framework runtime composition; single-spa for multi-framework.

3. **Shell responsibilities** — Routing, auth, error isolation, remote loading.

4. **Shared dependency strategy** — Singletons (React, Angular) via MF shared config. Non-singletons stay local.

5. **State & auth** — Shell owns auth. Remotes read from shared auth singleton. Event bus for cross-remote communication. No direct remote-to-remote imports.

6. **Deployment** — Each remote has its own pipeline. CDN paths. `latest/` mutable, versioned paths immutable. Rollback = URL swap.

7. **Trade-offs** — Be honest: MFEs add operational overhead. Justify with org scale and team count. Acknowledge performance costs (multiple remoteEntry.js loads).

---

## 25 Interview Q&A — Fast Reference

**Q: What is a micro-frontend?**  
A: An independently deployable UI slice owned by an autonomous team, mapped to a product domain. The shell orchestrates multiple remotes into one cohesive product. Solves the problem of multiple teams coupling through a monolith frontend.

**Q: What is Module Federation?**  
A: A Webpack (and Rspack/Vite) feature that lets a running application dynamically load modules from another deployed application at runtime. The shell downloads a remote's `remoteEntry.js` manifest and lazily loads its exposed modules, sharing negotiated dependencies like React to avoid duplication.

**Q: How does the shell know where to find remotes?**  
A: Three patterns: (1) static config in webpack — simple but requires shell redeploy for URL changes; (2) mutable `latest/` CDN path — shell always gets newest without redeploy; (3) dynamic config API — shell fetches remote URLs at boot, enabling rollback and A/B testing without any redeploy.

**Q: What does `singleton: true` mean in Module Federation?**  
A: Only one instance of that module is allowed on the page. If shell and remote both declare React as a singleton, only the first-loaded version is used — the other is discarded. Required for React, Angular, and any state library that uses module-level singletons. Without it, you get two React instances and broken hooks.

**Q: How do you route in a micro-frontend architecture?**  
A: Two-level routing. Shell owns top-level URL prefixes using wildcard routes (`/checkout/*` → loads checkout remote). Remotes own their sub-routes (`/review`, `/payment`) completely. The shell never references a remote's internal routes — this is the boundary that enables independent development.

**Q: How do you share auth between micro-frontends?**  
A: For cookie-based auth (BFF), nothing to share — the cookie attaches automatically. For JWT-based auth, a shared auth library is a singleton in the MF shared config. Shell handles login and token refresh, writes to the shared store. Remotes read from it. Critical detail: deduplicate token refresh with a single in-flight promise.

**Q: How do remotes communicate without tight coupling?**  
A: Three patterns by use case. URL navigation for page transitions. Typed custom event bus (`window.dispatchEvent`) for background data updates. Singleton stores (Zustand/RxJS) for reactive shared state. Never direct imports between remotes — those create hidden deploy dependencies.

**Q: What happens when a remote fails to load?**  
A: It should fail in isolation. Every remote mount point is wrapped in an error boundary. If the recommendations CDN is down, the user sees a "temporarily unavailable" message in that section — not a broken page. `React.lazy` + `Suspense` + `ErrorBoundary` is the standard pattern.

**Q: How do you deploy a remote independently?**  
A: The remote has its own CI/CD pipeline. On merge to main, it builds and uploads to a CDN path. The shell references that CDN URL. The next page load picks up the new code. The shell never redeploys for a remote update (unless using pinned version URLs).

**Q: How do you roll back a bad remote deploy?**  
A: If using a dynamic config API, update the API to return the previous version's URL — propagates in seconds. If using a mutable `latest/` CDN path, overwrite it with the previous version's files. Either way, no rebuild or redeploy needed — rollback is a configuration change.

**Q: What's a breaking change when deploying a remote?**  
A: Removing or renaming an exposed module, changing an exposed component's props contract, or bumping a shared singleton (React version) before the shell supports it. Non-breaking: bug fixes, new sub-routes, new props with defaults, new exposed modules.

**Q: When should you NOT use micro-frontends?**  
A: When you don't have multiple autonomous teams that need to deploy independently. MFEs add real operational overhead — independent pipelines, CDN management, shared dependency coordination. For 1-2 teams, an Nx monorepo with module boundaries gives you code organization without the complexity.

**Q: What is Nx and how does it help with MFEs?**  
A: Nx is a build system and monorepo tool with first-class Module Federation support. It generates webpack configs, manages shared dependencies, handles affected builds (only rebuild what changed), and provides `--devRemotes` for local development where you only run the remotes you're touching.

**Q: How do you enforce team ownership in an Nx monorepo?**  
A: With module boundary tags. Each project is tagged with its scope (`scope:checkout`). ESLint rules define which scopes can depend on which others. Checkout can import from `scope:shared` but not `scope:profile`. Violations fail in CI.

**Q: How do Angular and React coexist in Module Federation?**  
A: Module Federation is framework-agnostic. The cleanest integration: the React remote exposes a Web Component from its bootstrap. Angular consumes the custom element with `CUSTOM_ELEMENTS_SCHEMA`. Communication is via HTML attributes and DOM events. Both frameworks' singletons are declared in the shared config so each runs only once.

**Q: What's single-spa and when would you use it instead of Module Federation?**  
A: single-spa is an orchestration framework for multiple SPAs on one page. It manages app lifecycles (bootstrap, mount, unmount) based on routing. Use it for multi-framework teams or brownfield migration — wrapping a legacy app as a single-spa application while new teams build separately. Module Federation is the bundler layer; single-spa is the lifecycle layer. They can work together.

**Q: What's the difference between a BFF and a micro-frontend?**  
A: Different axis of decomposition. BFF is a server-side aggregation layer for the frontend — it composites backend services. Micro-frontends decompose the frontend code itself into independently deployable UI slices. They're orthogonal — a micro-frontend platform often has each remote calling its own BFF.

**Q: How do you handle feature flags across micro-frontends?**  
A: Load flags once in the shell after auth and write them to a shared singleton (also in the MF shared config). All remotes read from the same flag store. This ensures consistency — if the shell hides a nav item for a flag, the remote also won't render its corresponding page.

**Q: What's the N+1 problem in micro-frontends?**  
A: Similar to REST N+1 — if each remote independently fetches its own data, you get N roundtrips on page load. Solutions: (1) the shell pre-fetches common data (user, flags) and provides it via context, (2) remotes share a query cache (React Query singleton), (3) a BFF layer aggregates data for the page.

**Q: How do you test micro-frontends?**  
A: Three levels. Unit tests within each remote in isolation — no shell needed. Contract tests verifying exposed modules match the interface the shell expects — run before deploy. Integration tests with Cypress/Playwright loading the actual shell + remotes in a staging environment. The contract tests are the critical gate for independent deployability.

**Q: What's the performance impact of micro-frontends?**  
A: Multiple `remoteEntry.js` downloads on page load, potential for duplicate dependencies if shared config is wrong, framework bootstrap overhead if multiple frameworks are used. Mitigations: lazy-load remotes (only download on route activation), prefetch on user intent (hover over nav), strong `singleton: true` config, HTTP/2 multiplexing (multiple small files don't block each other), CDN with edge caching.

**Q: How do you do local development in a micro-frontend monorepo?**  
A: With Nx: `nx serve shell --devRemotes=checkout,profile` runs the shell and only the remotes you specify with live reloading. Other remotes load from their built output or a staging CDN URL. Each remote also has a standalone mode (its own entry point with mock providers) so you can develop in isolation without running the shell at all.

**Q: What's the role of a design system in micro-frontend architecture?**  
A: The design system is a shared library (`@company/shared-ui`) that every remote imports. It's declared in the Module Federation shared config so only one copy loads. This enforces visual consistency without coupling — teams use the same components but deploy independently. The design system team has their own pipeline; updates are consumed by each team on their schedule.

**Q: How do you handle i18n across micro-frontends?**  
A: Two patterns. Centralized: the shell loads all translations and provides them via a shared singleton (same pattern as auth). Decentralized: each remote ships its own translations, loaded lazily with the remote. Centralized is simpler but the shell must know about all locales from all teams. Decentralized scales better but requires agreed-upon locale keys to avoid conflicts.

**Q: What Conway's Law tells us about micro-frontends?**  
A: Conway's Law says your system architecture will mirror your organization's communication structure. MFEs are Conway's Law applied deliberately — you design the architecture to match the org, not fight it. If you have a checkout team, a profile team, and a platform team, you build a checkout remote, a profile remote, and a shell owned by the platform team. Teams that don't need to communicate architecturally represent teams that don't need to coordinate technically.

---

## Vocabulary Fast Reference

| Term | Definition |
|------|-----------|
| **Shell / Host** | Orchestrating app that loads and mounts remotes |
| **Remote** | Independently deployed feature app exposed via Module Federation |
| **remoteEntry.js** | Manifest file generated by MF — tells the host what's available |
| **Module Federation** | Webpack/Rspack feature for runtime code sharing across apps |
| **single-spa** | Framework for orchestrating multiple SPAs with lifecycle hooks |
| **Singleton (MF)** | Dependency that must only have one instance on the page |
| **Eager loading** | Loading a module at app bootstrap (vs lazy — on demand) |
| **Conway's Law** | Org structure is reflected in system architecture |
| **Independent deployability** | The core MFE promise — teams ship without coordinating |
| **Module boundary** | Nx-enforced rule about which team's code can import from which |
| **Affected build** | Nx feature — only rebuild/test what changed or depends on changes |
| **devRemotes** | Nx flag — run specific remotes live; others load from static |
| **Web Component** | Native browser custom element — framework-agnostic embedding |
| **Event bus** | Typed pub/sub channel for cross-remote communication |
| **Polyglot MFE** | Platform running multiple frameworks (Angular shell + React remote) |
