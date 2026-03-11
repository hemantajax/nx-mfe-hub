# Chapter 01 — What Are Micro-Frontends?

## TL;DR

Micro-frontends apply microservices thinking to the frontend: split a large web application into independently developed, deployed, and owned UI slices — one per product team. Each slice is a vertical slice of the product, not a layer.

> **One-liner for interviews:** "Micro-frontends let multiple teams own and deploy their UI independently, the same way microservices let teams own their backend independently."

---

## Core Concept

### The Monolith Frontend Problem

Most large products start as a single frontend codebase. This works until it doesn't:

```
One React app  →  100+ engineers  →  one repo  →  one build  →  one deploy
```

Problems that emerge:
- **Deploy coupling:** Team A's bug blocks Team B's release
- **Codebase congestion:** PRs queue up, ownership is blurry, merge conflicts are constant
- **Tech lock-in:** Every team must use the same framework, same version, forever
- **Slow builds:** 10-minute CI for a 2-line change

Microservices solved this for the backend. Micro-frontends solve it for the frontend.

---

### The Mental Model: Vertical Slices

The key insight is **vertical ownership**, not horizontal layers:

```
❌ Horizontal (layers — traditional):
┌─────────────────────────────────────┐
│         UI Components Layer          │  ← Design team
├─────────────────────────────────────┤
│         State Management Layer       │  ← Frontend team
├─────────────────────────────────────┤
│         API / BFF Layer              │  ← Full-stack team
└─────────────────────────────────────┘

✅ Vertical (slices — micro-frontends):
┌──────────┬──────────┬──────────┬────┐
│  Orders  │ Checkout │ Profile  │ ...│
│    UI    │    UI    │    UI    │    │
│  State   │  State   │  State   │    │
│   API    │   API    │   API    │    │
└──────────┴──────────┴──────────┴────┘
  Team A      Team B     Team C
```

Each team owns their slice end-to-end: UI, state, API calls, deployment pipeline.

---

### What Changes With Micro-Frontends

| Concern | Monolith Frontend | Micro-Frontends |
|---------|-----------------|-----------------|
| **Ownership** | Shared / unclear | Team owns a domain slice |
| **Deploy** | Whole app deploys together | Each MFE deploys independently |
| **Tech choice** | One framework for all | Teams can use different frameworks |
| **Build time** | Grows with codebase | Each MFE builds independently |
| **Failure blast radius** | One bug can break everything | Failures isolated per MFE |
| **Team coordination** | High (shared codebase) | Lower (API contract between MFEs) |
| **Complexity** | Simple (one app) | High (distributed system) |

---

### Micro-Frontends Are a Conway's Law Response

Conway's Law: "Organizations design systems that mirror their communication structure."

If your org has 5 product teams and one frontend codebase, the code will accumulate cross-team coupling until it's painful to change. Micro-frontends align the architecture with the team structure:

```
Team: Orders     → owns orders-mfe
Team: Checkout   → owns checkout-mfe
Team: Profile    → owns profile-mfe
Team: Platform   → owns shell-app + design system
```

When the architecture mirrors the team structure, teams can move independently.

---

## Deep Dive

### What Is a Shell (Host) App?

The **shell** (also called host or app shell) is the container application that:
1. Provides the outer page chrome (nav, footer, auth context)
2. Loads and mounts remote MFEs at the correct routes
3. Owns global concerns: auth, routing, global error boundaries
4. Does NOT contain business logic for any specific domain

```
Shell App
├── /              → loads HomeRemote
├── /orders        → loads OrdersRemote
├── /checkout      → loads CheckoutRemote
└── /profile       → loads ProfileRemote
```

The shell is thin. It's infrastructure, not product.

---

### What Is a Remote?

A **remote** is an independently deployed frontend application that:
1. Exposes specific components or routes as consumable modules
2. Has its own build pipeline and deployment
3. Owns a specific product domain
4. Can be developed and tested in isolation

```
orders-remote (deployed to: https://orders.cdn.example.com)
├── Exposes: OrdersPage, OrderDetailPage, OrderWidget
├── Own router (sub-routes under /orders/*)
└── Own state management (orders context, redux slice, etc.)
```

---

### Integration Points

Micro-frontends can be integrated at different points in the lifecycle:

| Integration Point | How | Example |
|------------------|-----|---------|
| **Build time** | npm packages | Shared component library |
| **Server side** | SSI, Edge includes | Akamai ESI, Nginx SSI |
| **Runtime (client)** | Module Federation, single-spa | Webpack MF, dynamic imports |
| **iframe** | HTML iframe | Third-party embeds, max isolation |

