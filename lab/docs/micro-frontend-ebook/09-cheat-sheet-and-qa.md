# Chapter 09 — Cheat Sheet & Interview Q&A

> This is your fast-reference sheet. Read the morning of your interview.

---

## MFE Decision Card

```
Are you experiencing deploy coupling pain with 5+ teams?
  └─ NO  → Don't use MFE. Use Nx module boundaries + lazy loading.
  └─ YES ↓

Do you have clear vertical domain ownership?
  └─ NO  → Fix team topology first. MFE won't help blurry ownership.
  └─ YES ↓

Do you have a platform team to maintain shell + infrastructure?
  └─ NO  → Build the platform team first, then adopt MFE.
  └─ YES → Proceed with MFE. Start with strangler fig extraction.
```

---

## Approach Selection Card

```
Same JS ecosystem, runtime composition, modern greenfield?
  └─ Module Federation (Webpack 5 / Nx)

Polyglot frameworks (Angular + React + Vue), gradual migration?
  └─ single-spa

Maximum isolation, third-party, security-sensitive, legacy embed?
  └─ iframes + postMessage

Framework-agnostic UI widgets (not full pages)?
  └─ Web Components

Simple, low-deps remote loading?
  └─ Native ESM / dynamic import
```

---

## Module Federation — Critical Config

```javascript
// Remote — every remote must have this exact pattern
const config: ModuleFederationConfig = {
  name: 'orders',             // unique, no spaces
  filename: 'remoteEntry.js', // the manifest file
  exposes: {
    './Module': './src/remote-entry.ts',
  },
  shared: {
    react:     { singleton: true, requiredVersion: '^18.0.0' },
    'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
  },
};

// ⚠️ ASYNC ENTRY POINT — required or singleton loading breaks
// main.ts:      import('./bootstrap');   ← ONLY this
// bootstrap.ts: import React from 'react'; ReactDOM.render(...)
```

---

## Shell Responsibilities (Quick List)

✅ Shell owns: auth context, global nav, top-level routing, event bus, error boundaries  
❌ Shell does NOT own: domain state, business logic, remote sub-routes

---

## Routing — Two-Tier Rules

```
Shell router: /orders/* → mount OrdersRemote    (wildcard — required!)
Remote router: handles /orders/, /orders/:id, /orders/:id/items

Rules:
  - ONE BrowserRouter (in the shell)
  - Remotes use Routes, NOT BrowserRouter
  - Remotes navigate via shell context navigate(), NOT direct imports
  - Cross-remote: emit event → shell routes
```

---

## State Ownership — Quick Rules

| State Type | Owner |
|-----------|-------|
| Auth / current user / token | Shell |
| Global theme / locale | Shell |
| Domain state (orders, cart, profile) | Each Remote |
| Cross-MFE communication | Event Bus (shell-owned) |
| Navigation context | URL params |
| Transient redirect context | sessionStorage (consume-once) |

**Never:** shared Redux/Zustand store across MFEs  
**Never:** remote importing from another remote  
**Always:** event bus for cross-MFE communication  

---

## Deployment — Quick Reference

```
Each remote deploys to:
  https://cdn.com/{remote-name}/{version}/remoteEntry.js  (60s TTL)
  https://cdn.com/{remote-name}/{version}/*.chunk.js      (immutable, 1yr TTL)

Shell discovers versions from:
  GET /api/mfe-manifest  →  { orders: "..url..", checkout: "..url.." }

Rollback:
  PATCH /api/mfe-manifest  { remote: "orders", version: "2.4.0" }

CI pipeline per remote:
  build → upload to versioned CDN path → update manifest → done
```

---

## Nx — Essential Commands

```bash
# Setup
npx create-nx-workspace@latest my-ws --preset=react
nx g @nx/react:host shell
nx g @nx/react:remote orders --host=shell

# Angular
nx g @nx/angular:host shell
nx g @nx/angular:remote orders --host=shell

# Develop
nx run-many --target=serve --projects=shell,orders --parallel
nx serve shell --devRemotes=orders,checkout

# Build / Test
nx build orders
nx test orders
nx lint orders

# CI — only what changed
nx affected --target=build,test,lint --base=origin/main

# Visualize
nx graph
```

