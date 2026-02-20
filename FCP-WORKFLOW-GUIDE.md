# FCP Website Build — Workflow Guide for Claude Sessions

**Last updated: February 2026**
Drop this file into any new Claude Cowork session to get it up to speed on the Florida Coastal Prep website project.

---

## The Setup: What We're Working With

Florida Coastal Prep Sports Academy runs a Jekyll static site hosted on Netlify. The source code lives in a GitHub repo. Netlify auto-deploys every time you push to the `master` branch — no build commands to run, no servers to manage. Push and it's live in about 30 seconds.

**The key links:**

- **Live site:** https://floridacoastalprep.com
- **Netlify preview:** https://candid-starburst-baa4f7.netlify.app
- **GitHub repo:** https://github.com/CoachD23/fcp-jekyll-site.git
- **Branch:** `master` (only branch, auto-deploys on push)

**Tech stack:** Jekyll 4.3, vanilla CSS (no framework), vanilla JS, Inter font via Google Fonts. No React, no Tailwind, no build tools beyond Jekyll itself. GoHighLevel handles forms and CRM. Google Analytics GA4 for tracking.

---

## How to Work on the Site in Cowork Mode

### Step 1: Mount the folder

The user (Lee) has the repo cloned to a folder on his desktop. In Cowork, he selects that folder so it mounts at `/sessions/[session-name]/mnt/fcp-jekyll-site/`.

You can read and edit files directly in this mounted folder. That's where all the site source files live.

### Step 2: Edit files normally

Use the `Read` and `Edit` tools to modify any file in the mounted folder. The main files you'll touch:

| File | What it is |
|------|------------|
| `index.html` | Homepage — hero, programs, stats, videos, testimonials |
| `about.md` | About page |
| `coaches.md` | Coaching staff bios |
| `post-grad.md` | Post-Graduate program page |
| `high-school.md` | High School program page |
| `training.md` | Spartan Training Center page |
| `housing.md` | Athlete housing |
| `academics.md` | Academics page |
| `tuition.md` | Tuition & fees |
| `testimonials.md` | Parent/coach testimonials |
| `contact.html` | Contact form (GHL iframe) |
| `apply.html` | Application form (GHL iframe) |
| `faq.html` | FAQ page |
| `_layouts/default.html` | Main layout (nav, footer, analytics, animations) |
| `_layouts/post.html` | Blog post layout |
| `_includes/nav.html` | Navigation bar |
| `_includes/footer.html` | Footer |
| `_includes/hero-video.html` | Homepage hero section |
| `assets/css/main.css` | Global CSS (some pages also have inline `<style>` blocks) |
| `_config.yml` | Jekyll configuration |
| `fcp-facts.md` | Source-of-truth for all FCP facts — READ BEFORE WRITING CONTENT |
| `blog-queue.md` | Editorial calendar for blog posts |
| `CLAUDE_SESSION_BRIEF.md` | Detailed project brief with everything |

### Step 3: Deploy via the /tmp clone pattern

**This is the critical part.** The mounted folder (`/mnt/`) uses VirtioFS, which does NOT support file deletion. That means `git reset`, `git clean`, and even basic `rm` commands will fail. You cannot push directly from the mounted folder because git operations create and delete lock files.

**The workaround — always do this:**

```bash
# 1. Get the remote URL from the mounted repo (includes auth credentials)
REPO_URL=$(git -C /sessions/[session-name]/mnt/fcp-jekyll-site remote get-url origin)

# 2. Clone to /tmp (native filesystem, no restrictions)
git clone "$REPO_URL" /tmp/fcp-deploy

# 3. Copy your changed files from the mounted folder to the clone
cp /sessions/[session-name]/mnt/fcp-jekyll-site/index.html /tmp/fcp-deploy/
cp /sessions/[session-name]/mnt/fcp-jekyll-site/about.md /tmp/fcp-deploy/
# (copy each file you changed)

# 4. Configure git identity
cd /tmp/fcp-deploy
git config user.email "info@floridacoastalprep.com"
git config user.name "Lee DeForest"

# 5. Commit and push
git add .
git commit -m "Description of changes"
git push origin master
```

