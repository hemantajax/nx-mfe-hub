## 07 — MCP Server-Side

> **TL;DR:** **MCP (Model Context Protocol)** is a standard for exposing **tools** and **resources** to LLM-powered applications. On the backend, you can run an **MCP server** that exposes your APIs or data; your **agent or chat service** connects to it and lets the model use those tools during a conversation. The frontend still talks only to your API; MCP is a server-to-server integration.

---

## 1. What MCP Adds

- **Tools:** Expose actions (e.g. "search docs," "create ticket") in a standard way so any MCP client (e.g. your agent) can discover and call them.
- **Resources:** Expose read-only data (e.g. "list projects") that the model can use as context.
- **Standard protocol:** So you can plug in new tools or data sources without rewriting the agent; the agent just connects to another MCP server.

---

## 2. Backend’s Role

- **MCP server:** You run a process (or integrate a library) that implements MCP and exposes your internal APIs or data as tools/resources.
- **Agent / chat service:** Your backend agent connects to one or more MCP servers, gets the tool list, and when the model asks to use a tool, your backend calls the MCP server (or your own code) to execute it and returns the result to the model.
- **Frontend:** Unchanged; it calls your chat/agent API and gets streamed or final responses. It doesn’t know about MCP.

Interview phrase:

> "We use MCP server-side so our agent can discover and call tools — for example search or ticketing — in a standard way. We run an MCP server that exposes our internal capabilities, and our chat backend connects to it. The frontend only talks to our API; it doesn’t interact with MCP directly."

---

## 3. When to Use MCP

- When you want **multiple tools or data sources** and a **standard way** for the agent to use them.
- When you want to **add or change tools** without changing the agent’s core logic (just add a new MCP server or tool).
- When you’re integrating with **third-party MCP servers** (e.g. data sources) that your agent should use.

---

## 4. Security

- MCP servers run in your **trusted backend**. Don’t expose them directly to the internet.
- **Authorize** tool calls in the same way as in Chapter 06: validate and check user permissions before executing.

---

## 5. Common Mistakes

| Mistake | Better approach |
|---------|-----------------|
| Exposing MCP server to the client | Keep MCP server-to-server; client talks only to your API |
| No auth on tool execution | Authorize every tool call for the current user/tenant |

---

## 6. Interview Q&A

**Q: What is MCP and how do you use it on the backend?**  
**A:**  
> "MCP is a protocol for exposing tools and resources to LLM apps. We run an MCP server that exposes our internal capabilities — like search or ticketing — and our agent service connects to it. When the model wants to use a tool, the backend calls the MCP server, gets the result, and sends it back to the model. The frontend only talks to our API; MCP is entirely server-side."

**Q: When would you use MCP instead of hard-coding tool calls?**  
**A:**  
> "When we have many tools or multiple data sources and want a standard, pluggable way for the agent to discover and call them. MCP lets us add new tools or connect to new MCP servers without changing the agent’s core logic. For a small fixed set of tools, we might just implement function calling directly; for a growing or multi-team set of capabilities, MCP scales better."

---

## 7. Next Topic

→ **[08-cost-rate-limiting-and-budgets.md](./08-cost-rate-limiting-and-budgets.md)** — Per-user limits, token counting, and cost control.
