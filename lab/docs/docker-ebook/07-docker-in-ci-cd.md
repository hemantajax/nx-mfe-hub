## 07 — Docker in CI/CD & Environments

> **TL;DR:** CI builds Docker images, runs tests inside them, and pushes them to a registry. Environments pull **versioned images** and deploy them. A good strategy includes clear tagging, caching for speed, security scanning, and simple rollbacks. Interviews expect you to connect Docker to the bigger release pipeline.

---

## 1. Build Once, Run Everywhere

The core CI/CD principle with Docker:

- **Build the image once** in CI.
- **Test that exact image**.
- **Promote the same image** across environments (dev → staging → prod).

Benefits:

- No "works in staging but not prod" due to rebuild differences.
- Clear artifact you can **roll back** to.
- Stronger supply chain story (scanning, provenance).

---

## 2. Typical CI Workflow with Docker

High-level steps:

1. Checkout code.
2. Build Docker image (`docker build`).
3. Run tests inside container or using the image.
4. Scan image for vulnerabilities.
5. Tag and push image to registry.

Example (pseudo YAML for CI, platform-agnostic):

```yaml
steps:
  - checkout

  - name: Build image
    run: |
      docker build \
        -t my-registry.com/my-app:${GIT_SHA} \
        -t my-registry.com/my-app:${BRANCH_NAME} .

  - name: Test
    run: |
      docker run --rm my-registry.com/my-app:${GIT_SHA} npm test

  - name: Push
    run: |
      docker push my-registry.com/my-app:${GIT_SHA}
      docker push my-registry.com/my-app:${BRANCH_NAME}
```

As a UI architect, mention:

- Ensuring **frontend build** (SSR/SPA) happens in the Dockerfile.
- Running **lint/tests** either inside the container or in CI before build.

---

## 3. Image Tagging Strategy

Good tags help you:

- Identify what's running where.
- Roll back quickly.

Common patterns:

- Immutable tags:
  - `my-app:git-sha` (e.g., `my-app:3f42c1b`).
  - `my-app:1.2.3`.
- Mutable tags (convenience pointers):
  - `my-app:main`.
  - `my-app:staging`.
  - `my-app:latest` (use sparingly in prod).

Recommended:

- Always use **immutable tag** in actual deployment manifests.
- Optionally push a human-friendly tag that points to the same image.

**Interview soundbite:**

> "We tag images with the Git SHA and use that immutable tag in deployments. That way, we can always roll back by redeploying a known SHA, regardless of how mutable tags like `latest` move."

---

## 4. Caching & Build Performance

CI performance matters, especially for frontend builds.

Strategies:

- Leverage Docker's layer cache:
  - COPY `package.json` / `package-lock.json` first, then `npm ci`, then rest of code.
  - Avoid changing `Dockerfile` frequently at the top.
- Use:
  - BuildKit (`DOCKER_BUILDKIT=1`).
  - Remote caches / registries that support layer reuse.

Example:

```bash
DOCKER_BUILDKIT=1 docker build \
  -t my-registry.com/my-app:${GIT_SHA} \
  .
```

Some CI systems support:

- `--cache-from` previous images.
- Shared layer caches between runs.

Mention in interviews:

> "I design Dockerfiles to be cache-friendly and configure CI to reuse layers from previous builds, especially the dependency installation steps, to keep pipeline times low."

---

## 5. Security Scanning & Compliance

Docker in CI is also a natural place to:

- Scan images for:
  - Known vulnerabilities (CVEs).
  - Policy violations (disallowed base images).
- Generate SBOMs (Software Bill of Materials).

Common tools:

- Trivy, Grype, Snyk, etc.

Example CI step (pseudo):

```yaml
- name: Scan image
  run: trivy image --exit-code 1 my-registry.com/my-app:${GIT_SHA}
```

**Interview angle:**

> "Our CI pipelines include image scanning before pushing to the registry, and we fail the build on high-severity vulnerabilities. We also prefer minimal base images to reduce the attack surface."

---

## 6. Deploying Across Environments

Once images are in registry:

- Dev/staging/prod environments pull by tag:

```bash
docker pull my-registry.com/my-app:3f42c1b
docker run -d my-registry.com/my-app:3f42c1b
```

In practice:

- You do this via:
  - Orchestrator manifests (Kubernetes).
  - Compose files for smaller setups.
  - Platform-specific configs (ECS, App Runner, Cloud Run).

Key practice:

- **No rebuilds** in downstream environments.
- Only change:
  - The image tag.
  - Environment-specific configuration (env vars, secrets, scaling).

---

## 7. Rollbacks & Release Strategies

With Docker images in a registry, rollbacks are straightforward:

- Re-deploy **previous image tag**.
- No need to reconstruct environment.

Common strategies:

- Blue/green:
  - Run old and new versions side by side.
  - Switch traffic when ready.
- Canary:
  - Route a percentage of traffic to new version.
  - Gradually increase if metrics look good.

Mention:

> "Our rollout strategy is based on immutable Docker images. We deploy new tags with canary or blue/green patterns, and if we see issues, we can roll back instantly by re-pointing deployments to the previous image tag."

---

## 8. Frontend-Specific Considerations

For UI:

- SSR apps:
  - Docker image runs Node server (Next.js/Nest SSR/etc.).
  - CI builds once; image is the artifact.
- SPA apps:
  - Docker image may:
    - Serve static assets via NGINX, or
    - Be used only in preview environments, while prod uses CDN-based deployment.

Good practice:

- Even if prod uses a CDN, you can:
  - Use Docker images for E2E testing in CI.
  - Use the same build pipeline for both Docker and CDN artifacts.

Example:

```bash
# In CI:
npm run build
docker build -t my-registry.com/ui-shell:${GIT_SHA} .
docker run my-registry.com/ui-shell:${GIT_SHA} npm test:e2e
# Then publish static assets to CDN from build artifacts if desired.
```

---

## 9. Common Mistakes

| Mistake | Impact |
|---------|--------|
| Rebuilding images separately in each environment | Inconsistent artifacts; hard to reproduce bugs. |
| Using only `latest` tag in deployments | Hard to know exactly what's running; rollbacks are guesswork. |
| Ignoring image scanning | Higher risk of shipping known vulnerabilities. |
| Bloated images with dev tools | Slower deployments, larger attack surface. |
| No automated rollback story | Longer incidents and manual triage. |

Call out at least one mitigation you use (e.g., SHA tags + scanning).

---

## 10. Interview Q&A

**Q: How does Docker fit into your CI/CD pipeline?**  
**A:**  
> "CI builds Docker images from the repo, runs unit/integration tests using those images, scans them for vulnerabilities, and then pushes them to our registry tagged with the Git SHA and branch. Our deployment manifests reference those tags, so each environment pulls the exact same image. That gives us reproducible deployments and simple rollbacks."

**Q: How do you roll back a bad release when using Docker?**  
**A:**  
> "Because each release is a tagged image, rollback means updating the deployment to point back to the previous image tag. In Kubernetes, for example, that's a simple deployment update or rollout undo. There's no need to rebuild — we already have the good artifact in the registry."

---

## 11. Next Topic

→ **[08-security-and-best-practices.md](./08-security-and-best-practices.md)** — Hardening Docker images and containers, secrets management, and supply chain concerns.

