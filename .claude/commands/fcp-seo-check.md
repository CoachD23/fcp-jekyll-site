# FCP SEO Audit — Validate All Pages

Run a full SEO audit of the Florida Coastal Prep site. Check every page and post for compliance with SEO standards.

## Audit Scope
Read the front matter of ALL pages and posts in the site:

### Root Pages (check all)
- index.html
- about.md
- coaches.md
- training.md
- academics.md
- housing.md
- post-grad.md
- high-school.md
- apply.html
- contact.html
- blog.html
- tuition.md
- area-info.md
- testimonials.md
- commitments.html
- faq.html

### All Blog Posts
- Every file in `_posts/` directory

## Checks Per File

### Required for ALL pages:
| Check | Rule |
|-------|------|
| `title` | Present, 50-60 characters, includes keywords |
| `description` | Present, 150-160 characters, unique across site |
| OG Image | Has `image`, `og_image`, or `hero_image` set |
| Internal links | Body content links to at least 1 other page |

### Required for Blog Posts (layout: post):
| Check | Rule |
|-------|------|
| `date` | Present and valid |
| `excerpt` | Present, 1-2 sentences |
| `image` | Present, NOT `blog-default.jpg` |
| Headings | Uses H2/H3 with keywords (not just H1) |
| CTA | Links to `/apply/` or `/contact/` |

### Required for Alumni Posts (layout: alumni-post):
| Check | Rule |
|-------|------|
| `player_name` | Present |
| `hometown`, `high_school` | Present |
| `position`, `height` | Present |
| `then_team`, `then_year` | Present |
| `now_team`, `now_year` | Present |
| `stats` | Array with at least 2 items |
| `bio` | Present, 2+ sentences |
| `image` | Present and unique |

### Structured Data Checks:
- Read `_includes/head.html` and verify:
  - SportsOrganization schema has name, url, logo, founder, address, contactPoint
  - Article schema triggers for `post` and `alumni-post` layouts
  - BreadcrumbList schema is present
- Read `faq.html` and verify FAQPage schema has ALL questions from the HTML

### CSS Checks:
- Social sharing styles exist in `main.css`
- Author card styles exist in `main.css`
- Reading time styles exist in `main.css`
- Mobile responsive breakpoints at 768px and 480px

## Output Format
Generate a scorecard like this:

```
# FCP SEO Audit Report — [DATE]

## Overall Score: [X]/100

### Page Scores:
| Page | Title | Desc | OG Image | Links | Score |
|------|-------|------|----------|-------|-------|
| about.md | ✅ | ✅ | ✅ | ✅ | 100% |
| coaches.md | ✅ | ✅ | ✅ | ❌ | 75% |

### Blog Post Scores:
| Post | Title | Desc | Image | Excerpt | CTA | Score |
|------|-------|------|-------|---------|-----|-------|

### Issues Found:
1. [File]: [Issue] — [How to fix]
2. ...

### Recommendations:
1. ...
```

After generating the report, ask the user if they want to fix any issues found.
