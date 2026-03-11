# Chapter 05 — When (Not) to Use Micro-Frontends

## TL;DR

Micro-frontends solve **organizational scaling problems**, not technical ones. If you don't have multiple autonomous teams that need to deploy independently, MFEs add cost with no benefit. The right question isn't "how do we implement MFEs?" — it's "do we actually need them?"

> **One-liner for interviews:** "MFEs are an organizational solution. If one team owns the frontend, a well-structured monorepo beats MFEs every time. Add MFEs when team autonomy requires it."

---

## Core Concept

### The Fundamental Trade-off

Every MFE benefit comes with a corresponding cost:

| Benefit | Cost |
|---------|------|
| Independent deployability | Complex CI/CD per team |
| Team autonomy | Shared dependency coordination |
| Isolated failure domains | Cross-app communication overhead |
| Tech stack flexibility | Duplicate runtime costs |
| Parallel development | Integration testing complexity |

The question is: **do your org structure and scale justify paying these costs?**

---

## Deep Dive

### Conway's Law — The Real Driver

> "Organizations which design systems are constrained to produce designs which are copies of the communication structures of those organizations."  
> — Melvin Conway, 1967

MFEs are Conway's Law applied to the frontend. If you have 5 teams each owning a product domain, a monolith frontend forces them to coordinate every deployment. An MFE architecture lets each team's domain map to an independently deployable unit.

```
Org structure                   Architecture
──────────────                  ────────────
Team: Checkout   →   Remote: /checkout/* (deploys independently)
Team: Profile    →   Remote: /profile/*  (deploys independently)
Team: Search     →   Remote: /search/*   (deploys independently)
Team: Platform   →   Shell + shared libs (deploys rarely)
```

**If your org structure doesn't look like this, neither should your architecture.**

---

### When MFEs Are the Right Answer

#### ✅ Multiple autonomous teams on the same product

You have 4+ teams, each owning a product domain end-to-end (backend + frontend). They have separate roadmaps, separate deployments, and their main coordination bottleneck is the monolith frontend. MFEs remove that bottleneck.

#### ✅ Different release cadences

Team A ships daily. Team B ships quarterly (compliance requirements). In a monolith, Team A's fast cycle is blocked by Team B's releases. MFEs let Team A deploy without waiting.

#### ✅ Gradual migration from a legacy app

You have a 6-year-old AngularJS monolith. You can't rewrite it all at once. Wrap the legacy app as a single-spa application. New features are built as separate React MFEs. Migrate page by page over 18 months without a big bang rewrite.

#### ✅ Mergers and acquisitions

Company A acquires Company B. Both have frontend apps. You need to integrate them under one shell while both teams continue operating autonomously. MFEs are the right architecture for this scenario.

#### ✅ Third-party team integrations

A partner team (external vendor, internal platform team) needs to embed their UI in your product. An iframe or MFE gives them an integration point without accessing your codebase.

---

### When MFEs Are the Wrong Answer

#### ❌ One team owns the entire frontend

If a single team owns the codebase, there's no coordination problem to solve. A well-structured monorepo with clear module boundaries gives you all the code organization benefits at a fraction of the operational cost.

#### ❌ Small startup (< 20 engineers)

You don't have 4 autonomous teams. You have 3 engineers and a deadline. MFE infrastructure — CDN per remote, independent CI/CD, shared lib governance, version coordination — is overhead that kills velocity at this scale.

#### ❌ Simple CRUD application

If your frontend is a standard admin dashboard or simple SPA with no complex domains, a monorepo monolith is faster to build, easier to deploy, and simpler to debug.

#### ❌ Tight UX cohesion requirements

MFEs introduce seams — transitions between remotes are visible if not carefully handled. If your product demands pixel-perfect, seamless transitions and deeply integrated interactions across what would be MFE boundaries, the UX cost may not be worth paying.

#### ❌ Performance-critical initial load

Each remote adds a network request and JS parse cost. If your core metric is sub-2-second first paint, multiple `remoteEntry.js` files loading in parallel may be too expensive without significant optimization work.

---

### The Cost Catalog

Before recommending MFEs in a system design interview, acknowledge these costs:

**Operational complexity:**
- N+1 deployment pipelines (one per remote + shell)
- Multiple CDN origins to manage and secure
- Remote URL configuration management
- Per-remote monitoring and alerting

**Development complexity:**
- Local dev setup requires running multiple apps
- Integration testing across remotes is harder than unit testing within one
- Debugging cross-remote issues requires distributed tracing
- Shared dependency version management is an ongoing discipline

**Performance overhead:**
- Multiple `remoteEntry.js` fetches on page load
- Risk of dependency duplication if sharing config is wrong
- Hydration issues if remotes load out of order

