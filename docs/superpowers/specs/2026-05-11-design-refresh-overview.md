# Design Refresh — Umbrella Spec

**Date:** 2026-05-11
**Status:** Draft — pending review
**Source materials:** `New Design Ideas/Open Brain - Design Brief.html`, `New Design Ideas/prototype.html`, JSX components and screenshots under `New Design Ideas/`

## Premise

The Open Brain on `dev` is a working, multi-role, Supabase-backed interactive textbook with auth, authoring, reader, highlights/notes, AI tutor, code labs, quizzes, flashcards, and dashboards for Creator/Professor/Student. The new design materials are not a redesign — they are a **focused round of usability and polish tweaks** to make the existing product feel more like an interactive textbook and less like a generic web app.

This spec frames the work as four parallel-ish tracks. Each track gets its own detailed spec + implementation plan. Diagram redesign is explicitly deferred.

## What's in scope

1. **UI freshen** — token-first design system (colors, spacing, radii), font system swap (Newsreader serif body + JetBrains Mono + Inter Tight), light/dark/system theme with live `prefers-color-scheme` listening.
2. **User-facing typography & accent controls** — font-pair picker, reading size, line length, accent color, persisted to `localStorage` + Supabase profile. Profile/Settings page scaffold to house them.
3. **Reader layout refinements** — sticky figure pane proportions, scroll-coupled figure swapping, end-of-chapter key-takeaways + stats + CTAs, demo panel (quiz/flashcard/lab) placement.
4. **Missing pages** — functional chapter index (with continue-reading + progress) and per-chapter overview landing.
5. **Mobile experience** — viewport branch at `<768px`, integrated single-column reader stream, two-state bottom sheet for notebook/tools, mobile profile variant, inline-illustration wrapper. Retires `MediaQueryWarning`.

## What's explicitly **out of scope** this round

- **Diagram redesign** — `chapter/Illus/*` internals stay as-is. Track 5 (mobile) wraps them for inline display; it does not rewrite them.
- **New marketing home page** — current `HomeView` (Matisse parallax cards) stays. A future phase reimagines the home page that "sets the screen."
- **Backend/data model changes** — except the small additions needed to persist new profile preferences (font pair, reading size, line length, accent). Supabase schema for highlights, notes, quizzes, reading progress, references, AI tutor, etc. is untouched.
- **Stack migration** — we stay on Vue 3 + Vite + Pinia + Tailwind + Supabase. No move to Next/React.
- **Tailwind removal** — the design brief recommends not using Tailwind. We disagree for this project. Tailwind stays; design tokens drive its config.

## Cross-cutting principles

- **Token-first.** All color, spacing, radius, type values come from CSS custom properties defined in a single `brand.css` (mirrored into `tailwind.config.js` so utility classes work). No hard-coded hex outside the token file. Existing hard-codes get migrated opportunistically as we touch the files.
- **Reversibility for type.** Font system uses `data-fontpair` on `<html>` selecting between `--ob-serif` / `--ob-sans` / `--ob-mono` bindings. "IBM Plex (legacy)" is one of the available pairs so reverting is a single setting toggle, not a code change.
- **Theme via `data-theme` on `<html>`.** System / light / dark; default = system; user override persists. Live `matchMedia` listener on system mode.
- **Respect `prefers-reduced-motion`** plus an explicit user override.
- **Mobile is its own layout, not a squeeze.** Reader, profile, and panels each get a mobile variant when below 768px.
- **No new dependencies unless needed.** TipTap, Pyodide, GSAP, Lottie, chart.js stay. Add Newsreader + JetBrains Mono + Inter Tight as web fonts. Possibly add a small composable for `useMediaQuery` if `@vueuse/core` doesn't already cover it.

## Tracks

### Track 1 — Design tokens and typography
**Spec:** `2026-05-11-design-tokens-and-typography.md`

Replace the current palette (`magenta = purple`, `green = electric green`, generic grays) with the brief's token set:
- Light theme: paper-warm bg `#f7f5f0`, paper `#ffffff`, ink `#0a0a0a`, mute `#6b6b66`
- Dark theme: bg `#0e1313`, paper `#161c1c`, ink `#f3efe6`, mute α 0.55
- Accents: magenta `#E91E8C` (primary), teal `#3DD9B5` (complete/takeaway), amber `#F4A621`, mono ink
- Highlighter palette: yellow / pink / blue / green (user-applied colors)

