## 06 — Angular Best Practices for AI

> **TL;DR:** Use **signals** for streaming content and loading/error state, **services** to encapsulate API calls and cancellation, and **async/streaming** patterns so the UI updates as tokens arrive. Keep AI features behind **lazy-loaded** routes or `@defer` when appropriate. In interviews, highlight signals, OnPush, and a single place for AI logic (services).

---

## 1. State: Signals for Content, Loading, Error

- **Streaming content:** A `WritableSignal<string>` that you update as chunks arrive from the backend.
- **Loading / error:** Separate signals (e.g. `loading()`, `error()`) so the template can show skeleton, content, or error without parsing.

Example idea:

```typescript
// Service
readonly content = signal('');
readonly loading = signal(false);
readonly error = signal<Error | null>(null);

async streamReply(messages: Message[]) {
  this.loading.set(true);
  this.error.set(null);
  this.content.set('');
  try {
    const res = await fetch('/api/chat/stream', { ... });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      this.content.update(prev => prev + decoder.decode(value, { stream: true }));
    }
  } catch (e) {
    this.error.set(e instanceof Error ? e : new Error('Unknown'));
  } finally {
    this.loading.set(false);
  }
}
```

Template: bind to `content()`, `loading()`, `error()` with `@if` and show skeleton or error UI.

---

## 2. Single Responsibility: AI in a Service

- Put all **LLM API calls**, streaming, and retry logic in a **service** (e.g. `ChatService`, `AiAssistService`).
- Components only call the service and bind to its signals (or observables). This keeps components simple and makes testing and reuse easy.

Interview phrase:

> "We keep AI integration in a dedicated service that exposes signals for content, loading, and error. Components stay presentational and just call the service and render the signals."

---

## 3. Cancellation and Cleanup

- When the user leaves the page or sends a new message, **cancel** the in-flight request (e.g. `AbortController`) and reset state.
- In Angular, use `DestroyRef` or `takeUntilDestroyed` if you expose observables, and abort fetch on destroy.

---

## 4. Lazy Loading and @defer

- If the AI feature is heavy (e.g. chat UI + dependencies), put it in a **lazy-loaded route** or use `@defer` so the initial bundle stays small.
- Load the AI service and components only when the user enters the AI flow.

---

## 5. OnPush and Performance

- Use **OnPush** so only signal (or input) changes trigger updates. Streaming updates to a signal will only re-render the bound parts of the template, which scales well for fast token streams.

---

## 6. Common Mistakes

| Mistake | Better approach |
|---------|-----------------|
| Putting API and streaming logic in the component | Use a service with signals; component only binds and calls the service |
| Not cancelling requests on navigate or new message | Use AbortController and cleanup in DestroyRef/takeUntilDestroyed |
| Loading AI bundle up front when it’s a secondary feature | Lazy-load the route or use @defer |

---

## 7. Interview Q&A

**Q: How would you implement a chat feature in Angular?**  
**A:**  
> "I’d add a ChatService that calls our backend chat/stream API and exposes signals for the streamed content, loading, and error. The component would call the service and bind to those signals with OnPush, show a skeleton while loading, and stream tokens into the template as they arrive. I’d use AbortController to cancel the request when the user navigates away or sends a new message, and I’d lazy-load the chat route or use @defer so the main bundle stays small."

**Q: Why use signals for streaming LLM output?**  
**A:**  
> "Signals give fine-grained updates: we can push each chunk into the same signal and only the dependent template updates. With OnPush, that keeps re-renders minimal and the UI responsive during fast token streams."

---

## 8. Next Topic

→ **[07-react-best-practices-for-ai.md](./07-react-best-practices-for-ai.md)** — Best use of React for AI: hooks, Suspense, and streaming.
