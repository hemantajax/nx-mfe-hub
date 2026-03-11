# Chapter 07 — When (Not) to Use Micro-Frontends

## TL;DR

Micro-frontends are an organizational pattern, not a technical upgrade. They add significant complexity — distributed deployment, shared dep management, cross-app communication, versioning overhead. The benefits only exceed the costs at sufficient team scale and domain complexity.

> **One-liner for interviews:** "MFEs solve team coordination problems at scale. If you don't have those problems, MFEs just add complexity. The question is always: does the organizational benefit justify the architectural cost?"

---

## Core Concept

### The Trade-Off is Real

Every MFE benefit comes with a cost:

| Benefit | Cost |
|---------|------|
| Independent deployment | Distributed system complexity |
| Team autonomy | Cross-team contract management |
| Isolated failures | Distributed debugging |
| Tech flexibility | Shared dep coordination |
| Separate codebases | Integration test surface |
| Smaller builds per team | Larger total bundle (if sharing fails) |

None of these costs go away. You're betting that the coordination overhead of a shared codebase is greater than the operational overhead of a distributed frontend. That bet pays off only at sufficient scale.

---

## Decision Framework

### The 5-Question Test

Before adopting MFE, answer these honestly:

**1. How many product teams work on the frontend?**
- 1–3 teams → Monolith with clear module boundaries is almost always sufficient
- 4–6 teams → MFE worth evaluating if deploy coupling is a real pain
- 7+ teams → MFE is likely the right call

**2. How often do teams block each other's deployments?**
- Rarely → Not a problem MFE solves
- Constantly → MFE directly addresses this

**3. Do teams have genuinely independent product domains?**
- Shared, overlapping features → MFE boundaries will be unclear and contentious
- Clear vertical slices (orders, checkout, profile) → MFE boundaries map naturally

**4. Do you need technology heterogeneity?**
- All teams happy with one framework → MFE's framework flexibility is unnecessary overhead
- Some teams have legacy Angular, others are on React → MFE or single-spa may be worth it

**5. Does your team have the platform engineering capacity?**
- No dedicated platform team → MFE infrastructure is expensive to maintain without one
- Platform team exists → They can own the shell, manifest, shared packages

---

## When NOT to Use MFE

### Scenario 1: Small to Medium Teams (< 5 teams)

A team of 20 engineers or 3 product squads sharing a codebase does not have the coordination problems MFE solves. They can coordinate directly.

**Better approach:** Feature modules with clear ownership, lazy-loaded routes, a shared component library, and a monorepo with code ownership rules.

```
// Angular module boundary enforcement (Nx)
// nx.json — enforce that orders can't import from checkout
{
  "tags": {
    "orders": { "onlyDependOnLibsWithTags": ["shared", "orders"] },
    "checkout": { "onlyDependOnLibsWithTags": ["shared", "checkout"] }
  }
}
```

### Scenario 2: Single-Domain Product

