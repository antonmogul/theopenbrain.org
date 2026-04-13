# Design Spec: Role Switcher, Navigation, Media Viewer & Responsive

**Date:** 2026-04-13
**Branch:** `dev`
**Status:** Draft

---

## Context

The Open Brain has 7 feature phases built via Ralph Loop sprints, all on the `dev` branch with ~50 modified and ~25 new untracked files. The app currently requires 1300px+ screens and blocks smaller devices. This session addresses:

1. Git housekeeping (commit + branch cleanup)
2. Dev-only role switcher for testing Creator/Professor/Student views
3. Running pending Supabase migrations
4. Textbook navigation redesign (mini TOC + sidebar cleanup)
5. Improved media/diagram viewer in Creator dashboard
6. Full responsive design (375px+) with phone, tablet, and desktop tiers

---

## Workstream 0: Git Housekeeping

### What
- Commit all working tree changes on `dev` as a single commit
- Add root `*.png` debug screenshots to `.gitignore`
- Delete stale local branches: `feature/professor-dashboard`, `feature/role-based-dashboard`, `claude/review-creator-admin-*`
- Delete stale remote branch: `origin/claude/review-creator-admin-*`

### Files
- `.gitignore` — add screenshot exclusion pattern

---

## Workstream 1: Dev-Only Role Switcher

### Problem
Testing all 3 roles (Creator, Professor, Student) requires signing in with different accounts. We need a fast way to flip between roles for development.

### Design

**Override mechanism in `useAuth.js`:**
- Add a module-scope `devRoleOverride` ref (alongside existing `user`, `session`, `profile` refs)
- Modify `userRole` computed to check override first, gated by `import.meta.env.DEV`:
  ```
  if DEV and devRoleOverride.value → return override
  else → return profile.role ?? user_metadata.role
  ```
- Export `devRoleOverride` as a named export (needed by router guard)
- Add `setDevRole(role)` and `clearDevRole()` functions in the composable return, gated by DEV

**Router guard (`router/index.js`):**
- Import `devRoleOverride` directly from `useAuth.js`
- Before the Supabase REST role fetch, check: if DEV and override is set, use override role for all redirect logic and skip the REST call

**DevToolbar component (`components/dev/DevToolbar.vue`):**
- Fixed position bottom-right (`bottom-6 right-6 z-[9999]`)
- Semi-transparent dark background with "DEV" label
- Three role buttons: Creator, Professor, Student
- Reset button to clear override (reverts to DB role)
- Shows current effective role
- Only visible when `import.meta.env.DEV` is true

**Mounting in `App.vue`:**
- Conditionally import via `defineAsyncComponent` (tree-shaken from production)
- Render outside main layout, as a sibling of RouterView

### Files
| File | Action |
|------|--------|
| `src/composables/useAuth.js` | Add `devRoleOverride` ref, modify `userRole` computed, export setter/getter |
| `src/router/index.js` | Import `devRoleOverride`, short-circuit guard when override active |
| `src/components/dev/DevToolbar.vue` | **Create** — floating role switcher |
| `src/App.vue` | Conditionally render DevToolbar |

### Production safety
- `import.meta.env.DEV` is `false` in all build modes except `npm start`
- Vite tree-shakes dead `if (false)` branches, so the override code and DevToolbar component are completely removed from production bundles
- `devRoleOverride` defaults to `null`, which means the `if` check is falsy — zero impact on non-dev behavior

---

## Workstream 2: Run Supabase Migrations

### What
Apply 5 pending migrations in `supabase/migrations/`:

1. `20250219000000_create_references_table.sql` — References table + RLS
2. `20250220000000_add_highlight_tags.sql` — Highlight tags column
3. `20250220000001_seed_chapter2_references.sql` — Seed chapter 2 references
4. `20250220000002_demo_features_setup.sql` — Demo quizzes, labs, flashcards
5. `20260406000000_seed_chapter1_animations.sql` — Seed chapter 1 animations into DB

### Process
1. Check which are already applied (`supabase migration list` or query `supabase_migrations.schema_migrations`)
2. Run missing migrations in order
3. Verify: `references` table exists with data, `animations` table has chapter 1 entries

### Dependencies
- Supabase CLI or SQL editor access
- `20260406000000` migration may need `service_role` key to bypass RLS for inserts

---

## Workstream 3: Navigation — Mini TOC + Sidebar Cleanup

### Problem
- MenuNav sidebar is 50vw wide (excessive)
- Chapter 1 is hardcoded separately from Supabase chapters
- Non-current chapters show "Navigate to chapter to see sections" (useless)
- No persistent orientation for where you are in a chapter

### Design

#### 3A. Mini Table of Contents (`TableOfContents.vue`)

