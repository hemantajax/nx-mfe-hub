# Micro-Frontends Deep Dive — Interview Prep Ebook

> **Target:** Senior frontend engineers, frontend architects, full-stack engineers  
> **Focus:** MFE architecture patterns, Module Federation, shell/remote design, state & auth, deployment, Nx monorepo with Angular & React  
> **Format:** Short, deep chapters — each one is an interview-ready topic.

---

## Chapter Map

| # | Chapter | Key Topics |
|---|---------|-----------|
| 01 | [What Are Micro-Frontends?](./01-what-are-micro-frontends.md) | Mental model, why they exist, monolith vs MFE trade-offs |
| 02 | [MFE Approaches & Techniques](./02-mfe-approaches-and-techniques.md) | Module Federation, single-spa, iframes, Web Components, ESM CDN |
| 03 | [Shell, Remotes & Routing](./03-shell-remotes-and-routing.md) | Shell app responsibilities, remote loading, cross-app routing |
| 04 | [Shared Dependencies & Design Systems](./04-shared-dependencies-and-design-systems.md) | Singleton pitfalls, version negotiation, shared UI libraries |
| 05 | [State & Auth Across Apps](./05-state-and-auth-across-apps.md) | Cross-MFE state, auth propagation, event bus, custom events |
| 06 | [Deployment & Independent Versioning](./06-deployment-and-versioning.md) | Independent deploys, versioning strategies, rollback, feature flags |
| 07 | [When (Not) to Use Micro-Frontends](./07-when-not-to-use-mfe.md) | Decision framework, team topology, cost-benefit, anti-patterns |
| 08 | [Nx Monorepo: MFE with Angular & React](./08-nx-mfe-angular-react.md) | Nx workspace setup, Angular MFE, React MFE, cross-framework shell |
| 09 | [Cheat Sheet & Interview Q&A](./09-cheat-sheet-and-qa.md) | Decision cards, 25+ Q&A templates, vocabulary |

---

## How to Use This Ebook

**Night before the interview:**  
Read **Chapter 09 (Cheat Sheet)** and **Chapter 07 (When Not to Use MFEs)** — interviewers love "would you actually use this?" as much as "how does it work?"

**Focused 3–4 hour session:**  
Chapters 01–03 for mental model and architecture. Chapters 04–06 for production concerns. Chapter 08 for hands-on Nx implementation.

---

## Quick Reference — Common Interview Prompts

**"Design a micro-frontend platform"**  
→ **[03-shell-remotes-and-routing.md](./03-shell-remotes-and-routing.md)** + **[06-deployment-and-versioning.md](./06-deployment-and-versioning.md)**

**"What's Module Federation?"**  
→ **[02-mfe-approaches-and-techniques.md](./02-mfe-approaches-and-techniques.md)**

**"How do you share state across micro-frontends?"**  
→ **[05-state-and-auth-across-apps.md](./05-state-and-auth-across-apps.md)**

**"Would you use micro-frontends for this product?"**  
→ **[07-when-not-to-use-mfe.md](./07-when-not-to-use-mfe.md)**

**"How do you set up MFE with Nx?"**  
→ **[08-nx-mfe-angular-react.md](./08-nx-mfe-angular-react.md)**
