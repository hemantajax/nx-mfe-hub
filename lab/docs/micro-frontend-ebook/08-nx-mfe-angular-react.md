# Chapter 08 — Nx Monorepo: MFE with Angular & React

## TL;DR

Nx is a smart build system with first-class Module Federation support for both Angular and React. It generates the shell/remote scaffold, configures webpack MF automatically, enforces module boundaries, and provides incremental builds — so you get MFE independence in production while still having a cohesive developer experience in the monorepo.

> **One-liner for interviews:** "Nx generates the full Module Federation setup for Angular and React MFEs, enforces module boundaries, and caches builds — giving you independent deployability with a monorepo DX."

---

## Core Concept

### Why Nx for MFE?

MFE in a monorepo sounds contradictory — "aren't they separate repos?" — but a monorepo with Nx gives you:

- **Shared code** (design system, utils, types) without npm publish overhead
- **Atomic commits** that change shell + remote together when needed
- **Enforced boundaries** — Nx prevents orders-mfe from importing checkout-mfe's internals
- **Generated Module Federation config** — no manual webpack MF setup
- **Affected builds** — only rebuild what changed, not the entire workspace
- **Consistent tooling** — same lint, test, build commands across all apps

The monorepo is the development environment. Each app still deploys independently in production.

---

## Workspace Structure

```
my-workspace/
├── apps/
│   ├── shell/                    ← Host app (React or Angular)
│   ├── orders-mfe/               ← Remote: Orders domain
│   ├── checkout-mfe/             ← Remote: Checkout domain
│   ├── profile-mfe/              ← Remote: Profile domain
│   └── shell-e2e/                ← Cypress E2E for the composed app
├── libs/
│   ├── shared/
│   │   ├── ui/                   ← Design system components
│   │   ├── auth/                 ← Auth context & hooks
│   │   ├── types/                ← Shared TypeScript interfaces
│   │   └── utils/                ← Shared utilities
│   ├── orders/
│   │   ├── data-access/          ← Orders API calls & state
│   │   ├── feature-list/         ← Orders list feature
│   │   └── feature-detail/       ← Order detail feature
│   └── checkout/
│       ├── data-access/
│       └── feature-checkout/
├── nx.json
└── package.json
```

**Key principle:** Apps are deployment units (thin). Libs are where the real code lives.

---

## Part A: React MFE with Nx

### Step 1 — Create the Workspace

```bash
# Create a new Nx workspace
npx create-nx-workspace@latest my-workspace \
  --preset=react \
  --bundler=webpack \
  --no-interactive

cd my-workspace
```

### Step 2 — Generate Shell (Host)

```bash
nx generate @nx/react:host shell \
  --directory=apps/shell \
  --style=css \
  --bundler=webpack \
  --no-interactive
```

This generates:
```
apps/shell/
├── src/
│   ├── app/
│   │   ├── app.tsx          ← Router with lazy remote imports
│   │   └── app.module.css
│   ├── bootstrap.tsx        ← Async entry (dynamic import)
│   └── main.ts              ← import('./bootstrap') only
├── module-federation.config.ts  ← MF config
└── webpack.config.ts
```

Generated `module-federation.config.ts`:
```typescript
import { ModuleFederationConfig } from '@nx/webpack';

const config: ModuleFederationConfig = {
  name: 'shell',
  remotes: ['orders', 'checkout', 'profile'],
};

export default config;
```

Generated `webpack.config.ts`:
```typescript
import { composePlugins, withNx } from '@nx/webpack';
import { withReact } from '@nx/react';
import { withModuleFederation } from '@nx/react/module-federation';
import mfConfig from './module-federation.config';

export default composePlugins(
  withNx(),
  withReact(),
  withModuleFederation(mfConfig)    // ← Nx handles all MF config
);
```

### Step 3 — Generate Remotes

```bash
# Generate orders remote
nx generate @nx/react:remote orders \
  --directory=apps/orders-mfe \
  --host=shell \
  --no-interactive

# Generate checkout remote
nx generate @nx/react:remote checkout \
  --directory=apps/checkout-mfe \
  --host=shell \
  --no-interactive
```

This automatically:
1. Creates the remote app with async bootstrap
2. Updates the shell's `module-federation.config.ts` to include the new remote
3. Configures shared dependencies (React, ReactDOM as singletons)
4. Sets up dev server ports (shell: 4200, orders: 4201, checkout: 4202, etc.)

