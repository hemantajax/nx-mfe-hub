# Chapter 08 — Monitoring: RUM, Synthetic Testing & Lighthouse

## TL;DR

Two complementary types of performance data: **field data (RUM)** from real users on real devices and networks — noisy but true; **synthetic data (lab)** from controlled runs in known environments — reproducible but artificial. You need both: field data tells you what's actually happening; synthetic tells you why and lets you catch regressions before users do.

> **One-liner for interviews:** "Field data (RUM) tells you what real users experience. Synthetic/lab data (Lighthouse) tells you why and catches regressions in CI. Never optimize based on Lighthouse alone."

---

## Core Concept

### Field vs Lab Data

| | Field Data (RUM) | Lab Data (Synthetic) |
|--|-----------------|---------------------|
| **Source** | Real users, real devices | Controlled simulated runs |
| **Environment** | Variable — many devices, networks | Fixed — one config |
| **Reproducibility** | Low — varies by user, time | High — same result each run |
| **Reflects reality** | ✅ Yes | ⚠️ Approximate |
| **CI integration** | ❌ Not directly | ✅ Yes |
| **Detects regressions** | Slowly (needs traffic) | Immediately |
| **Tells you the user's experience** | ✅ | ❌ |

**The rule:** Use lab data in CI to catch regressions. Use field data to understand actual user experience and set priorities.

---

## Deep Dive

### Lighthouse — The Standard Lab Tool

Lighthouse audits a URL and reports CWV proxies (LCP, TBT as INP proxy, CLS), accessibility, best practices, and SEO.

**Running Lighthouse:**

```bash
# CLI
npm install -g lighthouse
lighthouse https://example.com \
  --output=html \
  --output-path=./lighthouse-report.html \
  --chrome-flags="--headless"

# With specific throttling (mobile simulation)
lighthouse https://example.com \
  --preset=desktop \
  --throttling-method=devtools \
  --throttling.cpuSlowdownMultiplier=4
```

**Lighthouse scores are composites — know what matters:**

| Score Category | Key Metrics | CWV Mapping |
|---------------|------------|-------------|
| Performance | LCP, TBT, CLS, Speed Index, FCP, TTI | LCP, INP (via TBT), CLS |
| Accessibility | Color contrast, ARIA, keyboard nav | — |
| Best Practices | HTTPS, no console errors, modern APIs | — |
| SEO | Meta, robots, crawlable links | — |

**Don't obsess over the composite score.** A 98 Lighthouse score with a real user LCP of 4s means your lab config doesn't match reality.

---

### Chrome DevTools Performance Panel

For diagnosing INP root causes:

```
1. Open DevTools → Performance tab
2. Click record (⏺) or use Ctrl+Shift+E
3. Perform the slow interaction
4. Stop recording
5. Look for:
   - Long tasks (red bars > 50ms)
   - Layout/reflow operations
   - Paint events
   - JS call stacks consuming most time
```

**CPU Throttle for realistic profiling:**
```
DevTools → Performance → ⚙️ (settings) → CPU throttling: 4x slowdown
```

Always profile with CPU throttling — interactions feel fast on a developer MacBook but are slow on a mid-range Android.

---

### web-vitals Library — Measuring in Your App

```typescript
// Install: npm install web-vitals
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric: Metric) {
  // Send to your analytics endpoint
  fetch('/api/vitals', {
    method: 'POST',
    body: JSON.stringify({
      name: metric.name,        // 'LCP', 'INP', 'CLS'
      value: metric.value,      // numeric value (ms for LCP/INP, score for CLS)
      rating: metric.rating,    // 'good', 'needs-improvement', 'poor'
      id: metric.id,            // unique ID for deduplication
      navigationType: metric.navigationType,  // 'navigate', 'reload', 'back-forward'
    }),
  });
}

onLCP(sendToAnalytics);
onINP(sendToAnalytics);   // reports on page unload (98th percentile of all interactions)
onCLS(sendToAnalytics);
onFCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

**Angular integration:**
```typescript
// app.config.ts — initialize vitals reporting in APP_INITIALIZER
import { APP_INITIALIZER } from '@angular/core';
import { onCLS, onINP, onLCP } from 'web-vitals';

