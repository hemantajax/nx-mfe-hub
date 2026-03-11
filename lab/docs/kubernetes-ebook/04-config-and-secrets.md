## 04 — Config, Secrets & Environment Management

> **TL;DR:** Kubernetes separates **configuration** (ConfigMaps) and **secrets** (Secrets) from images, so you can promote the same Docker image across environments and inject different settings. Interviews expect you to explain how you manage per-env config without rebuilding images and how you keep secrets out of code.

---

## 1. Why Separate Config from Images

Goals:

- Build once, deploy everywhere:
  - Same image for dev, staging, prod.
  - Different endpoints, feature flags, credentials.
- Avoid baking:
  - URLs.
  - Keys.
  - Environment toggles.
into the image.

Kubernetes resources:

- **ConfigMap** — non-sensitive key/value pairs or small files.
- **Secret** — base64-encoded sensitive data:
  - API keys.
  - DB credentials.
  - Tokens.

---

## 2. ConfigMaps — Non-Secret Configuration

ConfigMap example:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ui-config
data:
  API_BASE_URL: "https://api.example.com"
  FEATURE_FLAGS: '{"newDashboard": true}'
```

Used by Pods via:

- Environment variables.
- Mounted config files.

Inject as env vars:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ui-shell
spec:
  template:
    spec:
      containers:
        - name: ui-shell
          image: my-registry.com/ui-shell:3f42c1b
          envFrom:
            - configMapRef:
                name: ui-config
```

Now:

- Inside container:
  - `process.env.API_BASE_URL` (Node).
  - `ENV['API_BASE_URL']` (other runtimes).

---

## 3. Secrets — Sensitive Data

Secret example:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: api-secrets
type: Opaque
data:
  DATABASE_URL: cG9zdGdyZXM6Ly91c2VyOnBhc3NAdXJsOjU0MzIvZGI=  # base64
```

You typically:

- Generate base64 via CLI.
- Or rely on tooling / secret managers to sync into cluster.

Inject as env vars:

```yaml
envFrom:
  - secretRef:
      name: api-secrets
```

Security considerations:

- Kubernetes Secrets are base64-encoded, not strongly encrypted by default.
  - Use:
    - Encrypted etcd.
    - Envelope encryption with KMS.
    - External secret managers where required.

Interview phrase:

> "We treat Kubernetes Secrets as an integration point with real secret stores and ensure etcd is encrypted; Secrets themselves are not strong cryptography."

---

## 4. Per-Environment Configuration Patterns

Common pattern:

- Keep:
  - Dev/stage/prod in separate **namespaces**.
  - Different ConfigMaps/Secrets per namespace.

Example:

- `ui-config-dev`, `ui-config-staging`, `ui-config-prod`.
- Deployment in each namespace references env-specific resources.

Alternatively (GitOps):

- Parameterize values (Helm, Kustomize).
- Keep environment overlays in git.

In interviews, show that:

- You don't rebuild images per environment.
- You externalize config and secrets.

---

## 5. Frontend-Specific Considerations

For SPAs:

- Build-time vs runtime config:
  - Many frontend frameworks bake config at build time.
  - With K8s, you may want to:
    - Inject config at runtime (e.g., via environment endpoint or config JSON).
    - Or have a tiny server layer read env vars and serve an index page referencing them.

Example pattern:

- NGINX serving SPA:
  - Env vars passed to init container or entrypoint script.
  - Script writes `config.js` consumed by SPA at runtime.

Mention:

> "Instead of rebuilding the SPA for each environment, we often use a runtime config endpoint or config file generated at container start from ConfigMaps/Secrets."

---

## 6. Common Mistakes

| Mistake | Impact |
|---------|--------|
| Baking environment-specific URLs into images | Forces rebuilds for each environment; harder rollbacks. |
| Storing secrets in ConfigMaps or git | High risk of credential leakage. |
| Treating Secrets as strong encryption | Misunderstanding; base64 is encoding, not encryption. |
| Overusing environment variables for large structured config | Harder to manage; prefer mounted files for complex config. |

Call out at least one mitigation you use.

---

## 7. Interview Q&A

**Q: How do you manage configuration across environments in Kubernetes?**  
**A:**  
> "We build images once and keep configuration externalized. Non-sensitive settings go into ConfigMaps and secrets go into Kubernetes Secrets or an external secret manager. Each environment has its own namespace and its own set of ConfigMaps/Secrets, and Deployments reference them via `envFrom` or mounted config files. That way, we promote the same image through dev, staging, and prod with different configuration."

**Q: How do you handle frontend configuration in Kubernetes without rebuilding for every environment?**  
**A:**  
> "For SPAs, we often generate a small runtime config file at container startup. An entrypoint script reads environment variables from ConfigMaps/Secrets and writes a `config.js` or JSON file that the SPA reads on load. That lets us reuse the same static build across environments and still change API endpoints or feature flags via Kubernetes config."

---

## 8. Next Topic

→ **[05-storage-and-persistence.md](./05-storage-and-persistence.md)** — Persisting data with volumes, PersistentVolumes, and PersistentVolumeClaims in Kubernetes.

