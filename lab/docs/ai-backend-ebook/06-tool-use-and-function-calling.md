## 06 — Tool Use & Function Calling

> **TL;DR:** **Tool use** (function calling) lets the model request an action (e.g. search, book a meeting). The backend **defines tools** (name, description, parameters), passes them to the LLM, **executes** the chosen tool when the model returns a tool call, and **sends the result** back to the model. The loop continues until the model returns a final answer. Frontend typically sees only the final reply or structured actions you expose.

---

## 1. Flow

1. Backend sends the user message and a **list of tools** (name, description, JSON schema for parameters) to the LLM.
2. Model can return a **tool call** (e.g. `search_products(query: "red shoes")`) instead of text.
3. Backend **executes** the tool (e.g. calls search API), gets a result.
4. Backend sends the **tool result** back to the model (as a message or tool response).
5. Model may call another tool or return the final **assistant** message. Repeat until done.
6. Backend returns the final text (or structured summary) to the client.

---

## 2. Defining Tools

- Each tool: **name**, **description** (so the model knows when to use it), **parameters** (JSON schema). Provider APIs (OpenAI, Anthropic, etc.) accept this format.
- Only expose tools the backend can **safely execute** with the current user and context. Validate and authorize before running (e.g. don’t let a tool delete data without auth checks).

---

## 3. Execution and Safety

- **Execute** the tool in your backend (call internal APIs, DB, search). Don’t let the model output run arbitrary code.
- **Validate** parameters (type, range) and **authorize** (user can do this action) before execution.
- **Limit** tool calls per turn or per request to avoid runaway loops.

---

## 4. Returning to the Client

- Option A: Return only the **final assistant message** (simple; client sees one reply).
- Option B: Include **structured actions** in the response (e.g. "Searched products: …" with a list) so the frontend can show what the agent did. Useful for transparency and UX.

---

## 5. Common Mistakes

| Mistake | Better approach |
|---------|-----------------|
| Letting the model trigger unsafe actions | Validate and authorize every tool execution |
| No limit on tool calls | Cap iterations so one request can’t spin forever |
| Exposing internal-only tools to the model | Only register tools that are safe and relevant for the user’s context |

---

## 6. Interview Q&A

**Q: How does function calling work on the backend?**  
**A:**  
> "We define tools with name, description, and parameter schema and pass them to the LLM with the user message. When the model returns a tool call, we validate the parameters and permissions, execute the tool in our backend — for example call our search API — and send the result back to the model. We repeat until the model returns a final answer, then we return that to the client. We enforce a limit on tool calls per request to avoid runaway loops."

**Q: How do you keep tool use safe?**  
**A:**  
> "We only register tools we can execute safely. Before running any tool we validate parameters and check that the user is authorized for that action. We don’t let the model execute arbitrary code; we map tool names to specific backend functions or API calls."

---

## 7. Next Topic

→ **[07-mcp-server-side.md](./07-mcp-server-side.md)** — Exposing capabilities to agents via MCP (Model Context Protocol) on the server.
