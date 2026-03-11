# Chapter 09 — Performance Budgets & CI Integration

## TL;DR

A performance budget is a constraint on metrics that, if violated, blocks a deploy. Budgets prevent the gradual degradation that kills performance over time — one "just 10KB" addition at a time. The best budget is one enforced automatically in CI so no one can accidentally ship a regression.

> **One-liner for interviews:** "Performance budgets are pass/fail thresholds in CI. If a PR adds 50KB to the bundle or pushes LCP past 2.5s, the build fails. Prevention in CI costs far less than remediation in production."

---

## Core Concept

### The Gradual Degradation Problem

```
Week 1:  Bundle: 180KB  LCP: 1.8s  ← 🟢 great
Week 4:  Bundle: 210KB  LCP: 2.1s  ← 🟢 still fine (each PR "just 10KB")
Week 8:  Bundle: 290KB  LCP: 2.8s  ← 🟡 degraded without anyone noticing
Week 12: Bundle: 380KB  LCP: 3.6s  ← 🔴 users notice, too expensive to fix
```

No single PR was obviously bad. But without a budget enforced in CI, nobody notices the cumulative effect until it's a major refactor.

---

## Deep Dive

### Budget Types

| Budget Type | What It Measures | Tool |
|------------|-----------------|------|
| **Bundle size** | JS/CSS bytes shipped to client | bundlesize, size-limit, webpack --json |
| **Lighthouse score** | Composite performance score | Lighthouse CI |
| **CWV thresholds** | LCP, TBT, CLS values | Lighthouse CI, Calibre |
| **Resource count** | Number of requests | WebPageTest |
| **Total page weight** | All resources combined | Lighthouse CI |

---

### 1. Bundle Size — `size-limit` (Recommended)

```bash
npm install --save-dev size-limit @size-limit/preset-app
```

```json
// package.json
{
  "size-limit": [
    {
      "name": "Main bundle (initial JS)",
      "path": "dist/main.*.js",
      "limit": "200 KB",       // gzipped
      "gzip": true
    },
    {
      "name": "Initial CSS",
      "path": "dist/*.css",
      "limit": "30 KB",
      "gzip": true
    },
    {
      "name": "Orders chunk",
      "path": "dist/orders.*.js",
      "limit": "80 KB",
      "gzip": true
    }
  ],
  "scripts": {
    "size": "size-limit",
    "size:why": "size-limit --why"   // runs webpack-bundle-analyzer after
  }
}
```

```bash
npm run size
# ✅  Main bundle (initial JS): 182.3 KB < 200 KB
# ✅  Initial CSS: 18.4 KB < 30 KB
# ❌  Orders chunk: 92.7 KB > 80 KB  EXCEEDS BUDGET by 12.7 KB
```

**In CI (GitHub Actions):**
```yaml
# .github/workflows/performance.yml
- name: Check bundle size
  run: npm run size
  # Fails build if any budget is exceeded
```

---

### 2. `bundlesize` — Alternative

```json
// package.json
{
  "bundlesize": [
    { "path": "./dist/main.*.js",    "maxSize": "200 kB" },
    { "path": "./dist/vendor.*.js",  "maxSize": "150 kB" },
    { "path": "./dist/*.css",        "maxSize": "30 kB" }
  ]
}
```

```bash
npx bundlesize
# PASS  ./dist/main.abc123.js: 182kB < 200kB gzip
# FAIL  ./dist/vendor.def456.js: 167kB > 150kB gzip
```

---

### 3. Angular Bundle Budgets (Built-In)

Angular has native bundle budgets in `angular.json`:

```json
{
  "configurations": {
    "production": {
      "budgets": [
        {
          "type": "initial",
          "maximumWarning": "500kb",    // warns at 500KB
          "maximumError": "1mb"         // fails build at 1MB
        },
        {
          "type": "anyComponentStyle",
          "maximumWarning": "4kb",
          "maximumError": "8kb"
        },
        {
          "type": "anyScript",
          "maximumWarning": "100kb",
          "maximumError": "200kb"
        }
      ]
    }
  }
}
```

```bash
ng build --configuration=production
# WARNING Budget "initial" was not met with 520.00 kB (exceeded by 20.00 kB)
# ERROR Budget "initial" was not met with 1.10 MB (exceeded by 124.00 kB)
# BUILD FAILED
```

