## 07 — Multi-Tenancy & Environments

> **TL;DR:** Kubernetes lets you safely share clusters across teams and environments using **namespaces, RBAC, resource quotas, and network policies**. In interviews, emphasize how you separate dev/stage/prod and isolate workloads while keeping operations manageable.

---

## 1. Namespaces — The First Level of Isolation

**Namespace**:

- Logical partition within a cluster.
- Scopes:
  - Names of most resources (Deployments, Services, ConfigMaps, etc.).
  - RBAC rules.
  - Resource quotas and limits.

Typical patterns:

- **Per environment**:
  - `dev`, `staging`, `prod`.
- **Per team**:
  - `team-a`, `team-b`.
- Mixed:
  - `frontend-dev`, `frontend-prod`, `backend-dev`, `backend-prod`.

Interview phrase:

> "We use namespaces to separate environments and teams logically within a shared cluster, then layer RBAC and quotas on top."

---

## 2. RBAC — Role-Based Access Control

Key resources:

- `Role` / `ClusterRole` — what actions are allowed.
- `RoleBinding` / `ClusterRoleBinding` — who can do them (users/service accounts).

Principles:

- **Least privilege**:
  - Devs in team A:
    - Full access to their namespace.
    - Read-only across others (if needed).
- Separate roles:
  - App developers vs cluster admins vs CI/CD.

Example (simplified):

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: dev-namespace-admin
  namespace: frontend-dev
rules:
  - apiGroups: ["", "apps", "extensions"]
    resources: ["deployments", "services", "pods", "configmaps", "secrets"]
    verbs: ["get", "list", "watch", "create", "update", "delete"]
```

Make clear you:

- Restrict access to Secrets.
- Use service accounts for apps and CI pipelines.

---

## 3. Resource Quotas & Limits

**ResourceQuota**:

- Caps:
  - Total CPU/memory usage in a namespace.
  - Number of objects (Pods, Services).

**LimitRange**:

- Sets default and max/min per-Pod/container resources.

Purpose:

- Prevent a single namespace (team/env) from:
  - Consuming all cluster resources.
  - Creating unbounded numbers of Pods/Services.

Interview angle:

> "We apply resource quotas and default limits per namespace so no single team can accidentally overwhelm the cluster, and every Pod has sane CPU/memory requests and limits."

---

## 4. Network Policies

**NetworkPolicy**:

- Controls:
  - Which Pods can talk to which other Pods.
  - Ingress and egress rules.

Without policies:

- All Pods may communicate freely (depending on CNI plugin).

With policies:

- You can:
  - Restrict:
    - Only certain namespaces or labels can reach a Service.
  - Enforce:
    - Zero-trust style networking inside cluster.

Example scenarios:

- Lock down:
  - DB Pods to only accept traffic from API Pods.
- Prevent:
  - Dev namespaces from talking to prod namespaces.

---

## 5. One Cluster vs Many Clusters

Trade-offs:

- **One large multi-tenant cluster**:
  - Pros:
    - Better bin packing and utilization.
    - Shared tooling and policies.
  - Cons:
    - Higher blast radius if misconfigured.
    - More careful governance needed.

- **Multiple clusters** (per env/org):
  - Pros:
    - Strong isolation between environments.
    - Easier regulatory boundaries.
  - Cons:
    - More clusters to manage.
    - Less efficient resource usage.

Interview stance:

> "I usually separate production into its own cluster(s) for stronger isolation, while lower environments can share clusters if governed by strict RBAC, quotas, and network policies."

---

## 6. Environment Strategy for UI Systems

Concrete example:

- Clusters:
  - `cluster-nonprod` (dev, staging).
  - `cluster-prod`.
- Namespaces:
  - `frontend-dev`, `frontend-staging`, `frontend-prod`.
  - `backend-dev`, `backend-staging`, `backend-prod`.

Per namespace:

- Namespaced:
  - Deployments.
  - Services.
  - ConfigMaps/Secrets.
  - HPAs.
  - Ingresses (with environment-specific hostnames).

This lets you:

- Promote images:
  - Tag + reconfigure.
- Keep:
  - Dev features out of prod.

---

## 7. Common Mistakes

| Mistake | Impact |
|---------|--------|
| Putting all workloads in `default` namespace | No isolation, messy governance. |
| No RBAC / everyone is cluster-admin | Security risk; hard to audit. |
| No quotas for noisy teams | Resource starvation for others. |
| Mixing prod and non-prod in same namespace | Risk of accidental cross-talk or misconfig. |

State clearly how you avoid these patterns.

---

## 8. Interview Q&A

**Q: How do you separate environments like dev, staging, and prod in Kubernetes?**  
**A:**  
> "At a minimum we use separate namespaces per environment, with environment-specific ConfigMaps/Secrets and Ingress hostnames. For stronger isolation, especially for prod, we often use separate clusters. RBAC and quotas ensure only the right people and workloads can access each environment."

**Q: How do you safely share a Kubernetes cluster between multiple teams?**  
**A:**  
> "We give each team one or more namespaces with appropriate RBAC, quotas, and default limits. Network policies restrict cross-namespace traffic to only what’s needed. Cluster-level resources are managed centrally by platform/SRE teams, while app teams operate within their namespaces."

---

## 9. Next Topic

→ **[08-observability-and-troubleshooting.md](./08-observability-and-troubleshooting.md)** — Logs, metrics, and practical `kubectl` workflows for debugging issues.

