# FCP Website — Claude Session Brief
**Last updated: February 2026**
Use this file to onboard any new Claude Cowork session to this project. Read it first before touching anything.

---

## 1. What This Project Is

**Florida Coastal Prep Sports Academy** — elite basketball prep academy in Fort Walton Beach, Florida. This is their marketing website: a Jekyll static site hosted on Netlify, integrated with GoHighLevel for lead capture.

The goal: look like a $50k agency build, rank #1 in Google for basketball prep school searches in the Florida Panhandle, and convert parent and player visits into leads in GoHighLevel.

---

## 2. Live URLs & Infrastructure

| Resource | Value |
|---|---|
| Live site | https://floridacoastalprep.com |
| Netlify preview | https://candid-starburst-baa4f7.netlify.app |
| GitHub repo | https://github.com/CoachD23/fcp-jekyll-site.git |
| GitHub branch | `master` |
| Netlify site ID | `386f4bce-9bac-4d53-bc0a-eae36af5d502` |
| GHL Location ID | `jBDUi7Sma6tCl3eXKBmX` |
| GHL Contact Form ID | `41vI0yGp6HJG0JBllaVt` |
| Google Analytics | GA4 G-0J66GRZ7SW |
| Domain registrar | GoDaddy |
| Git identity (name) | Lee DeForest |
| Git identity (email) | info@floridacoastalprep.com |

---

## 3. Tech Stack

- **Jekyll 4.3** — static site generator, kramdown markdown
- **Plugins:** `jekyll-sitemap`, `jekyll-seo-tag`, `jekyll-feed`
- **CSS:** Component-based vanilla CSS (no framework — keep it that way)
- **Fonts:** Inter via Google Fonts
- **Hosting:** Netlify — auto-deploys on every push to `master`
- **Forms:** GoHighLevel embedded iframes (NOT Netlify forms)
- **Analytics:** Google Analytics GA4
- **No JavaScript frameworks** — vanilla JS only (IntersectionObserver for scroll animations, etc.)

### Deployment pattern
Edit files → git add → git commit → git push → Netlify auto-deploys in ~30 seconds.

---

## 4. ⚠️ Critical Technical Gotcha: VirtioFS + Git

**The mounted workspace folder (`/mnt/`) does NOT support file deletion.** `rm`, `git reset --hard`, `os.remove()` — all fail with "Operation not permitted." This is a VirtioFS filesystem limitation and cannot be worked around directly.

**The workaround — always do this for git operations:**

```bash
# 1. Clone repo to /tmp (native Linux filesystem, no restrictions)
# Get the remote URL (includes credentials) from the existing repo:
REPO_URL=$(git -C /sessions/wizardly-beautiful-pascal/mnt/fcp-jekyll-site remote get-url origin)
git clone $REPO_URL /tmp/fcp-deploy

# 2. Copy changed files from workspace to clone
cp /sessions/wizardly-beautiful-pascal/mnt/fcp-jekyll-site/CHANGED_FILE.md /tmp/fcp-deploy/

# 3. Commit and push from /tmp
cd /tmp/fcp-deploy
git config user.email "info@floridacoastalprep.com"
git config user.name "Lee DeForest"
git add .
git commit -m "your message"
git push origin master
```

**Never try to do `git push` directly from the `/mnt/` directory.** It will hit lock file issues that are very difficult to resolve. Always use `/tmp` as your working git directory.

Additional gotchas:
- `mv` (rename) DOES work on VirtioFS even though `rm` doesn't
- If you see stale `.lock` files: rename them (`mv file.lock file.lock.bak`), never try to delete
- Lock files in `.git/refs/heads/` will corrupt git — if you renamed one in there, move it out to `.git/`

---

## 5. Design System

| Token | Value |
|---|---|
| Primary (navy) | `#0a1628` |
| Accent red | `#c41e3a` |
| Accent gold | `#d4a843` |
| Font | Inter (400, 500, 600, 700, 800) |
| Border radius | `8px` cards, `4px` buttons |
| Responsive breakpoints | 900px, 600px |

**Visual DNA:** "BlackRock meets Duke Basketball" — institutional, premium, dark navy backgrounds, gold accents, crisp typography. Think D1 athletic department meets private equity firm. No amateur feel, no clip art, no stock photo clichés.