Adopt the brief's type scale, spacing scale (4/8/12/16/20/24/32/40/48/56/64/80/96/120), radius scale (0/2/6/12/pill).

Wire fonts:
- Default: Newsreader (serif display + body) + Inter Tight (sans UI) + JetBrains Mono (metadata/labels)
- All five font pairs available as `data-fontpair` values: `newsreader` (default), `literata`, `georgia`, `sans`, `ibm-plex-legacy`
- Theme: `data-theme` on `<html>` with `system` / `light` / `dark`; live `matchMedia` listener for system mode

Migrate the existing custom Tailwind color names (`lightest`/`magenta`/`violet`/`green`/etc.) to new token-backed equivalents with aliases so existing components keep compiling during the migration. Audit and clean up over time.

### Track 2 — User typography & accent preferences + Settings page scaffold
**Spec:** `2026-05-11-user-typography-preferences.md`

The visible payoff of Track 1. Adds a Profile / Settings page (full-page route at `/profile` or `/settings`) with at minimum:
- **Reading & display:** font pair (4 cards + IBM Plex legacy), reading size (compact/regular/comfortable), line length (tight/standard/wide), diagram toggles (auto-play step diagrams, reduce motion, inline captions)
- **Theme & accents:** appearance (system/light/dark mini previews), accent color (magenta/teal/amber/mono swatches), highlighter palette toggles

Persistence:
- `localStorage` keys per the brief (`ob.theme`, `ob.fontPair`, `ob.typeSize`, `ob.accent`, `ob.lineLength`, `ob.reduceMotion`)
- Server-side: extend the existing `profiles` table (or add a `user_preferences` table — TBD in Track 2 spec) with these fields, debounced sync 800ms
- On login: pull preferences and merge into localStorage

Email preferences, data & privacy, account sections (per brief) — scaffold the left-rail navigation but defer content to later tracks. This spec focuses on the Reading & Display + Theme & Accents sections only.

### Track 3 — Reader layout refinements
**Spec:** `2026-05-11-reader-layout-refinements.md`

The existing reader already has the right shape (`ChapterView` + `IllustrationsComp` sticky left + `TextComp` right + `ReaderTopBar` + `ReaderSidebar`). Tweaks per the brief:
- Confirm 1.5fr / 1fr split proportions (left figure pane vs right prose); adjust whitespace, padding, sticky top offset relative to top bar
- Confirm scroll-coupled figure swap behavior (`IntersectionObserver` on sections) and add bottom dot indicator showing which sections map to which figure
- Add figure-picker dropdown + "● Tracking scroll" / pinned-figure state to the top of the sticky pane (some of this may already exist in `IllustrationOnScrollLinked` — audit before building)
- End-of-chapter callout: teal-tinted "Key takeaways" block + 4-up reading-stats strip + CTAs (Take quiz / Review flashcards / Chapter overview) + "Up Next" card linking to next chapter
- Demo panel (quiz/flashcard/lab `DemoModal`) — review placement, dressing, transitions

Right-side `ReaderSidebar` with Info/Notebook/Chat tabs already maps to the brief's "floating panel" — keep as-is structurally, refresh visuals only.

### Track 4 — Chapter index + chapter overview pages
**Spec:** `2026-05-11-chapter-index-and-overview.md`

Two new routes:

**`/chapters` — Chapter Index (functional)**
- Hero: title block (left) + featured "Continue Reading" card (right) showing chapter cover, magenta progress bar, time-remaining estimate
- 4-column responsive grid (3 at md, 2 at sm): cover art (3:4), "CHAPTER N" mono label, serif title, mono subtitle, magenta progress bar if started, "Reading" / "✓ Done" pill state
- Pulls from Supabase chapters + per-user reading progress
- Logged-in users: this is their default destination from clicking the wordmark or signing in
- Anonymous users: existing `HomeView` (Matisse marketing) stays as `/`. Whether `/chapters` is publicly accessible (with progress fields hidden) or gated behind auth is a Track 4 decision — see open question 3.

**`/chapter/:n` — Chapter Overview**
- 320px left rail: cover, title, progress, primary CTAs (Continue / Start / Quiz)
- Right column: sections list (each row: number, title, "X% · resume" or "no notes" / "N notes", figure count, minutes, completion check), figures grid, recent notes
- This is a sibling of the existing `/chapter/:number/:slug` reader route — it's the entry point a user sees when they click into a chapter from the index, then they pick a section to read

