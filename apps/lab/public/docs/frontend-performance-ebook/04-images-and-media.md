# Chapter 04 — Images & Media: Formats, Responsive, Priority

## TL;DR

Images are the #1 LCP killer and the largest contributor to page weight. Fix formats (WebP/AVIF), size (srcset), loading priority (preload hero, lazy-load below fold), and dimensions (prevent CLS).

> **One-liner for interviews:** "Use AVIF/WebP, serve correct sizes via srcset, preload the LCP image, lazy-load everything below the fold, and always set width+height to prevent CLS."

---

## Core Concept

Images typically account for 50–70% of a page's total byte weight. They're also the most common cause of poor LCP and a frequent source of CLS. The good news: image optimization has a higher ROI than almost any other performance technique.

---

## Deep Dive

### Modern Image Formats

| Format | Best For | Size vs JPEG | Browser Support |
|--------|---------|-------------|----------------|
| **AVIF** | Photos, complex images | ~50% smaller | Chrome, Firefox, Safari 16+ |
| **WebP** | Photos + transparency | ~25–35% smaller | All modern browsers |
| **JPEG** | Photos (legacy fallback) | Baseline | Universal |
| **PNG** | Transparency, sharp edges | Larger than WebP | Universal |
| **SVG** | Icons, logos, illustrations | Tiny for vector | Universal |
| **GIF** | Simple animation | Large | Universal — but use WebM/MP4 instead |

**The `<picture>` element for format negotiation:**

```html
<picture>
  <!-- Browser picks first format it supports -->
  <source srcset="/hero.avif" type="image/avif">
  <source srcset="/hero.webp" type="image/webp">
  <img src="/hero.jpg" alt="Hero" width="1200" height="630"
       loading="eager" fetchpriority="high">
</picture>
```

**Animated GIFs → video:**
```html
<!-- ❌ GIF: 3MB, no compression control -->
<img src="animation.gif">

<!-- ✅ Video: 300KB, hardware-decoded, same visual result -->
<video autoplay loop muted playsinline>
  <source src="animation.webm" type="video/webm">
  <source src="animation.mp4" type="video/mp4">
</video>
```

---

### Responsive Images with `srcset`

Serving a 2400px image to a 375px mobile screen wastes ~8x the bytes.

```html
<!-- srcset + sizes = browser picks the right image for device -->
<img
  srcset="
    /images/hero-400.webp  400w,
    /images/hero-800.webp  800w,
    /images/hero-1200.webp 1200w,
    /images/hero-2400.webp 2400w
  "
  sizes="
    (max-width: 600px) 100vw,
    (max-width: 1200px) 80vw,
    1200px
  "
  src="/images/hero-1200.webp"
  alt="Hero"
  width="1200"
  height="630"
>
```

**How `sizes` works:** Tells the browser how wide the image will be in CSS pixels before layout is calculated. The browser multiplies by `devicePixelRatio` to pick the right `srcset` entry.

```
iPhone 13 (375px wide, 3x DPR):
  sizes=(max-width: 600px) 100vw  → 375px CSS
  375px × 3 DPR = 1125px needed
  → picks hero-1200.webp ✅ (closest ≥ 1125)
```

---

### Loading Priority

```html
<!-- LCP image — load as early as possible -->
<img
  src="/hero.webp"
  fetchpriority="high"    <!-- ← browser priority hint -->
  loading="eager"         <!-- ← default, but explicit is clear -->
  decoding="sync"         <!-- ← decode synchronously for LCP -->
  alt="Hero"
  width="1200" height="630"
>

<!-- Above-fold secondary image — normal priority -->
<img src="/product.webp" alt="Product" width="400" height="400">

<!-- Below-fold images — lazy load -->
<img
  src="/product-2.webp"
  loading="lazy"         <!-- ← browser defers until near viewport -->
  decoding="async"       <!-- ← decode asynchronously -->
  alt="Product 2"
  width="400" height="400"
>
```

**The LCP image preload pattern (for images in CSS or JS):**

```html
<!-- In <head> — before the browser discovers the image -->
<link
  rel="preload"
  as="image"
  href="/hero.webp"
  imagesrcset="/hero-400.webp 400w, /hero-800.webp 800w, /hero-1200.webp 1200w"
  imagesizes="(max-width: 600px) 100vw, 1200px"
>
```

---

### Preventing CLS from Images

The browser doesn't know image dimensions until it downloads the image. Without dimensions, it allocates 0px height → image loads → layout shifts.

```html
<!-- ❌ No dimensions — CLS spike when image loads -->
<img src="hero.webp" alt="Hero">

<!-- ✅ Explicit dimensions — space reserved before download -->
<img src="hero.webp" alt="Hero" width="1200" height="630">
```

