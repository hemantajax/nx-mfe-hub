# Chapter 02 — MFE Approaches & Techniques

## TL;DR

| Approach | Best For | Key Trade-off |
|----------|----------|---------------|
| **Module Federation** | Runtime JS composition, same-framework or cross-framework | Complex config; shared dep versioning |
| **single-spa** | Framework-agnostic orchestration, gradual migration | Heavyweight orchestration layer |
| **iframes** | Maximum isolation (third-party, security-critical) | Poor UX, no shared layout, slow |
| **Web Components** | Framework-agnostic UI sharing | Limited ecosystem, SSR friction |
| **ESM CDN** | Simple, dependency-free remote loading | Browser support, no HMR |

> **One-liner for interviews:** "Module Federation is the modern standard for runtime MFE composition. Use single-spa for framework-agnostic orchestration. iframes for maximum isolation at the cost of UX."

---

## Core Concept

Every MFE approach answers the same question: **how does one app load and run code from another app at runtime?** The approaches differ in where that loading happens, how isolated the result is, and how much the approaches share.

---

## Deep Dive

### 1. Module Federation (Webpack 5 / Rspack / Vite)

**What it is:** A Webpack 5 feature that lets one JavaScript bundle (`host`) dynamically import modules from another separately-deployed bundle (`remote`) at runtime — without pre-bundling them together.

**How it works:**

```
orders-remote  →  builds  →  remoteEntry.js (manifest)
                              + chunked JS files
                              deployed to: https://cdn.com/orders/

shell (host)  →  at runtime  →  fetch remoteEntry.js from orders URL
                              →  dynamically import OrdersPage module
                              →  mount it like a local component
```

**Webpack config — Remote (orders-mfe):**
```javascript
// webpack.config.js — orders-mfe
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'orders',                    // unique remote name
      filename: 'remoteEntry.js',        // manifest file
      exposes: {
        './OrdersPage': './src/pages/OrdersPage',
        './OrderWidget': './src/components/OrderWidget',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
      },
    }),
  ],
};
```

**Webpack config — Host (shell):**
```javascript
// webpack.config.js — shell
new ModuleFederationPlugin({
  name: 'shell',
  remotes: {
    orders: 'orders@https://cdn.com/orders/remoteEntry.js',
  },
  shared: {
    react: { singleton: true, requiredVersion: '^18.0.0' },
    'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
  },
})
```

**Consuming in the shell:**
```tsx
// Shell — lazy-load the remote component
const OrdersPage = React.lazy(() => import('orders/OrdersPage'));

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/orders/*" element={<OrdersPage />} />
      </Routes>
    </Suspense>
  );
}
```

**Dynamic remotes (URL from config, not hardcoded):**
```javascript
// Load remote URL from a manifest API — enables runtime switching
async function loadRemote(name, url) {
  await __webpack_init_sharing__('default');
  const container = await loadScript(url);   // fetch remoteEntry.js
  await container.init(__webpack_share_scopes__.default);
  const factory = await container.get('./OrdersPage');
  return factory();
}
```

**Strengths:**
- Native Webpack — no extra runtime library
- Works with React, Angular, Vue, Svelte
- Shared singleton dependencies (one copy of React across all MFEs)
- HMR works in development

**Weaknesses:**
- Webpack-specific (though Rspack and Vite Federation Plugin offer similar APIs)
- Shared dep version negotiation is subtle and error-prone
- `remoteEntry.js` URLs must be known at build or load time
- SSR requires additional setup (Module Federation SSR is complex)

---

### 2. single-spa

**What it is:** A JavaScript router/orchestrator that manages the lifecycle (bootstrap, mount, unmount) of multiple framework applications on the same page.

```
single-spa root config
├── registers: orders-app   (Angular)
├── registers: checkout-app (React)
├── registers: profile-app  (Vue)
└── activates each based on URL path
```

**Root config:**
```javascript
import { registerApplication, start } from 'single-spa';

registerApplication({
  name: 'orders',
  app: () => import('orders/app'),           // dynamic import
  activeWhen: ['/orders'],
  customProps: { authToken: getAuthToken },
});

registerApplication({
  name: 'checkout',
  app: () => import('checkout/app'),
  activeWhen: ['/checkout'],
});

start();
```

**Each registered app exports lifecycle hooks:**
```javascript
// orders-app — single-spa lifecycle hooks
export async function bootstrap(props) {
  // one-time init
}

export async function mount(props) {
  // render to DOM
  ReactDOM.render(<OrdersApp {...props} />, document.getElementById('orders-root'));
}

export async function unmount(props) {
  ReactDOM.unmountComponentAtNode(document.getElementById('orders-root'));
}
```

**Strengths:**
- Framework-agnostic orchestration (Angular + React + Vue on same page — genuinely)
- Mature ecosystem, well-documented
- Good for gradual monolith migration (add one MFE at a time)

**Weaknesses:**
- More orchestration overhead than Module Federation
- Each app ships its own framework bundle unless shared carefully
- Router conflict risk (each framework wants to own the URL)
- Steeper learning curve for teams new to MFE

---

### 3. iframes

**What it is:** The browser's native isolation primitive. Each MFE is a full page loaded in an `<iframe>`.

```html
<!-- Shell -->
<iframe src="https://orders.example.com/widget" 
        title="Orders"
        sandbox="allow-scripts allow-same-origin">
</iframe>
```

**Communication via `postMessage`:**
```javascript
// Shell → iframe
iframe.contentWindow.postMessage({ type: 'AUTH_TOKEN', token }, 'https://orders.example.com');

// iframe → Shell
window.parent.postMessage({ type: 'ORDER_PLACED', orderId }, 'https://shell.example.com');

// Shell listens
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://orders.example.com') return;
  if (event.data.type === 'ORDER_PLACED') handleOrderPlaced(event.data);
});
```

