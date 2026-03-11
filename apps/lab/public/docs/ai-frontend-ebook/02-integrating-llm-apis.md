## 02 — Integrating LLM APIs from Angular & React

> **TL;DR:** Frontend calls your own backend or a BFF that talks to LLM providers; avoid exposing provider API keys from the client. Use streaming for chat so users see tokens as they arrive, and always handle loading, errors, and timeouts. In interviews, emphasize architecture (backend proxy), streaming, and UX.

---

## 1. Architecture: Never Expose Provider Keys in the Client

- **Do:** Frontend → your API/BFF → LLM provider (OpenAI, Anthropic, etc.).
- **Don't:** Frontend → LLM provider directly with a key in the client.

Reasons: key security, rate limiting, cost control, and ability to log, filter, and add RAG or tools on the server.

Interview phrase:

> "The frontend never talks to the LLM provider directly. It calls our backend or BFF, which adds auth, rate limits, and optional RAG or tool use before calling the provider. That keeps keys and cost server-side."

---

## 2. Non-Streaming vs Streaming

- **Non-streaming:** One request, full response. Simpler, but user waits with no feedback.
- **Streaming:** Chunks (SSE or similar). User sees progress; better perceived performance and cancellation.

For chat and long answers, prefer streaming and show tokens as they arrive.

---

## 3. Example: Calling a Backend Chat Endpoint (Angular)

Frontend calls your API; backend returns SSE or JSON.

```typescript
// Angular service (conceptual)
export class ChatService {
  private http = inject(HttpClient);

  sendMessage(messages: { role: string; content: string }[]) {
    return this.http.post<{ content: string }>('/api/chat', { messages }, {
      observe: 'events',
      responseType: 'json'
    }).pipe(
      // If backend uses SSE, parse event stream and emit chunks
      // Otherwise handle full response
    );
  }
}
```

For **streaming**, backend often uses Server-Sent Events (SSE). Frontend uses `EventSource` or a fetch-based reader and pushes chunks into a signal or observable so the template updates as text arrives.

---

## 4. Example: React Hook for Streaming Chat

```typescript
// React: hook that accumulates streamed chunks
function useStreamingChat() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const send = async (messages: Message[]) => {
    setLoading(true); setError(null); setContent('');
    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        body: JSON.stringify({ messages }),
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
      setError(e instanceof Error ? e : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return { content, loading, error, send };
}
```

Same idea in Angular: use a service that exposes a signal or observable updated from an async iteration over the response body.

---

## 5. Loading, Error, and Timeout Handling

- **Loading:** Show a skeleton or "Thinking…" and, if streaming, show partial output so the UI doesn’t feel stuck.
- **Errors:** Retry with backoff for transient failures; show a clear message and optional "Try again."
- **Timeout:** Set a max wait (e.g. 30–60s); cancel request or close stream and show fallback.

Interview angle:

> "We always show loading state and handle errors and timeouts. For streaming, we render partial content so the user sees progress instead of a single long wait."

---

## 6. Common Mistakes

| Mistake | Better approach |
|---------|-----------------|
| Calling LLM provider from the browser with a key | Proxy through your backend and keep keys server-side |
| No loading or error UI | Skeleton + error message + retry |
| Blocking UI on one big response | Prefer streaming so the UI updates as tokens arrive |
| Ignoring timeouts | Set timeout and cancel; show fallback or retry |

---

## 7. Interview Q&A

**Q: How would you integrate an LLM chat into our Angular/React app?**  
**A:**  
> "The frontend would call our backend chat API, not the LLM provider directly, so we keep keys and cost on the server. I’d use streaming so the user sees the reply as it’s generated, with a loading state before the first token and clear error and timeout handling. In Angular I’d use a service and signals or observables for the stream; in React I’d use a hook that reads the response body and updates state as chunks arrive."

**Q: Why use streaming for chat?**  
**A:**  
> "Streaming improves perceived performance — the user sees progress instead of waiting for the full response. It also allows showing partial content and cancelling if the user navigates away. We’d still handle the first-token latency with a skeleton or 'Thinking…' state."

---

## 8. Next Topic

→ **[03-rag-and-ai-with-your-data.md](./03-rag-and-ai-with-your-data.md)** — How RAG fits in and what the frontend’s role is when the backend uses "AI + your data."
