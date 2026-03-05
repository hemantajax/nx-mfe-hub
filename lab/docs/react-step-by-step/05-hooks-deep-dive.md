# 05 — Hooks Deep Dive

> **TL;DR:** Hooks are the API for state, effects, context, and component lifecycle in functional React. Master the built-in hooks, understand the closure model, know the dependency array rules, and build custom hooks that compose cleanly. React 19 adds `useActionState`, `useFormStatus`, `useOptimistic`, and `use()`.

---

## 1. How Hooks Work Internally

Hooks are stored as a **linked list** on the component's Fiber node. Each call to a hook appends (on mount) or reads (on update) from this list — which is why hooks must always be called in the same order.

```
Fiber.memoizedState → Hook1 → Hook2 → Hook3 → null
                      (useState)  (useEffect)  (useMemo)
```

**Rules of Hooks:**
1. Only call hooks at the top level — never inside conditions, loops, or nested functions
2. Only call hooks from React functions (components or custom hooks)
3. The `use()` API is the exception — it can be called conditionally

---

## 2. State Hooks

### useState

```tsx
const [count, setCount] = useState(0);

// Functional update — use when new state depends on old state
setCount((prev) => prev + 1);

// Lazy initialization — expensive computation runs only on mount
const [data, setData] = useState(() => parseExpensiveJSON(raw));
```

**Key details:**
- `setState` with the same value (by `Object.is`) skips re-render
- State updates are batched in React 18+ (even in async contexts)
- The setter function identity is stable — never changes between renders

### useReducer

```tsx
interface State {
  items: Item[];
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Item[] }
  | { type: 'FETCH_ERROR'; payload: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { items: action.payload, loading: false, error: null };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
  }
}

function ItemList() {
  const [state, dispatch] = useReducer(reducer, {
    items: [],
    loading: false,
    error: null,
  });

  async function loadItems() {
    dispatch({ type: 'FETCH_START' });
    try {
      const items = await fetchItems();
      dispatch({ type: 'FETCH_SUCCESS', payload: items });
    } catch (e) {
      dispatch({ type: 'FETCH_ERROR', payload: (e as Error).message });
    }
  }

  return (/* ... */);
}
```

**When to use `useReducer` over `useState`:**

| Use `useState` | Use `useReducer` |
|---|---|
| Simple, independent values | Multiple related values that change together |
| Boolean flags, counters | State machine with defined transitions |
| Primitive types | Complex objects with predictable update patterns |
| 1-2 state variables | 3+ tightly coupled state variables |

---

## 3. Effect Hooks

### useEffect — Side Effects After Paint

```tsx
useEffect(() => {
  const controller = new AbortController();

  async function fetchData() {
    const res = await fetch(`/api/users/${id}`, { signal: controller.signal });
    const data = await res.json();
    setUser(data);
  }

  fetchData();

  return () => controller.abort();  // Cleanup on unmount or before re-run
}, [id]);
```

**Execution timing:**

```
Render → DOM update → Browser paint → useEffect runs
```

**Dependency array rules:**
- `[]` — run once on mount, cleanup on unmount
- `[dep1, dep2]` — re-run when dependencies change (by `Object.is`)
- No array — run after every render (rarely what you want)

### useLayoutEffect — Before Paint (Blocking)

```tsx
useLayoutEffect(() => {
  const { height } = ref.current!.getBoundingClientRect();
  setMeasuredHeight(height);
}, [content]);
```

**Execution timing:**

```
Render → DOM update → useLayoutEffect runs → Browser paint
```

**When to use:**
- Measuring DOM elements before the user sees them
- Synchronizing scroll position
- Preventing visual flicker (tooltip positioning, animations)

> **Rule:** Prefer `useEffect`. Only use `useLayoutEffect` when you need to read/write DOM before the browser paints.

### useInsertionEffect — For CSS-in-JS Libraries

```tsx
useInsertionEffect(() => {
  const style = document.createElement('style');
  style.textContent = `.dynamic-class { color: ${color}; }`;
  document.head.appendChild(style);
  return () => style.remove();
}, [color]);
```

**Execution timing:**

```
Render → useInsertionEffect → DOM update → useLayoutEffect → Paint → useEffect
```

Only for CSS-in-JS library authors — you will almost never use this directly.

---

## 4. Ref Hooks

