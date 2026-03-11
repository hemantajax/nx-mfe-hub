## 07 — React Best Practices for AI

> **TL;DR:** Use a **custom hook** (e.g. `useStreamingChat`) to encapsulate API calls, streaming, and state. Store streamed content and loading/error in **useState** (or useReducer for complex state). Use **Suspense** only if you adopt data-fetching that throws for loading. Prefer **streaming** so the UI updates as tokens arrive. In interviews, highlight hooks for reuse and clear separation between data and UI.

---

## 1. Encapsulate in a Hook

- **Custom hook:** e.g. `useStreamingChat()` that returns `{ content, loading, error, send, reset }`.
- Hook owns: fetch, stream reading, state updates, and optional cancellation (e.g. ref to AbortController).
- Components only call the hook and render; no API logic in the component.

Example idea (conceptual):

```typescript
function useStreamingChat() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (messages: Message[]) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true); setError(null); setContent('');
    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        body: JSON.stringify({ messages }),
        signal: abortRef.current.signal,
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No body');
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setContent(prev => prev + decoder.decode(value, { stream: true }));
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError(e instanceof Error ? e : new Error('Unknown'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { content, loading, error, send };
}
```

---

## 2. Streaming Over One-Shot

- Prefer **streaming** for chat so users see tokens as they arrive; use the same pattern as in Chapter 02 (read `response.body` and update state per chunk).
- Show a skeleton or "Thinking…" until the first chunk, then append to `content`.

---

## 3. Suspense and Server Components (When Relevant)

- **Suspense:** Use if you adopt a data-fetching approach that suspends (e.g. a library that throws a promise). Wrap the AI-powered section in `<Suspense fallback={...}>` so the rest of the page can render.
- **Server Components:** If you do LLM or RAG on the server (e.g. Next.js server action or route handler), the frontend can be a thin client that calls that endpoint; streaming can still be consumed in a client component via a hook.

Interview angle:

> "For streaming chat we use a client-side hook that reads the response stream and updates state. If we had server-driven AI (e.g. in Next.js), we’d call a server action or API route and still consume the stream in a client component with a similar hook. Suspense would wrap any part that suspends on data."

---

## 4. Cleanup and Cancellation

- On unmount or when the user sends a new message, **abort** the current fetch with `AbortController` so you don’t update state after unmount or overwrite with stale stream.

---

## 5. Common Mistakes

| Mistake | Better approach |
|---------|-----------------|
| Putting fetch and stream logic in the component | Use a custom hook that returns state and send function |
| Not aborting on unmount or new request | Use a ref to AbortController and abort in cleanup and before new send |
| Blocking the whole page on AI load | Use streaming and show partial content; use Suspense only if you suspend |

---

## 6. Interview Q&A

**Q: How would you implement a chat feature in React?**  
**A:**  
> "I’d use a custom hook like useStreamingChat that calls our backend stream endpoint, reads the body stream, and updates state with each chunk. The component would call the hook and render content, loading skeleton, and error state. I’d use AbortController to cancel the request on unmount or when the user sends a new message, so we don’t leak or overwrite state."

**Q: How do React hooks help with AI features?**  
**A:**  
> "Hooks let us encapsulate all API and streaming logic in one place and reuse it across components. We can return content, loading, error, and a send function from the hook and keep the UI purely presentational. That also makes it easy to test the hook and swap the backend without touching the UI."

---

## 7. Next Topic

→ **[08-cost-latency-and-ux.md](./08-cost-latency-and-ux.md)** — Cost, latency, and UX: skeletons, streaming, and fallbacks.
