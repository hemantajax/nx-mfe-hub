# Chapter 06 — Nx Monorepo: Module Federation with Angular & React

## TL;DR

Nx is a build system + monorepo tool that has **first-class Module Federation support** for both Angular and React. It generates the webpack configs, manages shared dependencies, handles affected builds, and wires up local dev servers — removing the hardest parts of MFE setup.

> **One-liner for interviews:** "Nx handles the Module Federation boilerplate — webpack config, shared deps, affected CI. You focus on feature code; Nx wires the MFE plumbing."

---

## Core Concept

### What Nx Adds to Module Federation

| Without Nx | With Nx |
|-----------|---------|
| Hand-written webpack.config.js per app | Generated and managed webpack configs |
| Manual shared dependency tracking | Automatic shared dep detection |
| Run all apps to test integration | `nx serve shell --devRemotes=checkout` |
| Full rebuild on every change | Affected builds — only rebuild what changed |
| No workspace dependency graph | `nx graph` visualizes all app/lib relationships |
| Manual CI setup | Nx Cloud distributed caching + affected commands |

---

## Deep Dive

### Workspace Structure

```
my-platform/
├── apps/
│   ├── shell/              ← Host application (Angular or React)
│   ├── checkout/           ← Remote (Angular)
│   ├── profile/            ← Remote (React)
│   └── dashboard/          ← Remote (Angular)
├── libs/
│   ├── shared/
│   │   ├── ui/             ← Shared component library
│   │   ├── auth/           ← Auth utilities (singleton)
│   │   ├── events/         ← Typed event bus
│   │   └── types/          ← Shared TypeScript interfaces
│   ├── checkout/
│   │   ├── feature/        ← Smart components (pages)
│   │   ├── ui/             ← Dumb components
│   │   └── data-access/    ← Services, state
│   └── profile/
│       ├── feature/
│       ├── ui/
│       └── data-access/
├── nx.json
└── package.json
```

**Key Nx convention:** Apps are thin entry points. Business logic lives in `libs/`. Libs are the unit of code ownership — Team Checkout owns `libs/checkout/`.

---

## Part A: Angular + Module Federation with Nx

### 1. Create the Workspace

```bash
# Create a new Nx workspace
npx create-nx-workspace@latest my-platform \
  --preset=angular-monorepo \
  --appName=shell \
  --style=scss \
  --nxCloud=yes

cd my-platform
```

### 2. Add Module Federation to the Shell (Host)

```bash
# Convert the shell app to a Module Federation host
nx g @nx/angular:setup-mf shell --mfType=host --port=4200
```

This generates/updates:
- `apps/shell/module-federation.config.ts` — MF config
- `apps/shell/webpack.config.ts` — references the MF config
- `apps/shell/webpack.prod.config.ts` — production build config

**Generated `module-federation.config.ts`:**
```typescript
// apps/shell/module-federation.config.ts
import { ModuleFederationConfig } from '@nx/webpack';

const config: ModuleFederationConfig = {
  name: 'shell',
  remotes: ['checkout', 'profile'],  // Will be populated as you add remotes
};

export default config;
```

### 3. Generate Remote Apps

```bash
# Generate checkout remote (Angular)
nx g @nx/angular:remote checkout \
  --host=shell \
  --port=4201 \
  --style=scss

# Generate profile remote (Angular)
nx g @nx/angular:remote profile \
  --host=shell \
  --port=4202 \
  --style=scss
```

Nx automatically:
- Creates `apps/checkout/` with MF config
- Updates `apps/shell/module-federation.config.ts` to include `checkout`
- Wires up lazy-loaded routes in the shell

**Auto-generated shell routing update:**
```typescript
// apps/shell/src/app/app.routes.ts
import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: 'checkout',
    loadChildren: () =>
      loadRemoteModule('checkout', './Routes').then(m => m.remoteRoutes),
  },
  {
    path: 'profile',
    loadChildren: () =>
      loadRemoteModule('profile', './Routes').then(m => m.remoteRoutes),
  },
];
```