**Desktop (>= 1300px) — Vertical dots:**
```
┌────────┬─┬────────────┐
│ Illus  │●│  Chapter     │
│        │○│  text...     │
│        │○│             │
│        │○│             │
│        │○│             │
└────────┴─┴────────────┘
         ↑
    Fixed, vertically centered
    Left edge of text column
```

- Fixed position, vertically centered on left edge of text column
- One dot per section (read from `storeText.text.sections`)
- Active section filled violet (tracks `store.currentSubChapter`)
- Hover shows section title as a tooltip
- Click scrolls to section via `scrollIntoView`
- Hidden when `store.activeMenu` is true (avoids overlap with sidebar)
- Hidden below 1300px (desktop only for vertical layout)

**Tablet (768px–1299px) — Horizontal section indicator in ReaderTopBar:**
- Compact horizontal dots or abbreviated section numbers
- Integrated into the existing ReaderTopBar breadcrumb area
- Active section highlighted, clickable to scroll

**Phone (< 768px) — No TOC:**
- Mini TOC hidden entirely (too small to be useful)
- Users navigate via ReaderTopBar dropdown (already works)

#### 3B. Sidebar Cleanup (`MenuNav.vue`)

| Change | Before | After |
|--------|--------|-------|
| Width (desktop) | `w-[50vw]` | `max-w-[480px]` |
| Width (tablet) | N/A (blocked) | `max-w-[480px]` |
| Width (phone) | N/A (blocked) | `w-full` (full overlay) |
| Chapter 1 | Hardcoded `ch1` object | Loaded from Supabase modules (fallback to hardcode if migration not run) |
| Non-current sections | "Navigate to see sections" | Pre-fetched section titles for all chapters |
| Section fetch | Only current chapter | Single query: `sections?select=id,title,slug,module_id,order_index&order=order_index.asc` on sidebar open |

#### 3C. ReaderTopBar Additions

- Add prev/next chapter navigation arrows (left/right of chapter title)
- Show reading progress percentage number alongside progress bar
- On tablet: integrate horizontal section dots into the bar

### Files
| File | Action |
|------|--------|
| `src/components/chapter/TableOfContents.vue` | **Create** — mini TOC component |
| `src/components/Navigation/MenuNav.vue` | Modify — width, remove hardcode, pre-fetch sections |
| `src/components/chapter/ReaderTopBar.vue` | Modify — add prev/next, progress %, tablet section dots |
| `src/views/ChapterView.vue` | Modify — render TableOfContents |
| `src/stores/index.js` | Add `allSections` ref to `useGeneral` — cached section titles for all chapters, populated by MenuNav on first open |

---

## Workstream 4: Improved Media/Diagram Viewer

### Problem
- MediaDetails preview shows static image only (no Lottie playback, no video, no YouTube)
- Preview panel is small (1/4 of grid)
- No fullscreen/lightbox option

### Design

#### 4A. Live Preview in `MediaDetails.vue`

Type-specific rendering in the preview area:

| Type | Rendering |
|------|-----------|
| Lottie | Dynamic import `lottie-web`, render in container, auto-play loop. Destroy on unmount/item change. |
| Video | `<video>` tag with native controls |
| YouTube | `<iframe>` with embed URL (extract video ID from stored URL) |
| Image | `<img>` with `object-contain` |
| Unknown | Existing SVG placeholder |

#### 4B. Fullscreen Lightbox (`MediaLightbox.vue`)

- Teleported to `<body>`, fixed fullscreen overlay with dark backdrop
- Same type-switching renderer as preview
- For Lottie: play/pause, speed control, scrub slider
- For images: contain in viewport with padding
- Close on Escape, backdrop click, or X button
- Triggered by "Expand" button on the preview area

#### 4C. Layout Improvement in `MediaSection.vue`

- When no item selected: 4-column card grid (unchanged)
- When item selected: 50/50 split (cards left, details right) instead of current 75/25
- On tablet: stack vertically (cards above, details below)
- On phone: details slide in as a full-screen overlay

### Files
| File | Action |
|------|--------|
| `src/components/dashboard/media/MediaDetails.vue` | Modify — live Lottie/video/YouTube preview, fullscreen button |
| `src/components/dashboard/media/MediaLightbox.vue` | **Create** — fullscreen viewer |
| `src/components/dashboard/media/MediaSection.vue` | Modify — layout proportions, responsive grid |

---

## Workstream 5: Full Responsive Design (375px+)

### Responsive Tiers

