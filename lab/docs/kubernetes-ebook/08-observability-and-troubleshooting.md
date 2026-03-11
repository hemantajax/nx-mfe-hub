## 08 — Observability & Troubleshooting

> **TL;DR:** Debugging in Kubernetes means combining `kubectl` (pods, logs, events) with centralized logging and metrics. Interviews expect you to walk through how you investigate a failing service in a cluster.

---

## 1. Core `kubectl` Commands to Know

```bash
# Get high-level view
kubectl get namespaces
kubectl get pods -n frontend-dev
kubectl get deployments -n frontend-dev
kubectl get services -n frontend-dev

# Describe resource (shows events, status, probe failures)
kubectl describe pod <pod-name> -n frontend-dev
kubectl describe deployment ui-shell -n frontend-dev

# Logs
kubectl logs <pod-name> -n frontend-dev
kubectl logs -f <pod-name> -n frontend-dev
kubectl logs deployment/ui-shell -n frontend-dev  # controller logs shortcut (if supported)

# Exec into container
kubectl exec -it <pod-name> -n frontend-dev -- /bin/sh
```

These form your **first line of defense**.

---

## 2. Typical Debugging Workflow

Scenario: UI is returning 502/503 via Ingress.

1. **Check Ingress & Service:**
   - `kubectl get ingress,svc -n frontend-prod`.
   - `kubectl describe ingress web-ingress -n frontend-prod`.
2. **Check Pods:**
   - `kubectl get pods -n frontend-prod`.
   - Look for:
     - CrashLoopBackOff.
     - ImagePullBackOff.
     - NotReady statuses.
3. **Describe failing Pod:**
   - `kubectl describe pod <pod> -n frontend-prod`.
   - Examine:
     - Events.
     - Probe failures.
4. **Read logs:**
   - `kubectl logs <pod> -n frontend-prod`.
5. **Exec into Pod (if necessary):**
   - `kubectl exec -it <pod> -n frontend-prod -- /bin/sh`.
   - Check:
     - Env vars.
     - Config files.
     - Connectivity (`curl api-gateway:8080/health`).

In interviews, narrate this process end-to-end.

---

## 3. Centralized Logging & Metrics

Kubernetes encourages:

- Apps log to **stdout/stderr** → kubelet → log collectors.
- Use:
  - ELK / Loki / Datadog / Cloud-native logging stacks.
- For metrics:
  - Prometheus + Grafana.
  - Cloud providers' monitoring solutions.

Key signals:

- Container-level:
  - CPU/memory usage.
  - Restart counts.
- Application-level:
  - Request rate (RPS).
  - Latency (p95, p99).
  - Error rates.

UI angle:

- Track:
  - Frontend error logs.
  - Core Web Vitals (outside K8s but correlated).
  - API latency as seen by UI.

---

## 4. Probes & Events as Observability Signals

`kubectl describe pod` often reveals:

- Liveness/readiness failures:
  - "Readiness probe failed: HTTP probe failed with statuscode: 500".
- Restart history:
  - "Last State: Terminated (ExitCode: 137)".

Use:

- Probes not only for routing but also:
  - As early detectors of issues (dependency outages, misconfig).

Events:

- View recent cluster events:

```bash
kubectl get events -n frontend-prod --sort-by=.metadata.creationTimestamp
```

Look for:

- FailedScheduling.
- ImagePullBackOff.
- OOMKilled.

---

## 5. Common Failure Modes & How to Talk About Them

| Symptom | Likely Cause | What You’d Check |
|--------|--------------|------------------|
| Pods stuck in `ImagePullBackOff` | Wrong image name/tag or registry auth | `kubectl describe pod`, image registry config |
| Pods in `CrashLoopBackOff` | App crashing on startup | `kubectl logs`, Docker entrypoint/cmd, config |
| Pod `Running` but not `Ready` | Readiness probe failing | Probe endpoint, dependency availability |
| 5xx at Ingress | Ingress misconfig or backend Service/Pods unhealthy | Ingress rules, Service endpoints, Pod readiness |
| Sudden latency spikes | Resource saturation or dependency issues | HPA metrics, DB/cache health, node resource usage |

In interviews, pick one and walk through your diagnostic steps.

---

## 6. Interview Q&A

**Q: A service in your Kubernetes cluster is returning 5xx errors. How do you debug it?**  
**A:**  
> "First I check the Ingress and Service to ensure routing is correct. Then I look at Pods in the namespace to see if any are not ready or crash-looping. I describe failing Pods to inspect events and probe failures, then look at logs with `kubectl logs`. If needed, I exec into a Pod to verify environment vars and connectivity to its dependencies. In parallel, I check centralized logs and metrics to see when the errors started and whether they correlate with a rollout or resource spike."

**Q: How do you collect logs and metrics from Kubernetes workloads?**  
**A:**  
> "Applications log to stdout/stderr, which Kubernetes and our log collectors pick up and ship to a centralized logging platform. For metrics, we expose Prometheus-format metrics from services or use service mesh sidecars, scrape them, and visualize them in Grafana or a cloud-native dashboard. That gives us per-service latency, error rate, and resource usage to support both debugging and capacity planning."

---

## 7. Next Topic

→ **[09-security-and-best-practices.md](./09-security-and-best-practices.md)** — Securing Kubernetes workloads with RBAC, network policies, and hardened Pods.

