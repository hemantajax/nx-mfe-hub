# 03 — React 19 Deep Dive

> **TL;DR:** React 19 introduces Actions (async transitions for forms), `useActionState`, `useFormStatus`, `useOptimistic`, and the `use()` API. Refs are now regular props, document metadata can be rendered from components, and resource preloading is built-in. These changes shift React toward a server-first, progressively-enhanced model.

---

## 1. The Big Picture — What Changed and Why

React 19 is not a rewrite — it's the culmination of the concurrent rendering foundation laid in React 18. The theme is: **make common patterns first-class**.

| Before React 19 | React 19 |
|--|--|
| Manual `isPending` state for async ops | Actions handle pending/error/optimistic automatically |
| `forwardRef` wrapper for ref passing | `ref` is a regular prop |
| `react-helmet` for `<title>` / `<meta>` | Native document metadata in components |
| Manual preload links in `<head>` | `preload()`, `prefetchDNS()`, `preconnect()` APIs |
| `useEffect` + state for reading promises | `use()` reads promises and context in render |
| Manual form state management | `useActionState` + `useFormStatus` |

---

## 2. Actions — Async Transitions for Forms

An **Action** is any async function used in a transition. React 19 integrates actions deeply into forms.

### The Old Way (Manual Pending State)

```tsx
function UpdateName() {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async () => {
    setIsPending(true);
    const result = await updateNameOnServer(name);
    setIsPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    redirect('/profile');
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <button disabled={isPending}>Update</button>
      {error && <p className="text-danger">{error}</p>}
    </form>
  );
}
```

### The React 19 Way (Actions)

```tsx
function UpdateName() {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await updateNameOnServer(name);
      if (result.error) {
        setError(result.error);
        return;
      }
      redirect('/profile');
    });
  };

  return (
    <form action={handleSubmit}>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <button disabled={isPending}>Update</button>
      {error && <p className="text-danger">{error}</p>}
    </form>
  );
}
```

**What Actions give you for free:**
- **Pending state** — `isPending` is managed by the transition
- **Optimistic updates** — via `useOptimistic`
- **Error handling** — via error boundaries or `useActionState`
- **Form `action` prop** — `<form action={fn}>` works with both client and server actions
- **Progressive enhancement** — server actions work before JS loads

---

## 3. useActionState — Form State Machine

`useActionState` replaces the common pattern of managing form state, errors, and pending status manually.

```tsx
import { useActionState } from 'react';

async function createTodo(prevState: TodoState, formData: FormData): Promise<TodoState> {
  const title = formData.get('title') as string;

  if (!title.trim()) {
    return { error: 'Title is required', success: false };
  }

  const result = await saveTodoOnServer(title);

  if (!result.ok) {
    return { error: result.message, success: false };
  }

  return { error: null, success: true };
}

function TodoForm() {
  const [state, formAction, isPending] = useActionState(createTodo, {
    error: null,
    success: false,
  });

  return (
    <form action={formAction}>
      <input name="title" placeholder="New todo..." />
      <button disabled={isPending}>
        {isPending ? 'Adding...' : 'Add Todo'}
      </button>
      {state.error && <p className="text-danger">{state.error}</p>}
      {state.success && <p className="text-success">Added!</p>}
    </form>
  );
}
```

**Signature:**
```typescript
const [state, formAction, isPending] = useActionState(
  actionFn,      // (prevState, formData) => Promise<newState>
  initialState,  // initial state value
  permalink?     // optional URL for progressive enhancement
);
```

**Key details:**
- `actionFn` receives the previous state and `FormData`
- Returns the new state
- `isPending` is true while the action is running
- Works with server actions (`"use server"`) for zero-JS form submissions
- The `permalink` parameter enables progressive enhancement — the form works even before JS hydrates

---

## 4. useFormStatus — Pending UI in Child Components

`useFormStatus` lets any component inside a `<form>` read the form's submission status.

```tsx
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending, data, method, action } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className="btn btn-primary">
      {pending ? <Spinner size="sm" /> : 'Submit'}
    </button>
  );
}

function ContactForm() {
  return (
    <form action={submitContact}>
      <input name="email" type="email" required />
      <textarea name="message" required />
      <SubmitButton />  {/* Reads pending state from parent form */}
    </form>
  );
}
```

**Rules:**
- Must be called from a component rendered inside a `<form>`
- Reads the status of the parent `<form>`, not any arbitrary form
- Returns `{ pending, data, method, action }`

> **Why this matters:** You can build a generic `<SubmitButton>` component used across every form — it automatically knows when its parent form is submitting.