---

### 4. Lighthouse CI — Full CWV Gate

**Install and configure:**

```bash
npm install --save-dev @lhci/cli
```

```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "startServerCommand": "npx serve dist/my-app -l 4200",
      "startServerReadyPattern": "Accepting connections",
      "url": [
        "http://localhost:4200/",
        "http://localhost:4200/orders",
        "http://localhost:4200/checkout"
      ]
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.85 }],
        "categories:accessibility": ["error", { "minScore": 1.0 }],

        "largest-contentful-paint":  ["error", { "maxNumericValue": 2500 }],
        "total-blocking-time":       ["error", { "maxNumericValue": 200 }],
        "cumulative-layout-shift":   ["error", { "maxNumericValue": 0.1 }],
        "first-contentful-paint":    ["warn",  { "maxNumericValue": 1800 }],
        "speed-index":               ["warn",  { "maxNumericValue": 3400 }],

        "uses-optimized-images":     ["warn", {}],
        "uses-webp-images":          ["warn", {}],
        "unused-javascript":         ["warn", { "maxLength": 1 }],
        "render-blocking-resources": ["warn", {}],
        "unsized-images":            ["error", {}]
      }
    },
    "upload": {
      "target": "lhci",
      "serverBaseUrl": "https://lhci.your-team.com"
    }
  }
}
```

**GitHub Actions workflow:**

```yaml
# .github/workflows/ci.yml
name: CI + Performance

on: [push, pull_request]

jobs:
  build-and-perf:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install
        run: npm ci

      - name: Build
        run: npm run build -- --configuration=production
        # Angular bundle budgets enforced here ↑

      - name: Bundle size check
        run: npm run size
        # size-limit checks ↑

      - name: Lighthouse CI
        run: npx lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
        # CWV thresholds enforced here ↑

      - name: Upload Lighthouse results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: lighthouse-reports
          path: .lighthouseci/
```

---

### 5. webpack-bundle-analyzer — Visual Debugging

When the budget fails, you need to know what's causing it:

```bash
# Angular
ng build --stats-json
npx webpack-bundle-analyzer dist/my-app/stats.json

# React (CRA)
npx source-map-explorer 'build/static/js/*.js'

# Vite
npx vite-bundle-visualizer
```

**What to look for:**
- Duplicate packages (two versions of lodash, moment)
- Unexpectedly large deps (moment.js at 65KB — replace with date-fns)
- Packages included in main bundle that should be in lazy chunks
- Test utilities (jest, @testing-library) accidentally bundled

---

### 6. PR Size Reports

Show bundle size diff on every PR, even before the budget is exceeded:

**`size-limit` GitHub Action with diff reporting:**

```yaml
- name: Get size
  uses: andresz1/size-limit-action@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    build_script: build
```

This comments on the PR:
```
Bundle Size Report
┌────────────────────┬─────────┬──────────┬──────────┐
│ File               │ Before  │ After    │ Diff     │
├────────────────────┼─────────┼──────────┼──────────┤
│ Main bundle        │ 180 KB  │ 194 KB   │ +14 KB ⚠ │
│ Orders chunk       │ 75 KB   │ 78 KB    │ +3 KB    │
│ CSS                │ 18 KB   │ 18 KB    │ 0        │
└────────────────────┴─────────┴──────────┴──────────┘
```

Teams that see the size impact on every PR make better dependency decisions.

---

### 7. Full Pipeline Architecture

```
PR opened
  │
  ├─ Build (ng build --configuration=production)
  │   └─ Angular bundle budgets: PASS/FAIL
  │
  ├─ Bundle size (size-limit or bundlesize)
  │   └─ Per-chunk budgets: PASS/FAIL + PR comment with diff
  │
  ├─ Lighthouse CI
  │   ├─ Serve built app
  │   ├─ Run 3 Lighthouse audits per URL
  │   └─ Assert CWV thresholds: PASS/FAIL
  │
  ├─ E2E with performance assertions (Playwright + web-vitals)
  │   └─ Real interaction INP checks
  │
  └─ Deploy to staging
      └─ Synthetic monitoring (WebPageTest / Calibre) on staging URL
         └─ Compare to production baseline: alert if regression
```