**Runtime integration is the modern default** — it enables independent deployment while composing in the browser.

---

### Key Properties of a Good MFE System

1. **Independent deployment** — shipping orders-mfe does not require re-deploying checkout-mfe
2. **Technology agnostic** — orders team can use Angular; checkout team can use React
3. **Isolated failures** — a crash in the profile MFE doesn't take down checkout
4. **Owned routing** — each MFE controls its own sub-routes
5. **No shared runtime state** (as a rule) — MFEs communicate via contracts, not shared objects

---

## Examples

### Before MFE: One Big App

```
my-app/
├── src/
│   ├── features/
│   │   ├── orders/         ← Team A edits
│   │   ├── checkout/       ← Team B edits
│   │   └── profile/        ← Team C edits
│   ├── app.module.ts       ← everyone touches this
│   └── app-routing.ts      ← merge conflicts weekly
├── package.json            ← everyone bumps deps
└── CI: deploys ALL of this on every merge
```

### After MFE: Vertically Sliced

```
shell-app/               ← Platform Team (deploys: app.example.com)
orders-mfe/              ← Team A       (deploys: cdn/orders/latest/)
checkout-mfe/            ← Team B       (deploys: cdn/checkout/latest/)
profile-mfe/             ← Team C       (deploys: cdn/profile/latest/)
design-system/           ← Platform Team (npm: @company/ui)
```

Each deploys on its own cadence. Team A ships a hotfix to orders without touching anything else.

---

## Best Practices

- **Match MFE boundaries to team boundaries.** One team = one (or a few) MFEs. Don't split MFEs finer than your team structure — you'll create coordination overhead without independence.
- **Shell owns global, remotes own domain.** Auth state, global nav, error monitoring = shell. Business features = remotes. Never let remotes reach into the shell's internals.
- **Define a contract between shell and remotes.** What props does the shell pass in? What events does a remote emit? This interface is the API between teams.
- **Design for failure.** Every remote load should have an error boundary and a fallback. The page must remain usable when a remote fails to load.
- **Start with one team's pain.** Don't migrate everything at once. Identify the team that's most blocked by the monolith and extract their slice first.

---

## Common Mistakes

❌ **Splitting by component, not domain** — If you create a `button-mfe` and a `header-mfe`, you have more deployment overhead without team independence. Split by product domain.

❌ **Sharing too much state** — Passing a Redux store from the shell to all remotes recreates the monolith at runtime. Each MFE should manage its own state.

❌ **No contract between shell and remote** — Undocumented prop/event interfaces between apps lead to silent breakage when either side changes.

❌ **Treating MFE as a tech upgrade** — MFE is an organizational pattern, not a technology choice. Adopting it without the matching team structure adds complexity without the independence benefits.

❌ **Migrating everything at once** — Big-bang MFE migrations are high-risk. Use the strangler fig pattern: extract one domain at a time.

---

## Interview Q&A

**Q: What are micro-frontends and why would you use them?**  
A: "Micro-frontends apply the microservices principle to the frontend — split a large app into independently owned and deployed UI slices, one per product team. You'd use them when multiple teams are stepping on each other in a monolith frontend: deploy coupling slows everyone down, ownership is blurry, and teams can't choose their own tech or release cadence. The trade-off is real complexity — you now have a distributed frontend system — so it's only worth it when the team scale genuinely demands it."

**Q: What's the difference between a micro-frontend and a component library?**  
A: "A component library is build-time integration — you install it as an npm package and it ships with your app. A micro-frontend is runtime integration — it's a separately deployed application that's loaded and mounted in the browser at runtime. A component library shares UI primitives. A micro-frontend shares an entire product domain — its own routing, state, and business logic."

**Q: How is a shell app different from a regular app?**  
A: "The shell is infrastructure, not product. It provides the page chrome — nav, auth context, global error boundaries — and mounts remote MFEs at the appropriate routes. It has no business logic for any specific domain. The thinner the shell, the more independently the remotes can operate. If business logic creeps into the shell, you've recreated the coordination problem you were trying to avoid."

---

## Next Steps

- **MFE Approaches** → [02-mfe-approaches-and-techniques.md](./02-mfe-approaches-and-techniques.md) — Module Federation vs single-spa vs iframes
- **Shell & Routing** → [03-shell-remotes-and-routing.md](./03-shell-remotes-and-routing.md) — how to wire the shell and remotes together
- **When Not to Use** → [07-when-not-to-use-mfe.md](./07-when-not-to-use-mfe.md) — before committing, read this
