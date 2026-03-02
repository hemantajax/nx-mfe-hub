# 12 — Interview Q&A Cheat Sheet (Architect Level)

> **How to use this file:** Read the question, cover the answer, give your version, then compare. Focus on depth — senior/architect interviewers reward the "why" more than the "what".

---

## Architecture Questions

---

**Q1: How would you design an Angular architecture for a product-based enterprise app?**

> I use feature-based standalone architecture. Each feature is a self-contained module with its own components (split into smart pages and dumb presentational components), services, NgRx state slice, and lazy-loaded routes. Core holds singleton services like auth, logging, and interceptors — `providedIn: 'root'`. Shared holds only reusable UI components — no business logic. I use OnPush change detection everywhere, memoized NgRx selectors, and `@defer` for intra-page component splitting. The structure supports team ownership, lazy loading, and future microfrontend extraction.

---

**Q2: What is the difference between Core and Shared in Angular?**

> Core is for singleton services that should exist exactly once across the entire app — auth, HTTP interceptors, error handlers, app initializers. These are provided with `providedIn: 'root'`. Shared is for reusable UI-only components, pipes, and directives that have no business logic — buttons, modals, tables. The critical distinction is: Shared has no API calls, no state management, no routing. If something has business logic — it belongs in Core or in a feature module, not in Shared.

---

**Q3: Feature-based vs layer-based architecture — which do you prefer and why?**

> Feature-based, always — for enterprise applications. Layer-based (components/, services/, models/ at root level) works for small apps but collapses at scale. When 10 teams are working simultaneously, layer-based puts all their code in the same folders — no team ownership, no isolation. Feature-based gives each team their own feature folder. Lazy loading is natural because each feature is already self-contained. Microfrontend migration is straightforward. Onboarding is faster because the code location is predictable.

---

**Q4: When would you still use NgModules in Angular 18?**

> Almost never for new code. Standalone components are the official Angular direction and the default in Angular 17+. The only valid scenarios for NgModules today are: integrating with legacy libraries that haven't migrated yet, or maintaining backward compatibility in a library that consumers might use in older Angular versions. For all new features, standalone is strictly better — better tree shaking, cleaner lazy loading, no boilerplate.

---

**Q5: Explain DI scope options in Angular.**

> Angular has four main scopes. `providedIn: 'root'` — single instance for the entire app, eager singleton. `providedIn: 'any'` — new instance per lazy-loaded module or component tree, useful for feature-specific caches that shouldn't be shared. `providedIn: 'platform'` — shared across multiple Angular app instances on the same page (micro-frontends). Component-level `providers: [MyService]` in the `@Component` decorator — new instance scoped to that component's subtree, destroyed when the component destroys. Choosing the wrong scope is a common source of state sharing bugs.

---

## Change Detection Questions

---

**Q6: Explain how Angular change detection works internally.**

> Angular builds a component tree and maintains a change detector per component, which stores the previous values of all template bindings. Zone.js patches all async APIs — setTimeout, Promises, DOM events, XHR. When any of these fires, Zone.js notifies Angular, which runs `ApplicationRef.tick()`, traversing the component tree top-down comparing previous vs current binding values. If different — DOM updates. This is called dirty checking. With OnPush, a component is checked only when its input references change, it emits events internally, an async pipe emits, or `markForCheck()` is called. With Signals in Angular 17+, Angular tracks exactly which template nodes read which signals and updates only those.

---

**Q7: Why does mutating an array not update the UI in OnPush?**

> In OnPush, Angular compares input references, not values. `array.push(item)` mutates the array in place — the reference is unchanged. Angular checks: "same reference as before?" — yes — skips the check — DOM not updated. The correct approach is creating a new reference: `this.items = [...this.items, newItem]`. NgRx reducers enforce this by design — they always return new state objects via spread. This is why NgRx + OnPush + async pipe is the high-performance golden combo.

---

**Q8: What is Zone.js and why is Angular moving away from it?**

> Zone.js monkey-patches all async APIs globally to notify Angular when to run change detection. The problems: it adds ~30KB to the bundle, it causes false positives when third-party library async code fires, it makes debugging harder by modifying async stack traces, and it triggers full tree checks regardless of what actually changed. Angular 18 introduced experimental zoneless mode using Signals. In zoneless mode, Angular only re-renders components where signals have changed — surgical, fine-grained updates with no Zone.js overhead.

---

## @defer Questions

---

**Q9: What is @defer and what problem does route lazy loading NOT solve that @defer does?**

> Route lazy loading splits the app at navigation boundaries — the entire feature bundle loads when the user navigates to that route. But once the route is loaded, all components inside it are bundled together. If that route contains a heavy chart library, PDF generator, or admin panel — they all load even if the user never interacts with them. `@defer` provides component-level code splitting within an already-loaded route. I can defer the chart to load on viewport scroll, the export panel to load on button click, and the admin tools to load only for admin users. This creates layered optimization: route bundles are small and contain only critical UI, with heavy components loading on demand.

---

**Q10: Explain all @defer trigger types.**

