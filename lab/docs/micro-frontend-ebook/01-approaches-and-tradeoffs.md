# Chapter 01 — Micro-Frontend Approaches & Trade-offs

## TL;DR

| Approach | Best For | Main Cost |
|----------|----------|-----------|
| **Module Federation** | Same-framework teams, runtime composition, shared deps | Webpack/Rspack lock-in, version coordination |
| **single-spa** | Multi-framework apps, gradual migration | Framework overhead, manual lifecycle management |
| **iframes** | Maximum isolation, third-party embeds | UX friction, no shared DOM, deep linking pain |
| **Web Components** | Framework-agnostic widgets, design systems | Limited tooling, SSR complexity |
| **Build-time integration** | Simple monorepos, one team | No independent deployment — not truly "micro" |

> **One-liner for interviews:** "Module Federation for runtime composition with shared deps; single-spa for multi-framework; iframes for hard isolation. Most production MFE platforms today use Module Federation."

---

## Core Concept

### What Is a Micro-Frontend?

A micro-frontend extends the microservices idea to the frontend: **independently deployable, independently developed UI slices** owned by autonomous teams.

```
Monolith frontend               Micro-frontend platform
─────────────────               ───────────────────────
┌─────────────────┐             ┌──────────────────────┐
│                 │             │   Shell (Host)        │
│   One giant     │             │  ┌────┐ ┌────┐ ┌────┐│
│   React app     │    vs.      │  │MFE │ │MFE │ │MFE ││
│   one repo      │             │  │Team│ │Team│ │Team││
│   one deploy    │             │  │ A  │ │ B  │ │ C  ││
│                 │             │  └────┘ └────┘ └────┘│
└─────────────────┘             └──────────────────────┘
```

The fundamental promise: **Team A can deploy the checkout experience without Team B touching the navigation**.

### The Three Integration Points

Every MFE approach must answer three questions:

1. **When** does integration happen? (Build time vs. runtime)
2. **How** does the shell discover and load remotes?
3. **What** is shared between apps? (Framework, state, auth, styles)

---

## Deep Dive

### Approach 1: Module Federation (Webpack / Rspack)

Module Federation lets a running application **dynamically load code from another deployed application** at runtime — including sharing their dependencies.

**How it works:**

```
Shell app (host)                    Remote app
webpack.config.js                   webpack.config.js
─────────────────                   ──────────────────
ModuleFederationPlugin({            ModuleFederationPlugin({
  name: 'shell',                      name: 'checkout',
  remotes: {                          filename: 'remoteEntry.js',
    checkout:                         exposes: {
      'checkout@https://cdn.         './CheckoutApp':
        example.com/                    './src/App',
        remoteEntry.js',          })
  },
  shared: { react: { singleton: true } }
})
```

At runtime, the shell fetches `remoteEntry.js` from the checkout CDN. This manifest tells Webpack what modules are available and what dependencies they need. If both apps use React 18, only one copy loads.

**Strengths:**
- True runtime composition — remotes deploy independently, shell picks up changes without redeploying
- Shared dependencies prevent duplicate React/Angular instances
- Works with existing Webpack/Rspack builds — incremental adoption
- Vite federation available via `@originjs/vite-plugin-federation`

**Weaknesses:**
- Tight coupling to Webpack/Rspack build system
- Version mismatch bugs are subtle and hard to debug
- No SSR out of the box (requires `@module-federation/node`)
- Build configuration complexity grows with team count

---

### Approach 2: single-spa

single-spa is a **framework for orchestrating multiple SPAs** on one page. Each micro-frontend registers itself as an "application" with lifecycle hooks (bootstrap, mount, unmount). The single-spa router decides which apps are active based on the URL.

```javascript
// shell/src/main.js
import { registerApplication, start } from 'single-spa';

registerApplication({
  name: 'navbar',
  app: () => import('https://cdn.example.com/navbar/main.js'),
  activeWhen: () => true,   // always mounted
});

registerApplication({
  name: 'checkout',
  app: () => import('https://cdn.example.com/checkout/main.js'),
  activeWhen: (location) => location.pathname.startsWith('/checkout'),
});

start();
```

Each remote exports `bootstrap`, `mount`, `unmount` lifecycle functions. single-spa calls them at the right time.

**Strengths:**
- Framework-agnostic — run React, Angular, Vue side-by-side
- Excellent for **brownfield migration**: wrap legacy app as a single-spa app while new teams build in React
- Explicit lifecycle hooks — predictable mount/unmount behavior

**Weaknesses:**
- More boilerplate than Module Federation
- Each app must be built as a single-spa-compatible bundle (lifecycle exports)
- Shared dependencies require `SystemJS` import maps or manual coordination
- Single-spa router can conflict with each app's own router

---

### Approach 3: iframes

Each micro-frontend lives in a separate iframe. Maximum isolation — completely separate DOM, JS context, and styles.

```html
<!-- shell -->
<iframe src="https://checkout.example.com" id="checkout-frame"></iframe>

<!-- Cross-frame communication via postMessage -->
<script>
  document.getElementById('checkout-frame')
    .contentWindow
    .postMessage({ type: 'USER_AUTHENTICATED', userId: '123' }, 'https://checkout.example.com');
</script>
```

**Strengths:**
- Total isolation — one app crashing cannot affect another
- Security boundary for untrusted third-party widgets
- Each app is a completely independent deployment

**Weaknesses:**
- Deep linking and URL sync are painful
- Shared modals, tooltips, and dropdowns can't break out of iframe bounds
- Performance: separate browser context per frame
- Accessibility: focus management, screen readers struggle across frames
- Not suitable for cohesive UX — feels like embedded pages