**Auto-generated remote routes (checkout):**
```typescript
// apps/checkout/src/app/remote-entry/entry.routes.ts
import { Route } from '@angular/router';
import { RemoteEntryComponent } from './entry.component';

export const remoteRoutes: Route[] = [
  { path: '', component: RemoteEntryComponent },
];
```

### 4. Shared Dependencies (Angular)

```typescript
// apps/shell/module-federation.config.ts
import { ModuleFederationConfig } from '@nx/webpack';
import { sharedMappings } from '@nx/angular/mf';

const config: ModuleFederationConfig = {
  name: 'shell',
  remotes: ['checkout', 'profile'],
  shared: (libName, defaults) => {
    // Nx auto-detects workspace libs and marks them as shared
    if (sharedMappings[libName]) {
      return { ...defaults, singleton: true, strictVersion: false };
    }
    // Framework libs — must be singletons
    if (['@angular/core', '@angular/common', '@angular/router'].includes(libName)) {
      return { ...defaults, singleton: true, strictVersion: true };
    }
    return false; // Don't share everything else
  },
};

export default config;
```

### 5. Serving Locally (Angular)

```bash
# Serve shell + all remotes (each on its own port)
nx serve shell

# Serve shell with only checkout as a live remote (others load from static)
nx serve shell --devRemotes=checkout

# Serve checkout in isolation (no shell)
nx serve checkout
```

`--devRemotes` is Nx's killer feature for MFE dev. You only run the remotes you're actively working on. Other remotes load from their built static files or a staging URL.

### 6. Production Build (Angular)

```bash
# Build all apps for production
nx run-many --target=build --all --configuration=production

# Or build only affected apps (CI optimization)
nx affected --target=build --configuration=production
```

Output structure:
```
dist/
  apps/
    shell/       ← Deploy to app server / CDN root
    checkout/    ← Deploy to CDN /checkout/
    profile/     ← Deploy to CDN /profile/
```

---

## Part B: React + Module Federation with Nx

### 1. Create a React Workspace

```bash
npx create-nx-workspace@latest my-platform \
  --preset=react-monorepo \
  --appName=shell \
  --bundler=webpack \
  --style=scss

cd my-platform
```

> **Note:** Use `--bundler=webpack` for Module Federation. Vite federation support exists via `@nx/vite` + `@originjs/vite-plugin-federation` but is less mature.

### 2. Add Module Federation to Shell

```bash
nx g @nx/react:setup-mf shell --mfType=host --port=3000
```

Generated config:
```typescript
// apps/shell/module-federation.config.ts
import { ModuleFederationConfig } from '@nx/webpack';

const config: ModuleFederationConfig = {
  name: 'shell',
  remotes: [],
};

export default config;
```

### 3. Generate React Remotes

```bash
nx g @nx/react:remote checkout --host=shell --port=3001
nx g @nx/react:remote profile  --host=shell --port=3002
```

**Generated remote entry component:**
```tsx
// apps/checkout/src/app/remote-entry/entry.tsx
export function Entry() {
  return (
    <div>
      <h1>Checkout Remote</h1>
    </div>
  );
}

export default Entry;
```

**Generated remote's webpack config (exposing the entry):**
```typescript
// apps/checkout/module-federation.config.ts
import { ModuleFederationConfig } from '@nx/webpack';

const config: ModuleFederationConfig = {
  name: 'checkout',
  exposes: {
    './Module': './src/remote-entry.ts',  // Entry point for the shell
  },
};

export default config;
```

**Shell routing (auto-generated):**
```tsx
// apps/shell/src/app/app.tsx
import { Route, Routes, Link } from 'react-router-dom';
import { Suspense, lazy } from 'react';

const CheckoutEntry = lazy(() => import('checkout/Module'));
const ProfileEntry  = lazy(() => import('profile/Module'));

export function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/"          element={<HomePage />} />
        <Route path="/checkout/*" element={<CheckoutEntry />} />
        <Route path="/profile/*"  element={<ProfileEntry />} />
      </Routes>
    </Suspense>
  );
}
```

### 4. Shared Dependencies (React)