| Tier | Breakpoint | Key Characteristics |
|------|-----------|---------------------|
| **Phone** | 375px–767px | Single column, full-width text, edge-to-edge, no illustrations, no mini TOC, full-overlay sidebars, hamburger nav in dashboard |
| **Tablet** | 768px–1299px | Single column with reading-width margins (`max-width: 700px` centered), horizontal section indicator in ReaderTopBar, "View diagram" buttons at trigger points, sidebar max-w-[480px], dashboard sidebar persistent at 240px |
| **Desktop** | 1300px+ | Current 50/50 split — **completely unchanged**. Vertical mini TOC. Full sidebar. |

### 5A. Tailwind Config Update

**Breakpoint rename:**

| Old | New | Value |
|-----|-----|-------|
| `s` | `sm` | 640px |
| (new) | `md` | 768px |
| (new) | `lg` | 1024px |
| `m` | `xl` | 1300px |
| `l` | `2xl` | 1500px |

Search-and-replace across codebase:
- `s:` → `sm:` (check all files using `s:` Tailwind prefix)
- `m:` → `xl:` (check all files using `m:` prefix)
- `l:` → `2xl:` (check all files using `l:` prefix)

Add responsive width utilities:
```js
width: {
  text: 'min(50vw, calc(780px + 11rem))',       // desktop only
  illus: 'max(50vw, calc(100vw - 780px - 11rem))', // desktop only
  'text-tablet': '700px',                        // tablet reading width
},
```

### 5B. Remove MediaQueryWarning Gate

In `App.vue`:
- Remove the `v-if="isLargeScreen"` / `v-else` gate
- Delete `MediaQueryWarning.vue` component
- App always renders regardless of screen size

### 5C. Chapter View Responsive

**TextComp.vue:**

| Property | Phone | Tablet | Desktop |
|----------|-------|--------|---------|
| Width | `w-full` | `w-full max-w-[700px] mx-auto` | `w-text` (existing) |
| Margin-left | `0` | `auto` (centered) | `calc(100vw - w-text)` (existing) |
| Padding | `px-5` | `px-8` | `pl-20 pr-24` (existing) |
| Top offset | `0` | `0` | `calc(100vh)` (existing, for illustration scroll) |

**IllustrationsComp.vue:**
- Phone + Tablet: `hidden xl:block` (completely hidden below 1300px)
- At animation trigger points in text, render a "View illustration" button:
  - Small, inline, styled like `[Eye anatomy ▸]`
  - Tapping opens the illustration in a fullscreen overlay (reuse MediaLightbox pattern)
  - The button text comes from the animation name/title

**FullScreenIllustration.vue / FullScreenIllustrationLoop.vue etc:**
- The `-translate-x-custom` class and `w-screen` breakout: wrap in `xl:` prefix
- On mobile these won't render (parent is hidden), but guard defensively

### 5D. Dashboard Responsive

**Phone (< 768px):**
```
┌─────────────────────┐
│ ☰  Dashboard        │  ← mobile header with hamburger
├─────────────────────┤
│                     │
│  Main content       │
│  (full width)       │
│                     │
└─────────────────────┘

Hamburger opens full-screen sidebar overlay
```

**Tablet (768px–1299px):**
```
┌──────┬──────────────┐
│ Nav  │              │
│ 240px│  Main content│
│      │  (flex-1)    │
│      │              │
└──────┴──────────────┘

Narrower persistent sidebar (240px vs 300px)
```

**Desktop (1300px+):**
Unchanged (300px sticky sidebar + flex-1 main).

Implementation in `DashboardView.vue`:
- Add `dashboardMenuOpen` ref for mobile hamburger state
- Sidebar: `fixed inset-y-0 left-0 w-[300px] -translate-x-full md:translate-x-0 md:relative md:w-[240px] xl:w-[300px]`
- When `dashboardMenuOpen`: `translate-x-0` with backdrop overlay
- Add mobile header bar with hamburger toggle (visible below `md:`)

### 5E. Navigation Components Responsive

| Component | Phone | Tablet | Desktop |
|-----------|-------|--------|---------|
| `BottomNav.vue` | `w-10 h-10` buttons | `w-12 h-12` | `w-14 h-14` (existing) |
| `MenuNav.vue` | `w-full` overlay | `max-w-[480px]` | `max-w-[480px]` |
| `MenuAbout.vue` | `w-full` | `max-w-[480px]` | `w-[50vw]` (existing) |
| `MenuAuth.vue` | `w-full` | `max-w-[480px]` | `w-[50vw]` (existing) |
| `ReaderTopBar.vue` | Compact, smaller text | + horizontal section dots | Full (existing) |
| `ReaderSidebar.vue` | `w-full` overlay | `w-full` overlay | `w-[400px]` (existing) |

### 5F. Typography Scaling

Add to `index.css`:

```css
/* Tablet (768px–1299px) */
@media (max-width: 1299px) {
  .text-base { font-size: 1.8rem; line-height: 2.8rem; }
  .text-small { font-size: 1.25rem; line-height: 1.75rem; }
  h1 { font-size: 3.5rem; line-height: 4rem; padding-bottom: 3rem; }
  h2 { font-size: 3.2rem; line-height: 4rem; }
  h3 { font-size: 2.6rem; line-height: 3.2rem; }
}

/* Phone (< 768px) */
@media (max-width: 767px) {
  .text-base { font-size: 1.6rem; line-height: 2.5rem; }
  .text-small { font-size: 1.15rem; line-height: 1.6rem; }
  h1 { font-size: 2.8rem; line-height: 3.2rem; padding-bottom: 2rem; }
  h2 { font-size: 2.6rem; line-height: 3.2rem; }
  h3 { font-size: 2.2rem; line-height: 2.8rem; }
}
```

### 5G. Fix Global CSS Calculations in `index.css`

These rules use `calc(50vw - ...)` positioning that assumes the desktop split:

| Rule | Current | Fix |
|------|---------|-----|
| `.punkt, .punktComment` | `left: calc(50vw - min(...))` | Wrap in `@media (min-width: 1300px)`. Mobile default: `left: -1.25rem` |
| `.marker-start, .marker-end` | `left: calc(100vw - min(50vw, ...))` | Same: desktop-only. Mobile: `left: 0` |
| `.marker-center` | `left: calc(100vw - min(50vw, ...))` | Same pattern |
| `.-translate-x-custom` | `translateX(min(-50vw, ...))` | `transform: none` on mobile, keep on desktop |

### 5H. Implementation Order

1. Tailwind config breakpoints + search-replace `s:/m:/l:` usages
2. Remove MediaQueryWarning gate from App.vue
3. TextComp.vue single-column on mobile/tablet
4. Hide IllustrationsComp on mobile/tablet, add "View illustration" buttons
5. Navigation components responsive (MenuNav, BottomNav, MenuAuth, MenuAbout)
6. Dashboard responsive (hamburger, sidebar drawer)
7. Fix index.css global calculations
8. Typography scaling
9. ReaderTopBar + ReaderSidebar responsive
10. Test FullScreenIllustration breakouts

### Risk Areas

- **GSAP ScrollTrigger:** Only runs on desktop (>= 1300px) since illustrations are hidden on mobile/tablet. No refactoring needed. Call `ScrollTrigger.refresh()` on resize crossing the 1300px boundary.
- **Lottie performance:** Large Lottie files (2+ MB) won't load on mobile (illustrations hidden). Only matters for the "View illustration" overlay — lazy-load on tap.
- **Tailwind breakpoint rename:** The `s:` / `m:` / `l:` prefixes are used across the codebase. Must search-and-replace carefully. Regex: `\bs:` → `sm:`, `\bm:` → `xl:`, `\bl:` → `2xl:`.
- **Fixed positioning on mobile:** Multiple components use `position: fixed` with various z-indexes. Need z-index audit:
  - `z-[9999]` — DevToolbar (dev only)
  - `z-[60]` — BottomNav
  - `z-50` — MenuNav, ReaderSidebar
  - `z-40` — MenuNav backdrop
  - `z-30` — IllustrationsComp (hidden on mobile)

---

## Dependency Graph

```
Workstream 0 (Git commit)
    ↓
Workstream 1 (Role switcher)     Workstream 2 (Migrations)
    ↓                                ↓
Workstream 3 (Navigation)        Workstream 4 (Media viewer)
    ↓                                ↓
         Workstream 5 (Responsive)
```

- WS 1 + 2 are parallel (no dependencies between them)
- WS 3 depends on WS 2 (removing Ch1 hardcoding needs Ch1 in Supabase)
- WS 3 + 4 are parallel
- WS 5 is last (touches nearly every file, benefits from stable foundation)

---

## Verification Plan

After each workstream, verify:

| WS | Verification |
|----|-------------|
| 0 | `git status` clean, stale branches deleted, `git log` shows commit |
| 1 | Switch roles via DevToolbar, navigate to /dashboard /professor /student — each loads correct view. Production build: DevToolbar absent. |
| 2 | Chapter 1 loads with animations from Supabase. `references` table has data. |
| 3 | Mini TOC visible on desktop, tracks scroll position. Sidebar shows all chapter sections. Prev/next chapter works. |
| 4 | Select Lottie/video/image in Media section — live preview plays. Fullscreen lightbox opens and closes. |
| 5 | Test at 375px, 768px, 1024px, 1300px, 1920px widths. Chapter text readable at all sizes. Dashboard navigable on phone. Navigation works on all tiers. No horizontal scroll. |
