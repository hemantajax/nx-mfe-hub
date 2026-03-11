## 03 — Services, Ingress & Traffic

> **TL;DR:** Pods are ephemeral and their IPs change; **Services** provide stable virtual IPs and DNS names inside the cluster, and **Ingress** (plus external load balancers) routes HTTP/HTTPS traffic from the outside world to those Services. Interviews care about how you explain traffic flow through a Kubernetes-based system.

---

## 1. Why Services Exist

Problem:

- Pods:
  - Come and go.
  - Get new IPs when rescheduled.
  - Scale up/down dynamically.

If clients used Pod IPs directly, they’d constantly break.

**Service** solves this:

- Provides a **stable virtual IP (ClusterIP)**.
- Provides a **DNS name** (e.g., `api.default.svc.cluster.local`).
- Uses **label selectors** to route to matching Pods.

---

## 2. Service Types

### 2.1 ClusterIP (Default)

- Internal-only Service:
  - Accessible only **inside** the cluster.
  - Used for service-to-service communication (UI → BFF → API).

Example:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api
spec:
  type: ClusterIP
  selector:
    app: api
  ports:
    - port: 8080
      targetPort: 8080
```

Pods with `labels: app=api` behind a single, stable Service IP/DNS.

### 2.2 NodePort

- Exposes Service on a **port on each node** (e.g., 30000–32767).
- Often used with external load balancers or for simple clusters.

Less common in cloud production when using managed LBs.

### 2.3 LoadBalancer

- Asks cloud provider to create an **external load balancer**.
- Connects LB to a NodePort/ClusterIP under the hood.

Common pattern:

- `Service type: LoadBalancer` in front of:
  - Ingress controller.
  - API gateway.

---

## 3. Ingress — HTTP/HTTPS Routing

**Ingress**:

- Defines **layer 7 (HTTP/HTTPS)** routing rules.
- Routes hostnames and paths to **backend Services**.
- Requires an **Ingress Controller** (NGINX, Traefik, AWS ALB, etc.).

Example:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ingress
spec:
  rules:
    - host: example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: ui-shell
                port:
                  number: 80
          - path: /api/
            pathType: Prefix
            backend:
              service:
                name: api-gateway
                port:
                  number: 8080
```

Flow:

1. User hits `https://example.com`.
2. External LB forwards to Ingress controller.
3. Ingress controller routes:
   - `/` → `ui-shell` Service.
   - `/api/` → `api-gateway` Service.

---

## 4. Traffic Flow Explanation (Interview-Ready)

Describe verbally:

> "Traffic from the browser hits our cloud load balancer, which forwards HTTPS to an Ingress controller running in Kubernetes. The Ingress resource uses host and path rules to route requests to Services like `ui-shell` and `api-gateway`. Those Services load balance traffic across the underlying Pods, which can scale up or down transparently."

Highlight:

- External:
  - DNS → CDN (optional) → External LB → Ingress.
- Internal:
  - Ingress → Service → Pods.

---

## 5. Service Discovery Inside the Cluster

Built-in DNS:

- Each Service:
  - Gets a DNS entry: `service-name.namespace.svc.cluster.local`.
- Clients:
  - Usually use short name (e.g., `http://api:8080`) when in same namespace.

Example UI config:

- UI Pod calls:
  - `http://api-gateway:8080/api/...`.

Kubernetes ensures:

- DNS always points to current Service IP.
- Service forwards to healthy Pods via kube-proxy/IPVS.

---

## 6. Patterns for UI Architectures

Typical pattern:

- `ui-shell`:
  - Deployment + Service (ClusterIP).
  - Exposed via Ingress.
- `api-gateway` / BFF:
  - Deployment + Service (ClusterIP).
  - Also reachable via Ingress or through `ui-shell`.
- Microservices:
  - Deployments + Services (ClusterIP).
  - Only accessible inside cluster.

Best practices:

- Only expose:
  - UI.
  - Public APIs or gateways.
- Keep internal services:
  - On ClusterIP Services.
  - Behind network policies where needed.

---

## 7. Common Mistakes

| Mistake | Why It’s a Problem |
|---------|--------------------|
| Exposing every service as LoadBalancer | Unnecessary cost and large attack surface. |
| Skipping Services and using Pod IPs directly | Breaks on reschedules; not resilient. |
| Overloading Ingress with complex routing logic | Harder to maintain; consider API gateway for complex flows. |
| Ignoring HTTPS/TLS termination strategy | Leads to insecure defaults or inconsistent TLS handling. |

In interviews, suggest:

- One Ingress controller per cluster (or per ingress class).
- A limited number of public entrypoints.

---

## 8. Interview Q&A

**Q: How do Pods get traffic in Kubernetes?**  
**A:**  
> "Pods sit behind a Service, which gives them a stable virtual IP and DNS name. Inside the cluster, other services call them by Service name. For external traffic, we put an Ingress in front of Services and terminate HTTP/HTTPS at an Ingress controller, often behind a cloud load balancer."

**Q: What’s the difference between a Service and an Ingress?**  
**A:**  
> "A Service provides stable networking for Pods and load balances at layer 4 inside the cluster. Ingress adds layer 7 HTTP/HTTPS routing on top of that, using host and path rules to route external traffic to different Services."

---

## 9. Next Topic

→ **[04-config-and-secrets.md](./04-config-and-secrets.md)** — Managing configuration and secrets for your workloads across environments.