### useRef — Mutable Container That Doesn't Trigger Re-renders

```tsx
function VideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const renderCount = useRef(0);

  renderCount.current++;  // Mutation doesn't cause re-render

  function play() {
    videoRef.current?.play();
  }

  return <video ref={videoRef} src={src} />;
}
```

**Common uses:**
- Holding DOM element references
- Storing previous values
- Tracking render counts
- Holding interval/timeout IDs
- Any mutable value that shouldn't trigger re-render

### useImperativeHandle — Customizing Ref Exposure

```tsx
interface ModalHandle {
  open: () => void;
  close: () => void;
}

function Modal({ ref, children }: { ref?: React.Ref<ModalHandle>; children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  }));

  if (!isOpen) return null;
  return <div className="modal">{children}</div>;
}

// Usage
function App() {
  const modalRef = useRef<ModalHandle>(null);
  return (
    <>
      <button onClick={() => modalRef.current?.open()}>Open</button>
      <Modal ref={modalRef}><p>Hello</p></Modal>
    </>
  );
}
```

---

## 5. Context Hook

### useContext

```tsx
const ThemeContext = createContext<Theme>({ mode: 'light', primary: '#007bff' });

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>({ mode: 'light', primary: '#007bff' });

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

function ThemedButton() {
  const { theme } = useContext(ThemeContext);
  return <button style={{ backgroundColor: theme.primary }}>Click</button>;
}
```

**Performance pitfall:** Every consumer re-renders when the context value changes. Solutions:
- Memoize the context value with `useMemo`
- Split contexts (theme context vs auth context)
- Use `use()` for conditional reading (React 19)
- Consider Zustand for frequently-changing global state

---

## 6. Performance Hooks

### useMemo — Cache Expensive Computations

```tsx
const sortedItems = useMemo(
  () => [...items].sort((a, b) => a.price - b.price),
  [items]
);
```

### useCallback — Cache Function References

```tsx
const handleDelete = useCallback(
  (id: string) => dispatch({ type: 'DELETE', payload: id }),
  [dispatch]
);
```

### When the React Compiler Makes These Optional

With the React Compiler enabled, most `useMemo` and `useCallback` calls are unnecessary — the compiler inserts equivalent caching automatically. Keep them for:
- Explicit dependency documentation
- Code running without the compiler
- Edge cases the compiler can't analyze

---

## 7. Identity and Sync Hooks

### useId — Stable Unique IDs for SSR

```tsx
function FormField({ label }: { label: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} />
    </div>
  );
}
```

**Why not `Math.random()`?** Hydration mismatch — server and client generate different IDs. `useId` produces the same ID on both.

### useSyncExternalStore — Subscribe to External State

```tsx
function useWindowWidth() {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener('resize', callback);
      return () => window.removeEventListener('resize', callback);
    },
    () => window.innerWidth,            // Client snapshot
    () => 1024                          // Server snapshot (SSR fallback)
  );
}
```

**Use for:**
- Browser APIs (resize, online/offline, media queries)
- Third-party stores (Redux, MobX internals)
- Global variables that change outside React

---

## 8. React 19 Hooks

### useActionState

```tsx
const [state, formAction, isPending] = useActionState(
  async (prev, formData) => {
    const result = await saveData(formData);
    return result.error ? { error: result.error } : { error: null, saved: true };
  },
  { error: null, saved: false }
);
```

### useFormStatus

```tsx
function SubmitBtn() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? 'Saving...' : 'Save'}</button>;
}
```

### useOptimistic

```tsx
const [optimisticLikes, addLike] = useOptimistic(
  likes,
  (current, newLike: Like) => [...current, newLike]
);
```

### use()

```tsx
const data = use(dataPromise);      // Suspends until resolved
const theme = use(ThemeContext);     // Reads context (can be conditional)
```

> See [03-react-19.md](03-react-19.md) for full details on each of these.

---

## 9. Custom Hooks — Patterns and Best Practices

### Pattern 1: Data Fetching Hook

```tsx
function useUser(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    staleTime: 5 * 60 * 1000,
  });
}
```

### Pattern 2: Local Storage Hook

```tsx
function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
```

### Pattern 3: Debounced Value Hook

```tsx
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
```

### Pattern 4: Media Query Hook

```tsx
function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}
```