```typescript
// apps/shell/module-federation.config.ts
import { ModuleFederationConfig } from '@nx/webpack';

const config: ModuleFederationConfig = {
  name: 'shell',
  remotes: ['checkout', 'profile'],
  shared: (libName, defaults) => {
    // Singletons — must have only one instance
    const singletons = [
      'react', 'react-dom', 'react-router-dom',
      'react-router', '@tanstack/react-query',
    ];
    if (singletons.includes(libName)) {
      return { ...defaults, singleton: true, strictVersion: false };
    }
    // Workspace libs — share but don't enforce singleton
    if (libName.startsWith('@my-platform/')) {
      return { ...defaults, singleton: false };
    }
    return false;
  },
};

export default config;
```

### 5. Serving Locally (React)

```bash
# Serve all
nx serve shell

# Serve with specific live remotes
nx serve shell --devRemotes=checkout

# Serve remote in isolation with its own mock providers
nx serve checkout
```

For isolation dev with mock auth, add a standalone `main.tsx` to the remote:

```tsx
// apps/checkout/src/main.tsx — for standalone development
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MockAuthProvider } from '@my-platform/shared-auth/testing';
import { App } from './app/app';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <MockAuthProvider user={{ id: 'dev-user', name: 'Dev User' }}>
        <App />
      </MockAuthProvider>
    </BrowserRouter>
  </StrictMode>
);
```

---

## Part C: Angular Shell + React Remote (Polyglot MFE)

One of the most powerful Nx + MFE scenarios: an Angular shell hosting a React remote (or vice versa).

### Why This Works

Module Federation doesn't care about frameworks — it shares JavaScript modules. As long as each app manages its own framework bootstrapping, they coexist on the same page.

### Angular Shell Setup

```typescript
// apps/shell/module-federation.config.ts (Angular host)
const config: ModuleFederationConfig = {
  name: 'shell',
  remotes: ['react-checkout'],  // React remote
  shared: {
    // Angular singletons
    '@angular/core': { singleton: true },
    '@angular/common': { singleton: true },
    // React singletons (from the React remote)
    react: { singleton: true, requiredVersion: '^18.0.0' },
    'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
  },
};
```

### React Remote with Web Component Wrapper

The cleanest way to embed React in Angular: the React remote exposes a Web Component.

```tsx
// apps/react-checkout/src/bootstrap.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { CheckoutApp } from './app/checkout-app';

class CheckoutElement extends HTMLElement {
  private root: ReturnType<typeof createRoot> | null = null;

  connectedCallback() {
    this.root = createRoot(this);
    this.root.render(
      <React.StrictMode>
        <CheckoutApp
          userId={this.getAttribute('user-id') ?? ''}
          onComplete={(orderId) => {
            this.dispatchEvent(new CustomEvent('checkout-complete', {
              detail: { orderId },
              bubbles: true,
            }));
          }}
        />
      </React.StrictMode>
    );
  }

  disconnectedCallback() {
    this.root?.unmount();
  }
}

customElements.define('checkout-app', CheckoutElement);
```

```typescript
// apps/react-checkout/module-federation.config.ts
const config: ModuleFederationConfig = {
  name: 'reactCheckout',
  exposes: {
    './WebComponent': './src/bootstrap.tsx',
  },
};
```

**Consuming in Angular shell:**
```typescript
// apps/shell/src/app/checkout-page/checkout-page.component.ts
import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { loadRemoteModule } from '@angular-architects/module-federation';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <checkout-app
      [attr.user-id]="userId"
      (checkout-complete)="onCheckoutComplete($event)">
    </checkout-app>
  `,
})
export class CheckoutPageComponent implements OnInit {
  userId = 'user_123';

  async ngOnInit() {
    // Load the React remote — registers the Web Component
    await loadRemoteModule({
      type: 'module',
      remoteEntry: 'http://localhost:3001/remoteEntry.js',
      exposedModule: './WebComponent',
    });
  }

