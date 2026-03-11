## 02 — Images, Layers & Dockerfile Design

> **TL;DR:** A Docker image is built from layers defined in a `Dockerfile`. Good Dockerfile design means **small, cache-friendly, secure images**: choose minimal base images, use multi-stage builds, reduce layers, and never bake secrets into images. Interviews focus on how you structure Dockerfiles and optimize builds.

---

## 1. Mental Model: Layers & Caching

When you run `docker build`, Docker:

1. Reads your `Dockerfile` top to bottom.
2. Executes each instruction (`FROM`, `RUN`, `COPY`, etc.).
3. Creates a **new layer** for each instruction that changes the filesystem.
4. Caches layers by hashing:
   - The instruction itself.
   - All previous layers.

**Key implications:**

- If an instruction and all previous layers are unchanged, Docker reuses the cached layer.
- Changing a line near the top of the `Dockerfile` **invalidates the cache** for all following layers.
- Ordering matters for **build speed**.

**Interview soundbite:**

> "I structure Dockerfiles to maximize layer cache reuse — putting the most stable instructions first (dependencies, OS packages) and the most frequently changing ones last (app code)."

---

## 2. Core Dockerfile Instructions

Common instructions (know what each does):

- `FROM` — base image (required, and usually first).
- `WORKDIR` — set working directory inside the image.
- `COPY` / `ADD` — copy files into the image (prefer `COPY`).
- `RUN` — execute commands at build time (install deps, build assets).
- `CMD` — default command when container starts (can be overridden).
- `ENTRYPOINT` — main executable; often combined with `CMD`.
- `ENV` — set environment variables.
- `EXPOSE` — documentation of container's listening port (not a firewall).

**Example:** simple Node API `Dockerfile`:

```dockerfile
FROM node:22-alpine AS base

WORKDIR /app

# Only copy package files first to leverage caching
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Now copy the rest of the source (changes more frequently)
COPY . .

CMD ["node", "dist/main.js"]
```

---

## 3. Multi-Stage Builds — Must-Know Pattern

**Multi-stage build** = multiple `FROM` sections within one Dockerfile, allowing you to:

- Build in a heavier image (Node, JDK, toolchain).
- Copy only the **final artifacts** into a minimal runtime image.

Example: Angular SPA built and served by NGINX.

```dockerfile
# Stage 1: Build Angular app
FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration=production

# Stage 2: Runtime image (NGINX)
FROM nginx:1.27-alpine AS runtime

# Copy build output from previous stage
COPY --from=build /app/dist/my-angular-app/browser /usr/share/nginx/html

# Optional: custom NGINX config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Benefits:

- Final image:
  - No Node toolchain → smaller attack surface.
  - Only static assets + NGINX.
- Clear separation of **build-time** vs **runtime** concerns.

**Interview phrase:**

> "I always use multi-stage builds for production images so the final runtime only contains what the app needs to run — not compilers or build tools."

---

## 4. Choosing Base Images

Choosing the right `FROM` base is critical for:

- Image size.
- Security (fewer packages → smaller attack surface).
- Performance and compatibility.

Common choices:

- `node:22-alpine` — minimal Node runtime.
- `nginx:1.27-alpine` — lightweight NGINX.
- `python:3.13-alpine`, `openjdk:21-jdk-slim`, etc.

Guidelines:

- Use official images from trusted publishers.
- Prefer `-alpine` or `-slim` variants **for production**.
- Use fuller images only where tooling is required (build stages).

---

## 5. Layer Ordering & Caching Strategy

**Goal:** Make rebuilds fast when you change code frequently.

Pattern:

1. Copy and install dependencies first (stable).
2. Copy the rest of the source later (changes frequently).

Example for Node/TypeScript API:

```dockerfile
FROM node:22-alpine AS build

WORKDIR /app

# 1. Dependencies (slow but stable)
COPY package.json package-lock.json ./
RUN npm ci

# 2. Code (changes often)
COPY . .
RUN npm run build
```

This way:

- If only source files change, `npm ci` step uses cached layer.
- Only the final `COPY . .` and `RUN npm run build` re-run.

---

## 6. `.dockerignore` — Underrated but Essential

Like `.gitignore` but for Docker builds.

**Why it matters:**

- Large contexts slow down builds and increase image size.
- Unnecessary files can invalidate caches (e.g., local logs, `node_modules`).

Typical `.dockerignore`:

```text
.git
node_modules
dist
coverage
*.log
.env
.DS_Store
```

**Interview angle:**

> "I always set up a `.dockerignore` to keep the build context small and avoid accidentally copying secrets or bulky directories like `node_modules` into the image."

---

## 7. CMD vs ENTRYPOINT

They both define how the container starts, but have different roles:

- `ENTRYPOINT` — main executable.
- `CMD` — default arguments (or default command).

Patterns:

```dockerfile
# Example: using ENTRYPOINT + CMD
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
```

Running:

- `docker run my-nginx` → `nginx -g "daemon off;"`.
- `docker run my-nginx -c /etc/nginx/nginx.conf` → `nginx -c /etc/nginx/nginx.conf`.

For most app images, use either:

- Just `CMD` (simpler), or
- `ENTRYPOINT` when the container is **always** that binary.

---

## 8. Security & Best Practices for Dockerfiles

Key rules:

1. **Don't run as root** in the final image unless absolutely required.
2. Use minimal base images (Alpine/slim).
3. Don't bake secrets (API keys, passwords) into images.
4. Pin dependency versions (or at least major versions).
5. Use `HEALTHCHECK` where appropriate.

Example: non-root user in Node app:

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY . .

# Create and use a non-root user
RUN addgroup -S nodegrp && adduser -S nodeuser -G nodegrp
USER nodeuser

EXPOSE 3000
CMD ["node", "dist/main.js"]
```

---

## 9. Common Mistakes

| Mistake | Why It's a Problem |
|---------|--------------------|
| Using a full OS image (e.g., `ubuntu:latest`) for simple apps | Bloated image, more CVEs, slower pulls. |
| Not using multi-stage builds | Final image includes compilers/build tools, larger attack surface. |
| Copying entire repo before installing dependencies | Invalidates cache on every small code change. |
| Missing `.dockerignore` | Big build contexts, slow builds, potential leakage of secrets. |
| Running as root in production | Increases impact of container escape or app compromise. |

In interviews, mention at least 2–3 of these and how you avoid them.

---

## 10. Interview Q&A

**Q: How do you optimize Docker image size and build time?**  
**A:**  
> "I start with a minimal base image, use multi-stage builds so the runtime only has what it needs, and structure the Dockerfile so that dependency installation happens before copying frequently changing source files. I also use a `.dockerignore` to shrink the build context. This keeps images small, builds fast, and reduces the surface area for vulnerabilities."

**Q: What does `.dockerignore` do, and why is it important?**  
**A:**  
> "`.dockerignore` filters which files are sent to the Docker daemon during `docker build`. It prevents unnecessary files like `node_modules`, logs, or `.git` from bloating the build context and accidentally ending up in the image. It also helps keep builds fast and reduces the risk of leaking secrets."

**Q: When would you use a multi-stage Dockerfile?**  
**A:**  
> "Whenever the build requires heavy tooling that the runtime doesn't need — for example, building an Angular app with Node and then serving static files from NGINX. I build in one stage, then copy only the compiled assets into a lightweight runtime stage. That keeps the final image small and secure."

---

## 11. Next Topic

→ **[03-containers-and-lifecycle.md](./03-containers-and-lifecycle.md)** — Running, stopping, and managing containers, plus resource limits, health checks, and patterns for multi-service local stacks.

