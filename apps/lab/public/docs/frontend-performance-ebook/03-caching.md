# Chapter 03 — Caching: Browser, CDN & Stale-While-Revalidate

## TL;DR

Caching is the highest-leverage performance tool: a cached resource costs zero network time. The strategy: immutable long-lived cache for hashed assets, short revalidation window for HTML, CDN for geographic distribution, and `stale-while-revalidate` for API freshness without latency.

> **One-liner for interviews:** "Content-hash your assets for immutable caching, keep HTML short-lived, push everything to a CDN, and use stale-while-revalidate for API data that can tolerate brief staleness."

---

## Core Concept

### The Caching Hierarchy

```
Browser Cache (fastest — 0ms)
  ↓ miss
Service Worker Cache
  ↓ miss
CDN Edge Cache (fast — ~5–20ms)
  ↓ miss
Origin Server (slowest — 50–500ms+)
```

Every cache miss travels further down the chain. The goal is to serve as many requests as possible from the browser cache or CDN edge.

---

## Deep Dive

### HTTP Cache Headers

```
Cache-Control: max-age=31536000, immutable
               └─ seconds (1 year)         └─ browser won't revalidate
```

| Header Value | Use For | Behavior |
|-------------|---------|----------|
| `max-age=31536000, immutable` | Content-hashed JS/CSS/images | Cache forever, never revalidate |
| `max-age=3600` | Versioned but not hashed assets | Cache 1hr, then revalidate |
| `no-cache` | HTML pages | Cache but revalidate on every request |
| `no-store` | Sensitive data (auth pages) | Never cache |
| `stale-while-revalidate=86400` | API responses, non-critical assets | Serve stale while refreshing in background |
| `s-maxage=3600` | CDN-specific TTL (overrides max-age for CDN) | CDN caches 1hr; browser uses max-age |

---

### Content Hashing — The Key Insight

Content hashing (fingerprinting) embeds a hash of file contents in the filename:

```
app.js             → app.a3f9b2c1.js   (hash changes when content changes)
styles.css         → styles.7d4e2a91.css
hero.webp          → hero.c8b3f1a2.webp
```

This enables the optimal caching strategy:
- **Hash in filename = cache forever** (`max-age=31536000, immutable`)
- **No hash (HTML) = always revalidate** (`no-cache`)

```html
<!-- HTML: short-lived, always revalidated -->
<link rel="stylesheet" href="/styles.7d4e2a91.css">  <!-- immutable -->
<script defer src="/app.a3f9b2c1.js"></script>       <!-- immutable -->
```

When you deploy new code, the HTML updates to reference new hashes. The browser fetches the new hashed files. Old versions remain cached (for users mid-session) without conflicts.

**Angular and React build tools (Webpack, Vite, esbuild) do this automatically.**

```
// Angular build output
dist/
  main.a3f9b2c1.js       ← immutable
  polyfills.7d4e2a91.js  ← immutable
  styles.c8b3f1a2.css    ← immutable
  index.html             ← no-cache (references all the above)
```

---

### CDN Strategy

A CDN caches your assets at edge nodes worldwide. A user in Mumbai gets assets from a Mumbai edge, not a US-East origin server.

**Cache-Control for CDN:**
```
Cache-Control: public, max-age=31536000, immutable
               └─ CDN can cache    └─ browser too
```

vs:
```
Cache-Control: private, max-age=3600
               └─ browser only — CDN must NOT cache (for user-specific content)
```

**CDN cache invalidation:**
- Content-hashed files don't need invalidation — new content = new URL = new cache entry
- For non-hashed files (like `remoteEntry.js` in MFE): use CDN invalidation APIs (`aws cloudfront create-invalidation`)

```bash
# Invalidate specific paths on CloudFront after deploy
aws cloudfront create-invalidation \
  --distribution-id $CF_DISTRIBUTION_ID \
  --paths "/index.html" "/remoteEntry.js" "/manifest.json"
```

---

### stale-while-revalidate (SWR)

`stale-while-revalidate` serves a cached (possibly stale) response immediately, then revalidates in the background. The user gets instant response; the cache stays fresh.

```
Cache-Control: max-age=60, stale-while-revalidate=600
               └─ fresh for 60s  └─ if stale by up to 600s, serve stale + revalidate
```

Timeline:
```
0s:   User requests /api/products → cache miss → origin → cache set
30s:  User requests /api/products → cache hit (max-age=60, still fresh)
90s:  User requests /api/products → stale (60s expired) but within SWR window (600s)
       → Serve stale immediately (fast!)
       → Revalidate in background
       → Next request gets fresh data
700s: SWR window expired → must revalidate before serving
```

**Use SWR for:** Product listings, navigation menus, user preferences, non-financial data where 1–10 minute staleness is acceptable.

**Don't use SWR for:** Shopping cart, inventory/stock levels, financial data, auth state.

---

### Service Worker Caching

Service workers intercept network requests and can serve from their own cache — enabling offline support and aggressive caching strategies.

**Workbox (Angular + React) — the standard approach:**

