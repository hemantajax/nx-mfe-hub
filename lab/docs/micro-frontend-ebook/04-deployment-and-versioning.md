# Chapter 04 — Deployment & Versioning (Independent Deployability)

## TL;DR

Independent deployability is the **core value proposition** of micro-frontends. Each remote has its own CI/CD pipeline, deploys to its own CDN path, and can be rolled back without touching other remotes. The shell loads remotes by URL — changing that URL is a deployment.

> **One-liner for interviews:** "Each remote deploys to its own CDN path. The shell references remotes by URL. Changing a remote's `remoteEntry.js` IS the deployment — the shell picks it up on next page load."

---

## Core Concept

### What "Independent Deployability" Actually Means

```
Monday — Checkout team fixes a payment bug
  └─ checkout CI runs
  └─ New checkout/remoteEntry.js uploaded to CDN
  └─ Shell is NOT redeployed
  └─ Next user loading /checkout gets the new code
  └─ Profile, Dashboard, Shell are unaffected

Tuesday — Profile team ships a new settings page
  └─ profile CI runs  
  └─ New profile/remoteEntry.js uploaded to CDN
  └─ No coordination with checkout team needed
```

This is the fundamental difference from a monolith deploy. Teams ship on their own schedule.

---

## Deep Dive

### CDN Structure

Each remote gets its own versioned CDN path:

```
cdn.example.com/
  shell/
    v1.4.2/
      index.html
      main.js
      remoteEntry.js   ← Shell's own module federation entry
  checkout/
    latest/
      remoteEntry.js   ← Always points to latest
    v2.1.0/
      remoteEntry.js   ← Pinned version (for rollback)
  profile/
    latest/
      remoteEntry.js
    v1.8.3/
      remoteEntry.js
```

The shell references `checkout@https://cdn.example.com/checkout/latest/remoteEntry.js`. When checkout deploys, it overwrites `latest/`. The next shell page load fetches the new code.

### Remote URL Strategies

#### Strategy 1: Always-Latest (Mutable URL)

```javascript
// shell/webpack.config.js
remotes: {
  checkout: 'checkout@https://cdn.example.com/checkout/latest/remoteEntry.js',
}
```

- **Pro:** Remotes are always current — no shell redeploy needed for remote updates
- **Con:** Shell can't pin to a known-good version of a remote
- **Best for:** Fast-moving product teams, feature iteration

#### Strategy 2: Pinned Versions (Immutable URL)

```javascript
// shell/webpack.config.js — shell must be redeployed to bump remote versions
remotes: {
  checkout: 'checkout@https://cdn.example.com/checkout/v2.1.0/remoteEntry.js',
}
```

- **Pro:** Shell controls exactly which version of each remote runs — predictable
- **Con:** Every remote update requires a shell deploy (re-couples deployment)
- **Best for:** Regulated environments, large enterprises, when stability > speed

#### Strategy 3: Dynamic Remote URLs (Best of Both)

Shell loads remote URLs from a config API at runtime:

```typescript
// shell/src/bootstrap.ts
async function initRemotes() {
  // Fetched from a deployment registry
  const config = await fetch('https://config.example.com/remote-urls').then(r => r.json());
  // { checkout: 'https://cdn/.../v2.1.3/remoteEntry.js', profile: '...' }

  window.__remoteURLs__ = config;
}

// shell/webpack.config.js
new ModuleFederationPlugin({
  remotes: {
    // Placeholder — actual URL resolved at runtime
    checkout: `promise new Promise(resolve => {
      const url = window.__remoteURLs__.checkout;
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => {
        const proxy = { get: (req) => window.checkout.get(req), init: (arg) => window.checkout.init(arg) };
        resolve(proxy);
      };
      document.head.appendChild(script);
    })`,
  }
})
```

- **Pro:** Remote URLs updated without redeploying the shell. Instant rollback by updating the config API response.
- **Con:** Adds an extra network request at boot; config API is now a critical path dependency.
- **Best for:** Large platforms where the shell deploys infrequently.

---

### CI/CD Pipeline per Remote

Each team owns their own pipeline. A minimal GitHub Actions pipeline for a remote:

```yaml
# .github/workflows/deploy-checkout.yml
name: Deploy Checkout Remote

on:
  push:
    branches: [main]
    paths: ['apps/checkout/**', 'libs/checkout-*/**']

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install deps
        run: npm ci

      - name: Build checkout remote
        run: npx nx build checkout --configuration=production

      - name: Upload to CDN (versioned)
        run: |
          VERSION=$(node -p "require('./apps/checkout/package.json').version")
          aws s3 sync dist/apps/checkout/ \
            s3://cdn-bucket/checkout/v${VERSION}/ \
            --cache-control "max-age=31536000,immutable"

      - name: Update latest pointer
        run: |
          aws s3 sync dist/apps/checkout/ \
            s3://cdn-bucket/checkout/latest/ \
            --cache-control "max-age=60"   # Short TTL for latest

      - name: Notify deployment registry
        run: |
          curl -X POST https://config.example.com/deployments \
            -d '{"remote":"checkout","version":"'"$VERSION"'","url":"https://cdn.example.com/checkout/latest/remoteEntry.js"}'
```

Key cache strategy:
- **Versioned paths** (`v2.1.0/`) → immutable, `max-age=31536000` (one year)
- **Latest path** → short TTL, `max-age=60` (one minute), so new deploys propagate quickly

---

### Versioning Strategy

#### Semantic Versioning for Remotes

Each remote maintains its own `package.json` version. Version bumps signal the type of change:

