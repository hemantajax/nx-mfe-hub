## 05 — Storage & Persistence

> **TL;DR:** Kubernetes provides abstractions for persistent storage via **PersistentVolumes (PV)** and **PersistentVolumeClaims (PVC)**. For many apps you’ll still prefer managed databases outside the cluster, but when you do store data in-cluster, you must understand how Pods attach to durable storage.

---

## 1. Volumes vs PersistentVolumes

Recap:

- In Docker:
  - Volumes persist data beyond container lifecycle.
- In Kubernetes:
  - **Volumes** are attached to Pods.
  - Some volume types are ephemeral.
  - **PersistentVolumes (PV)** + **PersistentVolumeClaims (PVC)** handle durable storage.

Key idea:

- Pod spec defines **volume mounts**, not physical storage details.
- Storage backends (EBS, GCE PD, NFS, Ceph, etc.) are abstracted away via PVs.

---

## 2. PersistentVolumes & PersistentVolumeClaims

**PersistentVolume (PV)**:

- Represents a piece of storage in the cluster:
  - Concrete implementation (EBS volume, NFS share, etc.).
- Created by:
  - Admins manually.
  - **Dynamic provisioning** via StorageClass.

**PersistentVolumeClaim (PVC)**:

- Request for storage by a Pod:
  - Size.
  - Access mode.
  - StorageClass.

PVC example:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: db-data
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: standard
```

Pod using PVC:

```yaml
spec:
  containers:
    - name: db
      image: postgres:16-alpine
      volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: db-data
```

---

## 3. StorageClasses & Dynamic Provisioning

**StorageClass**:

- Defines:
  - Provisioner (cloud-specific).
  - Default parameters (type, IOPS).

Dynamic provisioning flow:

1. PVC requests storage with a `storageClassName`.
2. K8s uses StorageClass to **create a PV** on demand.
3. PVC binds to that PV.

Benefits:

- No manual PV creation.
- Easier per-environment storage config.

Interview phrase:

> "We rely on dynamic provisioning via StorageClasses so application teams can request storage declaratively via PVCs without dealing with underlying cloud volume APIs."

---

## 4. Stateless vs Stateful — UI Architect’s View

Best practice:

- Keep **UI and API services stateless**:
  - No persistent data in their Pod volumes.
  - State goes to managed DBs or caches.
- Use:
  - Persistent storage in cluster only when necessary and carefully.

Example:

- UIs:
  - Use volumes for:
    - Caching static assets (optional).
    - Ephemeral storage (emptyDir).
- APIs:
  - Write data to external DB/cache.
  - Use volumes rarely (e.g., local temp files).

In interviews:

> "For most frontend and BFF workloads, I keep Pods stateless and rely on external managed databases. When we do need in-cluster persistence, we use PVCs and StatefulSets with appropriate StorageClasses."

---

## 5. Common Pitfalls

| Pitfall | Impact |
|---------|--------|
| Treating Pod filesystem as durable storage | Data lost when Pods are rescheduled or deleted. |
| Hard-coding storage backend details into Pod specs | Tightly couples apps to infra; harder to migrate. |
| Using local node storage for critical data | Data loss when node fails or is replaced. |
| Ignoring backup/restore strategy for PV-backed data | High risk of irreversible data loss. |

Make it clear:

- Persistent storage planning is **not optional**.

---

## 6. Interview Q&A

**Q: How do you persist data for a database running in Kubernetes?**  
**A:**  
> "I’d define a PersistentVolumeClaim that requests storage from a StorageClass, and mount it into the database Pod at the appropriate data directory. Typically I’d run the DB as a StatefulSet so each replica gets a stable identity and volume. That said, I usually prefer managed databases outside the cluster and keep Kubernetes focused on stateless workloads where possible."

**Q: Where do you store state for your UI and API services?**  
**A:**  
> "UI and API services are deployed as stateless Deployments; they don’t depend on Pod-local storage surviving restarts. All durable state lives in external data stores like managed SQL/NoSQL databases and caches. That way we can freely scale and roll Pods without worrying about local state."

---

## 7. Next Topic

→ **[06-scaling-and-health.md](./06-scaling-and-health.md)** — Autoscaling, health checks, and self-healing strategies in Kubernetes.

