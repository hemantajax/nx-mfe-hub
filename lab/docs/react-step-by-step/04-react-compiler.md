# 04 — React Compiler & Automatic Optimization

> **TL;DR:** The React Compiler (formerly React Forget) is a build-time tool that automatically memoizes components, hooks, and expressions. It eliminates the need for manual `useMemo`, `useCallback`, and `React.memo` in most cases. It works by analyzing your code at compile time and inserting fine-grained caching. The catch: your code must follow the Rules of React (purity, no side effects in render).

---

## 1. The Problem the Compiler Solves

React re-renders components when state or props change. Without memoization, every re-render recomputes everything:

```tsx
function ProductList({ products, filter }: Props) {
  // Re-created on EVERY render — even if products/filter haven't changed
  const filtered = products.filter((p) => p.category === filter);

  // New function reference on EVERY render — breaks React.memo on children
  const handleSelect = (id: string) => { selectProduct(id); };

  return filtered.map((p) => (
    <ProductCard key={p.id} product={p} onSelect={handleSelect} />
  ));
}
```

### The Manual Fix (Pre-Compiler)

```tsx
function ProductList({ products, filter }: Props) {
  const filtered = useMemo(
    () => products.filter((p) => p.category === filter),
    [products, filter]
  );

  const handleSelect = useCallback(
    (id: string) => { selectProduct(id); },
    []
  );

  return filtered.map((p) => (
    <ProductCard key={p.id} product={p} onSelect={handleSelect} />
  ));
}

const ProductCard = React.memo(({ product, onSelect }: CardProps) => {
  return (
    <div className="card" onClick={() => onSelect(product.id)}>
      {product.name}
    </div>
  );
});
```

**Problems with manual memoization:**
- Verbose — every derived value needs `useMemo`, every handler needs `useCallback`
- Error-prone — wrong dependency arrays cause stale data or missed updates
- Incomplete — developers forget to memoize, or memoize the wrong thing
- Not composable — `React.memo` only checks shallow props, misses deep changes

---

## 2. What the React Compiler Does

The compiler is a **Babel plugin** that runs at build time. It analyzes your component and hook code, understands the data flow, and inserts caching automatically.

### Before Compilation (Your Code)

```tsx
function ProductList({ products, filter }: Props) {
  const filtered = products.filter((p) => p.category === filter);
  const handleSelect = (id: string) => { selectProduct(id); };

  return filtered.map((p) => (
    <ProductCard key={p.id} product={p} onSelect={handleSelect} />
  ));
}
```

### After Compilation (Generated Output)

```tsx
function ProductList({ products, filter }: Props) {
  const $ = useMemoCache(4);

  let filtered;
  if ($[0] !== products || $[1] !== filter) {
    filtered = products.filter((p) => p.category === filter);
    $[0] = products;
    $[1] = filter;
    $[2] = filtered;
  } else {
    filtered = $[2];
  }

  let handleSelect;
  if ($[3] === Symbol.for('react.memo_cache_sentinel')) {
    handleSelect = (id: string) => { selectProduct(id); };
    $[3] = handleSelect;
  } else {
    handleSelect = $[3];
  }

  return filtered.map((p) => (
    <ProductCard key={p.id} product={p} onSelect={handleSelect} />
  ));
}
```

**What the compiler inserts:**
- A `useMemoCache(n)` hook that holds `n` cached slots
- Conditional checks before every expression — recompute only if dependencies changed
- Fine-grained caching at the expression level (not component level)

---

## 3. What Gets Memoized Automatically

| What | Manual Equivalent | Compiler Handles |
|------|---|---|
| Derived values (filter, sort, map) | `useMemo()` | Yes |
| Event handler functions | `useCallback()` | Yes |
| JSX elements | `React.memo()` on child | Yes |
| Object/array literals in props | `useMemo()` wrapper | Yes |
| Component return value | — | Yes (skip re-render if output unchanged) |