---

## 5. useOptimistic — Instant UI Feedback

`useOptimistic` shows a temporary optimistic value while an async action completes.

```tsx
import { useOptimistic } from 'react';

interface Message {
  id: string;
  text: string;
  sending?: boolean;
}

function Chat({ messages }: { messages: Message[] }) {
  const [optimisticMessages, addOptimistic] = useOptimistic(
    messages,
    (currentMessages, newMessage: string) => [
      ...currentMessages,
      { id: crypto.randomUUID(), text: newMessage, sending: true },
    ]
  );

  async function sendMessage(formData: FormData) {
    const text = formData.get('message') as string;
    addOptimistic(text);
    await deliverMessage(text);
  }

  return (
    <div>
      {optimisticMessages.map((msg) => (
        <div key={msg.id} style={{ opacity: msg.sending ? 0.6 : 1 }}>
          {msg.text}
          {msg.sending && <span className="ms-2 text-muted">Sending...</span>}
        </div>
      ))}
      <form action={sendMessage}>
        <input name="message" placeholder="Type a message..." />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

**How it works:**
1. User submits → `addOptimistic` immediately adds the message with `sending: true`
2. The real `messages` prop hasn't changed yet — optimistic value is a temporary overlay
3. When the action completes and parent re-renders with new `messages`, the optimistic value is replaced by the real one
4. If the action fails, the optimistic value is automatically rolled back

---

## 6. use() API — Reading Promises and Context in Render

`use()` is a new API that reads the value of a promise or context during render.

### Reading a Promise

```tsx
import { use, Suspense } from 'react';

async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
}

function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise);  // Suspends until resolved

  return (
    <div className="card">
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}

function UserPage({ userId }: { userId: string }) {
  const userPromise = fetchUser(userId);

  return (
    <Suspense fallback={<Spinner />}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}
```

### Reading Context (Conditional)

Unlike `useContext`, `use()` can be called conditionally:

```tsx
import { use } from 'react';

function StatusBadge({ showTheme }: { showTheme: boolean }) {
  if (showTheme) {
    const theme = use(ThemeContext);  // Allowed! use() works in conditionals
    return <span style={{ color: theme.primary }}>Active</span>;
  }
  return <span>Active</span>;
}
```

**`use()` vs `useContext`:**

| | `use()` | `useContext()` |
|-|----|-----|
| Reads promises | Yes (suspends) | No |
| Reads context | Yes | Yes |
| Called in conditionals | Yes | No (violates Rules of Hooks) |
| Called in loops | Yes | No |

---

## 7. ref as a Regular Prop

React 19 eliminates the need for `forwardRef`. Refs are now regular props.

### Before (React 18)

```tsx
const FancyInput = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  return <input ref={ref} className="fancy-input" {...props} />;
});
```

### After (React 19)

```tsx
function FancyInput({ ref, ...props }: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} className="fancy-input" {...props} />;
}
```

**Benefits:**
- No `forwardRef` wrapper boilerplate
- Better TypeScript ergonomics
- `ref` appears in the component's props — easier to understand
- `forwardRef` will be deprecated in a future version

### Ref Cleanup Functions

React 19 also supports returning a cleanup function from ref callbacks:

```tsx
function MeasuredBox() {
  return (
    <div
      ref={(node) => {
        if (node) {
          const observer = new ResizeObserver(handleResize);
          observer.observe(node);
          return () => observer.disconnect();  // Cleanup on unmount
        }
      }}
    >
      Content
    </div>
  );
}
```

---

## 8. Document Metadata in Components

React 19 natively hoists `<title>`, `<meta>`, and `<link>` tags to the document `<head>`.

```tsx
function ProductPage({ product }: { product: Product }) {
  return (
    <article>
      <title>{product.name} — MyStore</title>
      <meta name="description" content={product.description} />
      <link rel="canonical" href={`https://mystore.com/products/${product.slug}`} />

      <h1>{product.name}</h1>
      <p>{product.description}</p>
    </article>
  );
}
```

**How it works:**
- React collects `<title>`, `<meta>`, `<link>` from anywhere in the component tree
- Hoists them into `<head>` during rendering
- Deduplicates (same `<meta name>` only appears once)
- Works with SSR streaming

> **Previously:** You needed `react-helmet`, `next/head`, or a meta-framework for this. Now it's built-in.

---

## 9. Resource Preloading APIs

React 19 exposes imperative APIs for preloading resources:

```tsx
import { preload, preconnect, prefetchDNS, preinit } from 'react-dom';

