## 04 — Volumes & Persistence

> **TL;DR:** Containers are ephemeral; **volumes** are how you persist data. Use named volumes or bind mounts for databases, uploaded files, and caches. Never rely on the container filesystem for important data. Interviews expect you to understand bind mounts vs volumes, where data actually lives, and common pitfalls that lead to data loss.

---

## 1. Why We Need Volumes

Recall from Chapter 3:

- Each container has a writable layer that disappears when the container is removed.
- That layer is not appropriate for:
  - Databases.
  - User uploads.
  - Shared caches that must survive container restarts.

**Volumes** provide storage that:

- Lives **outside** the container lifecycle.
- Can be **reused** by multiple containers.
- Can be backed up and managed independently.

Mental model:

- Container → runs your app.
- Volume → persistent hard drive that can be attached/detached.

---

## 2. Types of Volumes

Three main ways to persist data with Docker:

### 2.1 Named Volumes (Managed by Docker)

Created and managed by Docker:

```bash
docker volume create mydata

docker run -d \
  --name db \
  -e POSTGRES_PASSWORD=secret \
  -v mydata:/var/lib/postgresql/data \
  postgres:16-alpine
```

Characteristics:

- Docker chooses where to store on host (e.g., `/var/lib/docker/volumes/...`).
- Good for **databases** and data you don't need to edit directly.
- Easy to move stack between hosts with volume backup/restore tools.

### 2.2 Bind Mounts (Host Path)

Mount a specific host directory into the container:

```bash
docker run -d \
  --name app \
  -v /Users/me/project/logs:/app/logs \
  my-app:1.0.0
```

Characteristics:

- You choose exact host path.
- Great for:
  - Local dev (mount source code from host).
  - Sharing logs or config files for easy inspection.
- More dependent on host OS layout.

### 2.3 tmpfs (In-Memory)

Store data in memory only (never written to disk):

```bash
docker run -d \
  --name cache \
  --tmpfs /tmp/cache \
  my-cache-app:1.0.0
```

Characteristics:

- Very fast, ephemeral.
- Data lost on restart.
- Useful for temporary sensitive data or high-speed caches.

---

## 3. Where Does Docker Actually Store Volume Data?

For named volumes, on Linux hosts (conceptually):

- `/var/lib/docker/volumes/<volume-name>/_data`

But you should **not** depend on:

- Exact host path.
- Internal storage layout.

Instead, think:

- Docker manages the storage location.
- You interact through:
  - `docker volume ls`
  - `docker volume inspect`
  - `docker volume rm`

**Interview angle:**

> "For named volumes, I don't depend on the path under `/var/lib/docker`. I treat the volume as an abstraction and use Docker's CLI and backup tools to manage it."

---

## 4. Database Persistence Pattern

Databases in containers are common in:

- Local development.
- Some production setups (with careful storage configuration).

Pattern with a named volume:

```bash
docker volume create pgdata

docker run -d \
  --name pg \
  -e POSTGRES_PASSWORD=secret \
  -v pgdata:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:16-alpine
```

Now:

- Stop and remove container:

  ```bash
  docker stop pg
  docker rm pg
  ```

- Recreate with same volume:

  ```bash
  docker run -d \
    --name pg \
    -e POSTGRES_PASSWORD=secret \
    -v pgdata:/var/lib/postgresql/data \
    -p 5432:5432 \
    postgres:16-alpine
  ```

Data persists because it's in `pgdata`, not in the container layer.

---

## 5. Volumes for Frontend/Node Projects

For UI stacks, you often use volumes to:

- Mount source code for live reload in dev.
- Cache `node_modules` to speed up builds.

Example dev pattern:

```bash
docker run -it --rm \
  -v "$PWD":/app \
  -v node_modules_cache:/app/node_modules \
  -w /app \
  -p 4200:4200 \
  node:22-alpine \
  sh -c "npm ci && npm run start"
```

Here:

- Project code lives on host; edited via IDE.
- `node_modules_cache` volume persists dependencies between runs.

This pattern is often encapsulated more cleanly in Docker Compose (Chapter 6).

---

## 6. Permissions & Ownership Pitfalls

Common pain points:

- Host user vs container user IDs don't match.
- Files created by the container appear as "root" on host.

Mitigation strategies:

- Run container with your user ID (in dev):

  ```bash
  docker run -it --rm \
    -u "$(id -u):$(id -g)" \
    -v "$PWD":/app \
    my-dev-image
  ```

- In production:
  - Use a dedicated non-root user **inside** the container.
  - Make sure volume directories are owned/accessible by that user.

Interview mention:

> "For dev containers I often run as the host user to avoid permission issues on bind mounts. In production, I use a dedicated non-root user in the image and configure volume ownership accordingly."

---

## 7. Backup & Migration Considerations

Because volumes contain important data, you must:

- Have a **backup strategy** (especially for DB volumes).
- Plan for **migration** between hosts.

Simple pattern:

```bash
# Create a tarball from a volume
docker run --rm \
  -v pgdata:/data \
  -v "$PWD":/backup \
  alpine \
  sh -c "cd /data && tar czf /backup/pgdata-backup.tgz ."
```

In production, you'd typically:

- Use database-level backups (e.g., `pg_dump`, replication).
- Use cloud storage or managed DB backups instead of raw volume tarballs.

---

## 8. Common Mistakes

| Mistake | Impact |
|---------|--------|
| Storing DB data in container filesystem (no volume) | Data lost on redeploy or host migration. |
| Confusing bind mounts with volumes | Environment-specific host paths break reproducibility. |
| Baking secrets into images instead of using env/secret stores | Hard to rotate, security risk if image is leaked. |
| Ignoring permissions between host and container users | Confusing file ownership, CI failures. |
| Not backing up volumes in setups where they hold critical data | High risk of irreversible data loss. |

Call out **at least one** example of data loss due to missing volumes if you have real experience — it resonates with interviewers.

---

## 9. Interview Q&A

**Q: What's the difference between a bind mount and a named volume?**  
**A:**  
> "A bind mount maps a specific host directory into the container, so the path and OS layout matter. A named volume is managed by Docker; Docker decides where on disk to store the data and exposes it via an abstract name. For cross-machine reproducibility and databases I prefer named volumes, while bind mounts are great for local dev where I want to edit files on the host."

**Q: How do you persist database data in Docker?**  
**A:**  
> "I mount a named volume to the database's data directory, for example `-v pgdata:/var/lib/postgresql/data` for Postgres. Then containers can be stopped, recreated, or updated without losing data, because the data lives in the volume, not in the container filesystem."

---

## 10. Next Topic

→ **[05-networking-and-network-modes.md](./05-networking-and-network-modes.md)** — How Docker networking works, how services discover each other, and how to structure networks for local microfrontends and APIs.