Login: brief proposes a dedicated two-column page. **Decision:** stay with current `MenuAuth` modal for this round to keep scope tight; consider promoting to a page in a later phase.

### Track 5 — Mobile experience
**Spec:** `2026-05-11-mobile-experience.md`

Below 768px, branch to mobile layouts:
- Replace `MediaQueryWarning` (the "use a bigger screen" warning) with actual mobile layouts
- **Mobile reader:** single integrated stream — slim sticky app bar (menu + chapter title + progress dot), hero block, prose sections interleaved with inline-rendered diagrams (each with fullscreen-expand control), inline quiz/flashcard/lab checkpoints between sections
- **Two-state bottom sheet** (peek 12% / expanded 90%) replaces the right-side floating panel for Notebook & Tools
- **Mobile profile:** single-column variant — top bar, avatar+name header, theme cards 3-up, segmented size control, accent dots, email-prefs list, sign-out button at foot
- **Mobile chapter index:** stacked single-column grid
- **Inline-illustration wrapper:** new `IllustrationInline.vue` that renders an `Illus/*` component in flow at full container width with a fullscreen-expand button. Wraps without modifying the underlying components.

Depends on Track 1 (tokens) and benefits from Track 3 (sticky-pane behavior shouldn't be load-bearing for mobile, but mobile doesn't use the sticky pane at all).

## Sequencing and dependencies

```
Track 1 (tokens + typography)
  ↓
Track 2 (settings page + user prefs)  ←  needs T1
Track 3 (reader refinements)          ←  benefits from T1, structurally independent
Track 4 (chapter index + overview)    ←  needs T1
  ↓
Track 5 (mobile)                       ←  needs T1; absorbs T3 + T4 layouts at <768px
```

Order of execution:
1. **Track 1 first.** Everything downstream consumes the tokens. Within Track 1, do the migration in two phases: first add the new tokens alongside the old ones with aliases pointing back at current values (no visual change), then in the final Track 1 commit flip the values to the new palette/fonts. This means the bulk of Track 1's diff can be code-reviewed without visual chaos.
2. **Tracks 2, 3, 4 in parallel** once Track 1 is in. Different files, different concerns.
3. **Track 5 last.** Needs the new component shapes to exist before mobile variants can branch off them. Track 5 is the one we should not start until the others are at least mostly done — mobile layouts that diverge from a moving target will need constant rework.

## Risks and call-outs

- **Body font swap is a big visible change.** Confirmed in conversation: yes, do it, with IBM Plex available as a one-toggle legacy revert.
- **Color rename collisions.** The current `magenta` Tailwind utility is purple, the new `magenta` is pink. Anywhere the old purple is load-bearing visually (a button people remember, the wordmark) we need to either keep it on its old color via a `--violet-legacy` token or accept it shifts. Audit during Track 1.
- **`MediaQueryWarning` retirement.** Users who currently see a warning on a smaller screen will instead see a mobile layout. Make sure Track 5 ships before retiring the warning, or keep it as a fallback until mobile is verified.
- **Profile preference sync.** Adding new profile columns to Supabase needs a migration. Plan it as part of Track 2 with backward-compat (default values for old rows).
- **CLAUDE.md is stale.** Currently describes the main-branch state, not dev. Worth refreshing as part of Track 1 to capture the new directory structure (composables, services, dashboards). Out of band of the design work itself but worth bundling.

## Deliverables per track

Each track spec describes its own deliverables. At minimum each will produce:
- A concrete list of files touched
- New components / composables / Supabase migrations needed
- Test plan (which Cypress specs exist and what gets added)
- A handover checklist of "what 'done' looks like"

## Open questions to resolve in track specs

1. **Profile route name** — `/profile` vs `/settings` vs nested under dashboard. (Track 2)
2. **Preference storage shape** — flat columns on `profiles` table vs separate `user_preferences` table. (Track 2)
3. **Chapter index access for anonymous users** — gated, public-with-progress-hidden, or sign-in-redirect. (Track 4)
4. **Default route for logged-in users** — does `/` redirect to `/chapters`, or stays on `HomeView`? (Track 4)
5. **Mobile illustrations fallback** — for `Illus/*` components that genuinely don't work below 768px (e.g. split-screen variants), do we substitute a static fallback image, force fullscreen modal, or just expand inline anyway? (Track 5)

## Status

This umbrella spec is **draft, pending user review**. Once approved, Track 1 spec will be the first detailed spec written and implemented.
