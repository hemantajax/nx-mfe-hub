## 10 — Cheat Sheet & Interview Q&A

> Quick-reference commands, patterns, and ready-made answers for Docker-heavy interviews.

---

## 1. Core Commands Cheat Sheet

### 1.1 Images & Containers

```bash
# List images and containers
docker images
docker ps           # running
docker ps -a        # all

# Build image
docker build -t my-app:1.0.0 .

# Run container
docker run --name my-app -p 8080:80 my-app:1.0.0

# Stop / remove
docker stop my-app
docker rm my-app
docker rmi my-app:1.0.0
```

### 1.2 Debugging

```bash
docker logs my-app
docker logs -f my-app

docker exec -it my-app /bin/sh     # or /bin/bash

docker inspect my-app
docker stats                       # live resource usage
```

### 1.3 Volumes & Networks

```bash
# Volumes
docker volume ls
docker volume create pgdata
docker volume inspect pgdata

# Networks
docker network ls
docker network create my-net
docker network inspect my-net
```

### 1.4 Cleanup

```bash
docker container prune
docker image prune
docker system prune       # careful
docker system prune -a    # more aggressive
```

### 1.5 Docker Compose

```bash
docker compose up
docker compose up -d
docker compose up --build

docker compose down
docker compose stop

docker compose logs
docker compose logs -f api
```

---

## 2. Design & Best-Practice Checklist

### 2.1 Dockerfile Design

- **Base image**
  - [ ] Minimal (`alpine`/`slim`) for runtime.
  - [ ] Official image from trusted source.
- **Layers & caching**
  - [ ] `package.json` / `requirements.txt` copied before app code.
  - [ ] Heavy dependency installs before source copies.
- **Multi-stage build**
  - [ ] Build in heavy image (Node, JDK, etc.).
  - [ ] Copy only final artifacts to runtime stage.
- **Security**
  - [ ] Non-root `USER` in final stage.
  - [ ] No secrets baked into image.
- **Context**
  - [ ] `.dockerignore` configured (no `node_modules`, `.git`, logs).

### 2.2 Containers & Runtime

- [ ] Stateless services (no local persistent state).
- [ ] Volumes for DBs and durable storage.
- [ ] CPU/memory limits for critical workloads.
- [ ] Health checks and restart policies.

### 2.3 Compose & Environments

- [ ] `docker-compose.yml` for full local stack.
- [ ] Only entrypoints exposed with `ports`.
- [ ] Internal services communicate via service names on default network.
- [ ] Profiles or overrides for dev-only services (e.g., Mailhog).

### 2.4 CI/CD & Security

- [ ] CI builds images once per commit.
- [ ] Images tagged with Git SHA (immutable).
- [ ] Image scanning integrated into pipeline.
- [ ] Rollback = redeploy previous image tag.

---

## 3. High-Value Interview Answers (Templates)

### 3.1 "What Problem Does Docker Solve?"

> "Docker solves environment drift. Instead of manually configuring runtimes on each machine, we package the application and all its dependencies into an immutable image. The same image runs on developer laptops, CI, and production, which improves reliability, onboarding speed, and deployment consistency."

### 3.2 "Images vs Containers"

> "An image is an immutable blueprint that describes the filesystem and startup command. A container is a running (or stopped) instance of that image, with its own isolated process, filesystem, and network namespace. You can create many containers from the same image."

### 3.3 "Docker vs Virtual Machines"

> "VMs virtualize hardware; each VM runs its own OS kernel and is relatively heavy. Docker containers share the host kernel and package only the userspace and app, so they're much lighter and start faster. That lets us run many more containers per host and scale workloads more efficiently."

### 3.4 "How Do You Design a Production-Ready Dockerfile?"

> "I start from a minimal, trusted base image and use a multi-stage build so the runtime image only includes what the app needs to run. I structure layers to maximize caching — dependency installs before copying frequently changing source — and add a `.dockerignore` to keep the build context small. The final image runs as a non-root user, exposes only necessary ports, and doesn't contain secrets or build tools."

### 3.5 "How Do You Persist Data in Docker?"

> "Containers are ephemeral, so I never store important data in the container filesystem. For databases and other durable data, I use volumes — typically named volumes mounted to the DB's data directory. That way, I can stop and recreate containers without losing data because the volume lives outside the container lifecycle."

### 3.6 "How Do Containers Talk to Each Other?"

> "I attach related containers to a user-defined bridge network so Docker provides internal DNS. Services can reach each other by name, like `http://api:8080`, instead of hard-coded IPs. Only entrypoints like the UI or API gateway are exposed to the host via port mappings."

### 3.7 "How Does Docker Fit Into CI/CD?"

> "CI builds Docker images from the repo and runs tests using those images. After scanning for vulnerabilities, it pushes the images to our registry, tagged with the Git SHA. Deployments reference those tags, so each environment pulls the exact same artifact. Rolling back is as simple as redeploying a previous image tag."

### 3.8 "How Do You Secure Docker in Production?"

> "We use minimal, hardened base images and multi-stage builds so runtime containers are small. Containers run as non-root with reduced capabilities, internal services are on private networks, and we only expose gateways externally. CI scans images for high-severity vulnerabilities, and secrets are injected at runtime from a secret manager instead of being baked into the images."

### 3.9 "Docker vs Kubernetes"

> "Docker gives us container images and the ability to run containers on a single host. Kubernetes orchestrates those containers across a cluster: it maintains desired replica counts, handles rollouts and rollbacks, and provides service discovery and load balancing. We still build Docker images in CI, but Kubernetes is what runs them at scale."

---

## 4. Rapid-Fire Q&A (Bullet Style)

- **Q:** Should you use `latest` for production images?  
  **A:** No; use immutable tags (e.g., Git SHA) and keep `latest` only as a convenience pointer.

- **Q:** What's the purpose of `.dockerignore`?  
  **A:** To keep the build context small and prevent unnecessary files (like `node_modules`, `.git`, logs) from being sent to the daemon or baked into the image.

- **Q:** When would you use multi-stage builds?  
  **A:** Whenever the build needs heavy tooling (Node, compilers) that the runtime doesn't; it keeps the final image smaller and more secure.

- **Q:** Are containers stateful or stateless?  
  **A:** Containers can have state, but best practice is to keep services stateless and store persistent data in external systems (DBs, caches, volumes).

- **Q:** What's the difference between a bind mount and a named volume?  
  **A:** A bind mount maps a specific host path into the container; a named volume is managed by Docker and stored in Docker's storage locations.

- **Q:** How do you debug a failing container?  
  **A:** Check `docker ps -a`, inspect logs with `docker logs`, and if needed, use `docker exec -it` to inspect environment, files, and connectivity from inside.

---

## 5. Study Order (Night Before)

If you only have a few hours before an interview:

1. Re-read:
   - **01 — Docker Mental Model & Architecture**
   - **02 — Images, Layers & Dockerfile Design**
   - **07 — Docker in CI/CD & Environments**
   - **08 — Security, Compliance & Best Practices**
2. Memorize:
   - The answer templates in this chapter.
   - The checklist items you actually use in your current projects.

Focus on sounding:

- Structured.
- Pragmatic.
- Security-aware.
- Comfortable with trade-offs.