Generated remote `module-federation.config.ts`:
```typescript
import { ModuleFederationConfig } from '@nx/webpack';

const config: ModuleFederationConfig = {
  name: 'orders',
  exposes: {
    './Module': './src/remote-entry.ts',   // ← expose the app's entry
  },
};

export default config;
```

Generated `remote-entry.ts`:
```typescript
// apps/orders-mfe/src/remote-entry.ts
export { AppModule } from './app/app.module';  // For Angular
// or
export { default as App } from './app/app';    // For React
```

### Step 4 — Shell Routing (React)

Nx generates the shell with lazy remote imports pre-wired:

```tsx
// apps/shell/src/app/app.tsx
import { Suspense, lazy } from 'react';
import { Route, Routes, Link } from 'react-router-dom';
import { PageSkeleton } from '@my-workspace/shared/ui';

// Generated by Nx — these come from the remotes
const OrdersApp   = lazy(() => import('orders/Module'));
const CheckoutApp = lazy(() => import('checkout/Module'));

export function App() {
  return (
    <>
      <nav>
        <Link to="/orders">Orders</Link>
        <Link to="/checkout">Checkout</Link>
      </nav>

      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/orders/*"   element={<OrdersApp />} />
          <Route path="/checkout/*" element={<CheckoutApp />} />
        </Routes>
      </Suspense>
    </>
  );
}
```

### Step 5 — Generate Shared Libraries

```bash
# Shared UI library
nx generate @nx/react:library shared-ui \
  --directory=libs/shared/ui \
  --component=false

# Auth context library
nx generate @nx/react:library shared-auth \
  --directory=libs/shared/auth

# Orders data access
nx generate @nx/react:library orders-data-access \
  --directory=libs/orders/data-access
```

### Step 6 — Enforce Module Boundaries

```json
// nx.json — tag-based boundary enforcement
{
  "targetDefaults": {},
  "namedInputs": {},
  "generators": {
    "@nx/react": {
      "library": { "linter": "eslint" }
    }
  }
}
```

```json
// .eslintrc.json — boundary rules
{
  "rules": {
    "@nx/enforce-module-boundaries": [
      "error",
      {
        "enforceBuildableLibDependencyConstraints": true,
        "depConstraints": [
          {
            "sourceTag": "scope:orders",
            "onlyDependOnLibsWithTags": ["scope:orders", "scope:shared"]
          },
          {
            "sourceTag": "scope:checkout",
            "onlyDependOnLibsWithTags": ["scope:checkout", "scope:shared"]
          },
          {
            "sourceTag": "scope:shell",
            "onlyDependOnLibsWithTags": ["scope:shared", "type:util"]
          }
        ]
      }
    ]
  }
}
```

Tag your projects:
```json
// apps/orders-mfe/project.json
{ "tags": ["scope:orders", "type:app"] }

// libs/orders/data-access/project.json
{ "tags": ["scope:orders", "type:data-access"] }

// libs/shared/ui/project.json
{ "tags": ["scope:shared", "type:ui"] }
```

Now `orders-mfe` importing from `checkout/feature-list` throws a lint error.

### Step 7 — Run the Full MFE Locally

```bash
# Run shell + all remotes simultaneously
nx run-many --target=serve --projects=shell,orders,checkout,profile --parallel

# Shell:    http://localhost:4200
# Orders:   http://localhost:4201
# Checkout: http://localhost:4202
# Profile:  http://localhost:4203
```

Or run just the shell (Nx serves remotes as static from their build output):
```bash
nx serve shell --devRemotes=orders,checkout
```

---

## Part B: Angular MFE with Nx

### Step 1 — Create Angular Workspace

```bash
npx create-nx-workspace@latest my-ng-workspace \
  --preset=angular-monorepo \
  --bundler=webpack \
  --no-interactive
```

### Step 2 — Generate Angular Shell (Host)

```bash
nx generate @nx/angular:host shell \
  --directory=apps/shell \
  --style=scss \
  --no-standalone \
  --no-interactive
```

Generated `module-federation.config.ts`:
```typescript
import { ModuleFederationConfig } from '@nx/webpack';

const config: ModuleFederationConfig = {
  name: 'shell',
  remotes: ['orders', 'checkout'],
};

export default config;
```

Generated shell routing (`app-routing.module.ts`):
```typescript
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { loadRemoteModule } from '@nx/angular/mf';

const routes: Routes = [
  {
    path: 'orders',
    loadChildren: () =>
      loadRemoteModule('orders', './Module').then(m => m.RemoteEntryModule),
  },
  {
    path: 'checkout',
    loadChildren: () =>
      loadRemoteModule('checkout', './Module').then(m => m.RemoteEntryModule),
  },
  { path: '', redirectTo: '/orders', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
```

