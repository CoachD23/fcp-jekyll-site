# ESPN-Style Blog Page Redesign

**Date:** 2026-03-16
**Status:** Approved

## Summary

Replace the current blog page layout (dark hero + white intro + 2-col featured + equal grid) with an ESPN/CBS Sports-style front page that leads with content, not branding.

## Layout

### Section 1: Hero + Sidebar (dark bg, no page title)

- **Left 60%:** One of 4 pinned alumni stories, randomly selected on each page load via JS. Full-height image card with badge, headline, excerpt, and "Read Story" link.
  - Nathan Mariano — From FCP to the NBA
  - Sean East — From Coach DeForest to the NBA
  - Brandon Maclin — Jackson to the Big East
  - Kylin Green — FCP Alumni Spotlight

- **Right 40%:** 5 sidebar headline rows with small thumbnails
  - Slot 1 (pinned): "How to Get Recruited for College Basketball"
  - Slot 2 (pinned): "Inside the Grind Session" (new post)
  - Slots 3-5 (auto): 3 most recent posts, excluding all pinned stories

### Section 2: Secondary Stories (4-card row, dark bg)

Next 4 most recent posts after sidebar posts, displayed as image cards.

### Section 3: All Stories (light bg)

Category filter bar + 3-column grid of all remaining posts. Reuse existing filter JS.

## Removed

- "FCP Newsroom" heading
- White intro paragraph section
- Old 2-column featured pinned section

## New Content

- 1 blog post: "Inside the Grind Session" — covers the Grind Session circuit, FCP's participation, and exposure value

## Mobile

- Hero + sidebar stacks vertically
- 4-card row becomes 2x2
- Grid becomes single column

## Post Dates

Backdate clustered posts so they don't all show March 10 / March 7.
