## 01 — Docker Mental Model & Architecture

> **TL;DR:** Docker gives you *repeatable environments* by packaging apps and all their dependencies into immutable images, which you run as lightweight containers on any host with the Docker runtime. In interviews, talk about **images, containers, registries, and orchestration** — and how Docker improves **developer experience, reliability, and deployment speed**.

---

## 1. Why Docker Exists — The Core Story

Classic problem before Docker:

- "It works on my machine" because local env ≠ prod env.
- Different OS, library versions, Node/JDK versions, system packages.
- Deployments are slow and fragile: shell scripts, manual steps, config drift.

**Docker's promise:**  
Package the app and its runtime into a **standard unit** (an image) that can run the same way everywhere.

**Key mental model:**

- **Image** = *Blueprint / Class* — defines filesystem + startup command.
- **Container** = *Instance / Object* — running process created from an image.
- **Registry** = *Artifact repository* — stores and distributes images (Docker Hub, ECR, GCR, ACR, GHCR).
- **Docker Engine** = *Runtime* — pulls images, creates containers, manages networking/volumes.

As a UI architect, position Docker as:

- A way to **standardize frontend and backend environments**.
- A foundational building block for **modern CI/CD and Kubernetes**.

---

## 2. High-Level Architecture

Even without drawing, you should be able to describe this picture:

1. Developer writes a `Dockerfile` describing how to build the app image.
2. `docker build` produces an image with layers (base OS, runtime, dependencies, app code).
3. Image is pushed to a **registry** (e.g., `my-company-registry.com/ui/dashboard:1.2.3`).
4. Environments (dev/stage/prod) **pull** that image and run it as containers.
5. An orchestrator (Docker Compose locally, Kubernetes in prod) manages **multiple** containers.

Use this narrative in interviews:

> "We use Docker to package our Angular / Node / API services into versioned images. CI builds and scans the images, then pushes them to our registry. Environments pull those immutable images and run them in containers behind a load balancer. This keeps runtime behavior consistent across laptops, CI, and production."

---

## 3. Images vs Containers — Interview-Ready Explanation

### 3.1 Images

An **image**:

- Is a **read-only template** with:
  - A filesystem snapshot (binaries, libs, app code).
  - Metadata: default command, exposed ports, env defaults.
- Is built from a `Dockerfile` via `docker build`.
- Is composed of **layers** that can be cached and shared.

You reference images with **names and tags**:

- `node:22-alpine`
- `nginx:1.27`
- `my-registry.local/app/frontend:1.0.0`
- Tags are mutable pointers; `:latest` is just another tag (avoid in prod).

### 3.2 Containers

A **container**:

- Is a **running (or stopped) instance** of an image.
- Gets its own **process namespace**, filesystem view, network namespace.
- Shares the **host OS kernel** (not a full VM).

In practice:

- Multiple containers can be created from the same image.
- Containers are cheap to start and stop (milliseconds–seconds).
- Containers are *ephemeral* — treat their filesystem as temporary unless you use volumes.

**Interview soundbite:**

> "An image is the immutable blueprint. A container is a running instance of that blueprint with its own isolated process, filesystem, and network view."

---

## 4. Docker vs VMs — How to Explain the Difference

Old world: **Virtual Machines**

- Hypervisor emulates full hardware.
- Each VM runs its own OS kernel + userspace + app.
- Heavy, slow to boot, large image sizes.

Docker world: **Containers**

- No hardware emulation; **share the host kernel**.
- Only package userspace binaries + libs + app.
- Lightweight, fast to start, smaller images.

Use this comparison table:

| Aspect | VMs | Containers (Docker) |
|--------|-----|---------------------|
| Isolation | Hardware + OS level | Process + namespace level |
| Boot time | Seconds–minutes | Milliseconds–seconds |
| Image size | GBs (full OS) | MBs–hundreds of MBs |
| Overhead | High | Low |
| Density | Fewer VMs per host | Many containers per host |

**Interview framing:**