```css
/* CSS aspect-ratio for fluid images (maintain ratio at any width) */
img {
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;  /* Reserves proportional space */
}
```

---

### CDN Image Transforms

Modern CDNs (Cloudflare Images, Imgix, AWS CloudFront + Lambda@Edge) transform images on the fly:

```html
<!-- Cloudflare Images — resize + format + quality on the fly -->
<img src="https://imagedelivery.net/{accountId}/hero/w=800,format=auto,q=80">

<!-- Imgix — same concept -->
<img src="https://company.imgix.net/hero.jpg?w=800&auto=format,compress&q=80">
```

**format=auto** serves AVIF to AVIF-capable browsers, WebP to others, JPEG as fallback. No `<picture>` element needed.

```html
<!-- With srcset via CDN transforms — best of both worlds -->
<img
  srcset="
    https://images.example.com/hero?w=400&auto=format  400w,
    https://images.example.com/hero?w=800&auto=format  800w,
    https://images.example.com/hero?w=1200&auto=format 1200w
  "
  sizes="(max-width: 600px) 100vw, 1200px"
  src="https://images.example.com/hero?w=1200&auto=format"
  alt="Hero" width="1200" height="630"
  loading="eager" fetchpriority="high"
>
```

---

### Angular Image Directive (`NgOptimizedImage`)

Angular 15+ includes `NgOptimizedImage` which automates most of these best practices:

```typescript
// Import in component or module
import { NgOptimizedImage } from '@angular/common';

@Component({
  standalone: true,
  imports: [NgOptimizedImage],
  template: `
    <!-- ngSrc instead of src — enables all optimizations -->
    <img
      ngSrc="/hero.webp"
      width="1200"
      height="630"
      priority          <!-- marks as LCP — adds preload + fetchpriority=high -->
      alt="Hero"
    >

    <!-- Below fold — lazy loaded automatically -->
    <img
      ngSrc="/product.webp"
      width="400"
      height="400"
      alt="Product"
    >
  `
})
export class HeroComponent {}
```

`NgOptimizedImage` automatically:
- Adds `loading="lazy"` for non-priority images
- Adds `fetchpriority="high"` and `<link rel="preload">` for `priority` images
- Warns if `width`/`height` are missing
- Warns if priority image is not in the initial viewport
- Supports built-in CDN loaders (Cloudflare, Imgix, ImageKit)

```typescript
// With CDN loader
import { provideImgixLoader } from '@angular/common';

bootstrapApplication(AppComponent, {
  providers: [
    provideImgixLoader('https://mysite.imgix.net'),
  ]
});
```

---

## Best Practices

- **Always set `width` and `height`.** This is the single most impactful CLS fix for images.
- **Preload the LCP image.** If it's not in the initial HTML (it's in CSS or injected by JS), add a `<link rel="preload">` in `<head>`.
- **Never lazy-load above-the-fold images.** Use `loading="lazy"` only on images that start off-screen.
- **Use CDN image transforms.** Serving correctly-sized images from an image CDN is lower effort and higher impact than managing srcset files manually.
- **Convert GIFs to video.** Any GIF over 100KB should be replaced with a looping `<video>` — typically 80–90% smaller.
- **Audit with `<source>` type negotiation.** Let the browser choose AVIF → WebP → JPEG automatically rather than serving JPEG to all users.

---

## Interview Q&A

**Q: How do you optimize images for performance?**  
A: "Four levers: format, size, priority, and stability. Format: serve AVIF to browsers that support it, WebP as fallback, JPEG as last resort — a CDN image transform handles this automatically with `format=auto`. Size: use `srcset` and `sizes` so mobile devices download a 400px image instead of a 1200px one. Priority: `fetchpriority=high` and a `<link rel="preload">` on the LCP image, `loading=lazy` on everything below the fold. Stability: always include `width` and `height` attributes so the browser reserves space before the image loads, preventing CLS."

**Q: What's fetchpriority and when do you use it?**  
A: "A browser hint that tells the resource fetcher the relative priority of a resource. `fetchpriority=high` on the LCP image tells the browser to prioritize it over other images that might otherwise queue together. `fetchpriority=low` on below-fold images tells the browser they're not urgent. It's particularly important for hero images because browsers have started being conservative about image priority to avoid blocking other critical resources."

---

## Next Steps

- **Rendering Strategies** → [05-rendering-strategies.md](./05-rendering-strategies.md) — how SSR/SSG surface LCP images in initial HTML
- **Angular Performance** → [06-angular-performance.md](./06-angular-performance.md) — NgOptimizedImage in depth