---

## Nx Project Structure

```
apps/
  shell/                  → thin host app (routing + layout)
  orders-mfe/             → thin remote app (entry + routing)
libs/
  shared/ui/              → design system (scope:shared)
  shared/auth/            → auth context (scope:shared)
  shared/types/           → TypeScript interfaces (scope:shared)
  orders/data-access/     → API calls + state (scope:orders)
  orders/feature-list/    → OrdersListPage (scope:orders)
  orders/feature-detail/  → OrderDetailPage (scope:orders)
```

Tag rules:
```
scope:orders  → can only import scope:orders + scope:shared
scope:shell   → can only import scope:shared
scope:shared  → no restrictions
```

---

## 25 Interview Q&A — Fast Reference

**Q: What are micro-frontends?**  
A: Applying microservices thinking to the frontend — split a large app into independently deployed UI slices, one per product team, with vertical domain ownership.

**Q: When would you actually use MFEs?**  
A: 5+ teams, clear domain boundaries, measurable deploy coupling pain, and a platform team to own the infrastructure. Not before.

**Q: What's Module Federation?**  
A: Webpack 5 feature allowing one deployed JS bundle to dynamically import modules from another deployed bundle at runtime — without pre-bundling.

**Q: Why does React need to be a singleton in Module Federation?**  
A: React hooks depend on a single React instance. Multiple instances = broken hooks, broken context, event system conflicts.

**Q: What's the async entry point pattern?**  
A: `main.ts` does only `import('./bootstrap')`. `bootstrap.ts` has the real startup code. The dynamic import creates an async boundary for Module Federation to resolve shared deps before React loads.

**Q: Shell vs API Gateway — difference?**  
A: Gateway = infra (routing, rate limits, TLS) — platform team. Shell = UI composition (aggregation, auth context, routing to remotes) — frontend team.

**Q: How does routing work in MFE?**  
A: Two-tier. Shell maps URL prefixes to remotes (`/orders/*`). Remotes own sub-routes internally. One BrowserRouter in the shell. Remotes inherit router context.

**Q: What happens if a remote fails to load?**  
A: Error boundary catches the failure, shows fallback UI, logs the failure. Rest of the app keeps working. Remote load failures must never crash the shell.

**Q: How do remotes communicate?**  
A: Via the shell's event bus (typed events) or via URL params. Never by importing from each other directly.

**Q: How do you share auth across MFEs?**  
A: Shell handles auth, exposes user + token via React context (or Angular service) from a shared `@company/shell-context` package. Remotes consume it for their API calls.

**Q: What's wrong with a shared Redux store across MFEs?**  
A: Couples all remotes to the same state interface. Any shape change requires updating all teams. You've recreated the monolith at the state layer.

**Q: How does independent deployment work?**  
A: Each remote has its own CI pipeline. New version deploys to immutable versioned CDN path. Pipeline updates a manifest service. Shell reads manifest at runtime and loads current version. No shell redeploy needed.

**Q: How do you roll back an MFE?**  
A: Update the manifest to point at the previous version's CDN URL. It's still there (immutable deployment). Next page load uses the old version.

**Q: What's the strangler fig migration pattern?**  
A: Wrap monolith in shell. Extract one domain to a remote at a time. Monolith handles everything else. Repeat until monolith is empty.

**Q: How does Nx help with MFE?**  
A: Generates Module Federation scaffold, enforces module boundaries via lint rules, provides affected builds (only rebuild what changed), remote build caching, and consistent tooling across apps.

**Q: What's `nx affected`?**  
A: Builds/tests only projects that changed or have a changed dependency, compared to the base branch. In CI, this means only modified remotes get rebuilt and deployed.

**Q: How do you mix Angular and React in an Nx MFE workspace?**  
A: Angular shell wraps a React remote in a component using `createRoot`. Framework-agnostic libs (types, utils) are shared. React and Angular are NOT shared singletons — each framework has its own runtime.

