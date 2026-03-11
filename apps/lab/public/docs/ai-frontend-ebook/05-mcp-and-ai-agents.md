## 05 — MCP & AI Agents in Frontend

> **TL;DR:** **MCP (Model Context Protocol)** is a way for AI tools to expose capabilities (APIs, data sources) to LLM-based agents. **Agents** use tools and multi-step reasoning. The frontend typically talks to **your backend**, which may use MCP servers or agent frameworks server-side; the frontend shows the agent’s output (streaming, actions) and optionally triggers tools via your API. In interviews, position MCP as a server-side integration pattern; the UI consumes the results.

---

## 1. What MCP Is

**Model Context Protocol (MCP):**

- Standard for exposing **tools** and **resources** to LLM applications.
- Servers expose capabilities (e.g. "search docs," "run query"); an LLM or agent can call them during a conversation.
- Typically used **on the backend**: your service connects to MCP servers and passes tool results into the model.

Frontend does not implement MCP directly; it talks to your API, which may use MCP under the hood.

Interview phrase:

> "MCP is a protocol for exposing tools and data to LLM-powered apps. We’d use it server-side: our backend connects to MCP servers and uses them during agent or chat flows. The frontend calls our API and displays the streamed or structured response."

---

## 2. What Agents Are in This Context

**Agent:** An LLM-based flow that can use **tools** (search, API calls, code) and take multiple steps to answer.

- Runs **on the server** (your API or a dedicated agent service).
- Frontend: sends user message, gets back streamed text and/or structured tool results or suggested actions.

---

## 3. How This Plugs Into Angular/React

- **Frontend:** Same as chat: call your backend (e.g. `POST /api/agent` or `/api/chat`), support streaming and structured responses.
- **Backend:** Uses an agent framework (or MCP clients) to call tools and the LLM; returns one or more messages and optional "tool used" or "suggested action" payloads.
- **UI:** Renders streamed text; if the API returns "agent used tool X with result Y," you can show that in the thread (e.g. "Searched your docs: …") for transparency.

No special Angular or React primitive for MCP; it’s an integration concern on the server. Your frontend remains a client of your API.

---

## 4. When to Mention MCP in Interviews

- When asked how you’d let the model use **internal tools** (search, DB, APIs): "We’d expose those via an MCP server and have our backend agent call them."
- When asked about **extensibility**: "MCP gives a standard way to add new tools and data sources without changing the frontend; we’d add new MCP servers and the agent can use them."

---

## 5. Common Mistakes

| Mistake | Better approach |
|---------|-----------------|
| Implementing MCP in the browser | Use MCP on the backend; frontend calls your API |
| Exposing MCP servers directly to the client | Keep MCP server-to-server; frontend talks only to your API |
| Assuming the frontend must "drive" the agent | Frontend sends messages and renders responses; backend runs the agent |

---

## 6. Interview Q&A

**Q: What is MCP and how would you use it in our stack?**  
**A:**  
> "MCP is a protocol for exposing tools and resources to LLM apps. We’d use it on the backend: our API would connect to MCP servers to give the agent access to search, APIs, or data. The frontend would call our API and display the agent’s streamed output and any tool results we expose in the response. The frontend doesn’t talk to MCP directly."

**Q: How do AI agents fit into an Angular/React app?**  
**A:**  
> "The agent runs server-side. The frontend sends the user’s message to our backend and displays the streamed reply. If the backend returns structured tool calls or suggested actions, we can show those in the UI — for example, 'Searched your docs' with a snippet. The app stays a thin client; all agent logic and tool use stay on the server."

---

## 7. Next Topic

→ **[06-angular-best-practices-for-ai.md](./06-angular-best-practices-for-ai.md)** — Best use of Angular for AI features: signals, async, services, and streaming.