### Example: Object Props

```tsx
// This breaks React.memo in children without the compiler
<Chart options={{ responsive: true, theme: 'dark' }} data={chartData} />

// Compiler auto-caches the object literal — same reference if values unchanged
```

---

## 4. Rules of React the Compiler Enforces

The compiler assumes your code follows the **Rules of React**. If it doesn't, the compiler either skips optimization or produces incorrect results.

### Rule 1: Components and Hooks Must Be Pure

The render phase must be free of side effects:

```tsx
// WRONG — side effect in render
function Counter() {
  document.title = 'Counter';  // Side effect!
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

// CORRECT — side effect in useEffect
function Counter() {
  const [count, setCount] = useState(0);
  useEffect(() => { document.title = `Count: ${count}`; }, [count]);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

### Rule 2: No Mutation of Props, State, or Values During Render

```tsx
// WRONG — mutating during render
function SortedList({ items }: { items: Item[] }) {
  items.sort((a, b) => a.name.localeCompare(b.name));  // Mutates prop!
  return items.map((item) => <div key={item.id}>{item.name}</div>);
}

// CORRECT — create a new sorted array
function SortedList({ items }: { items: Item[] }) {
  const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));
  return sorted.map((item) => <div key={item.id}>{item.name}</div>);
}
```

### Rule 3: Local Mutation During Render Is Fine

```tsx
// This is OK — creating and mutating a local variable in the same render
function Greeting({ name }: { name: string }) {
  const parts: string[] = [];
  parts.push('Hello');
  parts.push(name);
  return <h1>{parts.join(', ')}</h1>;
}
```

### Summary of Rules

| Rule | What It Means |
|------|---------------|
| Pure rendering | No side effects during render (no DOM, no fetch, no logging) |
| No prop/state mutation | Never mutate values received from React |
| Idempotent | Same inputs → same output, every time |
| Local mutation OK | You can create and mutate local variables within a single render |
| Lazy initialization OK | `useState(() => expensive())` is fine |

---

## 5. Setup and Configuration

### Installation

```bash
npm install -D babel-plugin-react-compiler
```

### Babel Configuration

```json
{
  "plugins": [
    ["babel-plugin-react-compiler", {
      "target": "19"
    }]
  ]
}
```

### Next.js Configuration

```typescript
// next.config.ts
const nextConfig = {
  experimental: {
    reactCompiler: true,
  },
};

export default nextConfig;
```

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', { target: '19' }]],
      },
    }),
  ],
});
```

---

## 6. Gradual Adoption — Opt-in per File/Component

You can enable the compiler for specific files or directories:

```json
{
  "plugins": [
    ["babel-plugin-react-compiler", {
      "sources": (filename) => filename.includes("src/features/")
    }]
  ]
}
```

### Opting Out a Specific Component

```tsx
// "use no memo" — tells the compiler to skip this component
function LegacyWidget() {
  'use no memo';
  // This component has side effects in render that can't be easily fixed
  // Compiler will skip it
}
```

---

## 7. When Manual Optimization Is Still Needed

The compiler handles most memoization, but some cases still need manual work:

| Scenario | Why Compiler Can't Help | Manual Solution |
|----------|---|---|
| Expensive initial computation | Compiler caches between renders, not first render | `useState(() => expensiveInit())` |
| External store subscriptions | Compiler doesn't know about external mutations | `useSyncExternalStore` |
| Web Worker communication | Side effect, not pure computation | `useEffect` + state |
| Animations/RAF | Imperative timing, not declarative | `useEffect` + `requestAnimationFrame` |
| Virtualized list windowing | Requires specialized DOM management | `react-window` / TanStack Virtual |

---

## 8. Migration Strategy

### Step 1: Audit with eslint-plugin-react-compiler

```bash
npm install -D eslint-plugin-react-compiler
```

