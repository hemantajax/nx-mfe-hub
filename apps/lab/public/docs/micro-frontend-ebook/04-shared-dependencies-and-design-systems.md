# Chapter 04 — Shared Dependencies & Design Systems

## TL;DR

Without coordination, every remote ships its own copy of React, Angular, or your design system — doubling or tripling the page's JavaScript weight. Module Federation's `shared` config solves this by negotiating a single instance of each dependency at runtime.

> **One-liner for interviews:** "Declare shared dependencies as singletons in Module Federation so every remote uses one copy of React. Without this, you get multiple React instances, broken hooks, and megabytes of duplicate code."

---

## Core Concept

### The Duplicate Dependency Problem

Without sharing:
```
Shell loads:         react@18.2  (45KB)
orders-remote loads: react@18.2  (45KB) — duplicate!
checkout-remote:     react@18.2  (45KB) — duplicate!
profile-remote:      react@18.2  (45KB) — duplicate!

Total React JS: 180KB — should be 45KB
Plus: multiple React instances = broken hooks
```

With Module Federation `shared`:
```
Shell loads:         react@18.2  (45KB)
orders-remote:       ← uses shell's copy (0KB additional)
checkout-remote:     ← uses shell's copy (0KB additional)
profile-remote:      ← uses shell's copy (0KB additional)

Total React JS: 45KB ✅
Plus: one React instance = hooks work correctly
```

---

## Deep Dive

### Module Federation `shared` Config

```javascript
// Every app (shell + all remotes) must declare the same shared config
const sharedDeps = {
  react: {
    singleton: true,         // only one instance allowed on the page
    requiredVersion: '^18.0.0',
    eager: false,            // load on demand (not in initial chunk)
  },
  'react-dom': {
    singleton: true,
    requiredVersion: '^18.0.0',
    eager: false,
  },
  'react-router-dom': {
    singleton: true,         // one router — must be singleton
    requiredVersion: '^6.0.0',
  },
  '@company/design-system': {
    singleton: true,
    requiredVersion: '^3.0.0',
  },
};
```

---

### Version Negotiation Rules

Module Federation negotiates at runtime:

```
Shell ships:         react@18.2.0
orders-remote ships: react@18.2.0  → same version → share ✅
checkout-remote:     react@18.3.0  → higher compatible → upgrade shared to 18.3 ✅
profile-remote:      react@17.0.2  → incompatible with ^18 → LOADS ITS OWN COPY ⚠️
```

With `singleton: true`, an incompatible version logs a warning but still falls back to the highest compatible version. This means **profile-remote's React 17 hooks won't work properly** — it's silently broken.

**Version discipline is critical in MFE.** All teams should use the same major version of singleton deps.

---

### The `eager` Flag (Important Gotcha)

```javascript
// shell/src/index.ts
// ❌ WRONG — synchronous import of a shared module
import React from 'react';
ReactDOM.render(<App />, document.getElementById('root'));
```

```javascript
// ✅ CORRECT — dynamic import (async boundary)
// shell/src/index.ts
import('./bootstrap');   // bootstrap.ts contains the ReactDOM.render call
```

Why: Module Federation loads shared deps asynchronously. If your entry point synchronously imports React before the async loading has resolved, it loads its own copy — breaking the singleton guarantee.

**Every MFE must use an async entry point via dynamic import.**

---

### Design System Sharing Strategy

Your design system is the most sensitive shared dep — every team uses it, and breaking changes affect everyone.

#### Option A: npm package (build-time sharing)

```json
{
  "dependencies": {
    "@company/design-system": "^3.0.0"
  }
}
```

Each team installs the design system. Module Federation de-duplicates it at runtime via `shared`. Teams control when they upgrade.

**Trade-off:** Teams can lag on upgrades → multiple versions on the page → shared singleton fails → design inconsistency.

#### Option B: Remote (runtime sharing)

```javascript
// design-system is its own MFE remote
new ModuleFederationPlugin({
  remotes: {
    ds: 'designSystem@https://cdn.com/design-system/remoteEntry.js',
  },
})
```

