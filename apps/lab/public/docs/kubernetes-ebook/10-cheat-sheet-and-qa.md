## 10 — Kubernetes Cheat Sheet & Interview Q&A

> Quick-reference commands, patterns, and interview-ready answers for Kubernetes.

---

## 1. Core `kubectl` Cheat Sheet

### 1.1 Discover & Inspect

```bash
kubectl get namespaces
kubectl get pods -n frontend-dev
kubectl get deployments -n frontend-dev
kubectl get services -n frontend-dev
kubectl get ingress -n frontend-dev

kubectl describe pod <pod> -n frontend-dev
kubectl describe deployment ui-shell -n frontend-dev
kubectl get events -n frontend-dev --sort-by=.metadata.creationTimestamp
```

### 1.2 Logs & Exec

```bash
kubectl logs <pod> -n frontend-dev
kubectl logs -f <pod> -n frontend-dev

kubectl exec -it <pod> -n frontend-dev -- /bin/sh
```

### 1.3 Apply & Rollback

```bash
kubectl apply -f deployment.yaml
kubectl rollout status deployment/ui-shell -n frontend-dev
kubectl rollout undo deployment/ui-shell -n frontend-dev
```

### 1.4 Scaling

```bash
kubectl scale deployment api --replicas=5 -n backend-prod

kubectl get hpa -n backend-prod
kubectl describe hpa api-hpa -n backend-prod
```

---

## 2. Design & Best-Practice Checklist

### 2.1 Workloads

- [ ] Stateless services → **Deployments + Services**.
- [ ] Stateful services (only when necessary) → **StatefulSets + PVCs**.
- [ ] One main container per Pod; sidecars only when tightly coupled.
- [ ] Probes:
  - Readiness for routing.
  - Liveness for restarts.

### 2.2 Networking

- [ ] Internal traffic via ClusterIP Services and DNS (no Pod IPs).
- [ ] External HTTP/HTTPS via Ingress + external Load Balancer.
- [ ] Network policies for sensitive services (DBs, admin APIs).

### 2.3 Config & Secrets

- [ ] Images are **env-agnostic**; config externalized.
- [ ] ConfigMaps for non-sensitive config.
- [ ] Secrets (or external secret manager) for credentials.
- [ ] Per-environment namespaces and resources.

### 2.4 Scaling & Resilience

- [ ] HPAs on key services based on CPU or custom metrics.
- [ ] Rolling updates with safe surge/unavailable settings.
- [ ] Stateless design so Pods can be killed and rescheduled safely.

### 2.5 Security

- [ ] Non-root containers with restricted capabilities.
- [ ] Least-privilege RBAC and namespaced roles.
- [ ] NetworkPolicies to limit lateral movement.
- [ ] Image scanning and, ideally, signing and admission policies.

---

## 3. High-Value Interview Answers (Templates)

### 3.1 "Kubernetes vs Docker"

> "Docker gives us container images and the ability to run containers on a single host. Kubernetes is the control plane on top: it schedules those containers as Pods across many nodes, keeps them healthy using probes, scales them with HPAs, and provides service discovery and load balancing. We still build Docker images in CI; Kubernetes is how we run them reliably at scale."

### 3.2 "Explain a Pod, Deployment, and Service"

> "A Pod is the smallest deployable unit and can contain one or more containers that share an IP and volumes. A Deployment manages a set of identical Pods, handling replica count and rolling updates. A Service exposes a stable virtual IP and DNS name for a group of Pods so clients don’t need to care about individual Pod IPs."

### 3.3 "How Does Traffic Reach Your Service?"

> "Externally, traffic hits a cloud load balancer in front of an Ingress controller. The Ingress resource uses host and path rules to route to Kubernetes Services. Each Service load balances across its backing Pods. Inside the cluster, services discover each other via DNS names like `api.default.svc.cluster.local`."

### 3.4 "How Do You Scale and Keep Services Healthy?"

> "We deploy services as Deployments with multiple replicas and configure readiness and liveness probes. Readiness probes ensure only healthy Pods receive traffic; liveness probes restart stuck containers. Horizontal Pod Autoscalers adjust replica counts based on CPU or custom metrics, so the system scales out under load and back in when traffic drops."

### 3.5 "How Do You Manage Config and Secrets?"

> "Images are built once and don’t hard-code environment-specific values. Non-sensitive settings live in ConfigMaps; credentials and tokens live in Kubernetes Secrets or an external secret manager. Deployments reference these via environment variables or mounted files, and each environment has its own namespace with its own ConfigMaps and Secrets."

### 3.6 "How Do You Secure a Kubernetes-Based System?"

> "We start with hardened images and non-root containers, then apply RBAC and namespaces for least-privilege access. NetworkPolicies restrict which Pods can talk to each other, and Pod security policies/standards enforce baseline security like dropping privileges and read-only root file systems. Secrets are managed via a secret manager and surfaced as Kubernetes Secrets, and CI scans and signs images before they’re deployed."

### 3.7 "When Would You Avoid Kubernetes?"

> "For small teams or simple apps, Kubernetes can be operationally heavy. In those cases, managed container platforms or even a few well-managed VMs with Docker and Compose are enough. I reach for Kubernetes when we have enough services and traffic that we need strong scheduling, autoscaling, and self-healing across many nodes."

---

## 4. Rapid-Fire Q&A (Bullet Style)

- **Q:** Pod vs Deployment?  
  **A:** Pod is the runtime unit; Deployment manages replicated Pods and rollouts.

- **Q:** Service vs Ingress?  
  **A:** Service gives a stable IP/DNS inside the cluster; Ingress provides HTTP/HTTPS routing from outside to Services.

- **Q:** How to persist data?  
  **A:** Use PersistentVolumeClaims with appropriate StorageClasses, typically via StatefulSets for stateful workloads, or better, use managed databases outside the cluster.

- **Q:** How do Pods discover each other?  
  **A:** Via Service DNS names, e.g., `http://api:8080` in the same namespace.

- **Q:** What’s a common anti-pattern in K8s design?  
  **A:** Treating Pods like VMs and storing state in Pod filesystems rather than external data stores.

---

## 5. Study Order (Night Before)

If you only have limited time:

1. Re-read:
   - **01 — Kubernetes Mental Model & Architecture**
   - **02 — Pods, Containers & Workloads**
   - **03 — Services, Ingress & Traffic**
   - **06 — Scaling, Health Checks & Self-Healing**
   - **09 — Security & Best Practices**
2. Memorize:
   - The answer templates in this chapter.
   - The best-practice checklist you actually follow in your own systems.

Focus your answers on:

- Clear mental models.
- Trade-offs (complexity vs benefits).
- Practical operational experience, even if hypothetical.