**Q: What are module boundary rules in Nx?**  
A: ESLint rules that enforce which projects can import from which, based on tags. `scope:orders` can't import from `scope:checkout`. Prevents hidden cross-domain coupling.

**Q: How do you handle CSS isolation between MFEs?**  
A: CSS Modules (class name hashing), CSS-in-JS (scoped class generation), or strict BEM namespace prefixes. Never global styles from remotes — they leak into the shell and other remotes.

**Q: What's the right CDN caching strategy for MFEs?**  
A: `remoteEntry.js` → short TTL (60s), must-revalidate. Content-hashed chunk files → immutable, max-age=1 year. Never overwrite a versioned path.

**Q: What's a compatible version range in Module Federation?**  
A: When multiple remotes declare the same shared dep, MF loads the highest version within all declared ranges. If one remote requires `^17` and others `^18`, it can't satisfy both — the `^17` remote loads its own copy (breaking singleton).

**Q: How do you prevent remote version drift?**  
A: Shared `federation.config.ts` file that all apps import for consistent `shared` configuration. CI fails if a remote is more than one major version behind key singletons.

**Q: How do feature flags work with MFE deployment?**  
A: Manifest supports canary versions per remote with a percentage. Shell resolves which URL to load per user based on the canary rollout config. Allows progressive deployment before full promotion.

**Q: When should you NOT use iframes for MFE?**  
A: When you need shared layout (nav, modals, global styles), deep routing integration, performance (each iframe is a full page load), or accessibility (iframes are hard to make accessible).

**Q: What do you put in apps vs libs in Nx?**  
A: Apps are thin deployment wrappers — entry point, routing, remote entry. All business logic, components, services, and state live in libs. Libs are testable in isolation; apps are tested via e2e.

---

## Vocabulary Fast Reference

| Term | Definition |
|------|-----------|
| **Shell / Host** | Container app: provides chrome, mounts remotes, owns auth and routing |
| **Remote** | Independently deployed app exposing modules via Module Federation |
| **Module Federation** | Webpack 5 feature for runtime cross-bundle module sharing |
| **remoteEntry.js** | Manifest file from a remote, lists exposed modules and shared deps |
| **singleton** | Shared dep that must have exactly one instance on the page |
| **Async entry point** | `main.ts` doing only `import('./bootstrap')` — required for MF singleton loading |
| **Strangler fig** | Incremental migration: extract one domain at a time, don't big-bang |
| **Event bus** | Pub/sub channel owned by the shell for typed cross-MFE communication |
| **MFE manifest** | Server-side JSON mapping remote names to their current CDN URLs |
| **Affected builds** | Nx feature: only rebuild projects that changed or have changed dependencies |
| **Module boundary** | Nx lint rule: enforces which projects can import from which via tags |
| **single-spa** | Framework-agnostic MFE orchestrator managing app lifecycle hooks |
| **Conway's Law** | Architecture mirrors team communication structure |
| **Vertical slice** | Team owns a domain end-to-end: UI + state + API (vs horizontal layers) |
| **Canary deploy** | Release to % of users before full rollout; catch issues with real traffic |

---

## System Design Talking Points

When asked "design a micro-frontend platform":

1. **Why MFE?** — State the org problem: N teams, deploy coupling, independent cadences
2. **Approach** — Module Federation (or single-spa for polyglot), reasons
3. **Shell responsibilities** — auth, global nav, top-level routing, event bus
4. **Remote ownership** — each team owns a vertical domain slice
5. **Routing model** — two-tier, shell routes to remote, remote owns sub-routes
6. **Shared deps** — singletons in MF config, async entry points
7. **Cross-MFE communication** — typed event bus, URL params, never shared store
8. **Auth flow** — shell authenticates, provides token via context to all remotes
9. **Deployment** — versioned CDN paths, manifest service, per-remote CI, rollback
10. **When not to** — acknowledge complexity, say you'd only use this at 5+ teams
11. **Nx** — if asked about tooling: generator, boundary enforcement, affected builds

Mention trade-offs at every step.