### Step 3 — Generate Angular Remotes

```bash
nx generate @nx/angular:remote orders \
  --directory=apps/orders-mfe \
  --host=shell \
  --no-standalone \
  --no-interactive

nx generate @nx/angular:remote checkout \
  --directory=apps/checkout-mfe \
  --host=shell \
  --no-standalone \
  --no-interactive
```

Each remote generates a `RemoteEntryModule`:
```typescript
// apps/orders-mfe/src/app/remote-entry/entry.module.ts
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { OrdersModule } from '../orders/orders.module';

@NgModule({
  imports: [
    OrdersModule,
    RouterModule.forChild([
      { path: '',       component: OrdersListComponent },
      { path: ':id',    component: OrderDetailComponent },
    ]),
  ],
})
export class RemoteEntryModule {}
```

And exposes it via `module-federation.config.ts`:
```typescript
const config: ModuleFederationConfig = {
  name: 'orders',
  exposes: {
    './Module': './src/app/remote-entry/entry.module.ts',
  },
};
```

### Step 4 — Angular Shared Services Across MFEs

Angular's DI system is per-module. Share services via a `SharedModule` in a lib:

```typescript
// libs/shared/auth/src/lib/auth.service.ts
@Injectable({ providedIn: 'root' })   // root = singleton across the app
export class AuthService {
  private token$ = new BehaviorSubject<string | null>(null);
  
  get token(): string | null { return this.token$.value; }
  
  setToken(token: string) { this.token$.next(token); }
  
  getToken$(): Observable<string | null> { return this.token$.asObservable(); }
}
```

**Important for Angular MFE:** `providedIn: 'root'` works correctly only when the service is in a shared library that's declared as a singleton in Module Federation. If each remote bundles its own copy of the service, `root` creates separate instances.

```typescript
// module-federation.config.ts (all apps)
shared: {
  '@my-workspace/shared/auth': { singleton: true, strictVersion: false },
}
```

### Step 5 — Cross-Framework Shell (Angular Shell + React Remote)

This is the advanced case: Shell is Angular, one remote is React (legacy migration scenario).

```typescript
// module-federation.config.ts — Angular shell
const config: ModuleFederationConfig = {
  name: 'shell',
  remotes: [
    'orders',             // Angular remote
    'legacyDashboard',    // React remote
  ],
  shared: {
    // Only share framework-agnostic deps
    'rxjs': { singleton: true },
    '@my-workspace/shared/types': { singleton: true },
    // Do NOT share React or Angular as singleton across frameworks
  },
};
```

```typescript
// Angular shell — loading a React remote
// apps/shell/src/app/app-routing.module.ts
{
  path: 'dashboard',
  component: ReactWrapperComponent,  // Angular component that mounts React
  data: { remote: 'legacyDashboard', module: './DashboardApp' },
}
```

```typescript
// ReactWrapperComponent — mounts React MFE inside Angular
@Component({
  selector: 'app-react-wrapper',
  template: '<div #reactRoot></div>',
})
export class ReactWrapperComponent implements OnInit, OnDestroy {
  @ViewChild('reactRoot', { static: true }) rootRef!: ElementRef;
  private root: ReactRoot | null = null;

  async ngOnInit() {
    const { DashboardApp } = await loadRemoteModule('legacyDashboard', './DashboardApp');
    this.root = createRoot(this.rootRef.nativeElement);
    this.root.render(createElement(DashboardApp));
  }

  ngOnDestroy() {
    this.root?.unmount();
  }
}
```

---

## Part C: Nx-Specific Superpowers

### Affected Builds

```bash
# Only build/test what changed since main
nx affected --target=build
nx affected --target=test

# CI: only deploy remotes that changed
nx affected --target=deploy --base=origin/main --head=HEAD
```

If you only changed `orders-mfe`, Nx builds only `orders-mfe` (and its dependencies). The `checkout-mfe` and `profile-mfe` builds are cached.

### Build Cache

```bash
# Second build of unchanged code is instant — served from cache
nx build orders  # builds in 2 min
nx build orders  # returns in 0.1s — cached

# Remote cache (Nx Cloud) — shared across the team
# Team member's machine gets YOUR build cache
```

### Dependency Graph

