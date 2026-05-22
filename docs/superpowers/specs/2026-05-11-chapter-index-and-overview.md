# Track 4 — Chapter index + chapter overview pages

**Date:** 2026-05-22
**Status:** Draft — pending review
**Parent:** `2026-05-11-design-refresh-overview.md`
**Depends on:** Track 1 (tokens + typography). Benefits from Track 3 (consistent reader visuals to link into).

## Purpose

Today the app jumps users straight from `HomeView` (anonymous marketing) into a chapter (`/chapter/:number/:slug`). There's no "library shelf" view of all chapters, no per-chapter landing where students can see their progress + jump to a specific section. Track 4 ships those two missing surfaces.

## Scope

In scope:
- `/chapters` — functional chapter index. Featured "Continue Reading" card + responsive grid of all chapters, each showing cover art, title, progress, status pill.
- `/chapter/:number` — chapter overview page. 320px left rail with cover/CTAs + right column with section list, figure grid, recent notes.
- Wire navigation: clicking a chapter card on `/chapters` lands on `/chapter/:number`; clicking a section there lands on `/chapter/:number/:slug` (existing reader route).
- Decide default route for logged-in users vs anonymous users.

Out of scope:
- Mobile variants → **Track 5** (stacked single-column index, condensed overview).
- Editing chapter covers / order from a dashboard → existing Creator dashboard already covers this.
- Login as its own page → stays as `MenuAuth` modal for this round (per umbrella spec).

Explicitly deferred:
- Search across chapters / sections.
- Filters (status: not-started / in-progress / done).
- Personalized recommendations beyond "Continue Reading."

## Resolved open questions (from umbrella spec)

The umbrella left two questions in this track. Recommendations below; ratify or change during review.

**Q3 (umbrella): Chapter index access for anonymous users.**
Recommendation: **public access, progress fields hidden when no session.** Rationale: a library shelf is a marketing surface as much as a tool. Hiding it from logged-out users blocks them from seeing what the product offers. The `useReadingProgress` composable already handles no-session as "empty array" gracefully.

**Q4 (umbrella): Default route for logged-in users.**
Recommendation: **`/` redirects to `/chapters` for signed-in users; anonymous users still see `HomeView`.** Rationale: `HomeView` is marketing — repeat-visit signed-in users want their library, not the pitch. One small redirect in `router.beforeEach`.

Both decisions are reversible with single-line changes.

## Current state (as of 2026-05-22)

| Piece | File | Status |
|---|---|---|
| `/` route | `router/index.js` → `HomeView` | Working (Matisse parallax cards). |
| `/chapter/:number/:slug` (reader) | `router/index.js` → `ChapterView` | Working. |
| `/chapter/:number` (overview) | — | **Missing.** Not registered. |
| `/chapters` (index) | — | **Missing.** Not registered. |
| Chapter data access | `useChapter` composable + Supabase `modules` table | Working — already paginates / lists modules in Creator dashboard. |
| Per-user reading progress | `useReadingProgress` + Supabase `reading_progress` | Working. |
| Cover images | `modules.cover_image_url` | Working (storage bucket already serves them). |

## Target deliverables

### D1. `/chapters` route — chapter index page

Component: new `src/views/ChaptersView.vue`.

Layout:
```
┌─────────────────────────────────────────────┐
│  Chapters                                   │ ← serif H1
│  Browse the textbook — pick up where you   │
│  left off.                                  │
│                          ┌───────────────┐  │
│                          │ [cover image] │  │
│                          │ Continue      │  │
│                          │ Chapter 2     │  │
│                          │ The visual    │  │
│                          │ cortex        │  │
│                          │ ━━━━━━ 42%   │  │
│                          │ ~12 min left  │  │
│                          └───────────────┘  │
├─────────────────────────────────────────────┤
│ Grid (4 cols at xl, 3 at lg, 2 at sm, 1 mobile) │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐                │
│ │cov │ │cov │ │cov │ │cov │ (3:4 aspect)   │
│ │    │ │    │ │    │ │    │                 │
│ ├────┤ ├────┤ ├────┤ ├────┤                 │
│ │CH 1│ │CH 2│ │CH 3│ │CH 4│ ← mono caption │
│ │The │ │The │ │The │ │The │ ← serif title  │
│ │ret.│ │vis.│ │aud.│ │bra.│                │
│ │━━━ │ │━━  │ │    │ │    │ ← progress bar │
│ │Done│ │42% │ │—   │ │—   │ ← pill state   │
│ └────┘ └────┘ └────┘ └────┘                │
└─────────────────────────────────────────────┘
```

