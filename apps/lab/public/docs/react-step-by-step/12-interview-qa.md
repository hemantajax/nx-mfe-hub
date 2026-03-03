# 12 — Interview Q&A Cheat Sheet

> **TL;DR:** This is the night-before-the-interview file. Architect-level questions and strong answers, organized by topic. Each answer is structured as: key point, technical depth, trade-off awareness, and what NOT to say.

---

## 1. Architecture Questions

### Q: "How do you structure a large React application?"

**Strong answer:**

> Feature-based architecture with co-located components, hooks, API calls, and types per domain. Shared UI is separate with zero business logic. Core holds singleton infrastructure — API client, auth provider, TanStack Query setup. Boundaries are enforced via Nx module boundary rules or ESLint import restrictions. Each feature is lazy-loaded at the route level. Components follow a smart/dumb split — containers manage data and state, presentational components are pure functions of their props.

**What NOT to say:**

| Weak Answer | Why |
|---|---|
| "I use a flat structure with all components in one folder" | Doesn't scale — no team ownership |
| "I don't enforce boundaries between features" | Features become coupled, refactoring becomes impossible |
| "Every component gets its own folder in a global components directory" | Layer-based, not feature-based |

---

### Q: "How do you share code across teams in a monorepo?"

**Strong answer:**

> I use Nx or Turborepo with library boundaries. Shared code is organized as libraries by type — `ui`, `data-access`, `util` — and scoped by domain. Tags and ESLint enforce that libraries only import from allowed peers. Each library has a barrel export that serves as its public API. Internal code stays internal. CI runs `nx affected` to only build/test what changed.

---

### Q: "Smart vs Dumb components — what's the difference and why does it matter?"

**Strong answer:**

> Smart components (containers) handle data fetching, state management, and side effects. Dumb components (presentational) receive data via props and return JSX — no hooks, no side effects. This separation makes dumb components highly testable and reusable. Smart components are tested by mocking their data sources. The boundary between them is the props interface.

---

## 2. React 19 Questions

### Q: "What's new in React 19?"

**Strong answer:**

> Actions — async functions in transitions that handle pending state, errors, and optimistic updates. Three new hooks: `useActionState` for form state machines, `useFormStatus` for reading parent form submission status, and `useOptimistic` for instant UI feedback during mutations. The `use()` API reads promises (with Suspense) and context conditionally. Refs are now regular props — no more `forwardRef`. Document metadata like `<title>` and `<meta>` can be rendered from any component. Resource preloading APIs are built-in. The React Compiler auto-memoizes at build time.

**What NOT to say:**

| Weak Answer | Why |
|---|---|
| "React 19 is a complete rewrite" | It's an evolution of the concurrent model from React 18 |
| "I haven't looked at it yet" | Shows lack of curiosity for an architect role |
| "It replaces Redux/state management" | `useActionState` is form-specific, not app-wide state |

---

### Q: "What is the use() API and how is it different from useContext?"

**Strong answer:**

> `use()` can read both promises and context. Unlike `useContext`, it can be called inside conditionals and loops — it doesn't follow the Rules of Hooks. For promises, it suspends the component until the promise resolves, integrating with Suspense boundaries. For context, it works like `useContext` but with the added flexibility of conditional reads.

---

### Q: "How do React 19 form actions work?"

**Strong answer:**

> You pass an async function to a `<form>`'s `action` prop. React wraps it in a transition, giving you automatic `isPending` state. `useActionState` provides a reducer-like pattern: the action receives the previous state and `FormData`, returns new state. `useFormStatus` lets child components read submission status. This enables progressive enhancement — with server actions, forms work before JavaScript loads.

---

## 3. Rendering & Reconciliation Questions

### Q: "How does React Fiber work?"

**Strong answer:**

> Fiber is React's reconciliation engine. Each component instance gets a Fiber node — a JavaScript object with pointers to child, sibling, and parent. These form a linked list that can be traversed iteratively. Rendering is split into a render phase (pure, interruptible) where React calls components and diffs the tree, and a commit phase (synchronous) where DOM mutations are applied. Fiber uses priority lanes — sync updates (user input) preempt transition updates (filtering). React maintains two trees (double buffering) and swaps them on commit.

**What NOT to say:**

| Weak Answer | Why |
|---|---|
| "Fiber is the Virtual DOM" | Fiber is the reconciliation algorithm; Virtual DOM is the element tree |
| "React re-renders the entire DOM" | Only the diffed subset of real DOM is touched |
| "I don't need to know internals" | Architects must understand how tools work to make performance decisions |

---

