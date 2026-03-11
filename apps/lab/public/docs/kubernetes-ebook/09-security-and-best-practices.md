## 09 — Security & Best Practices

> **TL;DR:** Kubernetes adds a powerful abstraction layer, but it also introduces new attack surfaces. Focus on **RBAC, network policies, Pod security, image hardening, and secrets management**. In interviews, show that you understand both app-level and cluster-level security.

---

## 1. Shared Responsibility Model

Security spans:

- **Application**:
  - Code correctness.
  - Input validation.
  - AuthN/AuthZ.
- **Container**:
  - Image hardening.
  - Non-root users.
  - Minimal base images.
- **Kubernetes**:
  - RBAC.
  - Network policies.
  - Pod security policies (or replacements).
  - Secrets handling.
- **Cloud/Infra**:
  - Node OS hardening.
  - Network perimeter.
  - Storage encryption.

Interview phrase:

> "We treat Kubernetes as one layer in a defense-in-depth strategy, not a silver bullet."

---

## 2. RBAC & Least Privilege

Reinforce:

- No one runs as cluster-admin by default.
- Separate:
  - Operator roles (SRE/platform).
  - Application dev roles.
  - CI/CD service accounts.

Best practices:

- Grant:
  - Namespaced `Role` + `RoleBinding` for app teams.
  - Minimal `ClusterRole` for shared controllers and CI.
- Audit:
  - Who has which roles.
  - Access to Secrets.

---

## 3. Pod Security (Capabilities, Users, Policies)

Pod-level best practices:

- Run containers as:
  - **Non-root** user (`runAsUser`, `runAsNonRoot`).
- Drop capabilities:
  - Avoid `privileged: true`.
  - Use `capDrop` / `capAdd` sparingly.
- Filesystem:
  - Use `readOnlyRootFilesystem` where possible.

Example Pod security context (simplified):

```yaml
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
  containers:
    - name: api
      image: my-registry.com/api:1.0.0
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
```

Mention:

- Pod Security Standards / Admission controllers used to enforce baseline policies.

---

## 4. Network Policies & Isolation

Reinforce from multi-tenancy:

- Use NetworkPolicies to:
  - Restrict traffic:
    - Between namespaces.
    - Between frontends and backends.
    - To databases.

Examples:

- Only allow traffic to DB from specific API Pods.
- Deny cross-env traffic (e.g., dev → prod).

Interview angle:

> "By default, Pods in many clusters can talk to each other freely. We lock this down with network policies so only approved flows are allowed, especially around data stores and internal admin services."

---

## 5. Image & Supply Chain Security

Tie back to Docker ebook:

- Hardened images:
  - Minimal base images.
  - Multi-stage builds.
  - Non-root.
- Image scanning:
  - CVE scanning in CI/CD.
  - Policy to fail builds on high-severity issues.
- Signing:
  - Use tools like cosign/Sigstore to sign images.
  - Verify signatures at admission time.

In Kubernetes:

- Use:
  - Admission controllers / policies to:
    - Enforce image registries.
    - Enforce signing.
    - Enforce base images.

---

## 6. Secrets & Config Security

Reinforce:

- Never store secrets in ConfigMaps or git.
- Prefer:
  - External secret managers (Vault, AWS Secrets Manager, etc.).
  - Integrate with K8s via operators or CSI drivers.
- At minimum:
  - Enable:
    - etcd encryption.
    - Strict RBAC for Secrets.

Interview snippet:

> "We store secrets in an external manager and sync them into Kubernetes as Secrets using a controller. etcd is encrypted, and RBAC limits who can read Secret resources."

---

## 7. Common Mistakes

| Mistake | Impact |
|---------|--------|
| Overusing cluster-admin and broad roles | Easy privilege escalation, hard to audit. |
| Running Pods as root and using `privileged: true` | Increases blast radius of container escapes. |
| Exposing internal Services publicly | Larger attack surface and data exposure risk. |
| No network policies | Any compromised Pod can laterally move across cluster. |
| Skipping image scanning and signing | Shipping known vulnerabilities; supply chain risk. |

Call out how you’ve mitigated some of these in real or hypothetical setups.

---

## 8. Interview Q&A

**Q: How do you secure workloads running on Kubernetes?**  
**A:**  
> "We start with hardened, minimal images and run them as non-root with restricted capabilities. At the cluster level, we use RBAC and namespaces for least-privilege access, network policies to restrict traffic, and Pod security policies/standards to enforce baseline security. Secrets are managed via a secret manager and surfaced as Kubernetes Secrets with encrypted etcd, and CI scans and signs images before they are admitted to the cluster."

**Q: What are some security pitfalls you watch for in Kubernetes setups?**  
**A:**  
> "Cluster-wide admin access, Pods running as root or privileged, overly permissive network connectivity, secrets in ConfigMaps or repos, and lack of image scanning or signing. I also look for missing audit trails around who deployed what and from which image."

---

## 9. Next Topic

→ **[10-cheat-sheet-and-qa.md](./10-cheat-sheet-and-qa.md)** — Kubernetes command cheat sheet and high-value interview answer templates.

