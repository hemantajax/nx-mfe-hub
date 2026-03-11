## Kubernetes for System Design & UI Architects — Interview Prep Ebook

> **Target:** Senior engineers / UI architects  
> **Focus:** Pods, deployments, services, scaling, resilience, and how to talk about Kubernetes in system design interviews  
> **Format:** Short, deep chapters — each one is an interview-ready topic

---

## Part 1: Kubernetes Fundamentals

| # | Chapter | Key Topics |
|---|---------|-----------|
| 01 | [Kubernetes Mental Model & Architecture](./01-k8s-mental-model.md) | Why K8s exists, control plane vs data plane, clusters, nodes, workloads |
| 02 | [Pods, Containers & Workloads](./02-pods-and-workloads.md) | Pods, multi-container pods, Deployments, StatefulSets, Jobs, DaemonSets |
| 03 | [Services, Ingress & Traffic](./03-services-and-ingress.md) | ClusterIP, NodePort, LoadBalancer, Ingress, service discovery, routing |
| 04 | [Config, Secrets & Environment Management](./04-config-and-secrets.md) | ConfigMaps, Secrets, environment injection, per-env config patterns |
| 05 | [Storage & Persistence](./05-storage-and-persistence.md) | Volumes, PersistentVolumes, PersistentVolumeClaims, StorageClasses |

## Part 2: Scaling, Resilience & Operations

| # | Chapter | Key Topics |
|---|---------|-----------|
| 06 | [Scaling, Health Checks & Self-Healing](./06-scaling-and-health.md) | HPA, readiness vs liveness, rolling updates, disruption budgets |
| 07 | [Multi-Tenancy & Environments](./07-multi-tenancy-and-environments.md) | Namespaces, RBAC, resource quotas, env separation, multi-cluster basics |

## Part 3: Observability, Security & Interview Arsenal

| # | Chapter | Key Topics |
|---|---------|-----------|
| 08 | [Observability & Troubleshooting](./08-observability-and-troubleshooting.md) | Logs, events, metrics, probes, `kubectl` workflows, debugging patterns |
| 09 | [Security & Best Practices](./09-security-and-best-practices.md) | RBAC, network policies, pod security, image policies, multi-tenant safety |
| 10 | [Cheat Sheet & Interview Q&A](./10-cheat-sheet-and-qa.md) | Command reference, design checklists, strong answer templates |

---

## How to Use This Ebook

**Night before the interview:**  
Read **Chapter 10 (Cheat Sheet & Interview Q&A)** thoroughly. It gives you phrasing and patterns to sound confident when K8s comes up.

**Focused 2–3 hour session:**  
Read **Chapters 01–03** to lock in the mental model and traffic story, then skim **Chapters 06–07** for scaling and multi-tenancy.

**Full-day deep dive:**  
Work through all chapters in order. Each chapter is self-contained and maps directly to common interview questions.

**During system design interviews:**  
- Use Kubernetes as an **implementation detail**, not the starting point.  
- When appropriate, explain **how containers (Docker) flow into K8s deployments, services, and autoscaling**.  
- Emphasize reliability, cost, and operational simplicity, not just buzzwords.

---

## Chapter Structure (What to Expect)

Every chapter follows a consistent structure:

1. **TL;DR** — short, interview-ready summary  
2. **Core Concept Explanation** — mental models and clean narratives  
3. **Deep Dive (Senior Level)** — internals, trade-offs, real-world constraints  
4. **Examples** — concise YAML / `kubectl` examples you can adapt  
5. **Architecture & Best Practices** — how to apply K8s in real systems  
6. **Common Mistakes** — red flags to avoid mentioning in interviews  
7. **Interview Q&A** — direct question/answer templates  
8. **Next Steps** — where to go in this ebook next

---

## Quick Reference — Common Interview Prompts

**"How does Kubernetes differ from Docker?"**  
→ See **[01-k8s-mental-model.md](./01-k8s-mental-model.md)** — control plane vs containers.

**"Explain how traffic flows inside a Kubernetes cluster."**  
→ See **[03-services-and-ingress.md](./03-services-and-ingress.md)** — Services, Ingress, and DNS.

**"How do you scale services and keep them healthy in Kubernetes?"**  
→ See **[06-scaling-and-health.md](./06-scaling-and-health.md)** — HPA, probes, rollouts.

**"How do you isolate teams or tenants on a shared cluster?"**  
→ See **[07-multi-tenancy-and-environments.md](./07-multi-tenancy-and-environments.md)** — namespaces, quotas, RBAC.

**"How do you debug issues in Kubernetes?"**  
→ See **[08-observability-and-troubleshooting.md](./08-observability-and-troubleshooting.md)** — `kubectl` workflows, logs, events.

