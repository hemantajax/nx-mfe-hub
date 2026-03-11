## 02 — Pods, Containers & Workloads

> **TL;DR:** In Kubernetes, you never run containers directly — you run **Pods**, and higher-level controllers like **Deployments** and **StatefulSets** manage those Pods. Interviews expect you to know when to use each workload type and how they relate to Docker containers.

---

## 1. Pods — The Smallest Deployable Unit

A **Pod**:

- Is a group of **one or more containers** that:
  - Share the same network namespace (same IP, ports).
  - Can share volumes.
- Is scheduled as a **single unit** onto a node.

Mental model:

- Pod ≈ "logical host" for tightly coupled containers.
- Most apps use **one container per Pod**; multi-container Pods are for sidecars (proxies, log shippers).

Example Pod (not usually created directly in production, but good for understanding):

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ui-shell-pod
  labels:
    app: ui-shell
spec:
  containers:
    - name: ui-shell
      image: my-registry.com/ui-shell:3f42c1b
      ports:
        - containerPort: 80
```

---

## 2. Deployments — Stateless Workhorses

Most stateless services (UIs, APIs, BFFs) are run as **Deployments**.

Responsibilities:

- Maintain a desired number of Pod replicas.
- Manage rolling updates and rollbacks.
- Handle Pod template changes over time.

Example Deployment:

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

In interviews, this is your go-to answer for:

- Web UIs.
- Stateless APIs.
- BFFs.

---

## 3. Other Workload Types (Know When to Mention)

### 3.1 StatefulSet

For **stateful** workloads that need:

- Stable network identities.
- Stable volume mounts.
- Ordered startup/shutdown.

Use cases:

- Databases (when not using managed DB services).
- Stateful queues/brokers (Kafka, etc.) in some setups.

Interview note:

> "If we must run a stateful component inside the cluster, I'd consider a StatefulSet, but I generally prefer managed database services where possible."

### 3.2 DaemonSet

Ensures a Pod runs **on every node** (or a subset).

Use cases:

- Node-level log shippers.
- Monitoring agents.
- Security agents.

### 3.3 Job & CronJob

For **finite** work:

- Job:
  - Run to completion (e.g., data migration, one-off batch).
- CronJob:
  - Runs Jobs on a schedule (e.g., nightly cleanups, reports).

---

## 4. Multi-Container Pods & Sidecars

Most Pods have a single app container, but multi-container Pods are useful when:

- Containers must:
  - Share localhost.
  - Share volumes.
  - Be scheduled and scaled together.

Common pattern: **sidecar**.

- Example: NGINX reverse proxy + app container in same Pod.
- Example: Log shipper sidecar tailing logs from main container.

In interviews:

> "I treat Pods as an atomic deployment unit. Multi-container Pods are mainly for sidecars that need to be tightly coupled with the main app, like proxies or agents."

---

## 5. How Workloads Relate to Docker

Mapping:

- Docker:
  - Runs containers.
- Kubernetes:
  - Wraps containers into Pods.
  - Controllers like Deployments and StatefulSets manage Pods over time.

Lifecycle:

1. CI builds a Docker image.
2. You define a Deployment spec that references the image.
3. Kubernetes creates Pods with containers from that image.
4. If Pods crash, Deployment recreates them.

Important distinction:

- You **rarely create Pods directly** in production; you create controllers that own Pods.

---

## 6. Versioning & Rollouts

Deployments excel at:

- Rolling updates:
  - Gradually replace old Pods with new ones.
  - Control surge and unavailable counts.
- Rollbacks:
  - Revert to previous ReplicaSet if issues occur.

Key spec fields (you can mention, no need to quote all YAML):

- `spec.strategy.type`:
  - `RollingUpdate` (default).
- `spec.strategy.rollingUpdate.maxUnavailable`.
- `spec.strategy.rollingUpdate.maxSurge`.

Interview angle:

> "We deploy new image versions via Deployments with rolling updates and proper readiness probes, so we can roll forward or back quickly without downtime."

---

## 7. Common Mistakes

| Mistake | Better Approach |
|---------|-----------------|
| Creating Pods directly instead of using Deployments | Use Deployments for long-lived stateless services. |
| Treating Pods as VMs | Pods are ephemeral; design them to be replaceable. |
| Running stateful DBs as simple Deployments | Use StatefulSets with proper storage, or managed DB services. |
| Overusing multi-container Pods | Use sidecars only when tight coupling is necessary. |

Calling out these issues shows you understand K8s primitives, not just YAML.

---

## 8. Interview Q&A

**Q: What is a Pod in Kubernetes, and how does it relate to containers?**  
**A:**  
> "A Pod is the smallest deployable unit in Kubernetes — it can contain one or more containers that share the same IP and volumes. Kubernetes never schedules containers directly; it schedules Pods, and higher-level controllers like Deployments manage those Pods over time."

**Q: When would you use a Deployment vs a StatefulSet?**  
**A:**  
> "I use Deployments for stateless services like UIs and APIs where Pods are interchangeable. StatefulSets are for workloads that need stable identities and persistent storage, like databases or certain brokers. Even then, if possible I prefer managed database services outside the cluster and keep Kubernetes focused on stateless or easily replaceable workloads."

---

## 9. Next Topic

→ **[03-services-and-ingress.md](./03-services-and-ingress.md)** — How traffic reaches your Pods using Services and Ingress, and how to explain cluster networking in interviews.

