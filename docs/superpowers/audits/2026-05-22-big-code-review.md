# BIG Code Review — Design Refresh, Admin Token Audit, Diagram System

**Date:** 2026-05-22
**Scope:** Smoke test of the 5-track design refresh on `dev`, audit of admin surfaces for token adoption, deep look at the Chapter 1 diagram system and creator-side admin
**Status:** Audit complete; findings prioritized below

## TL;DR

The 5-track design refresh shipped the *foundation* (tokens, settings, new pages, callouts). Creator + Professor dashboards intentionally keep their own visual identities — that's a design choice, not debt. The **Student dashboard does need migrating** to reader tokens since students see both surfaces as one product. The diagram system has multiple latent bugs and no creator-side authoring UI; it's display-only. Two critical bugs from my Track 3/4 work need immediate fixes.

## 🚨 CRITICAL — fix immediately

### C1. `useChapterCatalog` selects `key_takeaways` column that doesn't exist in prod

**Where:** `src/composables/useChapterCatalog.js:34`
**Impact:** `/chapters` shows blank, `/chapter/:n` shows "Chapter not found" — the entire Track 4 work is **broken in production until the migration is applied**.
**Root cause:** I added `supabase/migrations/20260522000000_modules_add_key_takeaways.sql` but it hasn't been applied to the live Supabase DB. The composable selects the column unconditionally → 400 error → catalog stays empty → both new views fail.
**Fix:** Either (a) apply the migration on Supabase, OR (b) remove `,key_takeaways` from the select in `useChapterCatalog.js` (then re-add when migration runs). Recommend (b) for safety + reorder rollout.

### C2. `EndOfChapterCallout` renders at the top of the page, not at the end

**Where:** `src/views/ChapterView.vue:394` (callout placement) + `src/components/chapter/TextComp.vue:282` (`position: absolute`)
**Impact:** The new end-of-chapter callout is in the DOM but visually positioned ABOVE the chapter content because `<Text>` uses `position: absolute`.
**Root cause:** `TextComp.vue` line 282 wraps the entire chapter prose in `class="absolute top-start ..."`. Anything that follows `<Text>` in the parent template lays out as if `<Text>` had zero height.
**Fix:** Move the callout *inside* `TextComp.vue` at the end of its content, OR refactor `TextComp` to not be absolutely positioned (larger change, breaks other layout assumptions). Lower-risk path: move it inside TextComp.

### C3. `FullScreenIllustration` Lottie loads race with import

**Where:** `src/components/chapter/Illus/FullScreenIllustration.vue:36–53` (and same pattern in `IllustrationOnScrollLinked.vue:34–35`)
**Impact:** Console error `TypeError: Cannot read properties of undefined (reading 'loadAnimation')` — sometimes the fullscreen diagrams don't load. **Pre-existing bug**, not caused by my work. Confirmed live in the smoke test.
**Root cause:** Async dynamic `import("lottie-web")` resolves into a module-scoped `let lottie`, but `onMounted` doesn't `await lottieReady` before calling `lottie.loadAnimation`. When mount happens before the import resolves, Lottie is `undefined`.
**Fix:** Either `await lottieReady` at the top of `onMounted`, or convert to a normal top-level `import lottie from "lottie-web"`. The dynamic import pattern looks like it was for code-splitting, but it's done wrong.

## 🔴 HIGH — meaningful debt or design inconsistency

### H1. Student dashboard doesn't match the reader's token system

**Scope corrected (2026-05-22 review):** Creator and Professor dashboards are *intentionally* on their own visual identities — they're workshop tools for a different audience and that visual distinction is deliberate. They are NOT debt. **Only Student dashboard is misaligned**, because students experience the reader AND the dashboard as one continuous product.

- `StudentDashboardView.vue` (1288 LOC): cool blue palette (`#3b82f6`, `#1f2937`) — should adopt tokens to match reader.
- `DashboardView.vue` (Creator) — keeps legacy violet. **Intentional.**
- `ProfessorDashboardView.vue` — keeps warm sienna palette. **Intentional.**
- `MainNav.vue` — uses legacy violet to match Creator dashboard. **Intentional.**

**Fix:** Migrate `StudentDashboardView` color literals to reader tokens (`--color-accent`, `--color-ink`, `--color-bg`, `--color-paper`, `--color-line`, `--color-mute`). Inventory the ~30 distinct hex/rgb literals and map each to the closest token. Estimated 1-2 hours of mechanical work.

