# Chapter 06 — Deployment & Independent Versioning

## TL;DR

Independent deployment is the core value proposition of MFE. Each remote deploys on its own cadence to a versioned CDN path. The shell discovers remotes at runtime via a manifest. Rollback means pointing the manifest at a previous version URL.

> **One-liner for interviews:** "Each MFE deploys independently to a versioned CDN path. The shell reads a manifest at runtime to know which version to load. Rollback = update the manifest pointer."

---

## Core Concept

### The Independent Deploy Model

```
Traditional (coupled):
Team A finishes → Team B finishes → Team C finishes → everyone deploys together

MFE (independent):
Team A ships when ready → /orders/2.4.1/remoteEntry.js
Team B ships hotfix    → /checkout/1.9.1/remoteEntry.js
Team C ships feature   → /profile/3.2.0/remoteEntry.js

Shell reads manifest → mounts whatever is current for each remote
```

No deploy coordination. No "everyone must be ready before we ship."

---

## Deep Dive

### CDN Versioning Strategy

Each remote publishes to an immutable, versioned CDN path:

```
https://cdn.example.com/
  orders/
    2.4.0/
      remoteEntry.js        ← Module Federation manifest
      main.chunk.abc123.js  ← hashed chunks (immutable)
      vendor.chunk.def456.js
    2.4.1/                  ← new version
      remoteEntry.js
      main.chunk.xyz789.js
  checkout/
    1.9.0/
      remoteEntry.js
    1.9.1/
      remoteEntry.js
```

**Immutable, content-hashed chunks** — set `Cache-Control: max-age=31536000, immutable` on chunk files. `remoteEntry.js` should have a short TTL (60s) since it's the version pointer.

```nginx
# nginx config for MFE CDN
location ~* \.(js|css)$ {
  # Content-hashed chunks — immutable forever
  add_header Cache-Control "max-age=31536000, immutable";
}

location = /remoteEntry.js {
  # Entry manifest — short TTL
  add_header Cache-Control "max-age=60, must-revalidate";
}
```

---

### The MFE Manifest

The shell discovers remote versions through a manifest API, not hardcoded URLs:

```json
// GET /api/mfe-manifest  (short TTL — 60s)
{
  "version": "2024-03-11T10:30:00Z",
  "remotes": {
    "orders":   { "url": "https://cdn.example.com/orders/2.4.1/remoteEntry.js",   "version": "2.4.1" },
    "checkout": { "url": "https://cdn.example.com/checkout/1.9.1/remoteEntry.js", "version": "1.9.1" },
    "profile":  { "url": "https://cdn.example.com/profile/3.2.0/remoteEntry.js",  "version": "3.2.0" }
  }
}
```

