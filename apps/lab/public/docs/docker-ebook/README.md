## Docker for System Design & UI Architects — Interview Prep Ebook

> **Target:** Senior engineers / UI architects  
> **Focus:** Docker, Docker Compose, CI/CD, security, and how to talk about containers in system design interviews  
> **Format:** Short, deep chapters — each one is an interview-ready topic

---

## Part 1: Docker Fundamentals

| # | Chapter | Key Topics |
|---|---------|-----------|
| 01 | [Docker Mental Model & Architecture](./01-docker-mental-model.md) | Docker vs VMs, images vs containers, layers, registries, when to use Docker |
| 02 | [Images, Layers & Dockerfile Design](./02-images-and-dockerfile.md) | Dockerfile instructions, multi-stage builds, image slimming, caching, `.dockerignore` |
| 03 | [Containers, Lifecycle & Resource Management](./03-containers-and-lifecycle.md) | Container lifecycle, logs, CPU/memory limits, health checks, restart policies |
| 04 | [Volumes & Persistence](./04-volumes-and-persistence.md) | Bind mounts vs named volumes, data directories, DB persistence, node_modules caching |
| 05 | [Networking & Service Discovery](./05-networking-and-network-modes.md) | Bridge/host networks, ports, DNS between containers, local vs cloud exposure |

## Part 2: Workflow & Environments

| # | Chapter | Key Topics |
|---|---------|-----------|
| 06 | [Docker Compose for Local Environments](./06-docker-compose.md) | Compose file design, multi-service stacks, profiles, local microfrontends + APIs |
| 07 | [Docker in CI/CD & Environments](./07-docker-in-ci-cd.md) | CI builds, tagging, pushing, caching, multi-arch, promoting images across envs |

## Part 3: Advanced Topics & Interview Arsenal

| # | Chapter | Key Topics |
|---|---------|-----------|
| 08 | [Security, Compliance & Best Practices](./08-security-and-best-practices.md) | Non-root, minimal images, scanning, secrets, SBOM, supply-chain concerns |
| 09 | [Docker & Kubernetes/System Design](./09-docker-and-kubernetes.md) | Mapping Docker to K8s concepts, when to mention which, high-level architectures |
| 10 | [Cheat Sheet & Interview Q&A](./10-cheat-sheet-and-qa.md) | Command reference, optimization checklist, answer templates, red-flag mistakes |

---

## How to Use This Ebook

**Night before the interview:**  
Read **Chapter 10 (Cheat Sheet & Interview Q&A)** end-to-end. It summarizes the mental models, commands, and answer templates.

**Focused 2–3 hour session:**  
Read **Part 1 (Chapters 01–05)** to solidify your Docker foundations, then skim **Chapters 06–07** for CI/CD and Compose workflows.

**Full-day deep dive:**  
Read everything front-to-back. Each chapter is self-contained; you can jump directly to topics that match your interview expectations.

**During a system design or UI architect interview:**  
- Use Docker as an implementation detail, not the whole story.  
- When you introduce containers, explicitly mention **images, registries, and how you promote them across environments**.  
- Use the mental models and phrasing from Chapters 01, 02, 07, and 09.

---

## Chapter Structure (What to Expect)

Every chapter is structured the same way so you can scan quickly:

1. **TL;DR** — 5–10 bullet summary, interview-friendly phrasing  
2. **Core Concept Explanation** — mental models and diagrams in words  
3. **Deep Dive (Senior Level)** — internals, trade-offs, and performance angles  
4. **Code / CLI Examples** — realistic `Dockerfile`, `docker` / `docker compose` commands  
5. **Architecture & Best Practices** — how you would design it in a real system  
6. **Common Mistakes** — what junior answers usually miss or get wrong  
7. **Interview Q&A** — short, confident answers with follow-ups  
8. **Next Steps** — where to go next in this ebook

---

## Quick Reference — Common Interview Prompts

**\"Explain Docker to a non-dev, and why we use it.\"**  
→ See **[01-docker-mental-model.md](./01-docker-mental-model.md)** — TL;DR + first section.

**\"How do you design Dockerfiles for production?\"**  
→ See **[02-images-and-dockerfile.md](./02-images-and-dockerfile.md)** — multi-stage builds + best practices.

**\"How do you run your full stack locally (UI, API, DB) with Docker?\"**  
→ See **[06-docker-compose.md](./06-docker-compose.md)** — example stack and Compose patterns.

**\"How does Docker fit into your CI/CD pipeline?\"**  
→ See **[07-docker-in-ci-cd.md](./07-docker-in-ci-cd.md)** — build, tag, push, promote.

**\"What are the main security risks with Docker and how do you mitigate them?\"**  
→ See **[08-security-and-best-practices.md](./08-security-and-best-practices.md)** — security checklist and narratives.

**\"When do you talk about Docker vs Kubernetes in a system design interview?\"**  
→ See **[09-docker-and-kubernetes.md](./09-docker-and-kubernetes.md)** — framing and trade-offs.