**Strengths:**
- Maximum isolation — separate JS context, separate DOM, separate storage
- Can load any tech stack with zero integration work
- Security boundary: CSP, sandboxing attributes, origin isolation
- Perfect for third-party content, payments widgets, legacy apps

**Weaknesses:**
- Cannot share layout (scrolling, modals, tooltips get clipped by iframe boundary)
- No shared CSS — consistent styling requires effort
- Each iframe loads a full HTML page (slower, heavier)
- Accessibility is significantly harder
- SEO: iframe content is not indexed

**Use iframes for:** Payment forms (Stripe, Braintree), legacy apps you can't rewrite, high-security isolated widgets, third-party embeds.

---

### 4. Web Components

**What it is:** Custom HTML elements that encapsulate their own DOM and styles using native browser APIs (Custom Elements + Shadow DOM).

```javascript
// orders-mfe defines a custom element
class OrdersWidget extends HTMLElement {
  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<div class="orders-widget">...</div>`;
  }

  // Observe attribute changes for data passing
  static get observedAttributes() { return ['user-id']; }
  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'user-id') this.loadOrders(newVal);
  }
}

customElements.define('orders-widget', OrdersWidget);
```

```html
<!-- Shell uses it like a native HTML element -->
<orders-widget user-id="123"></orders-widget>
```

**Strengths:**
- Native browser standard — no framework coupling
- Shadow DOM provides style encapsulation
- Works with any framework in the consuming app
- Good for widgets and UI fragments (not full pages)

**Weaknesses:**
- Complex data passing (attributes are strings; objects need serialization or properties)
- Shadow DOM makes shared global styles harder
- SSR support is immature
- Less useful for full-page MFEs (routing, complex state)

---

### 5. ESM CDN (Native ES Modules)

**What it is:** Serve each MFE as native ES modules from a CDN. The shell uses dynamic `import()` to load them.

```javascript
// Shell loads remote module directly from CDN
const { OrdersPage } = await import('https://cdn.example.com/orders/1.2.0/index.js');
```

**Strengths:** Zero tooling overhead, native browser feature, cacheable at the module level.  
**Weaknesses:** No shared dependencies (each remote ships its own copy of React), limited HMR, CORS configuration required.

---

## Comparison Summary

```
Isolation:     iframe  >  Web Components  >  Module Federation  >  single-spa
Flexibility:   MF/spa  >  Web Components  >  iframe
DX:            MF      >  single-spa  >  Web Components  >  iframe
SSR support:   iframe  >  single-spa  ≈  MF  >  Web Components
Framework-agnostic: iframe = WC = single-spa > MF (framework coupling is lighter in MF but exists)
```

---

## Best Practices

- **Module Federation for greenfield, same-JS-ecosystem MFEs.** It's the most ergonomic for React+React or Angular+Angular compositions.
- **single-spa for polyglot or legacy migration.** Its framework-agnostic lifecycle hooks are its superpower.
- **iframes for third-party, payments, or high-security isolation.** Don't fight the iframe's limitations — embrace them where isolation is the goal.
- **Never mix Module Federation and single-spa** unless you have a very specific reason. Pick one orchestration strategy.
- **Use `singleton: true` for React and Angular in Module Federation.** Multiple instances of React on the same page will break hooks.

---

## Common Mistakes

❌ **Not marking React as singleton in Module Federation** — Two React instances on the page = broken hooks, context isolation, event handler issues.

❌ **Hardcoding remote URLs** — Use a remote manifest API or environment config so you can promote versions without rebuilding the shell.

❌ **Using iframes for routing** — iframes can't integrate with the shell's router. Clicking "back" in the browser may not behave as expected.

❌ **Web Components for full pages** — Web Components excel as UI widgets, not full application routes with their own router and state.

---

## Interview Q&A

**Q: What is Module Federation and how does it work?**  
A: "Module Federation is a Webpack 5 feature that enables one JavaScript application to dynamically import and use modules from another separately-deployed application at runtime. The remote app exposes specific modules via a `remoteEntry.js` manifest file. The host app references that manifest URL and loads modules from it on demand — like a dynamic import, but the code comes from a different deployment. Shared dependencies like React can be declared as singletons so both apps use the same instance."

**Q: When would you use single-spa over Module Federation?**  
A: "single-spa when you need to compose apps built in genuinely different frameworks — Angular team, React team, Vue team — on the same page with independent lifecycle management. It's also the better fit for gradual monolith migration because you can register one app at a time. Module Federation is a better choice when all teams use the same framework or you want tighter JS module sharing with less orchestration overhead."

**Q: Why would you ever use iframes in a modern MFE architecture?**  
A: "iframes are the right tool when isolation is the primary requirement — payment widgets, third-party embeds, legacy apps you can't rewrite, or security-sensitive content that needs its own origin. The iframe boundary is the strongest isolation primitive the browser provides. The UX limitations (shared layout, modals, scrolling) are real, which is why iframes aren't used for primary navigation flows — but for contained widgets with clear boundaries, they're the correct choice."

---

## Next Steps

- **Shell & Routing** → [03-shell-remotes-and-routing.md](./03-shell-remotes-and-routing.md) — wiring shell and Module Federation remotes together
- **Shared Dependencies** → [04-shared-dependencies-and-design-systems.md](./04-shared-dependencies-and-design-systems.md) — singleton configuration deep dive
- **Nx Setup** → [08-nx-mfe-angular-react.md](./08-nx-mfe-angular-react.md) — practical Module Federation with Nx