| Change | Version Bump | Shell Impact |
|--------|-------------|-------------|
| Bug fix, styling | Patch (2.1.1 → 2.1.2) | None — shell gets it automatically via `latest` |
| New feature, new route | Minor (2.1.0 → 2.2.0) | None if backwards-compatible |
| Breaking contract change | Major (2.0.0 → 3.0.0) | Shell must update + redeploy |

#### What Counts as a Breaking Change for a Remote?

- Removing or renaming an exposed module (`./App` → `./CheckoutApp`)
- Changing the props interface of an exposed component
- Removing a shared event type from the event bus
- Bumping a singleton dependency (React 18 → 19) before the shell is ready

Before a major version: coordinate with the shell team, run both versions in parallel during migration.

---

### Rollback

Because each version has an immutable CDN URL, rollback is instant:

**Option 1 — Update the config API:**
```bash
# Rollback checkout to previous version
curl -X PATCH https://config.example.com/remote-urls \
  -d '{"checkout": "https://cdn.example.com/checkout/v2.0.9/remoteEntry.js"}'
```
Propagates in seconds — no rebuild, no redeploy.

**Option 2 — Restore the `latest` S3 path:**
```bash
# Overwrite latest with a previous version's files
aws s3 sync s3://cdn-bucket/checkout/v2.0.9/ \
            s3://cdn-bucket/checkout/latest/ \
  --cache-control "max-age=60"
```

**Option 3 — Git revert + redeploy:**
Slowest but simplest — revert the commit, re-run CI. Good if the config API approach isn't set up.

---

### Environment Management

Remotes need different URLs per environment:

```typescript
// libs/shared/config/src/remote-urls.ts
const remoteUrls = {
  development: {
    checkout: 'http://localhost:4201/remoteEntry.js',  // Local dev server
    profile:  'http://localhost:4202/remoteEntry.js',
  },
  staging: {
    checkout: 'https://staging-cdn.example.com/checkout/latest/remoteEntry.js',
    profile:  'https://staging-cdn.example.com/profile/latest/remoteEntry.js',
  },
  production: {
    checkout: 'https://cdn.example.com/checkout/latest/remoteEntry.js',
    profile:  'https://cdn.example.com/profile/latest/remoteEntry.js',
  },
};

export const getRemoteUrl = (remote: keyof typeof remoteUrls.production) =>
  remoteUrls[process.env.NODE_ENV as keyof typeof remoteUrls][remote];
```

---

## Best Practices

- **Immutable versioned paths + mutable `latest`.** Never overwrite a versioned path. Overwrite `latest` for live updates. This gives you instant rollback to any historical version.
- **Short TTL on `latest`.** 60 seconds is a reasonable balance — new deploys propagate in under a minute, but CDN pressure is low.
- **Local dev points to localhost.** Each developer can run only the remotes they're working on; the rest load from staging CDN. Massively reduces local setup friction.
- **Run remotes in isolation.** Each remote should be runnable standalone (with mock auth) for development and testing. Don't force teams to run the entire platform locally.
- **Contract tests before deploy.** Before a remote deploys, run a contract test verifying its exposed modules still match the interface the shell expects.

---

## Common Mistakes

❌ **Overwriting versioned CDN paths** — Version `v2.1.0` should be immutable. Overwriting it breaks users who cached that URL and breaks rollback.

❌ **No CDN cache invalidation strategy** — If `latest` has a long TTL (hours), a bad deploy lingers for all cached users. Short TTL or explicit cache invalidation on deploy.

❌ **Coupling remote deploys to the shell pipeline** — If remotes must deploy together with the shell, you've lost independent deployability. Each remote gets its own pipeline.

❌ **Breaking the exposed module interface without coordination** — Renaming `./App` to `./CheckoutApp` in the remote webpack config breaks the shell immediately on next load. Coordinate or version-gate.

❌ **No local fallback** — If a remote CDN URL is unreachable in local dev, the shell crashes. Configure fallback URLs or provide clear error messages.

---

## Interview Q&A

**Q: How do micro-frontends deploy independently?**  
A: "Each remote has its own CI/CD pipeline triggered by changes to its directory. When it builds, it uploads to a versioned CDN path and also updates a `latest` path with a short TTL. The shell references the `latest` URL, so the next page load after a deploy picks up the new code automatically — the shell never needs to redeploy. For the dynamic URL pattern, a config API serves the remote URLs, and rollback is as simple as updating that API to point to a previous version."

**Q: How do you roll back a micro-frontend?**  
A: "Because each version is uploaded to an immutable CDN path, rollback is instant — no rebuild needed. If using dynamic remote URLs from a config API, I update the API to return the previous version's URL. It propagates within seconds. If using a mutable `latest` path, I overwrite it with the previous version's files. If neither is set up, I revert the commit and re-run CI, which is slower but reliable."

**Q: What's a breaking change when deploying a remote?**  
A: "Removing or renaming an exposed module in the webpack config, changing the props contract of an exposed component, or bumping a shared singleton like React to a version the shell doesn't support. Any of these require coordination with the shell team — usually a parallel deployment window where both versions coexist until the shell migrates. Bug fixes and new features that don't change the exported interface are non-breaking and can deploy freely."

---

## Next Steps

- **When Not to Use MFEs** → [05-when-not-to-use-mfe.md](./05-when-not-to-use-mfe.md) — all this complexity is only worth it when the org is right
- **Nx Setup** → [06-nx-mfe-angular-react.md](./06-nx-mfe-angular-react.md) — CI/CD pipelines with Nx affected commands
- **Cheat Sheet** → [07-cheat-sheet-and-qa.md](./07-cheat-sheet-and-qa.md) — deployment checklist