### Q: "When and why would you use startTransition?"

**Strong answer:**

> `startTransition` marks a state update as low priority. React can interrupt this work if a higher-priority update arrives — like user typing. I use it for filtering large lists, tab switches with heavy content, and non-urgent UI updates. The `isPending` flag from `useTransition` lets me show a visual indicator while the transition runs. It doesn't make the update faster — it makes the UI responsive during slow updates.

---

### Q: "Explain keys in React lists. Why do they matter?"

**Strong answer:**

> Keys are identity hints for reconciliation. Without keys, React matches elements by index — which causes bugs when items are reordered, inserted, or removed. With stable keys (like database IDs), React can track each element across renders, reorder DOM nodes instead of destroying/recreating them, and preserve component state. Never use array index as key for dynamic lists.

---

## 4. Performance Questions

### Q: "How do you optimize a slow React application?"

**Strong answer:**

> First, I measure with React DevTools Profiler and bundle analyzer to identify where time is spent. For bundle size: route-based code splitting with `React.lazy`, tree shaking with ESM imports, and size budgets in CI. For render performance: the React Compiler handles memoization automatically. For interaction responsiveness: `startTransition` for non-blocking updates. For long lists: virtual scrolling with TanStack Virtual. For images: `next/image` with WebP, lazy loading, and responsive `srcset`. For data: Server Components to eliminate client JS for read-only content, streaming SSR for progressive loading. Heavy computation goes to Web Workers.

**What NOT to say:**

| Weak Answer | Why |
|---|---|
| "I wrap everything in React.memo" | Premature optimization; React Compiler does this better |
| "I just add useMemo everywhere" | Shows lack of understanding of when memoization actually helps |
| "Performance isn't a priority until users complain" | Architecture decisions for performance are hard to retrofit |

---

### Q: "What is the React Compiler and should we use it?"

**Strong answer:**

> The React Compiler is a build-time Babel plugin that analyzes your components and inserts fine-grained memoization automatically. It replaces most manual `useMemo`, `useCallback`, and `React.memo` calls. The prerequisite is that your code follows the Rules of React — pure render functions, no mutation, no side effects outside effects. I'd enable it from day one on new React 19 projects. For existing projects, start with the ESLint plugin to audit violations, fix them gradually, then enable the compiler per directory.

---

### Q: "How do Core Web Vitals apply to React?"

**Strong answer:**

> LCP (Largest Contentful Paint) — optimize with SSR/streaming, preloaded images, and code splitting so the main content renders fast. INP (Interaction to Next Paint) — keep interactions under 200ms using `startTransition` for heavy state updates and avoiding long-running renders. CLS (Cumulative Layout Shift) — set explicit image dimensions, use `font-display: swap`, and show skeleton UIs instead of spinners that change layout. I measure with web-vitals library in production and Lighthouse in CI.

---

## 5. State Management Questions

### Q: "How do you decide which state management tool to use?"

**Strong answer:**

> I categorize state into five types. Server state goes into TanStack Query for caching, deduplication, and background refresh. Local UI state uses `useState` or `useReducer`. Global client state — truly cross-cutting concerns like theme or sidebar — uses Zustand. URL state handles filters and pagination. Form state uses React 19 actions for simple forms or React Hook Form for complex ones. The principle is co-location: start local, lift only when siblings need it, and never put server data in a client store.

**What NOT to say:**

| Weak Answer | Why |
|---|---|
| "I use Redux for everything" | Overkill for most state; server data belongs in a cache |
| "I just use Context for global state" | Context re-renders all consumers on every change |
| "State management is just useState" | Misses the server state vs client state distinction |

---

### Q: "Why TanStack Query over fetching in useEffect?"

**Strong answer:**

> `useEffect` + `useState` is manual cache management — you're responsible for deduplication, background refresh, stale data, error retry, pagination caching, and optimistic updates. TanStack Query provides all of this out of the box. Multiple components using the same query key share a single request. Data is cached with configurable staleness. Background refetches keep data fresh. Mutations with rollback support enable optimistic UI. It eliminates an entire category of state management code.

---

## 6. Server Components Questions

### Q: "Explain React Server Components. When would you use them?"

**Strong answer:**

> Server Components render exclusively on the server and send zero JavaScript to the browser. They can `async/await` data directly from databases or APIs without exposing credentials. Client Components, marked with `"use client"`, handle interactivity. In Next.js App Router, all components default to Server Components. I use them for data display, SEO content, and any read-only UI. Client Components handle forms, modals, and anything with event handlers. The RSC payload — a serializable stream — preserves React element identity, enabling client-side reconciliation without full page reloads.