(Original finding overstated this as the biggest piece of debt across all admin. With the design-intent clarification, it's a focused medium-sized cleanup on one file.)

### H2. Global `section { min-height: 100vh }` pollutes every new view

**Where:** `src/index.css:265-267`
**Impact:** Every `<section>` in the app gets a viewport-height minimum. This is from the original chapter design where each section was its own scroll-paged unit. But:
- My `SettingsView.vue` uses `<section>` for each card → every settings card is 900px tall, page is 5818px
- My `EndOfChapterCallout.vue` uses `<section>` → forced to 900px
- Any future component touching `<section>` inherits this

**Fix:** Scope the rule to the chapter view only. E.g.:
```css
.chapter-view section { min-height: 100vh; }
```
…or strip the rule entirely and add per-component `min-height` where needed. The latter is cleaner but riskier (might affect reader). Recommend scoping by adding a wrapping class on `ChapterView.vue`.

### H3. `section { padding-bottom: 24rem }` also bites

**Where:** `src/index.css:294-296`
**Impact:** Same blast radius as H2 — every section gets 240px of bottom padding. Compounds the giant settings cards.

Same fix.

### H4. `supabaseRest` helper duplicated across 10+ composables

**Where:** `useAnimations.js`, `useChapter.js`, `useChapterCatalog.js` (added by me), `useCodeLabs.js`, `useFlashcards.js`, `useHighlights.js`, `useNotes.js`, `useQuizzes.js`, `useReadingProgress.js`, `useStudentCourses.js`, `useTrendingHighlights.js` — flagged in user's project memory already
**Impact:** Some accept options, some don't; some pass auth headers, some don't; some throw on non-2xx, some return null. Inconsistent error handling is a silent-failure risk.
**Fix:** Extract `src/utils/supabaseRest.js` (or `src/services/supabase.js`), migrate composables one at a time. Mechanical refactor; ~30 min of careful sed-and-test.

### H5. `--violet` legacy alias still wires the reader

**Where:** `src/index.css` uses `var(--violet)` in 10 places (citation refs, animation triggers, highlight backgrounds, hover states).
**Impact:** This works through the alias `--violet: rgb(var(--color-accent))` set in `brand.css`, so accent changes DO flow through. But it's brittle: any future contributor will assume `--violet` is purple, not "current accent." The alias is fine as a transition tactic, but it should be marked deprecated and migrated to `var(--color-accent)` in a single sweep.
**Fix:** Replace `var(--violet)` with `rgb(var(--color-accent))` across `index.css` in one PR; delete the alias from `brand.css`. ~5 min of editing.

## 🟡 MEDIUM — quality/correctness issues

### M1. Diagram data integrity is broken

The animations system has multiple data-level inconsistencies:

**Orphan refs** — 8 animations declared in `animations.json` have no Lottie JSON file:
```
animationCataracts, animationDirectionSelectivity, animationLatteralOrganization,
animationNormalVision, animationObjectMotionSensitivity, animationONOFFLamina,
animationRodVsConeCircuits, animationWavesOfActivity
```
These will fail silently when triggered.

**Orphan files** — 13 Lottie files exist but aren't in the JSON:
```
animationCenterSurroundReceptiveFieldsSmalllight, ...WideLight,
animationDirectionSelectivityNull, ...Prefered, animationEye,
animationLatteralOrganizationLeft, ...Right,
animationObjectMotionSensitivityAsymmetricCenter, ...SymmetricCenter,
animationRetinalCellTypes2, animationRodVsConeCircuitsDay, ...Night,
animationStart
```
Some are clearly multi-state variants for animations whose JSON entries have `states`/`switches`. Others (`animationStart`, `animationEye`) look like dropped references.

**Filename typos in the wild:** "Latteral" (3 L's) vs "Lateral" — both appear, picking up the wrong file.

**Fix:** Write a sync script that compares JSON refs ↔ Lottie files ↔ Supabase `animations` rows; raise as a PR with the cleanup. Estimate ~1 hour.

### M2. NO creator-facing UI to edit/add animations

**Where:** `src/constants/dashboard.js` `BLOCK_TYPES` includes section/paragraph/heading/text/list/blockquote/code/**image** — but **no animation/diagram block type**.

The Creator-side chapter editor (`ChapterEditor.vue`, `BlockList.vue`) has no widget to attach a diagram to a paragraph. Animations bind to paragraphs via the DB `animation_id` column, but the UI doesn't expose it. Result: only Chapter 1 has interactive diagrams; new chapters cannot.

This is the **single biggest authoring gap**. To author Chapter 2 with the same interactive depth as Chapter 1, a creator currently needs:
1. SQL access to insert into `animations`, `animation_states`, `animation_variants` tables
2. Lottie file dropped into `public/publicAssets/animations/`
3. Manual `animation_id` set on the paragraph row

**Fix:** New "Diagram" block type + a media-picker style modal that lists available animations + (long-term) Lottie upload + state editor. Big scope — should be its own PRD/track.

### M3. Unused file with syntax error in tree

**Where:** `src/components/chapter/Illus/IllustrationOnScrollLinked.vue:53` — stray `)` character
**Impact:** Build passes because nothing imports it. But: my Track 3 spec named this file as foundational to figure-pin logic — it isn't. The file is dead code.
**Fix:** Delete it. Or, if its intent is unclear, archive it with a `.deprecated` extension and ask whether it was meant to be used.

### M4. Typo'd filename in tree

**Where:** `src/components/chapter/Illus/IllustarionMultiple.vue` (Illust**a**rion, not Illustration)
**Impact:** Looks unprofessional in IDE search; imports against the wrong-cased path would 404. Likely not imported anywhere.
**Fix:** Rename to `IllustrationMultiple.vue` + update imports (probably zero).

### M5. `<Text>` component has Tailwind utility-class color overrides

**Where:** `src/components/chapter/TextComp.vue:287` uses `bg-violet-600` (Tailwind purple) on a fixed badge.
**Impact:** Same as H1 — won't follow accent picker.
**Fix:** Replace `bg-violet-600` with `bg-accent`.

### M6. IBM Plex Sans woff2 files 404

**Console output:** Multiple 404s for `IBMPlexSans-Regular.woff2`, `IBMPlexSans-Italic.woff2`, `IBMPlexSans-SemiBold.woff2`, `IBMPlexMono-Regular.woff2`.
**Impact:** Pre-existing. Browser falls back to next in stack (`ui-sans-serif`, then `system-ui`). Page works but isn't using the intended font on first visit until other Plex weights cached.
**Fix:** Either restore the missing woff2 files, or trim the `@font-face` declarations in `src/ibm-plex.css` to only reference files that exist.

## 🟢 LOW — nice-to-have / cosmetic

### L1. `DashboardView.vue` is 8092 LOC

Megamonolith. The `src/components/dashboard/{analytics,chapters,media,quizzes,users,versions}` subtree exists but is partially adopted. Splitting `DashboardView` into thin orchestration + per-section components is a worthwhile refactor.

### L2. `--font-mono`/`--font-ui`/`--font-body` not consistently used

Some components use Tailwind's `font-sans`/`font-mono`. Others hard-code `font-family: "IBM Plex Sans"` or `"IBM Plex Mono"`. Only the new Settings + chapter callout components reference the CSS variables directly. Mixed system → font-pair picker only flips some text.

### L3. Hard-coded `#f5f3f0` near new `#f7f5f0` token

Several admin views use `#f5f3f0` which is approximately but not exactly the new `--color-bg` token (`#f7f5f0`). Convergence-debt — those should snap to the token.

### L4. `MediaQueryWarning.vue` was already dead code

Track 5's "retire MediaQueryWarning behind feature flag" was scoped against a file that wasn't being used. Deleted in `3bc485b`. Worth noting that the umbrella spec described it as "currently blocking <1300px" — that hadn't been true for a while.

## Recommended next moves, ranked

### Priority 1 — fix the regressions I introduced

1. **C1** — un-break `/chapters` and `/chapter/:n` (remove `key_takeaways` from select OR apply migration). **5 min.**
2. **C2** — move `EndOfChapterCallout` inside `TextComp.vue` so it renders at the bottom of the chapter. **15 min.**

### Priority 2 — clean up pre-existing bugs my smoke test surfaced

3. **C3** — fix Lottie race in `FullScreenIllustration.vue` and `IllustrationOnScrollLinked.vue`. **20 min.**
4. **H2 + H3** — scope `section { min-height: 100vh }` and `padding-bottom: 24rem` to the chapter view. **15 min.**
5. **M3** — delete the dead `IllustrationOnScrollLinked.vue` (with syntax error). **2 min.**

### Priority 3 — focused refactors + biggest product gap

6. **H1** — migrate `StudentDashboardView.vue` to reader tokens (~30 distinct hex/rgb literals; closest-token mapping). Creator + Professor + MainNav stay as-is (by design). **1-2 hours.**
7. **M2** — diagram authoring UI is the biggest product-level gap. PRD/track of its own.
8. **M1** — animation data-integrity sweep (orphan refs + orphan files + filename typos). **1 hour script + cleanup PR.**

### Priority 4 — quality plumbing

9. **H4** — extract shared `supabaseRest`. **30 min, mechanical.**
10. **H5** — sweep `--violet` references to `var(--color-accent)`. **5 min.**
11. **L1** — split `DashboardView.vue` to use existing `dashboard/*` subcomponents. **Multi-session.**

## How I'd sequence this for one session

If you want a tight, high-leverage cleanup session:
- Fix C1, C2, C3, H2/H3, M3 — all the immediate bugs (~1 hour total)
- Sweep H5 (`--violet` → `var(--color-accent)`) (~5 min)
- Stop, push, then schedule a brainstorm on H1 (dashboard tokens) and M2 (diagram authoring) as separate larger pieces of work