**Section pattern:** Alternate dark (#0a1628 navy) and light (#f8f9fa) sections for visual rhythm. Every section has a clear purpose.

**CSS pattern:** Everything lives in `<style>` blocks within each page file. There's no separate CSS file or build step. Keep it that way — it's simpler to edit inline.

**Animations:** IntersectionObserver-triggered `.fade-in` class. Elements start `opacity: 0; transform: translateY(30px)` and animate in on scroll. Already in `_layouts/default.html`.

---

## 6. Site Pages (Full Inventory)

| File | URL | Notes |
|---|---|---|
| `index.html` | `/` | Homepage — hero video, Grind Session feature, stats bar, newsroom section, programs overview |
| `about.md` | `/about/` | Executive team, mission, timeline |
| `coaches.md` | `/coaches/` | Full coaching staff bios |
| `post-grad.md` | `/post-grad/` | Post-Graduate Basketball program |
| `high-school.md` | `/high-school/` | High School program (9th–12th) |
| `training.md` | `/training/` | Spartan Training Center (14,000 sq ft indoor) |
| `housing.md` | `/housing/` | Athlete housing |
| `academics.md` | `/academics/` | Academic program, eligibility support |
| `tuition.md` | `/tuition/` | Tuition & fees, admissions process |
| `testimonials.md` | `/testimonials/` | Parent and coach testimonials |
| `area-info.md` | `/area-info/` | Fort Walton Beach area info |
| `contact.html` | `/contact/` | GHL contact form + Google Maps |
| `apply.html` | `/apply/` | GHL application form |
| `blog.html` | `/blog/` | Blog index page |
| `roster.html` | `/roster/` | Player roster |
| `faq.html` | `/faq/` | FAQ |
| `privacy.md` | `/privacy/` | Privacy policy |
| `terms.md` | `/terms/` | Terms |
| `404.html` | `/404/` | Custom 404 page |

**Internal link conventions:** Always use relative root-relative paths: `/contact/`, `/apply/`, `/training/`, etc.

---

## 7. Verified Image Inventory

**Only reference images that actually exist. Never invent a filename.**

```
/assets/images/blog/blog-default.jpg        ← generic blog fallback
/assets/images/blog/kenny-visit.jpg         ← Kenny Anderson training visit
/assets/images/blog/scholarships.jpg        ← scholarships post image
/assets/images/training/gym-main.jpg        ← main court / hardwood
/assets/images/training/spartan-center.jpg  ← facility overview (exterior/wide)
/assets/images/training/spartan-center-2.jpg ← secondary facility shot
/assets/images/about-fcp.jpg               ← team / FCP general
/assets/images/about-hero.jpg              ← about page hero
/assets/images/homepage-hero.jpeg          ← premium FCP hero shot
/assets/images/coaches/lee-deforest.webp
/assets/images/coaches/vando-becheli.webp
/assets/images/coaches/kenny-anderson.png
/assets/images/coaches/ (other coach photos in .webp)
/assets/images/housing/ (various housing photos)
/assets/images/partners/ (adidas, hudl, jr-nba, ussa, seal logos)
```

---

## 8. FCP Facts — Source of Truth

**Always read `fcp-facts.md` before writing any page content or blog posts.** It contains verified facts about the program, facility, coaches, testimonials, and programs. Never invent facts not in that file.

### Critical facts (never get these wrong):

**The Grind Session** — An exclusive ongoing basketball LEAGUE where FCP athletes compete alongside and against former NBA Draft Picks, overseas pros, and top collegiate talent. It is NOT a daily coaching session. NBA draft picks are OPPONENTS in a league, not coaches. Kenny Anderson is on the coaching staff separately.
- CORRECT: "FCP athletes compete alongside and against former NBA Draft Picks in the Grind Session"
- WRONG: "NBA draft picks coach our players," "former draft picks mentor athletes daily"

**The Spartan Training Center** — 14,000 sq ft INDOOR facility. NBA-dimension hardwood (94×50 ft), 24/7 access, shot clocks, video board, 2 Shoot-Away guns, 60 ft turf zone.
- CORRECT: "world-class indoor training facility," "14,000 sq ft Spartan Training Center"
- WRONG: "outdoor training," "train outside," "beach training," "year-round outdoor work"

**Programs** — Both HIGH SCHOOL (9th–12th) AND POST-GRADUATE are active.

**Location** — Fort Walton Beach, FL 32548. Florida Panhandle / Emerald Coast. NEVER say "South Florida."

**Coach Lee DeForest** — 25 years coaching, D1/D2/NAIA/JUCO. Named placements: Sean East (NBA G-League/Missouri), Brandon Maclin (DePaul), Kylin Green (Houston Baptist), Ring Malith (SIU Edwardsville).

**Kenny Anderson** — Basketball Coach / Skills Development Director. 1991 2nd overall NBA Draft pick (Nets), 14-year NBA career, 1994 All-Star. He IS on staff. He is NOT the Grind Session.

### Real testimonials available (see fcp-facts.md for full quotes):
- Paul Biancardi (ESPN Recruiting Director)
- Sean East Sr. (parent — son now in NBA G-League)
- Shawn Roy (parent — son got zero → multiple offers)
- Deanna Costello (parent)
- Andrej Zelenbaba (parent)
- James McCravy (parent)
- Spanky Parks (Program Director)

---

## 9. The Blog Machine

### How it works
Run `/blog` in Claude to write the next 3 posts from the queue. It will:
1. Read `fcp-facts.md` first (accuracy enforcement)
2. Read `blog-queue.md` for the next 3 TODO entries
3. Write each post as a Jekyll .md file in `_posts/`
4. Update queue entries from TODO → DONE
5. Commit and push via the `/tmp` clone pattern

### Blog quality rules (enforced by `/blog` command)
- **Grind Session = league language only** — see above
- **Spartan Training Center = indoor language only** — see above
- **Images = verified paths only** — no invented filenames
- **Quotes = fcp-facts.md only** — no fabricated testimonials
- **Word count:** 1,400–1,800 words
- **Structure:** Hook → 4–6 H2 sections → CTA
- **Every post must have:** 1 real quote, 1 Grind Session mention, 1 Spartan Training Center mention, 3+ internal links, a CTA to `/contact/` or `/apply/`
- **Author on all posts:** "Coach Lee DeForest"

### Blog queue current status (as of Feb 2026)
**DONE (3 posts published):**
- "The Best Basketball Prep School in Fort Walton Beach..." — local SEO anchor
- "IMG Academy vs DME Academy vs Montverde: An Honest Comparison" — competitor comparison
- "Top Basketball Prep Schools in the Florida Panhandle..." — geo anchor

**NEXT UP — 3 TIER 1 posts ready to write:**
- "How to Choose a Basketball Prep School: 7 Questions Every Parent Should Ask" — parent guide
- "What It's Like to Train Alongside Former NBA Draft Picks" — Grind Session deep-dive
- "How Much Does a Basketball Prep School in Florida Cost?" — cost/value breakdown

Then 9 TIER 2 authority posts, then 10+ TIER 3 evergreen posts. See `blog-queue.md` for full list.

### Blog post front matter template
```yaml
---
layout: post
title: "Title Here"
description: "150-160 char meta description — include primary keyword, Fort Walton Beach or Florida Panhandle, end with a benefit"
date: YYYY-MM-DD
categories: [basketball, recruiting]
tags: [tag1, tag2, tag3]
author: "Coach Lee DeForest"
image: /assets/images/blog/blog-default.jpg
---
```

---

## 10. GoHighLevel Integration

- **Platform:** GoHighLevel CRM
- **Forms:** Embedded via iframe on `/contact/` and `/apply/` pages
- **GHL Location ID:** `jBDUi7Sma6tCl3eXKBmX`
- **Contact Form ID:** `41vI0yGp6HJG0JBllaVt`
- **Pipeline:** Leads from forms flow into GHL sales pipeline
- **Workflows:** Autoresponders and follow-up sequences in GHL (separate from website)
- **Skills available:** Use `ghl-hybrid-automation`, `ghl-workflows-autoresponder`, `ghl-recruiting-follow-up` skills for any GHL work

---

## 11. Completed Work (What's Already Been Built)

Everything below has been implemented, committed, and is live on the site:

- ✅ Full site rebuilt — every page redesigned to premium standard
- ✅ Homepage: hero video background, Grind Session feature section, stats bar, newsroom, programs overview, testimonials, partners strip
- ✅ All program pages: Post-Grad, High School, Training, Housing, Academics, Tuition
- ✅ Coaches page with full staff bios (Lee DeForest, Vando Becheli, Kenny Anderson, Jared Dugan, Dmitry Utolin, Tyler Martin, Guanda Huang + Advisory Board)
- ✅ Testimonials page with real parent and ESPN quotes
- ✅ Area Info page for Fort Walton Beach
- ✅ Contact page with GHL form + Google Maps
- ✅ Apply page with GHL application form
- ✅ Blog infrastructure with `_layouts/post.html` and `blog.html` index
- ✅ `blog-queue.md` — 22-post editorial queue (3 DONE, 19 TODO)
- ✅ `/blog` skill — automated blog writing command with accuracy enforcement
- ✅ `fcp-facts.md` — source-of-truth for all FCP facts
- ✅ `PROJECT_CONTEXT.md` — basic project context
- ✅ This file: `CLAUDE_SESSION_BRIEF.md` — full session handoff
- ✅ 3 SEO blog posts published (Feb 2026) — factually verified, real quotes, correct images
- ✅ Jekyll sitemap, SEO tags, feed plugins configured
- ✅ Google Analytics GA4 integrated
- ✅ Responsive design (900px, 600px breakpoints)
- ✅ Mobile navigation with hamburger menu
- ✅ robots.txt and `_redirects` configured

---

## 12. Recommended Next Tasks

**High-priority website work:**
1. **Run next 3 blog posts** — `/blog` command, TIER 1 queue items are ready
2. **Structured data / JSON-LD** — Add `SportsOrganization` and `Event` schema to homepage for rich results
3. **Page speed audit** — check Core Web Vitals on Netlify (images may need compression/lazy loading)
4. **Google Search Console** — verify site and submit sitemap if not done
5. **Roster page** — `roster.html` exists but may need current player data updated

**GHL / CRM work:**
- Recruiting follow-up workflow for new form submissions
- Post-application nurture sequence
- Lead scoring / pipeline stage automation

**Content:**
- YouTube video embeds on Training and About pages
- Player highlight video section
- Schedule / upcoming events section (Grind Session game dates)

---

## 13. Working Instructions for Claude

1. **Read this file and `fcp-facts.md` first** before making any content changes
2. **Never invent FCP facts** — only use what's in `fcp-facts.md`
3. **Use `/tmp/fcp-deploy/` for all git operations** — never push from `/mnt/`
4. **Verify images exist** before referencing them in any file
5. **Build → commit → push → verify on Netlify** — take a screenshot to confirm each deploy
6. **Internal links:** always root-relative (`/contact/` not `https://floridacoastalprep.com/contact/`)
7. **Every page should earn its place** — no filler content, no weak sections
8. **Brand voice:** Confident, institutional, specific. Never hype-y. "BlackRock meets Duke Basketball."
9. **CTA on every page** — always link to `/apply/` or `/contact/`
10. **GHL work:** Use the `ghl-hybrid-automation` or `ghl-workflows-autoresponder` skills — don't attempt GHL work without reading a GHL skill first

---

## 14. Key File Locations

| File | Purpose |
|---|---|
| `fcp-facts.md` | Source-of-truth for all FCP facts. Read before writing anything. |
| `blog-queue.md` | Editorial queue for blog posts — 22 planned posts |
| `PROJECT_CONTEXT.md` | Quick-reference for URLs, design system, contacts |
| `CLAUDE_SESSION_BRIEF.md` | This file — full session handoff |
| `.claude/commands/blog.md` | The /blog skill — reads fcp-facts.md + writes 3 posts |
| `_config.yml` | Jekyll config — site title, URL, social, plugins |
| `_layouts/default.html` | Main layout — nav, footer, analytics, scroll animations |
| `_layouts/post.html` | Blog post layout |
| `_includes/nav.html` | Navigation bar |
| `_includes/footer.html` | Site footer |