**Team coordination overhead:**
- Contract changes still require cross-team communication
- Shared library updates require all teams to upgrade
- Breaking changes in the shell affect everyone

---

### The Decision Framework

Ask these questions before recommending MFEs:

```
1. How many autonomous teams own the frontend?
   └─ 1–2 teams → Monorepo. Stop here.
   └─ 3+ teams → Continue.

2. Do teams have different deployment cadences?
   └─ No → Monorepo with CI gates. Stop here.
   └─ Yes → Continue.

3. Do teams have genuinely separate product domains?
   └─ No (everything is tightly integrated) → Monorepo. Stop here.
   └─ Yes → Continue.

4. Does the org have the platform maturity for MFE ops?
   (CDN management, CI/CD tooling, observability)
   └─ No → Start with monorepo, plan MFE migration.
   └─ Yes → MFEs are justified.
```

---

### Alternative: Monorepo with Strong Module Boundaries

Before jumping to MFEs, a well-structured Nx monorepo often gives 80% of the benefit at 20% of the cost:

```
apps/
  web/           ← One deployable app
libs/
  checkout/      ← Checkout feature (team A owns)
    ui/
    data-access/
    feature/
  profile/       ← Profile feature (team B owns)
    ui/
    data-access/
    feature/
  shared/
    ui/
    auth/
```

**What this gives you:**
- Clear code ownership (teams own their `libs/` directories)
- Affected build/test — CI only runs what changed
- Module boundaries enforced by Nx (`no-restricted-imports` rules)
- One deployment — no remote URL coordination

**What you don't get:**
- Independent deployability — all teams ship together
- Tech stack diversity — everyone uses the same framework

If independent deployment is not required, start here.

---

## Best Practices

- **Justify MFEs with an org chart, not a tech diagram.** If you can't point to multiple teams that need to deploy independently, don't build MFE infrastructure.
- **Start with a monorepo.** When the team grows and deployment coordination becomes the bottleneck, migrate. Don't architect for scale you don't have.
- **Migrate incrementally.** Don't rewrite everything as MFEs simultaneously. Use single-spa to wrap existing code and introduce new remotes one domain at a time.
- **Measure the cost.** Track: local dev setup time, integration test cycle time, deploy coordination overhead. When these metrics degrade, it signals MFEs are needed.

---

## Common Mistakes

❌ **"We'll use MFEs to enforce good architecture"** — MFEs don't fix bad code. If your monolith is a tangle of spaghetti, your MFEs will be a distributed tangle of spaghetti.

❌ **Choosing MFEs for tech stack flexibility without needing it** — "We might want to use Vue for some parts" is not a reason. If you don't have a concrete polyglot requirement, the flexibility costs more than it's worth.

❌ **Under-estimating local dev complexity** — Developers need to run the shell + every remote they touch. Without good tooling (Nx, local mock remotes), onboarding time skyrockets.

❌ **MFEs as a substitute for team communication** — Teams still need to agree on shared contracts, event bus schemas, and dependency versions. MFEs reduce deployment coupling, not communication needs.

---

## Interview Q&A

**Q: When would you not use micro-frontends?**  
A: "Whenever the organizational problem they solve doesn't exist. MFEs add real operational overhead — independent pipelines, CDN management, shared dependency coordination. If one team owns the entire frontend, a well-structured Nx monorepo with clear module boundaries gives you code isolation and ownership without the deployment complexity. I'd reach for MFEs specifically when multiple autonomous teams have different deployment cadences and are being bottlenecked by a shared monolith deploy."

**Q: Can you have good architecture without micro-frontends?**  
A: "Absolutely. A monorepo with enforced module boundaries, strong ownership conventions, and Nx affected commands can scale to large teams. The difference is you're still deploying together, which means release coordination. If teams are okay with that, or they're naturally in sync, a monorepo is strictly simpler. MFEs are the solution to the specific problem of teams needing to ship independently."

**Q: How do you convince a team not to adopt MFEs prematurely?**  
A: "I ask them to identify the specific coordination problem they're trying to solve. If the answer is 'we want cleaner code' or 'we like the idea,' I'd propose a monorepo with module boundaries first — same organizational clarity, none of the operational overhead. If the answer is 'we have 5 teams deploying to the same frontend and blocking each other every sprint,' then MFEs are justified and the conversation shifts to how."

---

## Next Steps

- **Nx & Implementation** → [06-nx-mfe-angular-react.md](./06-nx-mfe-angular-react.md) — for when you've decided MFEs are justified
- **Shell & Routing** → [02-shell-remotes-routing.md](./02-shell-remotes-routing.md) — architecture fundamentals once you're committed
- **Cheat Sheet** → [07-cheat-sheet-and-qa.md](./07-cheat-sheet-and-qa.md) — decision framework quick reference