```javascript
// eslint.config.mjs
import reactCompiler from 'eslint-plugin-react-compiler';

export default [
  {
    plugins: { 'react-compiler': reactCompiler },
    rules: {
      'react-compiler/react-compiler': 'warn',
    },
  },
];
```

This flags code that violates the Rules of React and would confuse the compiler.

### Step 2: Fix Violations

Common fixes:
- Move side effects from render into `useEffect`
- Replace `array.sort()` with `[...array].sort()` (no mutation)
- Replace `object.prop = value` in render with spread `{ ...object, prop: value }`
- Ensure hooks are called unconditionally at the top level

### Step 3: Enable Compiler on a Feature Directory

```json
{
  "plugins": [
    ["babel-plugin-react-compiler", {
      "sources": (fn) => fn.includes("src/features/orders/")
    }]
  ]
}
```

### Step 4: Remove Manual Memoization

Once the compiler covers a file, you can safely remove:
- `useMemo` → let the compiler handle it
- `useCallback` → let the compiler handle it
- `React.memo` → let the compiler handle it

> **Don't remove all at once.** Remove feature by feature and verify performance is maintained.

### Step 5: Enable Globally

```json
{
  "plugins": [["babel-plugin-react-compiler", { "target": "19" }]]
}
```

---

## 9. Compiler vs Runtime — What Changes

| Aspect | Without Compiler | With Compiler |
|--------|--|--|
| Memoization | Manual (`useMemo`, `useCallback`, `memo`) | Automatic at expression level |
| Bundle size | Your code only | Slight increase (cache arrays + conditionals) |
| Build time | Baseline | Slightly longer (static analysis per file) |
| Runtime perf | Depends on developer discipline | Consistently optimized |
| Debugging | Standard React DevTools | Compiled output in source maps |
| Code style | Defensive (wrap everything in memo) | Natural (write plain code) |

---

## 10. What the Compiler Does NOT Do

- **Does not eliminate re-renders** — components still re-render, but skip recomputing unchanged parts
- **Does not optimize data fetching** — use TanStack Query, SWR, or server components
- **Does not fix algorithmic complexity** — O(n²) sort is still O(n²), just cached
- **Does not replace Suspense** — you still need Suspense for async boundaries
- **Does not make impure code pure** — it assumes purity and may break impure code silently

---

## Common Mistakes — Avoid Saying These

| Mistake | Why It's Wrong |
|---------|---------------|
| "React Compiler makes React faster" | It makes your *app* faster by preventing redundant work — React itself is unchanged |
| "I don't need to think about performance anymore" | Algorithmic choices, data fetching, and bundle size still matter |
| "useMemo and useCallback are deprecated" | They still work and are needed in edge cases; they're just rarely needed manually |
| "The compiler changes React's behavior" | It only adds caching — same semantics, same output, fewer re-computations |
| "I can have side effects in render if I use the compiler" | The opposite — the compiler REQUIRES purity to work correctly |

---

## Interview-Ready Answer

> "What is the React Compiler and should we use it?"

**Strong answer:**

> The React Compiler is a build-time Babel plugin that statically analyzes component and hook code to insert fine-grained memoization automatically. It replaces most manual `useMemo`, `useCallback`, and `React.memo` calls by caching values at the expression level — if dependencies haven't changed, the cached value is reused. The prerequisite is that your code follows the Rules of React: pure render functions, no mutation of props/state, and no side effects outside of `useEffect`. I'd adopt it gradually — start with the ESLint plugin to audit violations, fix them, enable on a feature directory, then expand globally. For new projects on React 19, I'd enable it from day one. It doesn't eliminate the need to think about performance architecture (code splitting, server components, data fetching), but it removes the entire category of "forgot to memoize" bugs.

---

## Next Topic

→ [05-hooks-deep-dive.md](05-hooks-deep-dive.md) — Every built-in hook, custom hook patterns, closure traps, and the dependency array pitfalls that trip up even senior developers.