Data:
- All published chapters via `useChapter().fetchAllModules()` (or equivalent). Filter by `published = true`.
- Per-user reading progress via `useReadingProgress().fetchAllForUser()` if signed in; else skip progress rendering.
- "Continue Reading" = the chapter with the most recent `reading_progress.updated_at` that isn't 100% complete. If none, hide the featured card and let the grid carry the page.

State pill logic:
- 100% complete → "✓ Done" (teal, var(--color-complete))
- 1–99% → "Reading" (accent, var(--color-accent))
- 0% → no pill (just the title)

Empty states:
- Anonymous: show grid, hide all progress UI (no bars, no pills, no featured card). Optionally show a subtle CTA at top: "Sign in to track your progress."
- Signed in, no progress: show grid, no featured card, no bars, no pills.

### D2. `/chapter/:number` route — chapter overview page

Component: new `src/views/ChapterOverviewView.vue`.

Layout:
```
┌─────────────────────┬──────────────────────────────┐
│ [cover image]       │  Sections                    │
│ (320px wide)        │  ┌────────────────────────┐ │
│                     │  │ 1. Photoreceptors      │ │
│ Chapter 2           │  │    ━━━━━━━━━ 80%      │ │
│ The Visual Cortex   │  │    ✎ 2 notes  ⊙ 1 hl   │ │
│                     │  │    5 figures · 8 min   │ │
│ ━━━━━━━━━━━ 42%    │  └────────────────────────┘ │
│                     │  ┌────────────────────────┐ │
│ [Continue reading]  │  │ 2. Color processing    │ │
│ [Start over]        │  │    no progress         │ │
│ [Take quiz]         │  │    4 figures · 6 min   │ │
│ [Review flashcards] │  └────────────────────────┘ │
│                     │  ... more sections          │
│                     ├──────────────────────────────┤
│                     │  Figures (grid 4×)          │
│                     │  ▢ ▢ ▢ ▢                   │
│                     │  ▢ ▢ ▢ ▢                   │
│                     ├──────────────────────────────┤
│                     │  Recent notes (3)           │
│                     │  • "..." — Section 2        │
│                     │  • "..." — Section 4        │
└─────────────────────┴──────────────────────────────┘
```

Data:
- Chapter row + sections list from Supabase `modules` + `sections` (already fetched by `useChapter`).
- Per-section progress via `reading_progress`. Per-section note/highlight counts via `useNotes` / `useHighlights` filtered by section.
- Figure thumbnails: from `paragraphs` rows where `type = 'figure'` (or wherever the schema stores them — confirm during implementation). Render as a 4×N grid of thumbnails; clicking opens the figure in fullscreen mode that already exists for the reader.
- Recent notes: top 3 notes for this chapter by `created_at desc`.

Behavior:
- Primary CTA: "Continue reading" — links to `/chapter/:n/:slug` of the section the user was last in. If no progress, label becomes "Start reading" and links to section 1.
- "Start over" only shown if there's any progress; clicking it clears `reading_progress` for this chapter (after a confirmation), then routes to section 1.

Empty states:
- No sections (shouldn't happen, but): render the left rail + "This chapter is being prepared."
- Anonymous user: render everything except progress bars / note counts / recent notes. Replace primary CTA with "Sign in to track progress, then read" → opens `MenuAuth`.

### D3. Default-route redirect for signed-in users

In `router/index.js` `beforeEach`:
- If `to.path === "/"` and `getSessionFromStorage()` returns a session → `return { path: "/chapters" }`.
- Anonymous users keep landing on `HomeView`.

Keep this guard early — before role checks — so it doesn't interact with the role-redirect logic for dashboards.

### D4. Wordmark / brand link routing

When a signed-in user clicks the wordmark / brand element in `MainNav` or `MenuHome`, they should also go to `/chapters` (not `/`). Anonymous click goes to `/`.

Implementation: small helper `useHomeRoute()` returning a computed route that depends on `isAuthenticated`.

### D5. Cross-link from end-of-chapter callout (Track 3)

The `EndOfChapterCallout`'s "Chapter overview" CTA → `/chapter/:n` (this track's route).

Just wire the link. Listed here so Track 3 doesn't need to keep a TODO for it.

## Files touched

New:
- `docs/superpowers/specs/2026-05-11-chapter-index-and-overview.md` (this file)
- `src/views/ChaptersView.vue`
- `src/views/ChapterOverviewView.vue`
- `src/composables/useHomeRoute.js` (D4)