**What NOT to say:**

| Weak Answer | Why |
|---|---|
| "`'use client'` means it only runs on the client" | Client Components render on BOTH server (SSR) and client (hydration) |
| "Server Components replace SSR" | They work together — SSR provides initial HTML, RSC provides component payload |
| "Every component should be a Server Component" | Interactive components must be Client Components |

---

### Q: "How does streaming SSR work with Suspense?"

**Strong answer:**

> Traditional SSR sends the entire page as one HTML blob — slow if any data source is slow. Streaming SSR sends HTML progressively: the page shell streams immediately, and each Suspense boundary sends its fallback first, then streams the resolved content when the data arrives. Multiple slow queries resolve independently — no waterfall. React uses selective hydration to make sections interactive as they arrive. If a user interacts with an unhydrated section, React bumps its priority.

---

## 7. Hooks Questions

### Q: "Explain the stale closure problem and how to fix it."

**Strong answer:**

> When a `useEffect` or callback captures a state value in its closure, it sees the value from the render it was created in — not the latest value. A classic example: `setInterval` inside `useEffect([])` reads the initial state forever. Fixes: use functional updates (`setState(prev => prev + 1)`) so you don't need the current value, or use `useRef` to hold the latest value in a mutable container.

---

### Q: "useEffect vs useLayoutEffect — when to use which?"

**Strong answer:**

> `useEffect` runs asynchronously after the browser paints. `useLayoutEffect` runs synchronously after DOM mutations but before paint. Use `useLayoutEffect` when you need to measure DOM (element dimensions, scroll position) or prevent visual flicker — for example, positioning a tooltip based on an element's bounding rect. Default to `useEffect` for everything else — API calls, subscriptions, analytics.

---

### Q: "What are the Rules of Hooks and why do they exist?"

**Strong answer:**

> Hooks must be called at the top level — never inside conditions, loops, or nested functions — and only from React functions. This is because hooks are stored as a linked list on each Fiber node, indexed by call order. If the order changes between renders, React reads the wrong hook. The `use()` API is the one exception — it can be called conditionally because it's not a traditional hook.

---

## 8. Security Questions

### Q: "How do you prevent XSS in a React app?"

**Strong answer:**

> React auto-escapes JSX output, which prevents most injection. Remaining vectors: `dangerouslySetInnerHTML` — always sanitize with DOMPurify. Dynamic `href` — validate URL protocol (block `javascript:`). Server action inputs — validate with Zod on the server. Third-party scripts — use Subresource Integrity. Defense in depth: CSP headers with nonces restrict what scripts can execute, even if XSS gets through.

---

### Q: "Where should you store authentication tokens?"

**Strong answer:**

> HTTP-only, Secure, SameSite=Lax cookies. Never `localStorage` — any XSS vulnerability can steal the token. HTTP-only means JavaScript cannot access the cookie. SameSite=Lax prevents CSRF for POST requests. For additional CSRF protection on sensitive mutations, I add a CSRF token in a separate cookie and validate it on the server. In Server Components, session validation happens server-side — tokens never reach the client bundle.

---

### Q: "How do you secure server actions?"

**Strong answer:**

> Server actions create HTTP endpoints — I treat them like API routes. Every input is validated with Zod schema. Authentication is checked via session cookie. Authorization confirms the user owns the resource. Rate limiting prevents abuse. Inputs are never trusted — even if the form only has two fields, the endpoint accepts arbitrary FormData. I log mutations for audit trails.

---

## 9. Testing Questions

### Q: "How do you approach testing in React?"

**Strong answer:**

> Testing trophy: most investment in integration tests using React Testing Library + MSW for API mocking. I test what the user sees — render the component, simulate interactions with `userEvent`, assert on visible text and accessible roles. Unit tests cover pure utilities and complex custom hooks. E2E with Playwright covers critical user journeys. Accessibility is automated with axe-core. I optimize for meaningful assertions over coverage percentage.

**What NOT to say:**

| Weak Answer | Why |
|---|---|
| "I test component state and implementation details" | Tests break on refactor; test behavior |
| "I mock everything" | Over-mocking gives false confidence |
| "I aim for 100% coverage" | Coverage ≠ correctness; some code isn't worth testing |
| "E2E tests for everything" | Too slow, too flaky — reserve for critical paths |

---

### Q: "What is MSW and why use it over mocking fetch?"

**Strong answer:**