export function initVitals() {
  return () => {
    const send = (metric: any) => {
      (window as any).gtag?.('event', metric.name, {
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        event_category: 'Web Vitals',
        event_label: metric.id,
        non_interaction: true,
      });
    };
    onCLS(send); onINP(send); onLCP(send);
  };
}

providers: [
  { provide: APP_INITIALIZER, useFactory: initVitals, multi: true }
]
```

---

### RUM Tools

**1. Google Analytics 4 (free)**
Automatically collects CWV for sites using GA4. View in Google Search Console → Core Web Vitals report. Limited drill-down capability.

**2. Chrome User Experience Report (CrUX) — free**
Google's dataset of real Chrome user performance for public URLs. Aggregated by 28-day windows, broken down by device type.

```
PageSpeed Insights → Field Data section = CrUX data for your URL
Search Console → Core Web Vitals report = CrUX for all your pages
```

**3. Sentry Performance (free tier + paid)**
```typescript
// Angular + Sentry
import * as Sentry from '@sentry/angular';

Sentry.init({
  dsn: 'https://...',
  integrations: [
    Sentry.browserTracingIntegration(),  // captures LCP, INP, CLS automatically
  ],
  tracesSampleRate: 0.1,    // 10% of sessions
  profilesSampleRate: 0.1,
});
```
Provides: transaction traces, Web Vitals per route, user session replay (for CLS investigations).

**4. Datadog RUM**
```typescript
import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
  applicationId: 'xxx',
  clientToken: 'xxx',
  site: 'datadoghq.com',
  trackInteractions: true,
  trackResources: true,
  defaultPrivacyLevel: 'mask-user-input',
});
```
Best for: teams already on Datadog. Dashboard integration with APM/logs. Correlate frontend CWV with backend TTFB.

**5. SpeedCurve / Calibre (paid)**
Dedicated performance monitoring with historical trending, competitive benchmarking, and budget alerts. Best for teams where performance is a primary product metric.

---

### Synthetic CI Tools

**1. Lighthouse CI (LHCI) — free, recommended**

```bash
npm install -g @lhci/cli
```

```yaml
# .github/workflows/lighthouse.yml
- name: Run Lighthouse CI
  run: |
    lhci autorun \
      --collect.url=http://localhost:4200 \
      --assert.preset=lighthouse:recommended \
      --assert.assertions.performance=["warn", {"minScore": 0.9}] \
      --assert.assertions.lcp=["error", {"maxNumericValue": 2500}] \
      --assert.assertions.cls=["error", {"maxNumericValue": 0.1}] \
      --upload.target=temporary-public-storage
```

```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "startServerCommand": "npx serve dist",
      "url": ["http://localhost:4200", "http://localhost:4200/orders"]
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "first-contentful-paint": ["warn", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "total-blocking-time": ["error", { "maxNumericValue": 200 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "uses-optimized-images": ["warn", {}],
        "unused-javascript": ["warn", {}]
      }
    },
    "upload": {
      "target": "lhci",
      "serverBaseUrl": "https://lhci.your-server.com"
    }
  }
}
```

**2. Playwright + Lighthouse**

```typescript
// e2e/performance.spec.ts — Lighthouse inside Playwright
import { test, expect } from '@playwright/test';
import { playAudit } from 'playwright-lighthouse';

test('Homepage performance budget', async ({ page, browser }) => {
  const { port } = (browser as any)._options;

  await page.goto('http://localhost:4200');

  const result = await playAudit({
    page,
    port,
    thresholds: {
      performance: 90,
      accessibility: 100,
      'best-practices': 90,
      seo: 90,
    },
  });

  expect(result.lhr.audits['largest-contentful-paint'].numericValue).toBeLessThan(2500);
  expect(result.lhr.audits['cumulative-layout-shift'].numericValue).toBeLessThan(0.1);
});
```

**3. WebPageTest API**

```bash
# Schedule a test via API
curl "https://www.webpagetest.org/runtest.php?url=https://example.com&k=YOUR_API_KEY&f=json&runs=3&fvonly=1&location=Dulles_MotoG4"