Modified:
- `src/router/index.js` — register both routes; add default-route redirect (D3); both routes are public (no `requiresAuth`).
- `src/components/Navigation/MainNav.vue` — wordmark uses `useHomeRoute` (D4)
- `src/components/Navigation/MenuHome.vue` — same as above if it has its own brand link (D4)

Supabase:
- No schema changes. All data needed already exists.

## Test plan

Manual:
1. **Anonymous index.** Open incognito, visit `/chapters`. Grid renders all published chapters. No progress bars, no pills, no featured card. Subtle sign-in CTA visible.
2. **Anonymous overview.** Click into a chapter; lands on `/chapter/1`. Section list renders without progress UI. CTA reads "Sign in to track progress, then read"; clicking opens `MenuAuth`.
3. **Anonymous default route.** Visit `/`. Lands on `HomeView` (Matisse cards). Unchanged behavior.
4. **Signed-in default route.** Sign in. Visit `/`. Redirects to `/chapters`.
5. **Signed-in index — fresh account.** A user with no progress: grid shows all chapters, no featured card, no progress bars/pills.
6. **Signed-in index — mid-progress.** A user with 42% on Chapter 2: featured card shows Chapter 2 with 42% bar and time-remaining estimate. Grid shows pill states correctly.
7. **Signed-in overview — mid-progress.** Visit `/chapter/2`. Section list shows per-section progress; primary CTA is "Continue reading"; clicking lands on the correct section.
8. **Start over.** Click "Start over" → confirmation modal → confirm → progress cleared → routed to section 1.
9. **Brand link.** Click wordmark while signed in: → `/chapters`. While signed out: → `/`.
10. **Figures grid.** On overview, click a figure thumbnail — opens existing fullscreen-figure viewer. (Confirm the viewer doesn't depend on chapter context the overview can't provide.)
11. **Recent notes.** Confirm the 3 most recent notes for this chapter render correctly with their section labels.
12. **Cross-link from reader.** Finish reading Chapter 1, click "Chapter overview" CTA in `EndOfChapterCallout` → lands on `/chapter/1` (this track's route).

Cypress: defer to Track 4.1. Recommend `cypress/e2e/chapters-index.cy.js` covering steps 1, 4, 6, 7.

## Handover checklist

- [ ] `/chapters` route registered, public.
- [ ] `ChaptersView.vue` renders index with featured card + grid.
- [ ] Anonymous/signed-in branching works on the index.
- [ ] `/chapter/:number` route registered, public.
- [ ] `ChapterOverviewView.vue` renders left rail + sections + figures grid + recent notes.
- [ ] Default-route redirect for signed-in users to `/chapters`.
- [ ] Wordmark uses `useHomeRoute`.
- [ ] Test plan steps 1–12 pass.
- [ ] PR description names which chapters were tested.

## Risks and call-outs

1. **Route name collision.** `/chapter/:number/:slug` already exists (reader). Adding `/chapter/:number` (overview) sits alongside it. Vue Router resolves the more-specific match correctly, but worth confirming with a unit test or a quick browser check that `/chapter/2/visual-cortex` still hits the reader, not the overview.

2. **`modules.order` reliability.** The "Up Next" logic in Track 3 and the chapter sorting on the index both depend on `modules.order` being correct. Sanity-check existing data; backfill order values if necessary. A migration to enforce `order int not null` may make sense, but is invasive — only do it if data is messy.

3. **Cover images.** Chapter 1 (legacy) may not have a cover image in Supabase. Either backfill, hard-code a fallback in the JSON, or render a placeholder cover (the umbrella spec's mockup uses generative gradients as fallbacks — option to consider).

4. **Featured-card heuristic.** "Most recent reading_progress that isn't 100% complete" is one option. Alternatives: "lowest-numbered incomplete chapter" or "most paragraphs read in last 7 days." Pick the simplest that doesn't surprise users. The simplest is also probably what we ship.

5. **Default-route redirect surprise.** Users who bookmark `/` will suddenly land on `/chapters` after this ships. Mostly fine for signed-in users (they want their library), but worth mentioning in release notes if there is one.

6. **Performance.** `/chapters` fetches all modules + all progress for the user. For 30+ chapters this is fine. If catalog grows to 100+, consider pagination or skeleton-loading. Not a v1 concern.

## Definition of done

Track 4 is done when:
- A signed-in user lands on `/chapters` after sign-in and can navigate to any chapter's overview, then into the reader.
- An anonymous user can browse the chapter index and overview without progress UI but can sign in inline.
- The default-route redirect works without breaking dashboard/role-redirect logic.
- Reader's end-of-chapter "Chapter overview" CTA routes here correctly.
- Test plan passes on Chapter 1 (legacy) and at least one Supabase chapter.