> Default (no trigger) — loads after the initial rendering stabilizes. `on idle` — loads when the browser's requestIdleCallback fires, ideal for non-urgent background components. `on viewport` — uses IntersectionObserver to load when the placeholder enters the viewport, ideal for below-fold charts and content sections. `on interaction` — loads when the user interacts with a specified element or the defer block itself, ideal for dialogs and advanced panels. `on timer(Xs)` — loads after a delay, used sparingly for promotional content. `when [expression]` — loads when a boolean expression becomes true, ideal for role-based or feature-flag-controlled UI. You can also combine triggers and use `prefetch on [trigger]` separately from the display trigger.

---

## NgRx Questions

---

**Q11: Why shouldn't we put everything in the NgRx global store?**

> NgRx global store should be reserved for shared, business-critical, persistent state. Putting everything there creates unnecessary coupling — features become dependent on each other's state. UI state like modal visibility or active tab doesn't need Redux overhead. Ephemeral state like search input values doesn't need to survive navigation. Overusing global store increases: action noise (every tiny change dispatches an action), reducer complexity, memory usage, DevTools clutter, and makes lazy loading harder because all state must be loaded upfront. The rule: UI state stays in components via signals, feature state goes in feature NgRx slices, cross-app state goes in root store.

---

**Q12: Explain the Facade pattern in NgRx and when you'd use it.**

> The Facade pattern is a service that wraps all NgRx store access — selectors and dispatch calls — behind a clean API. Components inject the Facade, never the Store directly. Benefits: if I later switch from NgRx to NgRx Signal Store or a simple service, only the Facade changes — components are untouched. Testing becomes simpler — mock the Facade instead of setting up a full store. The API is more semantic — `ordersFacade.loadOrders()` reads better than `store.dispatch(OrdersActions.loadOrders())`. I use it consistently in team environments. In solo projects or very small apps it may be over-engineering.

---

**Q13: How do memoized selectors prevent unnecessary re-renders?**

> `createSelector` caches its last input values and output. When the store state changes, the selector checks whether its input selectors produced new values. If the inputs are identical to the previous call — it returns the exact same output reference without running the projector function. The `async` pipe uses `distinctUntilChanged` internally, so same reference = no new emission = no change detection triggered. This means unrelated state changes — say, updating the user profile while viewing the orders list — don't trigger the orders component to re-check. The entire chain is optimized.

---

## RxJS Questions

---

**Q14: When would you use switchMap vs concatMap vs mergeMap vs exhaustMap?**

> `switchMap` — when only the latest value matters and previous results are obsolete. Classic use: search — if the user types "ab" before the "a" request returns, cancel "a" and use "ab". `concatMap` — when order matters and operations must run sequentially. Use for create/update where you can't have race conditions. `mergeMap` — when all results matter and can run in parallel. Use for independent delete operations or parallel data loading. `exhaustMap` — when you want to ignore new events while an operation is already processing. Use for login button, form submit — prevents double-submit.

---

**Q15: What is the difference between a Subject and a BehaviorSubject?**

> Both are hot observables that multicast to all subscribers. The difference is initialization and late subscribers. `Subject` has no memory — late subscribers miss previous emissions. `BehaviorSubject` requires an initial value and late subscribers immediately receive the current value. This makes `BehaviorSubject` ideal for state in services — you always get the current state regardless of when you subscribe. Use `Subject` for event buses or one-time events where you only care about future emissions.

---

**Q16: How do you prevent memory leaks in RxJS?**

> Memory leaks happen when subscriptions outlive their component. Three modern approaches: First — `async` pipe in templates (Angular auto-unsubscribes on component destroy). Second — `takeUntilDestroyed(inject(DestroyRef))` for imperative subscriptions in Angular 16+ — cleaner than the old `takeUntil(destroy$)` pattern. Third — `toSignal()` from `@angular/core/rxjs-interop`, which converts an observable to a signal and handles cleanup automatically. I avoid `subscribe()` in `ngOnInit` without cleanup because it's the leading source of Angular memory leaks.

---

## Signals Questions

---

**Q17: What are Signals and how do they differ from RxJS observables?**

> Signals are a fine-grained reactive primitive introduced in Angular 16. A signal holds a single value, any template or `computed()` that reads it automatically subscribes to updates. When the signal changes, only the specific DOM nodes that read it update — surgical updates with no Zone.js dependency. Observables are push-based streams suited for async events, HTTP, complex time-based operations. Signals are synchronous, simpler, and directly integrated with Angular's template system. They're complementary — use `toSignal()` to consume observables as signals, `toObservable()` to use a signal with RxJS operators. The right mental model: Signals for state, RxJS for events and async flows.

---

**Q18: Should we replace NgRx with Signals?**

> They serve different purposes. Signals are excellent for local component state, derived computed values, and small feature state with NgRx Signal Store. NgRx with classic Actions/Reducers/Effects remains better for: globally shared business-critical state, time-travel debugging with Redux DevTools, auditable action history, and complex async flows with Effects. The modern best practice is using both — consume NgRx selectors via `toSignal()` in signal-based components. This gives you OnPush-compatible templates without `async` pipe while keeping the NgRx state management benefits.