**If `/tmp/fcp-deploy` already exists from a prior session** (you'll get "Permission denied" errors on `rm -rf`), just use a different name: `/tmp/fcp-deploy2`, `/tmp/fcp-deploy3`, etc.

### Step 4: Verify the deploy

After pushing, wait about 25-30 seconds for Netlify to build, then:

1. Navigate to `https://candid-starburst-baa4f7.netlify.app` in Chrome
2. Hard-reload with `Ctrl+Shift+R` to bust the cache
3. Take a screenshot to confirm the changes are live
4. Scroll to the section you changed and verify visually

---

## The Efficient Desktop Workflow (for the human)

The most efficient setup for Lee working with Claude on this site:

1. **Keep the repo cloned on your desktop** (e.g., `~/Desktop/fcp-jekyll-site` or wherever you prefer)
2. **Select that folder in Cowork** when starting a session — Claude gets direct read/write access
3. **Claude edits → deploys via the /tmp pattern** → changes go live on Netlify automatically
4. **If you want to edit outside of Claude**, use VS Code or any editor on the same folder, then `git add . && git commit -m "message" && git push origin master` from terminal
5. **The GitHub repo is the single source of truth** — both you and Claude push to it, Netlify auto-deploys

If you ever need to re-clone the repo fresh:
```bash
git clone https://github.com/CoachD23/fcp-jekyll-site.git
```

You may need to set up a GitHub Personal Access Token for authentication. The token goes in the remote URL like:
```
https://[TOKEN]@github.com/CoachD23/fcp-jekyll-site.git
```

---

## Design System (Don't Break These)

| Token | Value |
|-------|-------|
| Primary navy | `#0a1628` |
| Accent red | `#c41e3a` |
| Accent gold | `#d4a843` |
| Font | Inter (400, 500, 600, 700, 800) |
| Border radius | 8px cards, 4px buttons |
| Responsive breakpoints | 900px, 600px |

**Visual DNA:** "BlackRock meets Duke Basketball." Premium, institutional, dark navy backgrounds, gold accents, crisp typography. Think D1 athletic department meets private equity firm. No amateur feel, no clip art, no stock photo clichés.

**Section pattern:** Alternate dark navy (`#0a1628`) and light (`#f8f9fa`) backgrounds for visual rhythm.

**Animations:** IntersectionObserver-triggered `.fade-in` class. Elements start `opacity: 0; transform: translateY(30px)` and animate in on scroll. Already wired up in `_layouts/default.html`.

---

## Content Rules

**Always read `fcp-facts.md` before writing any content.** It contains verified facts about FCP. Never invent facts.

**Critical things to get right:**

- **The Grind Session** is a competitive basketball LEAGUE where FCP athletes play alongside and against former NBA Draft Picks and overseas pros. It is NOT a daily coaching session. The NBA guys are opponents in a league, not coaches.
- **The Spartan Training Center** is a 14,000 sq ft INDOOR facility. Never say "outdoor" or "beach training."
- **Location** is Fort Walton Beach, FL (Florida Panhandle / Emerald Coast). NEVER say "South Florida."
- **Kenny Anderson** is on the coaching staff as Basketball Coach / Skills Development Director. He is NOT the Grind Session.
- **Both programs are active:** Post-Graduate (ages 18-20) and High School (grades 9-12)

**Images:** Only reference images that actually exist in `/assets/images/`. The full inventory is in `CLAUDE_SESSION_BRIEF.md`. Never invent a filename.

**Internal links:** Always root-relative: `/contact/`, `/apply/`, `/training/`, etc.

---

## Blog System

There's a blog queue in `blog-queue.md` with 22 planned posts (3 published, 19 to go). Blog posts go in `_posts/` as Jekyll markdown files.

**Front matter template:**
```yaml
---
layout: post
title: "Title Here"
description: "150-160 char meta description with keyword and location"
date: YYYY-MM-DD
categories: [basketball, recruiting]
tags: [tag1, tag2, tag3]
author: "Coach Lee DeForest"
image: /assets/images/blog/blog-default.jpg
---
```

**Blog rules:** 1,400-1,800 words. Every post needs at least 1 real quote (from `fcp-facts.md`), 1 Grind Session mention, 1 Spartan Training Center mention, 3+ internal links, and a CTA to `/contact/` or `/apply/`.

---

## GoHighLevel Integration

Forms on `/contact/` and `/apply/` are embedded GHL iframes. The CRM side (workflows, autoresponders, pipelines) is separate from the website. If doing GHL work in Cowork, use the `ghl-hybrid-automation` or `ghl-workflows-autoresponder` skills.

- **GHL Location ID:** `jBDUi7Sma6tCl3eXKBmX`
- **Contact Form ID:** `41vI0yGp6HJG0JBllaVt`

---

## Google Drive Photos

Lee has professional basketball photos in Google Drive:
https://drive.google.com/drive/folders/1a4vsnZ5AORVJsFLgbbQdciEKLOEhCKG3

**Note for Claude sessions:** The Google Drive MCP tools can browse and list files but downloading binary images to the VM filesystem has proven difficult (API returns binary that can't be stored, browser downloads go to local Downloads not the VM). The workaround is either:
1. Use images already in the repo (see `/assets/images/` inventory in `CLAUDE_SESSION_BRIEF.md`)
2. Ask Lee to manually download photos from Drive and drop them into the repo's `assets/images/` folder
3. Then Claude can reference them in the site code

---

## What's Already Done

The full site has been rebuilt from scratch to premium standards. All pages are live, responsive, and deployed. See `CLAUDE_SESSION_BRIEF.md` section 11 for the complete list of completed work.

**Recent changes (Feb 2026):**
- 3 SEO blog posts published
- Program card images swapped from facility shots to real player/coaching photos
- Design audit completed and all issues resolved

**Priority next tasks:**
1. Write next 3 blog posts from the queue (TIER 1 items)
2. Add structured data / JSON-LD schema to homepage
3. Page speed audit (image compression, Core Web Vitals)
4. Google Search Console verification + sitemap submission
5. Recruiting follow-up workflow in GHL

---

## Quick Reference for Claude

1. Read `CLAUDE_SESSION_BRIEF.md` and `fcp-facts.md` first
2. Edit files in the mounted folder
3. Deploy via `/tmp` clone pattern (never push from `/mnt/`)
4. Verify every deploy with a screenshot
5. Use root-relative internal links
6. Never invent FCP facts — only use `fcp-facts.md`
7. Brand voice: confident, institutional, specific. Never hype-y.