```tsx
const { Button, Modal } = await import('ds/components');
```

**Trade-off:** The design system must be deployed independently. All remotes are always on the same version (latest). A DS bug affects everyone immediately.

#### Option C: Hybrid (recommended)

- **Primitive tokens** (colors, spacing, typography) — CSS variables, ship via CDN stylesheet
- **Foundational components** (Button, Input, Modal) — npm package, shared in Module Federation
- **Domain-specific components** — owned by each team, built with foundational components

```html
<!-- In shell's index.html — CSS variables for all remotes -->
<link rel="stylesheet" href="https://cdn.com/design-tokens/3.0.css" />
```

---

### CSS Isolation

Each remote's styles must not bleed into other remotes or the shell.

#### CSS Modules (Webpack)
```css
/* OrdersPage.module.css */
.container { padding: 24px; }   /* compiled to: orders-remote__container__abc123 */
```
Scoped by default. No global pollution.

#### Shadow DOM (Web Components)
```javascript
const shadow = element.attachShadow({ mode: 'open' });
// Styles inside shadow DOM don't leak
```

#### CSS-in-JS (styled-components, Emotion)
```tsx
const Container = styled.div`padding: 24px;`;
// Generates unique className — scoped by default
```

#### CSS Naming Convention (fallback)
```css
/* orders-remote uses a namespace prefix */
.orders-page__container { }
.orders-page__header { }
```

**Avoid global CSS in remotes.** `body { margin: 0 }` in orders-remote affects the entire shell.

---

## Best Practices

- **All teams use the same major version of singleton deps.** Create a shared `federation.config.js` file that all apps import for their `shared` configuration — one source of truth.
- **Async entry points everywhere.** Every MFE's entry file must use a dynamic import to avoid eager singleton loading.
- **Scope all CSS.** No global styles from remotes. Use CSS Modules, CSS-in-JS, or strict BEM namespacing.
- **Pin design system version in CI.** Fail the build if a remote is more than one major version behind the design system.
- **Test with version mismatches deliberately.** Simulate a remote on an older React version in CI to catch silent singleton failures.

---

## Common Mistakes

❌ **Forgetting the async entry point** — Shell and remotes with synchronous `import React` bypass the shared module system. Each gets its own React copy. Hooks break silently.

❌ **Different singleton dep versions across teams** — Profile team on React 17, everyone else on React 18. The singleton negotiation fails. Profile either loads a duplicate or breaks.

❌ **Global CSS in remotes** — `* { box-sizing: border-box }` in a remote resets the entire page's box model including the shell.

❌ **Sharing too many deps** — Not everything needs to be shared. Only deps that must be singletons (React, Angular, the router) or are heavy enough to de-duplicate (lodash, moment) deserve shared config.

---

## Interview Q&A

**Q: How does Module Federation handle shared dependencies?**  
A: "Through the `shared` config. Each app — shell and all remotes — declares which packages it wants to share and at what version range. At runtime, Module Federation negotiates and loads the highest compatible version once, then reuses it for all consumers. For packages like React and Angular, you mark them as `singleton: true`, which means only one instance is allowed. Without this, every remote loads its own copy — wasting bandwidth and, for React, breaking hooks because they depend on a single React instance."

**Q: What's the async entry point pattern and why is it required?**  
A: "Module Federation resolves shared dependencies asynchronously. If your entry file synchronously imports React before that resolution happens, it loads its own copy and bypasses the shared singleton. The fix is to have your entry file — `index.js` — only do `import('./bootstrap')`, and put all your real startup code in `bootstrap.js`. The dynamic import creates an async boundary that lets Module Federation resolve shared deps first."

---

## Next Steps

- **State & Auth** → [05-state-and-auth-across-apps.md](./05-state-and-auth-across-apps.md) — sharing auth and state across the now-dep-optimized MFEs
- **Deployment** → [06-deployment-and-versioning.md](./06-deployment-and-versioning.md) — versioning the design system remote
