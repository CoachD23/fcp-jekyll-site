# Mobile Responsiveness Overhaul — Changes Summary

**Date:** 2026-03-07
**Branch:** claude/mystifying-chaum

---

## Phase 1: Audit (Research Only)

Mapped all responsiveness issues across the site:
- 62 `@media` queries using 8 different breakpoint values (all desktop-first `max-width`)
- 101 `:hover` declarations with 0 `:active` and 0 `:focus-visible` states
- Several hero images over 3MB served at full resolution on mobile
- Only 4 responsive image variants existed (all 640w JPG)
- Fluid typography already in place for headings (`clamp()`)
- Global `img { max-width: 100% }` already set
- Mobile nav hamburger already implemented

---

## Phase 2: Implementation

### 1. Touch & Keyboard Accessibility (`ce53b0a`)
**File:** `assets/css/main.css` (+630 lines)

- Added 95 `:active` states for touch device feedback on all interactive `:hover` elements
- Added 95 `:focus-visible` states for keyboard navigation accessibility
- Added global focus ring: `2px solid #c41e3a` with `outline-offset: 2px`
- Added `:focus:not(:focus-visible)` suppression to hide focus ring for mouse/touch users
- Skipped non-interactive hovers (table row highlights, dropdown structural rules, ticker animation)
- All states use existing brand colors — no new colors introduced

### 2. Netlify Build Processing (`ca74de3`)
**File:** `netlify.toml` (+15 lines)

Added `[build.processing]` section:
- CSS: bundle + minify (reduces HTTP requests and file size)
- JS: minify only (no bundle to avoid breaking separate scripts)
- Images: compress (Netlify-level optimization on all images)
- HTML: pretty_urls (clean URL paths)

### 3. Fluid Typography
**Status:** Already complete — no changes needed.

All headings (h1-h3) and major text elements already use `clamp()` for fluid scaling. The only remaining px font-sizes are the root `html` (17px, must stay as rem base) and tiny toast UI elements.

### 4. Responsive Images (`371946d`)
**Files:** `_layouts/page.html`, `_includes/hero-video.html`, `index.html`, + 52 new WebP files

- Generated 52 WebP variants at 480w, 768w, and 1200w for 18 hero images
- Updated `page.html` layout to use `<picture>` with WebP `srcset` for all hero images
- Updated `hero-video.html` fallback image with WebP `srcset`
- Updated 3 homepage images (`index.html`) with `<picture>` WebP sources
- **Size savings example:** `paul-biancardi.jpg` 6.9MB → 480w WebP 22KB (99.7% reduction)
- **Average mobile hero:** Now serves 20-90KB instead of 1-6MB

### 5. Breakpoint Consolidation (`573491e`)
**File:** `assets/css/main.css` (13 lines changed)

Consolidated 8 breakpoint values down to 3 standard values:

| Old Value | Queries | New Value |
|-----------|---------|-----------|
| 375px     | 1       | 480px     |
| 420px     | 1       | 480px     |
| 480px     | 19      | 480px     |
| 600px     | 8       | 768px     |
| 640px     | 1       | 768px     |
| 768px     | 18      | 768px     |
| 900px     | 2       | 1024px    |
| 1024px    | 6       | 1024px    |

**Final distribution:** 480px (21), 768px (27), 1024px (8) = 56 total queries across 3 breakpoints.

---

## What Was NOT Changed
- GHL iframe forms (externally controlled)
- Root `html` font-size (17px — serves as rem base)
- Existing `max-width` content constraints (only `@media` queries were consolidated)
- Mobile nav implementation (already working)
- Critical CSS in `<head>` (already optimized)
- Font preloading (already implemented)

---

## Commits (in order)
1. `ce53b0a` — fix: add :active and :focus-visible states to all interactive hover elements
2. `ca74de3` — feat: add Netlify build.processing for CSS/JS/image optimization
3. `371946d` — feat: add WebP responsive images for all hero images
4. `573491e` — style: consolidate CSS breakpoints to 480/768/1024px only