```typescript
// Angular — ngsw-config.json (Angular Service Worker)
{
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app-shell",
      "installMode": "prefetch",        // Cache on install
      "resources": {
        "files": ["/favicon.ico", "/index.html", "/*.css", "/*.js"]
      }
    },
    {
      "name": "assets",
      "installMode": "lazy",            // Cache on first use
      "updateMode": "prefetch",
      "resources": {
        "files": ["/assets/**", "/*.(svg|cur|jpg|webp|png|gif|ico|ttf|woff|woff2)"]
      }
    }
  ],
  "dataGroups": [
    {
      "name": "api-freshness",
      "urls": ["/api/products/**"],
      "cacheConfig": {
        "strategy": "freshness",        // Network first, cache fallback
        "maxSize": 100,
        "maxAge": "1h",
        "timeout": "3s"                 // Fall back to cache after 3s
      }
    },
    {
      "name": "api-performance",
      "urls": ["/api/navigation/**"],
      "cacheConfig": {
        "strategy": "performance",      // Cache first (SWR-like)
        "maxSize": 10,
        "maxAge": "10m"
      }
    }
  ]
}
```

**Workbox strategies:**
- `CacheFirst` — serve cache, update in background (SWR for assets)
- `NetworkFirst` — try network, fall back to cache (for dynamic data)
- `StaleWhileRevalidate` — serve cache immediately, update in background
- `NetworkOnly` — never cache (auth, payments)
- `CacheOnly` — always from cache (pre-cached app shell)

---

### Cache Busting Patterns

```html
<!-- ❌ Query string cache busting — CDNs often ignore query strings -->
<script src="/app.js?v=2.4.1"></script>

<!-- ✅ Filename hashing — CDN treats as a new resource -->
<script src="/app.a3f9b2c1.js"></script>

<!-- ✅ Path versioning — explicit version in path -->
<script src="/v2/app.js"></script>
```

---

## Best Practices

- **Hash everything except HTML.** HTML is the version pointer. Assets are immutable. This is the single most impactful caching decision.
- **Set `immutable` on hashed assets.** Prevents the browser from revalidating even when the user hard-refreshes (in supported browsers).
- **Use `s-maxage` to control CDN TTL separately.** Let the CDN cache HTML for 5 minutes while the browser uses `no-cache`. Reduces origin load without sacrificing freshness.
- **Don't service-worker-cache authenticated content.** Service workers run across tabs and sessions. Cached auth responses can leak between users on shared devices.
- **Monitor cache hit rates.** A CDN with a low cache hit ratio suggests too many unique URLs, missing `Cache-Control` headers, or too-short TTLs. Target > 90% cache hit.

---

## Common Mistakes

❌ **Not setting Cache-Control headers at all** — Browsers then make up their own heuristic TTL (often ~10% of Last-Modified age). You have no control. Always set explicit headers.

❌ **Setting long max-age on non-hashed files** — If `app.js` (no hash) has `max-age=1year`, users get stale JS until their cache expires or they hard-refresh. Only do this for content-hashed files.

❌ **Invalidating CDN on every deploy** — If you're cache-busting via CDN invalidation for every file on every deploy, you've negated the CDN benefit during the invalidation window. Use content hashing instead.

❌ **Applying SWR to financial or inventory data** — A product showing "In Stock" from a 5-minute-old cached response when it's actually out of stock creates a bad checkout experience.

---

## Interview Q&A

**Q: What's your caching strategy for a frontend deployment?**  
A: "Two-tier approach. Static assets — JS, CSS, images — are content-hashed at build time, so the filename changes whenever the content changes. Those get `Cache-Control: max-age=31536000, immutable` — cache forever, no revalidation needed. The HTML file references those hashed filenames, so it gets `no-cache` — always revalidated, but it's tiny so that's fine. Everything static goes through a CDN. For API responses, I use `stale-while-revalidate` for data that can tolerate short staleness, and `no-cache` or `no-store` for anything sensitive."

**Q: How does stale-while-revalidate work?**  
A: "It splits the caching concern: serve the user something immediately (even if slightly stale), and revalidate in the background. The browser serves the cached version right away — zero latency — then fires a background request to update the cache. The next visitor gets the freshened version. The `max-age` controls how long the response is considered fully fresh; `stale-while-revalidate` controls how long beyond that the browser will still serve stale while refreshing. It's the best of both worlds for content that updates frequently but doesn't need to be perfectly real-time."

**Q: Why does content hashing matter for CDN caching?**  
A: "Without content hashing, you're stuck choosing between a short TTL (frequent revalidation, defeats the CDN) or a long TTL (users get stale files after deploy). Content hashing sidesteps the problem entirely: the filename changes when the file changes, so old URLs are still valid for mid-session users, new URLs are immediately cached by the CDN as distinct resources, and you never need CDN invalidation for regular deploys."

---

## Next Steps

- **Images & Media** → [04-images-and-media.md](./04-images-and-media.md) — caching images correctly alongside format optimization
- **Performance Budgets** → [09-performance-budgets-ci.md](./09-performance-budgets-ci.md) — enforcing cache header correctness in CI