function App() {
  preinit('/scripts/analytics.js', { as: 'script' });
  preload('/fonts/inter.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' });
  preconnect('https://api.example.com');
  prefetchDNS('https://cdn.example.com');

  return <div>...</div>;
}
```

| API | Purpose | When to Use |
|-----|---------|-------------|
| `prefetchDNS(url)` | Resolve DNS early | Third-party domains you'll request later |
| `preconnect(url)` | DNS + TCP + TLS handshake | API servers, CDNs |
| `preload(url, opts)` | Download resource early | Fonts, critical images, scripts |
| `preinit(url, opts)` | Download AND execute/apply | Scripts, stylesheets needed immediately |

---

## 10. Stylesheet Precedence

React 19 manages stylesheet loading order and deduplication:

```tsx
function FeaturePanel() {
  return (
    <>
      <link rel="stylesheet" href="/styles/base.css" precedence="low" />
      <link rel="stylesheet" href="/styles/feature.css" precedence="medium" />
      <link rel="stylesheet" href="/styles/overrides.css" precedence="high" />
      <div className="feature-panel">...</div>
    </>
  );
}
```

**Behavior:**
- Stylesheets with `precedence` are hoisted to `<head>`
- Deduplicated — same `href` only loads once
- Ordered by `precedence` value (not insertion order)
- React waits for stylesheets to load before revealing content (avoids FOUC)
- Suspense boundaries respect stylesheet loading

---

## 11. Improved Error Reporting

React 19 significantly improves error messages:

**Hydration mismatch diffs:**
```
Warning: Text content did not match.
  Server: "Hello World"
  Client: "Hello World!"
         ────────────────^
```

**Better `onCaughtError` and `onUncaughtError`:**
```tsx
const root = createRoot(document.getElementById('root')!, {
  onCaughtError(error, errorInfo) {
    logToSentry(error, { componentStack: errorInfo.componentStack });
  },
  onUncaughtError(error, errorInfo) {
    showFatalErrorUI(error);
  },
  onRecoverableError(error, errorInfo) {
    logWarning(error);
  },
});
```

| Callback | When It Fires |
|----------|---------------|
| `onCaughtError` | Error caught by an Error Boundary |
| `onUncaughtError` | Error NOT caught by any Error Boundary |
| `onRecoverableError` | Error that React recovers from automatically (e.g., hydration mismatch retry) |

---

## 12. Server Actions — "use server"

Server actions are async functions that run on the server, callable from client components:

```tsx
// app/actions.ts
'use server';

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  await db.posts.create({ data: { title, content } });
  revalidatePath('/posts');
}
```

```tsx
// app/posts/new/page.tsx
import { createPost } from '@/app/actions';

export default function NewPostPage() {
  return (
    <form action={createPost}>
      <input name="title" required />
      <textarea name="content" required />
      <button type="submit">Publish</button>
    </form>
  );
}
```

**Security considerations:**
- Server action arguments are user input — always validate
- Never trust `formData` without server-side validation
- Server actions create HTTP endpoints — treat them like API routes
- Use Zod or similar for schema validation

---

## Common Mistakes — Avoid Saying These

| Mistake | Why It's Wrong |
|---------|---------------|
| "React 19 is a complete rewrite" | It's an evolution of the concurrent foundation from React 18 |
| "useActionState replaces Redux" | It manages form submission state, not app-wide state |
| "use() replaces useEffect for data fetching" | `use()` reads a promise; the promise creation still happens outside render |
| "Server actions replace REST APIs" | They complement APIs for mutations; you still need APIs for external clients |
| "forwardRef still works the same" | It works but will be deprecated — ref is now a regular prop |

---

## Interview-Ready Answer

> "What's new in React 19?"

**Strong answer:**

> React 19 introduces Actions — async functions in transitions that handle pending state, errors, and optimistic updates automatically. `useActionState` provides a state machine for forms, `useFormStatus` lets child components read submission status, and `useOptimistic` enables instant UI feedback during mutations. The `use()` API can read promises (with Suspense) and context conditionally, which hooks couldn't do. Refs are now regular props, eliminating `forwardRef`. Document metadata like `<title>` and `<meta>` can be rendered from any component and React hoists them to `<head>`. Resource preloading APIs (`preload`, `preconnect`) are built-in. Combined with server actions via `"use server"`, React 19 enables progressively-enhanced, server-first applications where forms work before JavaScript loads.

---

## Next Topic

→ [04-react-compiler.md](04-react-compiler.md) — How the React Compiler automatically optimizes your components, replacing manual `useMemo`, `useCallback`, and `React.memo`.