---

## Security Questions

---

**Q19: How do you handle JWT refresh token securely in Angular?**

> I store the access token in memory (JavaScript variable, not localStorage) via a signal in the AuthService. The refresh token is stored in an HTTP-only cookie set by the server — JavaScript can't read it, so it's protected from XSS. An HTTP interceptor catches 401 responses, calls the refresh endpoint with `withCredentials: true` (sends the cookie), updates the in-memory access token, and retries the original request. If refresh fails — clear in-memory token and redirect to login. I check the request URL to avoid infinite loops on auth endpoint 401s.

---

**Q20: What is XSS and how does Angular protect against it?**

> XSS (Cross-Site Scripting) is an attack where malicious scripts injected via user input execute in other users' browsers. Angular protects by sanitizing all template bindings automatically — `{{ }}` HTML-encodes values, `[innerHTML]` strips `<script>` tags and inline event handlers, `[src]` and `[href]` validate URL schemes. The `DomSanitizer` API exists but should never be used with `bypassSecurityTrust*` on user-provided content. Additional layers: Content Security Policy headers on the server, avoiding `eval()` and `new Function()`, and using `HttpOnly; SameSite=Strict` cookies for session tokens.

---

## Performance Questions

---

**Q21: How would you optimize a large Angular application for performance?**

> I approach it as a system. Level 1: Change detection — OnPush everywhere, `track` on all `@for`, no function calls in templates, pure pipes only. Level 2: Bundle size — analyze with `source-map-explorer`, set budgets in `angular.json`, lazy import heavy libraries. Level 3: Loading strategy — lazy routes + `@defer` for intra-page splitting + preloading strategy. Level 4: Runtime — Web Workers for CPU-heavy tasks, CDK virtual scrolling for large lists. Level 5: Measurement — Angular DevTools profiler, Lighthouse CI in pipeline, Core Web Vitals tracking. Fix the highest-impact bottleneck first — usually it's missing OnPush or an oversized initial bundle.

---

## SSR Questions

---

**Q22: What is the difference between SSR and hydration in Angular?**

> SSR (Server-Side Rendering) runs Angular on a Node.js server and sends fully rendered HTML to the browser. This improves FCP and SEO. Hydration is the client-side process that follows: instead of destroying the server-rendered DOM and re-creating everything (which causes a flash), Angular 16+ reuses the existing DOM by attaching event listeners and activating bindings. Incremental hydration in Angular 18 goes further — individual sections can be marked to hydrate lazily using `@defer` with `hydrate on` triggers, so the DOM is present for SEO but Angular doesn't activate it until the user needs it.

---

## What NOT to Say

These are answers that signal junior/mid-level thinking in a senior round:

| If Asked | Don't Say |
|----------|-----------|
| Architecture | "I keep everything in a shared folder" |
| Architecture | "I use NgModules for every feature" |
| Change Detection | "I don't use OnPush because it's complex" |
| NgRx | "I put all state in global store" |
| NgRx | "I don't lazy load because the app is small" |
| Performance | "I'll optimize later if it's slow" |
| Security | "I store tokens in localStorage for convenience" |
| Testing | "I only test if there's time" |
| Signals | "Signals replace NgRx completely" |
| @defer | "I don't use it — lazy routes are enough" |

---

## Architect-Level Answer Formula

For any design question:

```
1. State the principle behind your decision
2. Give the specific approach
3. Explain why over alternatives
4. Mention the performance/scale impact
5. Acknowledge trade-offs
```

Example using this formula for "How do you design Angular architecture?":

> *[Principle]* In a product-based enterprise app, I prioritize scalability, team ownership, and performance from day one.  
> *[Approach]* I use feature-based standalone architecture with lazy-loaded routes. Each feature owns its UI, NgRx slice, and services.  
> *[Why over alternatives]* Layer-based collapses at scale — 10 teams in the same components folder. Feature-based gives each team isolated ownership.  
> *[Performance impact]* OnPush everywhere reduces CD cycles. Lazy routes + `@defer` minimize initial bundle. Memoized selectors prevent unnecessary re-renders.  
> *[Trade-off]* More upfront structure — but this pays off rapidly as the app grows. The alternative is refactoring later under pressure.

---

## 2-Minute Architecture Whiteboard Answer

If asked to design an Angular app on the whiteboard:

```
App Shell (app.config.ts)
  ├── Core (singleton services, interceptors, guards)
  ├── Shared (UI components, pipes, directives)
  └── Features (lazy loaded)
       ├── auth/ (routes, pages, components, store, services)
       ├── dashboard/ (same pattern + @defer for heavy widgets)
       └── orders/ (same pattern + provideState for feature store)

State:
  Root: user, theme, permissions
  Feature: each feature's own NgRx slice

Performance:
  OnPush everywhere
  @defer for below-fold, interaction-based, role-based UI
  Memoized selectors
  trackBy on all lists

For 1M users:
  + SSR for public pages
  + CDN + edge caching
  + Service Worker for offline
  + Web Workers for heavy compute
```

Delivering this answer on a whiteboard in 2 minutes = strong architect signal.