If the product is a single coherent experience (a SaaS dashboard, a mobile app's companion web), domain boundaries are artificial. Splitting it creates seams in user flows that don't need to exist.

**Better approach:** A well-structured monolith with strong module boundaries. Extract a library when the boundary is clear and stable.

### Scenario 3: Startup / Early Stage

You don't have 10,000 users yet. Your architecture should optimize for iteration speed, not team scale. MFE doubles your operational overhead.

**Better approach:** Monolith with good code structure. Migrate to MFE when the team coordination pain becomes undeniable.

### Scenario 4: High Integration Across Domains

If "orders" and "checkout" constantly share components, cross-navigate, and share state, the MFE boundary creates friction everywhere. Every feature touches the contract.

**Better approach:** Keep them in the same app. Extract the boundary only when you can define a clean API between them.

### Scenario 5: SSR-Critical Application

Module Federation SSR is complex and immature. If you need Next.js or Angular Universal-level SSR for SEO or performance, standard MFE approaches create significant complications.

**Better approach:** Monolith Next.js or SSR app. Module-level code splitting and lazy loading solves most of the same problems.

---

## When MFE IS the Right Call

✅ **5+ teams, clear vertical domain ownership** — The org structure maps to the codebase naturally.

✅ **Deploy coupling causes measurable pain** — Teams are delaying features or doing deploy coordination calls weekly.

✅ **Technology migration** — Migrating from Angular 1 to React or Angular. MFE lets you do it incrementally via the strangler fig pattern.

✅ **Acquired product integration** — Merging two companies' frontends. Iframe or MFE integration is often faster than a full rewrite.

✅ **Platform product** — Building a product where third parties embed their frontends into your shell (plugin marketplace, embedded analytics).

---

## The Strangler Fig Migration Pattern

If you're not starting greenfield, don't big-bang migrate. Extract one domain at a time:

```
Phase 1: Set up shell around the monolith
  Shell → mounts entire monolith at /*
  No behavior change — just adding the shell frame

Phase 2: Extract first remote (least coupled domain)
  Shell → /profile/* → profile-remote (new)
  Shell → /* → monolith (everything else)

Phase 3: Extract next domain
  Shell → /orders/* → orders-remote
  Shell → /* → monolith (still shrinking)

Phase N: Monolith is empty → decommission
```

```javascript
// Shell during migration — routes to either remote or monolith
new ModuleFederationPlugin({
  remotes: {
    profile: 'profile@https://cdn.com/profile/remoteEntry.js',
    orders:  'orders@https://cdn.com/orders/remoteEntry.js',
    // monolith still serves /* — no Federation needed
  },
})
```

---

## The Alternatives Checklist

Before committing to MFE, verify you've tried:

- [ ] **Nx/Turborepo monorepo with enforced module boundaries** — You get code isolation and ownership without runtime complexity
- [ ] **Lazy-loaded route-based code splitting** — Large bundles? Route splitting reduces TTI without MFE overhead
- [ ] **Shared component library (npm package)** — Design consistency without MFE complexity
- [ ] **Clear Git ownership rules (CODEOWNERS)** — Ownership clarity without architectural changes
- [ ] **Separate repos with shared type package** — Some of the independence, far less integration complexity

---

## Best Practices

- **Make the decision based on team topology, not technology trends.** Read Team Topologies (Skelton & Pais). Your architecture should match your team structure.
- **Extract incrementally.** Never big-bang migrate an entire monolith to MFE.
- **Define success metrics before starting.** "Reduce deploy time from 2 days to 4 hours per team" is a measurable goal. "Be more modern" is not.
- **Have a platform team.** MFE infrastructure needs someone to own the shell, manifest service, shared packages, and the overall developer experience.

---

## Interview Q&A

**Q: Would you use micro-frontends for a new product?**  
A: "Almost certainly not at day one. MFE is an organizational scaling pattern — it solves deploy coupling and team autonomy problems that only appear at sufficient team size and domain complexity. A new product should optimize for iteration speed. I'd start with a well-structured monolith using Nx or Turborepo for module boundaries. I'd revisit MFE when: the team grows past 5–6 squads, deploy coordination becomes a recurring pain point, or we're integrating a legacy system we can't rewrite immediately."

**Q: What are the hidden costs of micro-frontends?**  
A: "Several. Shared dependency versioning is a constant operational overhead — if teams drift on React versions, you get subtle bugs. Distributed debugging is harder — a production issue might span shell, a remote, and a shared package. Integration testing becomes complex — you need to test the shell with each remote in combination. The manifest service and CDN infrastructure need someone to own them. And the shell-remote API contract needs governance — changes require coordination between teams. These costs are worth it at scale, but they're real and they never go away."

**Q: How do you migrate from a monolith to micro-frontends without breaking production?**  
A: "Strangler fig pattern. First, add a shell around the monolith — it passes through all routes to the monolith, no behavior change. Then extract the least-coupled domain first — maybe the profile section. The shell routes `/profile/*` to the new remote and everything else to the monolith. Verify it works. Extract the next domain. Repeat until the monolith is empty. This lets you ship value at each phase, and if something goes wrong with a remote, you can route back to the monolith instantly."

---

## Next Steps

- **Nx MFE Setup** → [08-nx-mfe-angular-react.md](./08-nx-mfe-angular-react.md) — practical implementation with Angular and React
- **Cheat Sheet** → [09-cheat-sheet-and-qa.md](./09-cheat-sheet-and-qa.md) — complete decision framework in one page