> MSW (Mock Service Worker) intercepts HTTP requests at the network level. The application code doesn't know it's mocked — it uses real fetch/axios calls. This tests the full data flow: request construction, response parsing, state updates, and rendering. Same handlers work in Node (tests) and browser (Storybook). Unlike `vi.mock(fetch)`, MSW doesn't couple tests to the HTTP client implementation.

---

## 10. Quick Reference Tables

### React 19 New APIs

| API | Purpose | Key Detail |
|-----|---------|------------|
| `useActionState` | Form state + action | `(prevState, formData) => newState` |
| `useFormStatus` | Read parent form status | `{ pending, data, method, action }` |
| `useOptimistic` | Optimistic updates | Temporary overlay, auto-rollback on error |
| `use()` | Read promise/context | Can be called conditionally |
| `ref` as prop | Forward refs naturally | No more `forwardRef` wrapper |
| Document metadata | `<title>`, `<meta>` in components | Auto-hoisted to `<head>` |
| Resource preloading | `preload()`, `preconnect()` | Built-in, no library needed |
| React Compiler | Auto-memoization | Build-time Babel plugin |

### State Management Decision Table

| State Type | Tool | Why |
|------------|------|-----|
| Server data | TanStack Query | Caching, dedup, background refresh |
| Local UI | `useState` / `useReducer` | Simple, co-located |
| Global client | Zustand | Minimal API, selector-based |
| URL | `useSearchParams` | Shareable, bookmarkable |
| Form | React 19 actions / React Hook Form | Progressive enhancement / complex validation |

### Hook Categories

| Category | Hooks |
|----------|-------|
| State | `useState`, `useReducer`, `useActionState` |
| Effects | `useEffect`, `useLayoutEffect`, `useInsertionEffect` |
| Refs | `useRef`, `useImperativeHandle` |
| Context | `useContext`, `use()` |
| Performance | `useMemo`, `useCallback`, `useTransition`, `useDeferredValue` |
| Async | `use()`, `useOptimistic`, `useFormStatus` |
| Identity | `useId` |
| External | `useSyncExternalStore` |

### Performance Optimization Priorities

| Priority | Action | Tool |
|----------|--------|------|
| 1 | Measure first | React Profiler, bundle analyzer |
| 2 | Code split routes | `React.lazy` + Suspense |
| 3 | Server Components for static content | Next.js App Router |
| 4 | Auto-memoization | React Compiler |
| 5 | Non-blocking updates | `startTransition` |
| 6 | Image optimization | `next/image`, WebP, lazy loading |
| 7 | Virtual scrolling | TanStack Virtual |
| 8 | Web Workers | Heavy computation off main thread |

### What NOT to Say — Master List

| Topic | Weak Statement |
|-------|----------------|
| Architecture | "I keep all components in one folder" |
| Architecture | "I use Redux for everything" |
| React 19 | "React 19 is a complete rewrite" |
| Performance | "I wrap everything in React.memo" |
| Performance | "Virtual DOM makes React faster than vanilla JS" |
| Fiber | "React re-renders the whole DOM" |
| State | "Context is my global state solution" |
| State | "I manage API data with useState + useEffect" |
| RSC | "'use client' means it only runs on the client" |
| Security | "React prevents all XSS" |
| Security | "I store JWT in localStorage" |
| Testing | "I test implementation details" |
| Testing | "100% coverage means no bugs" |
| Hooks | "useEffect is componentDidMount" |
| Compiler | "I don't need to think about performance anymore" |

---

## 11. Architect Whiteboard Template

When asked to design a React architecture on a whiteboard:

```
1. REQUIREMENTS (2 min)
   - Users? Scale? Real-time? SEO?
   - Core entities? Data relationships?
   - Team size? Deployment model?

2. HIGH-LEVEL ARCHITECTURE (3 min)
   - Draw: CDN → Load Balancer → Next.js (RSC + SSR) → API → DB
   - Mark: What's server-rendered, what's client-interactive

3. COMPONENT ARCHITECTURE (5 min)
   - Feature-based folder structure
   - Smart/Dumb component split
   - Shared UI library

4. DATA FLOW (5 min)
   - Server Components for read-only data
   - TanStack Query for interactive data
   - Zustand for cross-cutting client state
   - Server actions for mutations

5. PERFORMANCE (3 min)
   - Code splitting per route
   - Streaming SSR with Suspense
   - React Compiler for auto-memoization
   - Image optimization, font strategy

6. TRADE-OFFS (2 min)
   - Name what you chose and what you gave up
   - "I chose Next.js App Router for RSC support, trading some flexibility for built-in optimization"
```

---

> **Go back to any chapter for deeper coverage. Good luck with the interview.**