> "VMs virtualize hardware, containers virtualize the OS. Docker containers share the host kernel, which makes them much lighter and faster to start. That's why we can run dozens or hundreds of containers on the same host."

---

## 5. Where Docker Fits in System Design

In a typical architecture:

- **Clients**: Browsers/mobile apps.
- **Edge**: CDN, WAF, API gateway.
- **Services**: API services, UI servers, background workers — often packaged as **Docker images**.
- **Data**: Databases, caches, queues.

Docker's role:

- Standardizes **how** those services are packaged and deployed.
- Enables:
  - Blue/green deployments (swap image versions).
  - Canary releases (route % traffic to new image).
  - Rollbacks (re-deploy previous image tag).

For UI systems:

- Package **SSR apps**, **SPA asset servers (NGINX)**, or **BFF APIs** into Docker images.
- Use Docker-based stacks for:
  - Local development (`docker compose up`).
  - Preview environments (per-branch stacks in CI).
  - Production workloads (Kubernetes running Docker-compatible images).

---

## 6. Developer Experience — Why Teams Love Docker

From a UI architect lens, highlight **DX improvements**:

- Onboarding:
  - *Before*: "Install Node, Java, Postgres, Redis, configure everything."
  - *With Docker*: "Install Docker, run `docker compose up`."
- Consistency:
  - Same image used in **local**, **CI**, and **prod**.
  - Less "works on my machine" debugging.
- Tools:
  - `docker logs`, `docker exec -it`, `docker stats` simplify debugging.
  - Easy to spin up dependencies (DB, cache, queue) as sidecar containers.

**Interview snippet:**

> "For frontend-heavy systems, Docker gives us consistent environments across the entire lifecycle. Developers get a one-command stack locally, CI runs the same containers, and prod runs the same image built once in the pipeline."

---

## 7. Key Commands to Know (Mental Model)

You don't need every flag, but you should know the **core verbs**:

```bash
# Build an image from Dockerfile
docker build -t my-app:1.0.0 .

# List images and containers
docker images
docker ps          # running
docker ps -a       # all

# Run a container from an image
docker run --name my-app -p 8080:80 my-app:1.0.0

# Debug / explore
docker logs my-app
docker exec -it my-app /bin/sh

# Stop and remove containers
docker stop my-app
docker rm my-app
```

In interviews, it's enough to demonstrate you understand **what** these do and **when** you'd use them.

---

## 8. Common Misconceptions (Call These Out)

| Misconception | Correct View |
|---------------|-------------|
| "Containers are secure by default." | They provide isolation but require hardening (non-root, minimal images, proper network rules). |
| "Docker replaces VMs." | It complements them; often you run Docker **on top of** VMs or cloud instances. |
| "Docker = Kubernetes." | Docker is for building/running containers; Kubernetes orchestrates containers at scale. |
| "Docker solves all deployment problems." | It standardizes packaging, but you still need good CI/CD, monitoring, and infra. |

Explicitly correcting one of these in an interview is a strong senior signal.

---

## 9. Interview Q&A

**Q: What problem does Docker solve?**  
**A:**  
> "Docker solves environment drift. It lets us package the application and all its dependencies into an immutable image so the same thing that runs on a developer laptop runs in CI and production. That improves reliability, onboarding speed, and deployment consistency."

**Q: How do you explain Docker to a non-technical stakeholder?**  
**A:**  
> "Think of Docker as a shipping container for software. Once we pack everything the app needs into a container, we can ship and run it anywhere that supports containers, without repacking each time."

**Q: When would you *not* use Docker?**  
**A:**  
> "If the platform already gives you managed runtime environments that meet your needs (e.g., simple serverless functions), or if you're running on very constrained devices where the Docker daemon overhead is too high, Docker might not be worth the added complexity. But for most web and UI architectures, containers are a great default."

---

## 10. Next Topic

→ **[02-images-and-dockerfile.md](./02-images-and-dockerfile.md)** — Designing efficient Dockerfiles, understanding layers and caching, and building production-ready images for UI and API services.