**Manifest service responsibilities:**
- Store the current active version for each remote
- Support promotion (update a remote's active version)
- Support rollback (revert to a previous version)
- Support per-environment configs (dev/staging/prod)

---

### CI/CD Pipeline Per Remote

Each remote has its own independent pipeline:

```yaml
# .github/workflows/orders-mfe.yml
name: Deploy Orders MFE

on:
  push:
    branches: [main]
    paths: ['apps/orders-mfe/**']  # Only triggers when orders-mfe changes

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install & Build
        run: |
          cd apps/orders-mfe
          npm ci
          npm run build
          # Output: dist/ with remoteEntry.js + hashed chunks

      - name: Upload to CDN
        run: |
          VERSION=$(node -p "require('./package.json').version")
          aws s3 sync dist/ s3://mfe-cdn/orders/$VERSION/ \
            --cache-control "max-age=31536000,immutable" \
            --exclude "remoteEntry.js"
          
          # remoteEntry.js gets shorter cache
          aws s3 cp dist/remoteEntry.js s3://mfe-cdn/orders/$VERSION/remoteEntry.js \
            --cache-control "max-age=60,must-revalidate"

      - name: Promote to manifest
        run: |
          VERSION=$(node -p "require('./package.json').version")
          curl -X PATCH https://api.example.com/mfe-manifest \
            -H "Authorization: Bearer ${{ secrets.MANIFEST_TOKEN }}" \
            -d '{ "remote": "orders", "version": "'$VERSION'" }'

      - name: Notify
        run: echo "orders-mfe $VERSION deployed and promoted"
```

---

### Rollback

Rollback is instant — it's just a manifest update:

```bash
# Rollback orders-mfe to version 2.4.0
curl -X PATCH https://api.example.com/mfe-manifest \
  -d '{ "remote": "orders", "version": "2.4.0" }'

# The CDN path for 2.4.0 still exists (immutable deployment)
# Next shell page load will load orders 2.4.0
```

Because CDN paths are immutable and versioned, rollback is always available as long as the old version exists. Old versions are typically retained for 30–90 days.

---

### Feature Flags for Progressive Rollout

Instead of deploying to all users at once, gate new remote versions behind feature flags:

```json
// Manifest with feature flag support
{
  "remotes": {
    "orders": {
      "default": "https://cdn.com/orders/2.4.0/remoteEntry.js",
      "canary":  "https://cdn.com/orders/2.5.0-beta/remoteEntry.js",
      "canaryPercentage": 10
    }
  }
}
```

```typescript
// Shell resolves which version to load per user
async function resolveRemoteUrl(remoteName: string): Promise<string> {
  const manifest = await getManifest();
  const remote = manifest.remotes[remoteName];

  if (remote.canary && isInCanaryGroup(currentUser, remote.canaryPercentage)) {
    return remote.canary;
  }
  return remote.default;
}
```

---

### Compatibility Contract

Independent deployment creates a compatibility challenge: the shell might be on version N while a remote is on version N+1 of the shell context API.

Define a compatibility contract:

```typescript
// @company/shell-context package
// Version 3.x is compatible with shell 2.x and 3.x
// Breaking changes bump the major version

export const SHELL_CONTEXT_VERSION = '3.0.0';

// In shell, validate on remote mount:
if (!isCompatible(remote.requiredContextVersion, SHELL_CONTEXT_VERSION)) {
  console.warn(`Remote requires shell-context ${remote.requiredContextVersion}, shell provides ${SHELL_CONTEXT_VERSION}`);
}
```

**Practical rule:** The shell context package uses semver. Remotes declare which range they're compatible with. The shell checks compatibility on mount and degrades gracefully.

---

### Environment Management

```
dev     → manifest at api.dev.example.com     → CDN dev.cdn.example.com
staging → manifest at api.staging.example.com → CDN staging.cdn.example.com
prod    → manifest at api.example.com          → CDN cdn.example.com
```

Each environment has its own manifest and CDN namespace. A remote can be at different versions in different environments simultaneously.

---

## Best Practices

- **Immutable CDN deployments.** Never overwrite an existing version path. New version = new path.
- **Short TTL on `remoteEntry.js`, long TTL on chunks.** The manifest file needs to be fresh; content-hashed chunks are eternal.
- **Retain old versions for at least 30 days.** Users mid-session may have cached references to old chunk URLs.
- **Automate manifest promotion in CI.** Never manually edit the manifest. PRs to main auto-promote on successful build.
- **Canary deploy before full rollout.** 10% canary for 1 hour before full promotion to catch issues with real traffic.
- **Semantic versioning with Conventional Commits.** Automate version bumps from commit messages. `fix:` = patch, `feat:` = minor, `feat!:` = major.

---

## Common Mistakes

❌ **Shell with hardcoded remote URLs** — If the URL is in the shell's webpack config, deploying a new remote version requires rebuilding and redeploying the shell. This kills independent deployment.

❌ **Mutable CDN paths** — Deploying new code to `orders/latest/` means cached shells might load half-old, half-new code during CDN propagation. Always use versioned paths.

❌ **No rollback path** — If you overwrote the previous version's CDN files, you can't roll back without a redeploy. Immutable deployments make rollback trivial.

❌ **All remotes on the same deploy pipeline** — A monorepo with one CI workflow that deploys everything together is a monolith with MFE overhead. Each remote needs its own trigger and pipeline.

---

## Interview Q&A

**Q: How do micro-frontends deploy independently?**  
A: "Each remote has its own CI pipeline triggered by changes to its code. When it builds, it uploads to a versioned, immutable CDN path — for example `cdn.com/orders/2.4.1/`. After upload, the pipeline updates a central manifest service that maps each remote name to its current active URL. The shell fetches this manifest at runtime and loads the current version of each remote. Deployment of one remote doesn't touch the others."

**Q: How does rollback work in an MFE system?**  
A: "Because each remote version is deployed to an immutable CDN path that's never deleted, rollback is just a manifest update — point the manifest's orders entry back to the previous version URL. The CDN files for that version are still there. The next shell page load picks up the rollback. No redeploy needed, no CDN invalidation. This is why immutable, versioned deployment paths are critical."

**Q: How do you prevent a new remote version from breaking the shell?**  
A: "Two mechanisms. First, canary deployment — release to 10% of users first, monitor error rates, then promote to 100%. Second, compatibility contracts — the shell-context shared package is versioned, and remotes declare which version range they're compatible with. The shell checks compatibility on remote mount and can degrade gracefully or block the remote from loading if there's a version mismatch."

---

## Next Steps

- **When Not to Use MFE** → [07-when-not-to-use-mfe.md](./07-when-not-to-use-mfe.md) — now that you know the full complexity
- **Nx Setup** → [08-nx-mfe-angular-react.md](./08-nx-mfe-angular-react.md) — implementing this pipeline with Nx
