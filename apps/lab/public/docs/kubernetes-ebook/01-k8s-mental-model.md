## 01 — Kubernetes Mental Model & Architecture

> **TL;DR:** Docker gives you images and containers on a single machine; Kubernetes gives you a **cluster-wide control plane** that schedules and manages those containers as Pods across many nodes. In interviews, talk about control plane vs data plane, declarative desired state, and how Kubernetes improves reliability and scaling for containerized apps.

---

## 1. Why Kubernetes Exists

Containers solved **packaging and environment drift**. But as teams adopted more services:

- Dozens or hundreds of containers needed to run.
- Containers had to be:
  - Placed on the right nodes.
  - Restarted on failure.
  - Scaled up/down.
  - Exposed and load-balanced.

Doing this manually with plain Docker doesn’t scale.

**Kubernetes solves:**

- **Scheduling** — where containers (Pods) run.
- **Self-healing** — restart and reschedule on failure.
- **Scaling** — automatically adjust replicas.
- **Service discovery & load balancing** — stable DNS names and virtual IPs.
- **Configuration & secrets** — first-class resources.

Interview phrase:

> "Kubernetes is a control plane for containers. It continuously drives the actual state of the cluster toward a declaratively defined desired state."

---

## 2. Control Plane vs Data Plane

High-level split:

- **Control plane** — brains of the cluster:
  - API server.
  - Scheduler.
  - Controller manager(s).
  - etcd (state store).
- **Data plane** — where workloads run:
  - Nodes (VMs or physical machines).
  - Kubelet, container runtime, and kube-proxy on each node.

Mental model:

- You talk to the **API server** (via `kubectl`, CI, or operators).
- API server persists desired state into **etcd**.
- **Controllers** watch that state and compare it with the actual cluster state.
- Controllers trigger actions (create/delete/update Pods, etc.) to reconcile.

You rarely interact directly with the control plane components in day-to-day UI/backend work; you interact via:

- YAML manifests.
- `kubectl apply`.
- Platform UIs or GitOps tools.

---

## 3. Declarative Desired State

Kubernetes uses a **declarative model**:

- You declare **what** you want (e.g., "3 replicas of this deployment").
- Kubernetes figures out **how** to get there and keep it there.

Example Deployment snippet:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ui-shell
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ui-shell
  template:
    metadata:
      labels:
        app: ui-shell
    spec:
      containers:
        - name: ui-shell
          image: my-registry.com/ui-shell:3f42c1b
          ports:
            - containerPort: 80
```

If one Pod crashes:

- Replica count drops to 2.
- Deployment controller sees the difference.
- It creates a new Pod to get back to 3.

**Interview soundbite:**

> "Kubernetes controllers continuously reconcile the live cluster state toward the desired state defined in manifests."

---

## 4. Core Objects to Know

At minimum, be fluent with:

- **Pod** — smallest deployable unit; 1+ containers that share:
  - Network namespace (IP, ports).
  - Volumes.
- **Deployment** — manages stateless Pods with:
  - Replica count.
  - Rolling updates/rollbacks.
- **StatefulSet** — manages stateful workloads:
  - Stable identities.
  - Ordered scaling.
- **Service** — stable virtual IP + DNS name for accessing Pods:
  - ClusterIP, NodePort, LoadBalancer.
- **Ingress** — HTTP/HTTPS routing into Services.
- **ConfigMap & Secret** — configuration and sensitive data injection.
- **Namespace** — logical partition of cluster for teams/apps.

Later chapters deep-dive into each. In interviews, show you can map:

- "I would run the UI shell as a Deployment with X replicas behind a Service and Ingress."

---

## 5. Kubernetes in System Design Diagrams

When drawing architectures:

- Show:
  - **Outside the cluster:** clients, CDN, external LB, identity providers.
  - **At cluster boundary:** ingress controller, API gateway.
  - **Inside cluster:** Deployments/Pods for UI, BFFs, APIs, workers; internal Services; DB/caches (often managed services outside cluster).

Describe in words:

> "The browser hits our CDN and ingress, which routes to an NGINX-based UI deployment in Kubernetes. The UI calls a BFF service via internal DNS, which in turn talks to other microservices and external managed databases. Each service is packaged as a Docker image and deployed as a Deployment with auto-scaling."

---

## 6. How Kubernetes Relates to Docker

Docker and Kubernetes are complementary:

- **Docker (or OCI-compatible runtime)**:
  - Builds images.
  - Runs containers on a node.
- **Kubernetes**:
  - Orchestrates Pods (containers) across many nodes.
  - Abstracts away individual machines.

Key point:

- Modern Kubernetes may use `containerd` instead of Docker, but:
  - The **image format** is still OCI-compatible (Docker-style images).
  - Your `Dockerfile` and image design still matter.

Interview phrasing:

> "We still build Docker images in CI; Kubernetes pulls and runs those images as Pods according to Deployment specs."

---

## 7. Cost, Complexity & When to Use Kubernetes

Pros:

- Excellent for:
  - Many services.
  - High availability.
  - Autoscaling.
  - Multi-tenant clusters.
- Rich ecosystem (Ingress, operators, service mesh).

Cons:

- Operational overhead:
  - Cluster upgrades.
  - Security hardening.
  - Monitoring and incident response.
- Steeper learning curve for teams.

Good interview stance:

> "For smaller teams or simpler apps, managed container services or even a few Docker hosts with Compose can be enough. I usually reach for Kubernetes when we have enough services and scale that we need strong scheduling, auto-scaling, and reliability guarantees."

---

## 8. Common Misconceptions

| Misconception | Correction |
|---------------|-----------|
| "Kubernetes replaces Docker." | Kubernetes still runs containers built from images; it orchestrates them. |
| "K8s automatically makes apps highly available." | It provides tools (replicas, health checks), but you must design apps and configs correctly. |
| "Kubernetes is required for microservices." | You can run microservices without K8s; it's a powerful option, not a requirement. |
| "Once on K8s, you don't worry about infra." | You still need to manage nodes, security, observability, and cost. |

Calling out one or two of these with nuance is a strong senior signal.

---

## 9. Interview Q&A

**Q: What problem does Kubernetes solve on top of Docker?**  
**A:**  
> "Docker solves packaging and running containers on a single host. Kubernetes adds a control plane that schedules containers across many nodes, keeps them healthy, scales them based on load, and provides service discovery and load balancing. It turns a fleet of machines into a single logical 'cluster' for running containerized workloads."

**Q: How would you explain Kubernetes to a non-technical stakeholder?**  
**A:**  
> "Think of Kubernetes as an air traffic controller for our containerized applications. Developers package apps into standard containers, and Kubernetes decides where they run, restarts them if they fail, and adds or removes copies depending on demand."

---

## 10. Next Topic

→ **[02-pods-and-workloads.md](./02-pods-and-workloads.md)** — Pods, Deployments, and other workload types, and how they map to real frontend and backend services.