---

### 8. Performance Budget Policy

Beyond tooling, the team needs a policy:

```markdown
## Performance Budget Policy

### Hard limits (build fails)
- Initial JS bundle: ≤ 200KB gzipped
- LCP: ≤ 2.5s (Lighthouse CI, mobile preset)
- CLS: ≤ 0.1
- TBT: ≤ 200ms
- Images without dimensions: 0

### Soft limits (warning, requires review comment)
- Any lazy chunk: ≤ 80KB
- FCP: ≤ 1.8s
- Lighthouse performance score: ≥ 90

### Process
- Adding a dependency > 20KB requires a justification comment in the PR
- Exceeding a hard limit requires a waiver from the tech lead + a follow-up issue
- Budget review quarterly: adjust based on field data trends
```

---

## Best Practices

- **Start with bundle size budgets — they're fastest to enforce.** Lighthouse CI requires a running server; bundle size tools run on the build artifacts in seconds.
- **Set budgets based on current state minus 10%.** If your current main bundle is 220KB, set the budget at 200KB. Close enough to be meaningful, ambitious enough to encourage improvement.
- **Use `warn` before `error`.** A new rule that immediately fails builds creates friction. Introduce as `warn` for a sprint, let teams adapt, then escalate to `error`.
- **Save Lighthouse reports as CI artifacts.** The HTML report has the waterfall and specific failing audits. Archive it so you can diff reports across commits.
- **Run synthetic monitoring on production (not just CI).** Cron-based Lighthouse runs on the real production URL catch issues that passed CI but hit production (third-party scripts, CDN issues, real-world TTFB).

---

## Common Mistakes

❌ **Only gating on Lighthouse score** — The composite score is too coarse. A score of 88 vs 90 isn't meaningful. Gate on specific metric values (LCP < 2500ms, TBT < 200ms).

❌ **Not running Lighthouse in mobile mode** — Default Lighthouse is desktop. Your users are on mobile. Configure `preset: 'desktop'` explicitly if you want desktop scores, and always also run mobile.

❌ **Setting budgets then ignoring warnings** — Warnings are debts. If your team ships with 10 warnings on every PR, the warnings lose meaning. Fix them or escalate to errors.

❌ **No baseline to compare against** — Running Lighthouse CI without the LHCI server means you only know if you pass the threshold, not if you regressed. Store historical data to show trends.

❌ **Only checking the homepage** — Most performance regressions happen in feature areas, not the landing page. Add the top 3–5 URLs users actually visit to your Lighthouse CI config.

---

## Interview Q&A

**Q: What is a performance budget and why does it matter?**  
A: "A performance budget is a constraint — a hard threshold that, if exceeded, blocks a build or deployment. It might be 'main bundle < 200KB gzipped' or 'LCP < 2.5s'. Without budgets, performance degrades gradually through individually-reasonable decisions: one small dependency, one lazy chunk that got a bit bigger. Nobody's PR is obviously bad, but the cumulative effect kills performance. Budgets make the cost of each addition explicit and automatic."

**Q: How do you enforce performance budgets in CI?**  
A: "I use a layered approach. First, Angular's built-in bundle budgets in `angular.json` fail the build immediately if chunks exceed limits — zero overhead. Second, `size-limit` does per-chunk gzipped size checks and comments the diff on every PR so engineers see the size impact before merge. Third, Lighthouse CI runs after the build to check LCP, TBT, and CLS thresholds on the actual served app. The whole pipeline adds about 3–5 minutes to CI."

**Q: What tools do you use for bundle analysis?**  
A: "For investigation: `webpack-bundle-analyzer` (Angular `--stats-json` flag) for an interactive treemap of what's in each chunk. `source-map-explorer` for React CRA. For CI enforcement: `size-limit` for threshold checking with PR diff reporting. `bundlesize` as an alternative. Angular's native budget feature for initial and component style budgets. For identifying specific large dependencies before installing them: `bundlephobia.com` to check size and tree-shakability."

---

## Next Steps

- **Cheat Sheet** → [10-cheat-sheet-and-qa.md](./10-cheat-sheet-and-qa.md) — complete pipeline setup reference and tool comparison