**Use for:** Third-party widgets (payment forms, chatbots), admin embeds, legacy app integration where you can tolerate UX limitations.

---

### Approach 4: Web Components

Each MFE exposes a Custom Element. Framework-agnostic consumption — Angular, React, or plain HTML can use it.

```javascript
// checkout remote — publishes a Web Component
class CheckoutApp extends HTMLElement {
  connectedCallback() {
    const root = this.attachShadow({ mode: 'open' });
    ReactDOM.render(<CheckoutRoot />, root);
  }
  disconnectedCallback() {
    ReactDOM.unmountComponentAtNode(this.shadowRoot);
  }
}
customElements.define('checkout-app', CheckoutApp);
```

```html
<!-- Shell — any framework -->
<checkout-app user-id="123"></checkout-app>
```

**Strengths:**
- True framework agnosticism at the consumption point
- Shadow DOM provides style encapsulation
- Native browser standard — no runtime library needed to use

**Weaknesses:**
- SSR is complex (Declarative Shadow DOM is emerging but not universal)
- React's synthetic events don't bubble through shadow DOM naturally
- Tooling and testing support is weaker than framework-native solutions
- Angular/React inside a Web Component is common but adds boilerplate

---

### Decision Matrix

```
Are teams on different frameworks (React + Angular + Vue)?
  └─ YES → single-spa (multi-framework orchestration)
  └─ NO ↓

Do you need full DOM/JS isolation (third-party, security boundary)?
  └─ YES → iframes
  └─ NO ↓

Is runtime composition and shared dependencies critical?
  └─ YES → Module Federation (Webpack/Rspack/Vite)
  └─ NO ↓

Is this a design system with reusable components for any consumer?
  └─ YES → Web Components
  └─ NO → Consider if MFEs are even needed (see Chapter 05)
```

---

## Examples

### Module Federation: Exposing and Consuming

```javascript
// Remote: checkout/webpack.config.js
new ModuleFederationPlugin({
  name: 'checkout',
  filename: 'remoteEntry.js',
  exposes: {
    './App': './src/App',
    './CheckoutButton': './src/components/CheckoutButton',
  },
  shared: {
    react: { singleton: true, requiredVersion: '^18.0.0' },
    'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
  },
})

// Host: shell/webpack.config.js
new ModuleFederationPlugin({
  name: 'shell',
  remotes: {
    checkout: 'checkout@https://checkout.cdn.com/remoteEntry.js',
  },
  shared: {
    react: { singleton: true, requiredVersion: '^18.0.0' },
    'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
  },
})

// shell/src/App.tsx — lazy load the remote
const CheckoutApp = React.lazy(() => import('checkout/App'));

function Shell() {
  return (
    <Suspense fallback={<Spinner />}>
      <CheckoutApp />
    </Suspense>
  );
}
```

---

## Best Practices

- **One approach per platform.** Don't mix Module Federation and iframes unless there's a hard technical reason. Consistency reduces cognitive load.
- **Define your integration contract explicitly.** What props does each remote accept? What events does it emit? Document it like an API.
- **Shared dependencies must have a version policy.** Decide: strict version matching, or semver ranges? Mismatched React versions cause silent runtime bugs.
- **Load remotes lazily.** Never block the shell's initial paint on remote JS. Always use dynamic imports with Suspense or a loading state.
- **Isolate styles.** CSS Modules, Shadow DOM, or a strong BEM-style convention. Global CSS leaking between MFEs is one of the most common pain points.

---

## Common Mistakes

❌ **Sharing too much** — If 80% of your code is in a shared library, you haven't decomposed anything. Each remote should be mostly self-contained.

❌ **Mismatched singleton versions** — Running React 17 in the shell and React 18 in a remote causes `Invalid hook call` errors. Mark singletons explicitly and enforce version ranges.

❌ **No fallback for remote load failure** — If `remoteEntry.js` is unreachable, the shell should degrade gracefully, not crash. Always wrap remote imports in error boundaries.

❌ **Synchronous remote loading** — `import('checkout/App')` at the top of a file blocks hydration. Always lazy-load.

❌ **iframes for cohesive UX** — If the user shouldn't feel they're crossing an app boundary, iframes are the wrong tool.

---

## Interview Q&A

**Q: What's the difference between Module Federation and single-spa?**  
A: "Module Federation is a Webpack feature for sharing modules between builds at runtime — it's primarily a bundler-level concern. single-spa is a framework for orchestrating multiple SPAs on one page — it manages app lifecycles (mount, unmount) based on routing. They can be used together: single-spa handles routing and lifecycle, Module Federation handles how each remote's code is loaded and shared. Module Federation alone doesn't give you lifecycle management; single-spa alone doesn't handle shared dependencies."

**Q: Why would you choose iframes for a micro-frontend?**  
A: "Iframes are the right choice when you need a hard security or isolation boundary — for example, embedding a third-party payment widget, an untrusted analytics dashboard, or a legacy app you can't modify. The iframe's separate JS context prevents crashes in one app from affecting another. The trade-offs are significant though: deep linking is painful, modals and tooltips can't escape the frame, and focus management for accessibility is complex. For a cohesive, in-house product experience, Module Federation or single-spa is almost always better."

---

## Next Steps

- **Shell & Remotes** → [02-shell-remotes-routing.md](./02-shell-remotes-routing.md) — how the host/remote model works in practice
- **When Not to Use** → [05-when-not-to-use-mfe.md](./05-when-not-to-use-mfe.md) — the decision framework before you commit
- **Nx Setup** → [06-nx-mfe-angular-react.md](./06-nx-mfe-angular-react.md) — hands-on Module Federation with Nx