### Custom Hook Rules

1. Name must start with `use`
2. Can call other hooks
3. Should return a consistent interface (tuple, object, or single value)
4. Should be pure — no side effects during the hook's synchronous body
5. Should handle cleanup in their own effects

---

## 10. Closure Traps and Stale State

The most common senior-level bug: stale closures in effects and callbacks.

### The Problem

```tsx
function Timer() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      console.log(count);  // Always logs 0! Stale closure
      setCount(count + 1); // Always sets to 1! Stale closure
    }, 1000);
    return () => clearInterval(id);
  }, []);  // Empty deps → closure captures initial count (0) forever

  return <div>{count}</div>;
}
```

### The Fix — Functional Updates

```tsx
useEffect(() => {
  const id = setInterval(() => {
    setCount((prev) => prev + 1);  // Uses latest state
  }, 1000);
  return () => clearInterval(id);
}, []);
```

### The Fix — useRef for Latest Value

```tsx
function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

function Timer() {
  const [count, setCount] = useState(0);
  const countRef = useLatest(count);

  useEffect(() => {
    const id = setInterval(() => {
      console.log(countRef.current);  // Always current
    }, 1000);
    return () => clearInterval(id);
  }, []);
}
```

### Common Stale Closure Scenarios

| Scenario | Fix |
|---|---|
| `setInterval` with state | Functional update: `setState(prev => ...)` |
| Event listener reading state | `useRef` to hold latest value |
| Timeout callback | Functional update or ref |
| `useCallback` with missing deps | Add deps or use ref |

---

## 11. useEffect Dependency Pitfalls

### Objects and Arrays as Dependencies

```tsx
// BUG: New object reference every render → infinite loop
useEffect(() => {
  fetchData(filters);
}, [{ status: 'active', page: 1 }]);  // New object every render!

// FIX: Use primitive values or memoize
useEffect(() => {
  fetchData({ status, page });
}, [status, page]);
```

### Functions as Dependencies

```tsx
// BUG: fetchUser is recreated every render → infinite loop
function Profile({ userId }: { userId: string }) {
  function fetchUser() { return fetch(`/api/users/${userId}`); }

  useEffect(() => {
    fetchUser().then(setUser);
  }, [fetchUser]);  // New function every render!
}

// FIX: Move function inside effect or wrap in useCallback
function Profile({ userId }: { userId: string }) {
  useEffect(() => {
    fetch(`/api/users/${userId}`).then(r => r.json()).then(setUser);
  }, [userId]);
}
```

---

## Common Mistakes — Avoid Saying These

| Mistake | Why It's Wrong |
|---------|---------------|
| "useEffect is the lifecycle replacement for componentDidMount" | It's not — it runs after paint, not on mount. Think in terms of synchronization, not lifecycle |
| "I always use an empty dependency array for setup code" | Missing deps cause stale closures — only omit deps when you truly want mount-only behavior |
| "useRef is just for DOM elements" | It's a generic mutable container; use it for any value that shouldn't trigger re-renders |
| "Custom hooks must return JSX" | Custom hooks return data, not UI. Components return UI |
| "I put all state in useReducer" | Over-engineering — use `useState` for simple state, `useReducer` for state machines |

---

## Interview-Ready Answer

> "Explain the hooks model and common pitfalls."

**Strong answer:**

> Hooks are stored as a linked list on each component's Fiber node, which is why they must be called in a consistent order — no conditions, no loops. `useState` and `useReducer` manage state; I choose `useReducer` when multiple state values change together in predictable patterns. `useEffect` synchronizes with external systems and runs after paint; `useLayoutEffect` runs before paint for DOM measurements. The biggest pitfall is stale closures — effects and callbacks capture the values from their render, so using state directly in a `setInterval` always reads the old value. The fix is functional updates (`setState(prev => ...)`) or `useRef` for the latest value. For React 19, `useActionState` replaces manual form state management, and `use()` can read promises and context conditionally — the first hook-like API that breaks the "no conditionals" rule. With the React Compiler, manual `useMemo` and `useCallback` become largely unnecessary, but understanding *why* they exist is still critical for debugging.

---

## Next Topic

→ [06-state-management.md](06-state-management.md) — The five categories of state, when to use each tool, and the decision tree for choosing between Zustand, TanStack Query, Redux, and local state.