  onCheckoutComplete(event: CustomEvent) {
    console.log('Order completed:', event.detail.orderId);
  }
}
```

---

## Part D: Nx Affected & CI

### The Key Nx Superpower

Nx knows your dependency graph. `nx affected` only builds/tests apps and libs that were actually changed (or depend on changed code).

```bash
# In CI — only build what's affected by this PR
nx affected --target=build --base=origin/main

# Only test affected
nx affected --target=test --base=origin/main

# See what's affected
nx affected:graph --base=origin/main
```

If a developer only changes `libs/checkout/feature`, Nx rebuilds:
- `libs/checkout/feature` ✅
- `apps/checkout` (depends on it) ✅
- `apps/shell` (depends on checkout) — ✅ or ❌ depending on config

If they change `libs/shared/ui`, Nx rebuilds everything that uses it.

### CI Pipeline with Nx Affected

```yaml
# .github/workflows/ci.yml
jobs:
  affected:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history needed for affected

      - name: Install deps
        run: npm ci

      - name: Lint affected
        run: npx nx affected --target=lint --base=origin/main

      - name: Test affected
        run: npx nx affected --target=test --base=origin/main

      - name: Build affected
        run: npx nx affected --target=build --base=origin/main --configuration=production

  deploy:
    needs: affected
    steps:
      - name: Deploy changed remotes
        run: |
          # Nx outputs a list of affected projects
          AFFECTED=$(npx nx show projects --affected --base=origin/main)
          for app in $AFFECTED; do
            if [[ "$app" == "checkout" || "$app" == "profile" ]]; then
              echo "Deploying $app..."
              aws s3 sync dist/apps/$app/ s3://cdn-bucket/$app/latest/
            fi
          done
