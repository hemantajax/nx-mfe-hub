## 09 — Docker & Kubernetes/System Design

> **TL;DR:** Docker solves **packaging and local runtime**; Kubernetes (and friends) solve **scheduling, scaling, and resilience** for containers at cluster scale. In interviews, clearly separate these concerns and show how Docker-based images fit into system design diagrams.

---

## 1. Docker vs Kubernetes — Clear Separation

### Docker

- Builds images from `Dockerfile`.
- Runs containers on a single host.
- Provides basic:
  - Networking.
  - Volumes.
  - Logs.

### Kubernetes (and similar orchestrators)

- Schedules containers across **many nodes**.
- Handles:
  - Desired state (replicas).
  - Self-healing (restarts, reschedules).
  - Rolling updates & rollbacks.
  - Service discovery & load balancing.
  - Config & secrets management.

Interview phrase:

> "Docker gives us the unit of deployment — the image and container. Kubernetes orchestrates those containers across a cluster with features like scaling, self-healing, and service discovery."

---

## 2. Mapping Docker Concepts to Kubernetes

| Docker | Kubernetes | Description |
|--------|-----------|-------------|
| Image | Image | Same artifact stored in registry. |
| Container | Container | Still containers under the hood (Docker, containerd, etc.). |
| `docker run` | Pod | Smallest deployable unit; may contain 1+ containers. |
| Port mapping | Service | Stable virtual IP + DNS name for accessing Pods. |
| Docker network | Cluster network | Pod network (CNI plugins) plus Services. |
| `docker-compose.yml` | Deployment/StatefulSet + Service + ConfigMap/Secret | Multi-resource manifest describing full app. |

Be ready to walk through:

- "We build a Docker image, push to registry, then reference that image in a Kubernetes Deployment."

---

## 3. High-Level Architecture with Docker & K8s

In a system design conversation:

- Show:
  - CI builds Docker images.
  - Registry stores images.
  - Kubernetes pulls images and runs Pods.
  - Services expose Pods inside cluster.
  - Ingress/Load Balancer exposes entrypoints externally.

Describe in words (no need to draw full YAML):

> "Our CI pipeline builds Docker images for the UI shell, microfrontends, and BFF APIs and pushes them to our registry. Kubernetes Deployments reference these images and maintain the desired replica counts. Services provide stable DNS names for internal traffic, and Ingress/Load Balancers expose the UI and public APIs to the outside world."

---

## 4. Where Docker Still Matters in a K8s World

Even when using Kubernetes:

- You still:
  - Write `Dockerfile`s.
  - Optimize images.
  - Use Docker (or buildx) in CI.
  - Use container runtime-compatible images (`OCI`).

Docker skills are:

- **Foundational** — all orchestrators rely on container images.
- **Portable** — ECS, Cloud Run, App Runner, Nomad, etc. all use images.

Interview angle:

> "Even with managed platforms, understanding Docker helps you design efficient images, debug issues, and reason about rollouts and rollbacks."

---

## 5. UI Architect’s Perspective: Microfrontends & Containers

For microfrontends and UI-heavy systems:

- Each microfrontend can:
  - Build to static assets served via NGINX container.
  - Or be embedded in a Node-based server for SSR.
- Kubernetes:
  - Runs these containerized UIs as Deployments.
  - Exposes them via an Ingress or API gateway.

Patterns:

- **Module Federation**:
  - Host and remotes each have their own image.
  - New remote versions roll out by updating image tags.
- **BFF per microfrontend**:
  - Each UI has a dedicated BFF API service and image.
  - Deployed and scaled independently.

Show in interviews that you:

- Understand how containers support independent deployability of frontend pieces.

---

## 6. When to Mention Docker vs Kubernetes in Interviews

Guidelines:

- For **small-scale** or early-stage systems:
  - Mention Docker + simple deployments (Compose, basic orchestrator).
  - Emphasize CI pipelines and immutable images.
- For **larger** or SRE-heavy systems:
  - Mention Kubernetes as how you run many containers.
  - Focus on:
    - Auto-scaling.
    - Health checks.
    - Rolling deployments.

Phrase it like:

> "At small scale, Docker with a simple orchestrator or even Compose is enough. As you grow to dozens of services and nodes, you introduce Kubernetes or a managed alternative to handle scheduling, scaling, and resilience."

---

## 7. Common Interview Scenarios

**Scenario 1: "Design a high-availability API backend."**

Include:

- Docker images built in CI, stored in registry.
- Kubernetes Deployments with multiple replicas across nodes.
- Services for internal discovery, Ingress/Load Balancer for external traffic.
- Horizontal Pod Autoscalers (HPAs) based on CPU or custom metrics.

**Scenario 2: "Design a microfrontend platform."**

Include:

- Containerized host and remote apps (Docker images).
- Central registry of images and versioning strategy.
- Edge caching/CDN for static assets.
- Kubernetes cluster as one possible runtime (if appropriate to scope).

---

## 8. Common Mistakes

| Mistake | Better Approach |
|---------|-----------------|
| Treating Docker and Kubernetes as interchangeable | Distinguish packaging/runtime (Docker) from orchestration (K8s). |
| Over-specifying K8s internals for small problems | Start with simple Docker-based deployments and scale up only as needed. |
| Ignoring image design when discussing K8s | Images still need to be small, secure, and well-structured. |
| Assuming Docker-only without considering orchestration at scale | For high-traffic/complex systems, mention some orchestrator, even if managed. |

Interviewers like candidates who:

- Pick the right level of complexity for the problem.
- Acknowledge the existence of managed alternatives (ECS, Fargate, Cloud Run).

---

## 9. Interview Q&A

**Q: How do Docker and Kubernetes work together in your deployments?**  
**A:**  
> "We define Dockerfiles for each service, and CI builds and scans the images before pushing to our registry. Kubernetes Deployments reference those images and maintain the desired replicas across nodes. Services and Ingress resources expose the containers inside and outside the cluster. Docker gives us consistent, versioned artifacts; Kubernetes gives us scheduling, scaling, and resilience."

**Q: When would you not use Kubernetes even if you're using Docker?**  
**A:**  
> "For simpler systems or smaller teams, Kubernetes can be operationally heavy. In those cases, running Docker containers on managed services like ECS, Cloud Run, or even a few well-managed VMs with Compose can be perfectly sufficient. I only reach for Kubernetes when we have enough services and scale that we need sophisticated scheduling, scaling, and rollout features."

---

## 10. Next Topic

→ **[10-cheat-sheet-and-qa.md](./10-cheat-sheet-and-qa.md)** — Quick-reference commands, optimization checklist, and curated Docker interview questions with strong answers.

