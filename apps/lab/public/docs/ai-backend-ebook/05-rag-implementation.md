## 05 — RAG Implementation

> **TL;DR:** **RAG** = retrieve relevant chunks from your data, add them to the prompt, then call the LLM so answers are grounded in your content. Backend owns **embedding** (or using pre-embedded chunks), **retrieval** (vector or hybrid search), and **injection** into the prompt. The frontend only sends the query; it doesn’t do retrieval or embedding.

---

## 1. RAG Pipeline (Backend)

1. **Indexing (offline or on ingest):** Chunk documents → embed chunks → store in a vector store (e.g. Pinecone, Weaviate, pgvector, or a search engine with vector support).
2. **Query (at request time):** User sends a question → backend embeds the query (or uses the query as-is for keyword search) → retrieves top-k similar chunks → injects them into the prompt → calls the LLM → returns (or streams) the answer.
3. **Optional:** Return **sources** (chunk IDs or snippets) in the API response so the frontend can show citations.

---

## 2. Chunking

- Split documents into **chunks** (e.g. by paragraph, section, or fixed token size). Overlap or sentence boundaries can improve relevance.
- Chunk size and strategy affect recall and prompt size; tune for your content and model context window.

---

## 3. Embeddings and Vector Store

- **Embedding model:** Turn text into vectors (e.g. OpenAI embeddings, or open-source models). Same model for indexing and query for compatibility.
- **Vector store:** Store chunk vectors; at query time run **similarity search** (e.g. cosine) to get top-k chunks. Can combine with keyword filters (hybrid search) for better precision.

---

## 4. Injecting Context into the Prompt

- Prepend or insert retrieved chunks into the prompt (e.g. "Use the following context: …" then the chunks, then the user question).
- Keep total prompt size under the model’s context limit; trim or summarize if you have many chunks.

---

## 5. Common Mistakes

| Mistake | Better approach |
|---------|-----------------|
| Doing retrieval or embedding in the frontend | Keep the full RAG pipeline on the backend |
| Sending raw documents in the request for "RAG" | Backend retrieves from its own store; client sends only the query |
| No source attribution | Return source IDs or snippets so the client can show citations and you can debug |

---

## 6. Interview Q&A

**Q: How would you implement RAG?**  
**A:**  
> "We chunk documents and embed them with the same model we use for queries, then store the vectors in a vector store. At request time we embed the user’s question, run a similarity search to get the top-k chunks, inject them into the prompt with a clear 'context' section, and call the LLM. We return the answer and optionally source IDs or snippets so the frontend can show citations. The whole pipeline runs on the backend; the client only sends the query."

**Q: How do you choose chunk size and top-k?**  
**A:**  
> "Chunk size is a trade-off: smaller chunks give more precise retrieval but more fragments; larger chunks give more context per chunk but can be noisier. We tune for our content and model context window. Top-k we set so we stay under the context limit and keep latency reasonable; we often start with 5–10 and adjust based on quality and cost."

---

## 7. Next Topic

→ **[06-tool-use-and-function-calling.md](./06-tool-use-and-function-calling.md)** — Letting the model call tools (e.g. search, API) and how to execute and return results.