# Get results (poll until complete)
curl "https://www.webpagetest.org/jsonResult.php?test=TEST_ID"
```

WebPageTest strength: tests on real devices (Moto G4, iPhone), real networks (3G/4G), real locations. Closer to RUM than Lighthouse.

---

### Interpreting Reports — What to Look For

**Lighthouse report sections:**

```
Opportunities:   "Eliminate render-blocking resources" → actionable fixes with estimated savings
Diagnostics:     "Avoid enormous network payloads" → informational, not scored
Passed Audits:   Already good — skip unless verifying
```

**Key Lighthouse audits for each CWV:**

| CWV | Key Lighthouse Audits |
|-----|----------------------|
| LCP | render-blocking-resources, uses-optimized-images, uses-webp-images, preload-lcp-image, server-response-time |
| INP (via TBT) | unused-javascript, bootup-time, mainthread-work-breakdown, long-tasks |
| CLS | layout-shift-elements, unsized-images, uses-passive-event-listeners |

---

## Best Practices

- **Run Lighthouse 3 times and take the median.** Single runs have high variance. Lighthouse CI defaults to 3 runs for this reason.
- **Test on a simulated mobile device.** Desktop Lighthouse scores are irrelevant for most users. Use the mobile preset (4x CPU, Slow 4G).
- **Segment RUM data by device category.** Your p75 LCP might be 1.8s on desktop but 4.2s on mobile. Averages hide this. Always segment by `mobile` vs `desktop`.
- **Create performance dashboards with trend lines.** A single number in isolation is meaningless. Trending over a sprint or quarter shows whether you're improving.
- **Set up Slack/email alerts for CWV degradations.** Catching a regression the day it ships is far cheaper than finding it a sprint later.

---

## Common Mistakes

❌ **Only looking at Lighthouse scores, not field data** — Lighthouse tests from a data center. Your users are on mobile networks in various locations. CrUX is the ground truth.

❌ **Reporting average instead of p75** — CWV is measured at the 75th percentile. An average LCP of 1.5s can coexist with a p75 of 4s if 25% of users have very slow experiences.

❌ **Running Lighthouse with extensions enabled** — Browser extensions inject scripts and can artificially inflate TBT. Always run Lighthouse in incognito or via CLI.

❌ **Optimizing for Lighthouse audits, not metrics** — Lighthouse can give "opportunities" that don't move real-world CWV. Prioritize optimizations that move field data metrics.

---

## Interview Q&A

**Q: What's the difference between field data and lab data, and why do you need both?**  
A: "Field data comes from real users using real devices on real networks — it's collected via tools like the web-vitals library or Google Analytics and aggregated in CrUX. It tells you what users are actually experiencing. Lab data is from controlled synthetic runs — Lighthouse or WebPageTest — in a fixed environment. It's reproducible and you can run it in CI. You need both: field data tells you the truth about user experience, lab data lets you catch regressions before users encounter them and gives you diagnostic detail that RUM data can't."

**Q: How do you integrate performance testing into CI?**  
A: "Lighthouse CI is the standard tool. It runs Lighthouse against a locally-served build, asserts against thresholds for LCP, TBT, CLS, and bundle size, and fails the build if they're exceeded. I also run bundle size checks separately using tools like `bundlesize` or size-limit — these catch regressions earlier in the pipeline, before a full Lighthouse run. For more realistic synthetic testing, WebPageTest on real devices gives better signal on mobile performance."

**Q: How would you investigate a CLS complaint from users?**  
A: "First, I'd check field data — CrUX or Sentry — to confirm the CLS score is actually poor in production (p75 > 0.1). Then I'd reproduce it in Chrome DevTools with the Layout Shift Regions setting enabled — it highlights shifting elements in blue. Alternatively, the web-vitals library's CLS `entries` array includes the `sources` property which lists specific DOM elements that caused the shift. Most common causes: images without dimensions, dynamically-injected banners above the fold, or fonts causing FOUT. I'd fix the specific element identified and verify with a new Lighthouse run and field data over the following days."

---

## Next Steps

- **Performance Budgets & CI** → [09-performance-budgets-ci.md](./09-performance-budgets-ci.md) — full CI pipeline with Lighthouse CI + bundle budgets
- **Cheat Sheet** → [10-cheat-sheet-and-qa.md](./10-cheat-sheet-and-qa.md) — tools comparison and monitoring quick reference