```bash
# Visualize the dependency graph
nx graph

# See which apps depend on a library
nx graph --focus=shared-auth
```

### Generate Code

```bash
# Add a new feature to the orders lib
nx generate @nx/react:component OrderSummary \
  --project=orders-feature-list \
  --export

# Add a new remote to the workspace
nx generate @nx/react:remote payments \
  --host=shell
```

---

## Development Workflow Summary

```bash
# 1. Create workspace
npx create-nx-workspace@latest my-workspace --preset=react

# 2. Generate shell
nx g @nx/react:host shell

# 3. Generate remotes
nx g @nx/react:remote orders --host=shell
nx g @nx/react:remote checkout --host=shell

# 4. Generate shared libs
nx g @nx/react:library shared-ui --directory=libs/shared/ui
nx g @nx/react:library shared-auth --directory=libs/shared/auth

# 5. Tag projects + add boundary rules in .eslintrc.json

# 6. Develop
nx run-many --target=serve --projects=shell,orders,checkout --parallel

# 7. Build
nx build shell
nx build orders
nx build checkout

# 8. CI — affected only
nx affected --target=build,test,lint

# 9. Deploy (each app independently to CDN)
nx affected --target=deploy
```

---

## Best Practices

- **Put code in libs, not apps.** Apps are thin wrappers. The testable, reusable code belongs in libs.
- **Tag every project.** Module boundary enforcement only works when all projects are tagged.
- **Use `nx affected` in CI.** Never build the entire workspace on every commit.
- **Set up Nx Cloud early.** Remote caching is a game-changer for team DX — build once, everyone benefits.
- **Use `--devRemotes` flag.** During development of one remote, serve other remotes as static builds — saves memory.
- **Use `@nx/angular:library` for Angular-specific libs, `@nx/js:library` for framework-agnostic.** Framework-agnostic libs can be shared between Angular and React apps in a mixed workspace.

---

## Common Mistakes

❌ **Business logic in apps** — If you put a complex service in `apps/shell/src`, it can't be shared. Put it in `libs/shared/`.

❌ **Forgetting to tag projects** — Module boundary rules are silent if projects aren't tagged. Run `nx graph` to verify tags.

❌ **Using `nx build shell` to test MFE integration** — The shell's build doesn't include remotes. Use `nx serve shell --devRemotes=orders,checkout` for integration testing.

❌ **Shared Angular services without singleton MF config** — Two remotes that both import `AuthService` will each get their own instance unless the lib is declared as a singleton in Module Federation.

---

## Interview Q&A

**Q: How does Nx help with micro-frontend development?**  
A: "Nx generates the entire Module Federation scaffold for Angular and React — the shell, remotes, webpack configs, async entry points, and shared dependency configuration — with a single command. You don't write webpack MF config by hand. It also enforces module boundaries with lint rules, so orders-mfe can't accidentally import checkout internals. And `nx affected` means CI only rebuilds what changed, so even a 20-remote workspace has fast pipelines."

**Q: How do you structure code in an Nx MFE workspace?**  
A: "Apps are thin deployment shells — they hold routing and mount components from libs. All real code — features, services, state, components — lives in libs. This means libs are testable in isolation and shareable across apps. Libs are organized by scope (orders, checkout, shared) and type (feature, data-access, ui, util). The scope determines which apps can use a lib, enforced by Nx's boundary rules."

**Q: Can you mix Angular and React in an Nx MFE workspace?**  
A: "Yes. You can have an Angular shell loading a React remote (or vice versa). The Angular shell mounts the React remote in a wrapper component using `createRoot` from React DOM, loaded via `loadRemoteModule`. The key is not declaring React and Angular as shared singletons across the boundary — each framework has its own runtime. Framework-agnostic libs (types, utilities, API clients) can be shared across both."

**Q: How does `nx affected` work in an MFE context?**  
A: "Nx builds a dependency graph of the entire workspace. When you run `nx affected`, it compares the current branch to main, identifies which projects have changed or have a dependency that changed, and only runs the target for those projects. In MFE, this means if only the orders-mfe changed, only orders-mfe builds and deploys — checkout-mfe and profile-mfe are untouched. This is what makes the monorepo + independent deployment combination practical."

---

## Next Steps

- **Cheat Sheet** → [09-cheat-sheet-and-qa.md](./09-cheat-sheet-and-qa.md) — complete reference including Nx commands
- **Deployment** → [06-deployment-and-versioning.md](./06-deployment-and-versioning.md) — deploying Nx-built MFEs to CDN independently
