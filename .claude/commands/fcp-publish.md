# FCP Publish — Push Changes to GitHub & Deploy

You are publishing changes to the Florida Coastal Prep Jekyll site. Follow this exact workflow.

## Step 1: Identify Modified Files
Scan the working directory for files that have been modified since the last known commit. Read each file to confirm changes are present.

Check these locations for common edits:
- `_includes/` (head.html, nav.html, footer.html)
- `_layouts/` (post.html, alumni-post.html, page.html)
- `_posts/` (any new or edited blog posts)
- `_data/` (commitments.yml)
- `assets/css/main.css`
- Root pages: about.md, coaches.md, training.md, academics.md, housing.md, post-grad.md, high-school.md, apply.html, contact.html, blog.html, tuition.md, area-info.md, testimonials.md, commitments.html, faq.html, index.html

## Step 2: SEO Validation (MANDATORY before push)
For every modified file, verify:

**All pages:**
- [ ] Has `title` in front matter
- [ ] Has `description` in front matter (150-160 chars)
- [ ] Has an OG image (`image`, `og_image`, or `hero_image`)

**Blog posts (layout: post):**
- [ ] Has `excerpt`
- [ ] Has unique `image` (not blog-default.jpg)
- [ ] Has `date`

**Alumni posts (layout: alumni-post):**
- [ ] Has all alumni fields: `player_name`, `hometown`, `high_school`, `position`, `height`
- [ ] Has `then_team`, `then_year`, `now_team`, `now_year`
- [ ] Has `stats` array and `bio`
- [ ] Has unique `image`

If any check fails, fix the issue BEFORE pushing. Do not skip validation.

## Step 3: Push via GitHub REST API
Git CLI is blocked (Xcode license). Use this curl-based workflow:

```bash
# Auth — load tokens from secrets file
source ~/.fcp-secrets
REPO="CoachD23/fcp-jekyll-site"
API="https://api.github.com/repos/$REPO"

# 1. Base64 encode each file
base64 -i <file> | tr -d '\n' > /tmp/blob_name.b64

# 2. Create blob for each file
CONTENT=$(cat /tmp/blob_name.b64)
curl -s -X POST -H "Authorization: token $TOKEN" -H "Content-Type: application/json" \
  "$API/git/blobs" -d "{\"content\":\"$CONTENT\",\"encoding\":\"base64\"}"

# 3. Get current HEAD SHA
curl -s -H "Authorization: token $TOKEN" "$API/git/ref/heads/master"

# 4. Get tree SHA from HEAD commit
curl -s -H "Authorization: token $TOKEN" "$API/git/commits/<HEAD_SHA>"

# 5. Create new tree with all modified files
curl -s -X POST -H "Authorization: token $TOKEN" -H "Content-Type: application/json" \
  "$API/git/trees" -d '{"base_tree":"<TREE_SHA>","tree":[...]}'

# 6. Create commit
curl -s -X POST -H "Authorization: token $TOKEN" -H "Content-Type: application/json" \
  "$API/git/commits" -d '{
    "message":"<prefix>: descriptive message",
    "tree":"<NEW_TREE_SHA>",
    "parents":["<HEAD_SHA>"],
    "author":{"name":"CoachD23","email":"130697360+CoachD23@users.noreply.github.com"}
  }'

# 7. Update master ref
curl -s -X PATCH -H "Authorization: token $TOKEN" -H "Content-Type: application/json" \
  "$API/git/refs/heads/master" -d '{"sha":"<COMMIT_SHA>"}'
```

**JSON parsing** (no python/jq): `tr -d ' \n' | grep -o '"sha":"[^"]*"' | head -1 | cut -d'"' -f4`

## Step 4: Commit Message Format
Use prefixes:
- `seo:` — SEO improvements (meta tags, schema, OG images)
- `feat:` — New features or pages
- `fix:` — Bug fixes
- `blog:` — New or edited blog posts
- `style:` — CSS/design changes

Example: `blog: add Brandon Maclin alumni story with journey card and stats`

## Step 5: Verify Netlify Deploy
```bash
curl -s -H "Authorization: Bearer $NETLIFY_TOKEN" \
  "https://api.netlify.com/api/v1/sites/386f4bce-9bac-4d53-bc0a-eae36af5d502/deploys?per_page=1"
```

Check that `state` is `building` or `ready`. Report the deploy status to the user.

## Step 6: Cleanup
Remove all `/tmp/blob_*.b64` temp files after successful push.

Report to the user:
- Commit SHA
- Number of files pushed
- List of files changed
- Netlify deploy status
