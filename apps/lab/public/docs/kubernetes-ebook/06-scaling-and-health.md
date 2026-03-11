## 06 — Scaling, Health Checks & Self-Healing

> **TL;DR:** Kubernetes keeps applications healthy and scalable via **probes**, **replicas**, and **Horizontal Pod Autoscalers (HPA)**. In interviews, emphasize how you use readiness/liveness checks, rolling updates, and autoscaling to provide resilient services.

---

## 1. Replicas & Rolling Updates

Deployments:

- Maintain a desired replica count:
  - `spec.replicas: 3`.
- Coordinate rolling updates:
  - Gradually replace old Pods with new ones.

Key ideas:

- You control:
  - How many Pods can be unavailable during update (`maxUnavailable`).
  - How many extra Pods can be created temporarily (`maxSurge`).

Interview explanation:

> "We deploy with rolling updates so new versions come online gradually, while the old version continues serving traffic until the new Pods are healthy."

---

## 2. Probes — Liveness, Readiness & Startup

**Liveness probe**:

- Checks if Pod is still alive.
- If it fails:
  - Kubelet restarts the container.

**Readiness probe**:

- Checks if Pod is ready to serve traffic.
- If it fails:
  - Pod is temporarily removed from Service endpoints.

**Startup probe**:

- For slow-starting apps.
- Prevents liveness probe from killing them too early.

Example (HTTP probes):

```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10

livenessProbe:
  httpGet:
    path: /health/live
    port: 8080
  initialDelaySeconds: 15
  periodSeconds: 20
```

For UI/BFF services:

- Readiness:
  - Check:
    - App process running.
    - Key dependencies reachable (optional, but careful with cascading failures).
- Liveness:
  - Lightweight "app is still alive" check.

---

## 3. Horizontal Pod Autoscaler (HPA)

**HPA**:

- Automatically adjusts replica count based on metrics:
  - CPU utilization (default).
  - Custom/External metrics (QPS, latency, etc.).

Example:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

Explain:

> "When average CPU across Pods exceeds 70%, HPA gradually scales the Deployment up; when it drops, it scales down, within min/max bounds."

---

## 4. Self-Healing Behavior

Kubernetes constantly reconciles against desired state:

- If a Pod:
  - Crashes → restarted or replaced.
  - Fails readiness → traffic stops flowing to it.
- If a node:
  - Fails → Pods rescheduled to other nodes if capacity exists.

Requirements:

- Apps must:
  - Be **stateless** or resilient to restarts.
  - Handle:
    - Duplicate requests.
    - Interrupted requests.

In interviews, combine:

- Probes + replicas + autoscaling + stateless design.

---

## 5. UI & API Scaling Patterns

For frontend architectures:

- Scale:
  - SSR/BFF APIs by CPU/latency.
  - Static assets via CDN (outside K8s) — Pods mostly serve dynamic content.

Best practices:

- Use:
  - HPA on BFF/API Deployments.
  - Probes to ensure routers only send traffic to healthy Pods.
- For large UI traffic:
  - Prefer:
    - Pre-rendered pages.
    - Edge caching.
  - Keep K8s primarily handling dynamic and personalized content.

---

## 6. Common Mistakes

| Mistake | Impact |
|---------|--------|
| Using only liveness probes (no readiness) | Traffic sent to Pods before they're ready; user-visible errors. |
| Probes that do heavy work | Causes self-DOS; probes should be cheap. |
| Ignoring HPA or over-scaling to max | Wasted cost or poor performance under load spikes. |
| Stateful design in stateless Deployments | Data loss or inconsistent behavior on restarts. |

Mention:

- Probe endpoints should be:
  - Fast.
  - Side-effect-free.

---

## 7. Interview Q&A

**Q: How does Kubernetes help keep your services available and healthy?**  
**A:**  
> "We define Deployments with multiple replicas and use readiness and liveness probes. Kubernetes routes traffic only to Pods that pass readiness checks, and if a container becomes unhealthy, the liveness probe causes it to be restarted. Combined with rolling updates and HPAs, this gives us resilient, auto-healing services."

**Q: How do you scale services in Kubernetes?**  
**A:**  
> "We configure an HPA for each critical Deployment, usually based on CPU or custom metrics like request rate. HPA scales Pods between min and max replica counts. We also ensure services are stateless and fronted by Services/Ingress so additional Pods can start handling traffic immediately."

---

## 8. Next Topic

→ **[07-multi-tenancy-and-environments.md](./07-multi-tenancy-and-environments.md)** — Namespaces, RBAC, and patterns for splitting environments and teams safely.