```

### Module Boundary Enforcement

Nx lets you define and enforce which libs can import which others — preventing accidental coupling between team domains:

```json
// nx.json
{
  "targetDefaults": {},
  "generators": {},
  "plugins": [
    {
      "plugin": "@nx/eslint/plugin",
      "options": {
        "targetName": "lint"
      }
    }
  ]
}
```

```json
// .eslintrc.json
{
  "rules": {
    "@nx/enforce-module-boundaries": [
      "error",
      {
        "depConstraints": [
          {
            "sourceTag": "scope:checkout",
            "onlyDependOnLibsWithTags": ["scope:checkout", "scope:shared"]
          },
          {
            "sourceTag": "scope:profile",
            "onlyDependOnLibsWithTags": ["scope:profile", "scope:shared"]
          },
          {
            "sourceTag": "scope:shell",
            "onlyDependOnLibsWithTags": ["scope:shell", "scope:shared"]
          }
        ]
      }
    ]
  }
}
```

Tag your projects:
```json
// apps/checkout/project.json
{
  "tags": ["scope:checkout", "type:app"]
}
```

Now ESLint throws if `apps/checkout` tries to import from `libs/profile/`. Team boundaries enforced at the linter level.

---

## Best Practices

- **Use `nx g @nx/angular:remote` / `nx g @nx/react:remote`** — Don't hand-write webpack MF configs. Nx generators produce battle-tested configurations.
- **`--devRemotes` for local development** — Run only the remotes you're touching. Others load from built output or staging.
- **Isolate remotes with their own `main.tsx`/`main.ts`** — Each remote should be runnable standalone with mock providers. Non-negotiable for team velocity.
- **Enforce module boundaries with Nx tags** — Define `scope:*` tags and `@nx/enforce-module-boundaries` rules. Prevents accidental cross-team coupling before it reaches code review.
- **Use Nx Cloud for CI caching** — Nx Cloud caches build/test results. If the same commit built on another machine, CI skips the work. Drastic CI time reductions in monorepos.
- **Generate shared libs, not shared apps** — Business logic goes in `libs/`, not `apps/`. Apps are thin; libs are tested and versioned independently.

---

## Common Mistakes

❌ **Hand-writing webpack MF configs in an Nx workspace** — Nx generators handle this correctly. Hand-rolling introduces subtle bugs (wrong shared config, missing `eager` flags) that are hard to debug.

❌ **Importing between apps (checkout importing from profile)** — Nx module boundaries prevent this. Enforce them from day one.

❌ **No standalone mode for remotes** — If a developer must run the entire platform to work on checkout, onboarding takes an hour and iteration is slow. Always add a standalone dev entry.

❌ **Not using `nx affected` in CI** — Running `nx run-many --all` builds everything on every PR. In a large monorepo, this takes 20–40 minutes. `nx affected` cuts it to the relevant subset.

❌ **Mixing Angular and React without a clear boundary** — Polyglot MFEs are powerful but add complexity. Document exactly which apps use which framework and why. Don't add a second framework casually.

---

## Interview Q&A

**Q: How does Nx help with micro-frontends?**  
A: "Nx has first-class Module Federation support for both Angular and React. The generators produce correct webpack configs automatically, manage the shared dependency configuration, and wire up lazy-loaded routes in the shell. The big operational win is `nx affected` — it knows the dependency graph, so CI only builds and tests apps that are actually changed. In a large MFE platform, that's the difference between 5-minute and 40-minute CI runs."

**Q: How do you set up Module Federation with Angular and Nx?**  
A: "Three commands: `nx g @nx/angular:setup-mf shell --mfType=host` to make the shell a Module Federation host, then `nx g @nx/angular:remote checkout --host=shell` for each remote. Nx generates the webpack configs, updates the shell's MF config to include the new remote, and adds the lazy-loaded route. For local dev, `nx serve shell --devRemotes=checkout` runs both with live reloading. For CI, `nx affected --target=build` rebuilds only what changed."

**Q: Can Angular and React coexist in a Module Federation setup?**  
A: "Yes. Module Federation is framework-agnostic — it shares JavaScript modules regardless of framework. The cleanest integration is to expose the React remote as a Web Component from its `bootstrap.tsx`. Angular consumes the custom element via `CUSTOM_ELEMENTS_SCHEMA` and the `loadRemoteModule` utility from `@angular-architects/module-federation`. Communication happens through HTML attributes (inputs) and DOM events (outputs). The main config concern is declaring both framework's singletons in the shared config so you don't end up with two React instances or two Angular zones."

**Q: How do you enforce team ownership of code in an Nx monorepo?**  
A: "With Nx module boundary tags. Each project gets tagged with its scope — `scope:checkout`, `scope:profile`, `scope:shared`. The `@nx/enforce-module-boundaries` ESLint rule defines which scopes can depend on which others. Checkout can import from `scope:shared` but not from `scope:profile`. Violations are linting errors that fail in CI before they reach code review. It's the architectural guardrail that makes a monorepo viable at team scale."

---

## Quick Reference: Nx MFE Commands

```bash
# Create workspace
npx create-nx-workspace@latest my-platform --preset=angular-monorepo

# Setup MFE
nx g @nx/angular:setup-mf shell --mfType=host --port=4200
nx g @nx/angular:remote checkout --host=shell --port=4201

# React equivalents
nx g @nx/react:setup-mf shell --mfType=host --port=3000
nx g @nx/react:remote checkout --host=shell --port=3001

# Serve
nx serve shell                          # Shell + all remotes
nx serve shell --devRemotes=checkout   # Shell + checkout live, others static
nx serve checkout                       # Checkout standalone

# Build
nx build shell --configuration=production
nx run-many --target=build --all
nx affected --target=build --base=origin/main

# Graph
nx graph                               # Visual dependency graph
nx affected:graph --base=origin/main  # What's affected by this change

# Generate shared lib
nx g @nx/angular:library shared-auth --directory=libs/shared/auth
nx g @nx/react:library shared-ui --directory=libs/shared/ui
```

---

## Next Steps

- **Cheat Sheet** → [07-cheat-sheet-and-qa.md](./07-cheat-sheet-and-qa.md) — all commands and patterns on one page
- **Deployment** → [04-deployment-and-versioning.md](./04-deployment-and-versioning.md) — CI/CD for Nx-built remotes
- **When Not to Use** → [05-when-not-to-use-mfe.md](./05-when-not-to-use-mfe.md) — justify before you implement
