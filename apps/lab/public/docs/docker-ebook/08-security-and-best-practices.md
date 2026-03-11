## 08 — Security, Compliance & Best Practices

> **TL;DR:** Containers are not magically secure. You must harden images (minimal base, non-root user), manage secrets carefully, scan images, and restrict network/host access. In interviews, focus on how Docker changes your threat model and what concrete steps you take to mitigate risks.

---

## 1. Threat Model with Docker

Key risks:

- **Image-level vulnerabilities**:
  - Outdated OS packages.
  - Vulnerable runtime versions (Node, OpenSSL, etc.).
- **Misconfiguration**:
  - Running as root inside container.
  - Overly broad capabilities / privileges.
  - Exposing internal services publicly.
- **Secrets leakage**:
  - Secrets baked into images or committed to repo.
  - Environment variables dumped into logs or crash reports.

Containers help by:

- Providing process isolation.
- Standardizing environments for scanning and policy enforcement.

But they don't replace:

- Good code security.
- Network segmentation.
- Proper identity and access management.

---

## 2. Image Hardening

Best practices:

1. **Use minimal base images**:
   - `alpine`, `-slim` variants.
   - Reduces package count → fewer CVEs.
2. **Remove build tools from runtime**:
   - Use multi-stage builds (Chapter 2).
3. **Pin versions**:
   - Avoid floating `latest` where possible.
4. **Non-root user**:
   - Create a dedicated user and `USER` to it in final stage.

Example:

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY package.json package-lock.json ./
RUN npm ci --only=production

RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 3000
CMD ["node", "dist/main.js"]
```

**Interview line:**

> "Our production images are multi-stage, minimal, and run as non-root, which significantly reduces the attack surface."

---

## 3. Secrets Management

Avoid:

- Baking secrets into images:
  - `.env` files copied via `COPY`.
  - Hard-coded credentials in code.
- Passing secrets on the CLI (often visible in process list).

Prefer:

- Environment variables injected at runtime (not build time).
- Secret managers:
  - Kubernetes Secrets.
  - AWS Secrets Manager, HashiCorp Vault, etc.
- Docker secrets (for Swarm) or orchestrator-native options.

Example (local dev):

```bash
docker run -d \
  -e DATABASE_URL=postgres://... \
  -e JWT_SECRET=supersecret \
  my-api:1.0.0
```

Make clear:

- Dev/test might use env vars directly.
- Prod should use a secure secret store and inject into runtime responsibly.

---

## 4. Least Privilege & Capabilities

Containers can be run with:

- Extra capabilities (dangerous).
- Dropped capabilities (safer).

Principles:

- Run with as few Linux capabilities as possible.
- Avoid `--privileged` unless absolutely necessary.
- Mount only required volumes; use `read_only` when possible.

Example:

```bash
docker run -d \
  --read-only \
  --cap-drop=ALL \
  --cap-add=NET_BIND_SERVICE \
  my-api:1.0.0
```

In many environments, orchestrator policies handle this. In interviews, mention:

> "We avoid privileged containers and reduce capabilities so that even if an app is compromised, the blast radius is limited."

---

## 5. Network Security

Good defaults:

- Use private Docker networks for internal services.
- Only expose ports for:
  - Gateways.
  - UI entrypoints.
- Apply:
  - Security groups / firewalls at host or cloud level.
  - TLS at the edge (API gateway, ingress).

Mention:

- "Internal services are not exposed via `-p`."
- "We terminate TLS at gateway/ingress and forward via mTLS where required."

---

## 6. Image Scanning & Policy

Integrate scanning into CI:

- Tools:
  - Trivy, Grype, Snyk, Anchore, etc.
- Policies:
  - Fail builds on **high** or **critical** severity CVEs.
  - Maintain an allowlist for exceptional cases.

Example (conceptual CI step):

```bash
trivy image --exit-code 1 --severity HIGH,CRITICAL my-registry.com/my-app:${GIT_SHA}
```

Compliance:

- Keep SBOMs for each image.
- Know what OSS components you ship.

Interview phrase:

> "Our CI pipeline scans images on every build and blocks promotion if high-severity vulnerabilities are found. We track dependencies via SBOMs so we can react quickly when new CVEs are published."

---

## 7. Logging, Monitoring & Incident Response

Security also means:

- Being able to **detect** and **respond**.

For Dockerized workloads:

- Centralize logs:
  - Ship container logs to ELK, Loki, Datadog, etc.
- Monitor:
  - Unusual restarts.
  - Resource spikes.
  - Unexpected network calls.
- Use:
  - Runtime security tools (Falco, etc.) if needed.

From a UI architect perspective:

- Ensure:
  - UI containers log access/error logs to stdout/stderr for centralization.
  - Sensitive data (tokens, PII) is never logged.

---

## 8. Compliance-Friendly Patterns

If you're in regulated environments (finance, healthcare):

- Standardize:
  - Base images with pre-approved packages.
  - Security baselines enforced via policy (OPA, admission controllers).
- Keep:
  - Audit trails: who built/pushed which image, when.
  - Signed images (e.g., Sigstore/cosign).

Interview angle:

> "We maintain a small set of hardened base images and enforce their use via policy. CI signs images and we verify signatures at deploy time, which improves supply chain integrity."

---

## 9. Common Mistakes

| Mistake | Why It's Dangerous |
|---------|--------------------|
| Running as root in production containers | Any compromise gives attacker root inside the container; easier to escalate. |
| Using large, unpinned base images | More vulnerabilities, harder to reason about what's inside. |
| Baking secrets into images or git | Secrets are hard to rotate; leaks can be catastrophic. |
| Exposing internal services publicly with `-p` | Broadens attack surface unnecessarily. |
| Skipping image scanning | Shipping known vulnerabilities; audit/compliance gaps. |

Mention how you avoid at least 2–3 of these.

---

## 10. Interview Q&A

**Q: How do you secure Docker images and containers in production?**  
**A:**  
> "We start with hardened, minimal base images and use multi-stage builds so the runtime only contains what's needed. Containers run as non-root with reduced capabilities, and internal services are kept on private networks with only gateways exposed. CI scans images for vulnerabilities and fails builds for high-severity issues, and secrets are injected at runtime from a secret manager rather than baked into images."

**Q: What are some common Docker security pitfalls you watch for?**  
**A:**  
> "Running containers as root, using `--privileged` casually, exposing every service via host ports, and embedding secrets in images or configs. I also watch for bloated base images that bring in unnecessary packages and CVEs."

---

## 11. Next Topic

→ **[09-docker-and-kubernetes.md](./09-docker-and-kubernetes.md)** — How Docker concepts map to Kubernetes and how to talk about containers vs orchestration in system design interviews.

