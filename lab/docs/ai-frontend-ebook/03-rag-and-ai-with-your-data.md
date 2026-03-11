## 03 — RAG and AI + Your Data

> **TL;DR:** RAG (Retrieval-Augmented Generation) runs on the **backend**: retrieve relevant documents, then pass them into the LLM so answers are grounded in your data. The frontend’s job is to call a RAG-enabled API (e.g. search or chat), show results or streamed answers, and optionally send context (e.g. selected doc IDs or query). In interviews, clarify that RAG is a server-side pattern; the frontend consumes it via normal APIs.

---

## 1. What RAG Is (Backend-Centric)

**RAG** = Retrieve relevant chunks from your data (vector DB, search) → add them to the LLM prompt → generate an answer grounded in that context.

- Happens **on the server** (your API or a dedicated RAG service).
- Frontend does **not** implement retrieval or prompt construction; it just calls an API.

Interview phrase:

> "RAG is a server-side pattern. The backend retrieves relevant documents, injects them into the prompt, and calls the LLM. The frontend calls our chat or search API and displays the streamed or final answer; it doesn’t do retrieval or prompt building."

---

## 2. Frontend’s Role

- **Call RAG-backed endpoints:** e.g. `POST /api/chat` or `POST /api/search` with the user’s message (and optional context).
- **Send minimal context:** query, current product/tenant, or selected doc IDs if the UX allows "answer from these."
- **Display results:** streamed text, citations, or links to source docs if the API returns them.
- **Don’t:** Send large doc bodies from the client for RAG; the server should own retrieval and chunking.

---

## 3. Example: Chat That Uses RAG Under the Hood

User asks: "What’s our refund policy?"

- Frontend: `POST /api/chat` with `{ "message": "What's our refund policy?" }`.
- Backend: Runs vector/search over policy docs, gets top chunks, builds prompt with those chunks + user message, calls LLM, streams reply.
- Frontend: Shows streamed answer; if API includes `sources`, show links or snippets.

Frontend code stays the same as in Chapter 02; only the backend changes to add RAG.

---

## 4. When Frontend Sends Extra Context

Sometimes the frontend sends **context** the backend will use (e.g. for personalization or scope):

- Current product ID, locale, or tenant.
- Selected items (e.g. "answer using these doc IDs").
- Session or conversation ID for multi-turn.

The backend still does retrieval and prompt construction; the frontend just supplies parameters.

---

## 5. Common Mistakes

| Mistake | Better approach |
|---------|-----------------|
| Implementing RAG in the browser | Keep retrieval and prompt construction on the server; frontend calls APIs |
| Sending full documents from client for "RAG" | Server should pull from its own store; client sends query and optional filters |
| No citations or sources in UI when backend provides them | Show source links or snippets so users can verify |

---

## 6. Interview Q&A

**Q: How does RAG fit into our frontend?**  
**A:**  
> "RAG is implemented on the backend: it retrieves relevant chunks and feeds them to the LLM. The frontend calls our chat or search API with the user’s message and optional context. We display the streamed answer and, if the API returns sources, we show citations or links so users can verify the answer."

**Q: Does the frontend do retrieval or embedding?**  
**A:**  
> "No. Retrieval and embedding happen on the server. The frontend only sends the query and any scoping parameters; the backend returns the generated answer and optionally source references."

---

## 7. Next Topic

→ **[04-prompt-engineering-and-api-design.md](./04-prompt-engineering-and-api-design.md)** — Prompt design, structured outputs, and API contracts for AI features.
