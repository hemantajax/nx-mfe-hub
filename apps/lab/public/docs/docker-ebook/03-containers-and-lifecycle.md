## 03 — Containers, Lifecycle & Resource Management

> **TL;DR:** Containers are **ephemeral processes** created from images. You control their lifecycle with `docker run/start/stop/rm`, inspect behavior with logs and exec, and keep systems stable using resource limits, health checks, and restart policies. Interviews will test whether you can operate and reason about containers beyond just "docker run".

---

## 1. Container Lifecycle — From Image to Running Process

Lifecycle phases:

1. **Create** — `docker create` or `docker run` allocates a container from an image.
2. **Start** — process begins (`CMD`/`ENTRYPOINT` gets executed).
3. **Running** — container process is alive.
4. **Stopped** — process exited (success or failure), container metadata remains.
5. **Removed** — `docker rm` deletes container metadata; image can still exist.

Core commands:

```bash
# Run (create + start)
docker run --name api -p 8080:8080 my-api:1.0.0

# List running containers
docker ps

# Stop and remove
docker stop api
docker rm api
```

**Interview angle:**

> "I treat containers as disposable runtime instances — configuration and data live outside via env vars and volumes so I can stop, recreate, and roll back containers quickly."

---

## 2. Ephemeral Containers & Persistent Data

Containers:

- Have their own **writable layer** on top of the image layers.
- That writable layer is **deleted** when the container is removed.

Therefore:

- Logs, temp files, and runtime data in the container filesystem are **not durable**.
- You must use **volumes** (Chapter 4) for persistence:
  - Databases.
  - Uploaded files.
  - Shared caches.

Pattern for stateless services:

- Build the app to be **stateless**:
  - No local sessions.
  - No local file-based state.
  - All state in external DB/cache.
- This makes scaling and rolling containers trivial.

---

## 3. Inspecting & Debugging Containers

Know these core commands:

```bash
# Container status and details
docker ps
docker ps -a
docker inspect api

# Logs
docker logs api
docker logs -f api            # follow

# Execute a shell inside a running container
docker exec -it api /bin/sh   # or /bin/bash

# Resource usage
docker stats
```

**Typical debug workflow:**

1. App in container fails health check.
2. `docker ps` to see status and restart count.
3. `docker logs <name>` for stack traces.
4. `docker exec -it <name> /bin/sh` to:
   - Check environment variables.
   - Inspect files.
   - Curl internal endpoints.

In interviews, mention you use these commands routinely when diagnosing issues.

---

## 4. Resource Limits — CPU & Memory

By default, containers can use as much CPU and memory as the host allows, which can cause **noisy neighbor** problems.

Use resource limits to:

- Prevent one container from exhausting resources.
- Enforce fair sharing on shared nodes.

Examples:

```bash
# Limit memory to 512MB, CPU to ~50% of a core
docker run \
  --memory=512m \
  --cpus=0.5 \
  --name api \
  my-api:1.0.0
```

**Key concepts:**

- Memory limit:
  - If container exceeds limit → OOM kill.
- CPU:
  - `--cpus=0.5` ≈ half a CPU worth of scheduler time.

In many production setups, these are configured via orchestrators (Kubernetes), but understanding the Docker-level flags shows you know the fundamentals.

---

## 5. Health Checks & Restart Policies

### 5.1 Health Checks

Health checks indicate whether a container is **ready** and **healthy**.

In Dockerfile:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD \
  curl -f http://localhost:8080/health || exit 1
```

Then:

```bash
docker ps    # shows STATUS (healthy / unhealthy)
```

This is more common in orchestrators, but still matters for:

- Local Compose stacks.
- Basic Docker-only deployments.

### 5.2 Restart Policies

Restart policy determines what happens when a container exits.

```bash
docker run \
  --restart=on-failure:3 \
  --name api \
  my-api:1.0.0
```

Common policies:

- `no` (default).
- `on-failure[:max-retries]`.
- `always`.
- `unless-stopped`.

**Interview phrase:**

> "For critical services we run with health checks and restart policies so transient failures self-heal, while still surfacing repeated failures via monitoring."

---

## 6. Patterns for Multi-Service Local Stacks

While Chapter 6 covers Docker Compose in detail, you should still know basic patterns at the container level.

Example: running UI + API + DB:

```bash
# Database
docker run -d --name db -e POSTGRES_PASSWORD=secret -p 5432:5432 postgres:16-alpine

# API, linking via network (Compose makes this easier)
docker run -d --name api \
  -p 8080:8080 \
  -e DATABASE_URL=postgres://postgres:secret@db:5432/mydb \
  my-api:1.0.0

# UI (NGINX serving built SPA)
docker run -d --name ui -p 80:80 my-ui:1.0.0
```

Pain points with raw `docker run`:

- Manual networking setup.
- Hard to keep track of all flags.
- Not declarative or shareable.

This motivates using **Docker Compose**, which you'll cover in depth later.

---

## 7. Cleaning Up — Pruning Images & Containers

Over time, local Docker environments accumulate:

- Stopped containers.
- Old images.
- Dangling layers.
- Unused volumes.

Useful commands:

```bash
# Remove a single container / image
docker rm my-old-container
docker rmi my-old-image:tag

# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove everything (be careful!)
docker system prune
docker system prune -a   # also removes unused images
```

Interview angle:

> "On dev machines and in CI we regularly prune unused images and containers to keep disk usage under control."

---

## 8. Common Mistakes

| Mistake | Impact |
|---------|--------|
| Treating containers as VMs and storing important data in their filesystem | Data lost when container is replaced. |
| No resource limits on noisy workloads | One misbehaving container can starve others. |
| Lack of health checks and restart policies | Crashed services stay down until manual intervention. |
| Overusing `docker exec` for manual fixes in prod | Configuration drift and non-reproducible environments. |
| Forgetting to clean up old containers/images | Disk bloat; CI agents running out of space. |

Call out at least one "I saw this in a real project" example if you have it.

---

## 9. Interview Q&A

**Q: How do you debug a containerized service that's failing to start?**  
**A:**  
> "First I check `docker ps -a` for the exit code and restart count. Then I run `docker logs` to see stack traces or configuration errors. If needed, I'll start a container with an interactive shell or use `docker exec -it` into a running one to verify environment variables, network connectivity, or file paths. If this is under Compose or Kubernetes, I also check event logs and health checks."

**Q: How do you prevent a single container from affecting other workloads on the same host?**  
**A:**  
> "I set CPU and memory limits, and in orchestrated environments I also set requests and limits so the scheduler can pack workloads safely. That way, if a container misbehaves, it's throttled or OOM-killed instead of starving the entire node."

---

## 10. Next Topic

→ **[04-volumes-and-persistence.md](./04-volumes-and-persistence.md)** — Persisting data with volumes, patterns for databases and caches, and avoiding common pitfalls that lead to data loss.

