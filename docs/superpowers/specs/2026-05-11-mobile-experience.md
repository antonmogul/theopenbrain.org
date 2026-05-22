# Track 5 — Mobile experience

**Date:** 2026-05-22
**Status:** Draft — pending review
**Parent:** `2026-05-11-design-refresh-overview.md`
**Depends on:** Tracks 1 (tokens) + 3 (reader components stable) + 4 (chapter index/overview shapes finalized). Track 5 absorbs Tracks 3 & 4 layouts at `<768px` — start it after those are at least mostly done so we're not chasing a moving target.

## Purpose

Today the app requires `>=1300px` viewport and shows a `MediaQueryWarning` "use a bigger screen" message on anything smaller. Track 5 replaces that gate with actual mobile layouts so phones and small tablets become first-class citizens.

## Scope

In scope:
- Define the viewport branch point (recommend `<768px` per the umbrella, with a `md`/`lg` middle band that uses the current desktop layout).
- Mobile reader: single integrated stream with slim app bar, hero block, prose interleaved with inline-rendered diagrams.
- Two-state bottom sheet (peek 12% / expanded 90%) replacing the right-side `ReaderSidebar` on mobile.
- Mobile chapter index (single-column variant of Track 4's grid).
- Mobile chapter overview (stacked variant of Track 4's two-column layout).
- Mobile Settings (single column with theme cards 3-up, segmented size control, accent dots).
- `IllustrationInline.vue` wrapper that renders any `Illus/*` component in flow at full container width with a fullscreen-expand button.
- Retire `MediaQueryWarning.vue` once mobile layouts are verified.

Out of scope:
- Native mobile apps (iOS/Android). Web only.
- Rewriting `Illus/*` internals to render better on mobile — Track 5 wraps them, doesn't fix them. Components that genuinely don't work small show as fullscreen-by-default with a thumbnail preview.
- Touch-gesture-driven scroll animations beyond what already works.

Explicitly deferred:
- Mobile dashboard / editor surfaces. Out of scope this round — these are creator/professor tools, fine on desktop.
- Mobile-optimized AI tutor / chat UX beyond what the bottom sheet exposes.

## Resolved open question (from umbrella spec)

**Q5 (umbrella): Mobile illustrations fallback.**
Recommendation: **per-component opt-in.** Default behavior is the new `IllustrationInline` wrapper that renders the component inline at full container width with a fullscreen-expand button. Components that genuinely break below 768px (e.g., split-screen variants like `FullScreenIllustrationSplit`) opt out by setting a `static mobileFallback = 'fullscreen'` flag in their script, which makes `IllustrationInline` render a static thumbnail + tap-to-fullscreen instead of trying to render the live component inline.

This keeps the default zero-config (every illustration works on mobile somehow) while allowing per-component escape hatches without rewriting them.

## Current state (as of 2026-05-22)

| Piece | File | Status |
|---|---|---|
| Viewport-blocking warning | `src/components/UI/MediaQueryWarning.vue` | Active. Blocks `<1300px`. |
| Desktop reader | `ChapterView.vue` + `IllustrationsComp.vue` + `TextComp.vue` | Working. |
| Right floating panel | `ReaderSidebar.vue` | Working. |
| `BottomNav.vue` | `src/components/Navigation/BottomNav.vue` | Working on all viewports; serves well as the basis for mobile app bar. |
| Tailwind breakpoints | `md: 768px` defined | Available. |
| `useMediaQuery` composable | — | **Missing.** Need a small composable to drive mobile branching from JS (CSS-only branching for layout, JS for component selection). |

## Target deliverables

### D1. `useMediaQuery` composable

Tiny composable (~20 LOC) using `window.matchMedia`. Reactive boolean.

```js
// src/composables/useMediaQuery.js
import { ref, onMounted, onBeforeUnmount } from "vue";
export function useMediaQuery(query) {
  const matches = ref(false);
  let mq;
  const handler = (e) => (matches.value = e.matches);
  onMounted(() => {
    mq = window.matchMedia(query);
    matches.value = mq.matches;
    mq.addEventListener("change", handler);
  });
  onBeforeUnmount(() => mq?.removeEventListener("change", handler));
  return matches;
}

// usage: const isMobile = useMediaQuery("(max-width: 767px)");
```

Lives in `src/composables/useMediaQuery.js`. Used by views to switch between desktop and mobile layout variants.

### D2. Mobile reader (single integrated stream)

New file `src/views/ChapterViewMobile.vue` OR conditional rendering inside `ChapterView.vue` based on `useMediaQuery`. Recommendation: separate file. Cleaner than `v-if`-spaghetti in a 450-LOC desktop component.

Structure:
```
┌─────────────────────────────┐
│ ☰  Chapter 1 — Retina   ●  │ ← slim sticky app bar (menu, title, progress dot)
├─────────────────────────────┤
│ Hero block                  │ ← cover image + chapter title in serif
│ ┌─────────────────────────┐ │
│ │ The Retina              │ │
│ │ "When light enters..."  │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Section 1: Photoreceptors   │
│                             │
│ Lorem ipsum prose ...       │
│                             │
│ [inline illustration]       │ ← IllustrationInline wrapper
│ [expand ⛶]                  │
│                             │
│ More prose ...              │
│                             │
│ ┌─ Quiz checkpoint ──────┐  │ ← inline demo (was a modal on desktop)
│ │ Quick check: pick one  │  │
│ └────────────────────────┘  │
├─────────────────────────────┤
│ Section 2: ...              │
└─────────────────────────────┘
                              [Notebook] ← bottom-sheet handle (peek state)
```

Behavior:
- Single column. Prose, illustrations, demos all flow vertically.
- Illustrations render via `IllustrationInline` (D4) — full-width, in-flow, with an expand button.
- Demos (`DemoModal` on desktop) render inline as section-break cards. They don't dim/cover the page on mobile.
- Sticky app bar uses `BottomNav.vue`'s existing styles, just at the top with a fixed height. Or extract a new `MobileAppBar.vue`.
- Reading progress is shown as a small dot in the bar that fills as the user scrolls.

Routing: `/chapter/:number/:slug` still resolves to `ChapterView.vue`. If we go the separate-file route, `ChapterView.vue` checks `useMediaQuery("(max-width: 767px)")` and either renders its current desktop layout or delegates to `ChapterViewMobile.vue`. Single route, two implementations.

### D3. Two-state bottom sheet (Notebook & Tools)

Replaces `ReaderSidebar.vue` on mobile.

States:
- **Peek (12vh):** small handle + label "Notebook & tools" at the bottom of the viewport. Tap-up or swipe-up expands.
- **Expanded (90vh):** full sheet covering all but the top 10%. Contains the same Info/Notebook/Chat tabs as desktop sidebar. Swipe-down or tap backdrop collapses.

Component: new `src/components/chapter/BottomSheet.vue`. Wraps the same tab content (`InfoTab`, `NotebookTab`, `ChatTab`) used by `ReaderSidebar`. Different chrome, same content.

Implementation notes:
- No drag library — `touchstart`/`touchmove`/`touchend` enough.
- Snap to peek or expanded based on velocity + position at touchend.
- Backdrop fades in proportional to expansion.
- ARIA: `role="dialog"`, `aria-modal="true"` when expanded.

### D4. `IllustrationInline.vue` wrapper

New file `src/components/chapter/Illus/IllustrationInline.vue`. Wraps any `Illus/*` component:

```vue
<script setup>
import { ref, computed } from "vue";
defineProps({ component: Object, props: Object });
const expanded = ref(false);
const fallbackToFullscreen = computed(
  () => props.component?.mobileFallback === "fullscreen"
);
</script>

<template>
  <figure class="illu-inline">
    <template v-if="!fallbackToFullscreen">
      <component :is="component" v-bind="props" class="inline-mode" />
      <button @click="expanded = true" aria-label="Expand">⛶</button>
    </template>
    <template v-else>
      <button @click="expanded = true" class="thumb-only">
        <!-- static thumb if available -->
        Tap to view illustration
      </button>
    </template>
    <FullScreenIllustration v-if="expanded" @close="expanded = false">
      <component :is="component" v-bind="props" />
    </FullScreenIllustration>
  </figure>
</template>
```

Per-component `mobileFallback = 'fullscreen'` opts a component out of inline rendering. Default = inline.

### D5. Mobile chapter index

If Track 4 shipped `ChaptersView.vue` with a responsive grid (4/3/2/1 cols by breakpoint), the mobile variant may already work — single column at small viewports. Confirm:
- Featured "Continue Reading" card stacks above the grid (not floated right).
- Grid is 1 col below 768px.
- Spacing/typography read well on a 375px-wide viewport.

If `ChaptersView.vue` doesn't naturally adapt, add a mobile-specific section at the bottom of its `<style>` (no new component needed for v1).

### D6. Mobile chapter overview

Track 4's `ChapterOverviewView.vue` is two-column (320px left rail + right content). On mobile this stacks: rail content (cover + title + CTAs) flows above section list. Sections list compresses to a single column. Figures grid drops to 2 cols.

Same approach as D5 — CSS-only adaptation in the existing component unless that gets too messy.

### D7. Mobile Settings

`SettingsView.vue` already has a `@media (max-width: 767px)` block that reduces padding. Expand:
- Theme cards: stay 3-up (already work).
- Accent swatches: stay 4-up (current grid is fine).
- Font picker: change from 5-col grid to 2-col stacked grid (already in D1 of Track 2's FontPairPicker).
- Segmented controls: full-width, larger tap targets.
- Cards stack normally; padding reduced.

Likely a small CSS pass on existing components.

### D8. Retire `MediaQueryWarning`

After D2–D7 are verified working, remove the warning from `App.vue`. Keep the file for one release as a feature-flag fallback (`?legacyMobileWarning=1` query param re-enables it) in case mobile regressions get reported in the wild. Delete the file in a follow-up cleanup commit.

Alternative: skip the feature flag, just delete it. Recommendation: feature flag for one release, then delete. The flag itself is ~5 LOC.

## Files touched

New:
- `docs/superpowers/specs/2026-05-11-mobile-experience.md` (this file)
- `src/composables/useMediaQuery.js` (D1)
- `src/views/ChapterViewMobile.vue` (D2) — or a major refactor of `ChapterView.vue` if going single-file
- `src/components/chapter/BottomSheet.vue` (D3)
- `src/components/Navigation/MobileAppBar.vue` (D2) — possibly
- `src/components/chapter/Illus/IllustrationInline.vue` (D4)

Modified:
- `src/views/ChapterView.vue` — branch on `useMediaQuery` (D2)
- `src/views/ChaptersView.vue` — mobile-friendly styles (D5) [created in Track 4]
- `src/views/ChapterOverviewView.vue` — mobile-friendly styles (D6) [created in Track 4]
- `src/views/SettingsView.vue` — mobile polish pass (D7)
- `src/App.vue` — remove `MediaQueryWarning` or hide behind flag (D8)
- `src/components/UI/MediaQueryWarning.vue` — file removed in follow-up

## Test plan

Manual on real devices (iPhone Safari + Android Chrome + iPad Safari) at minimum. Browser devtools mobile simulation as smoke test.

1. **Viewport branch.** Resize browser from 1500px → 1300px → 1000px → 800px → 700px → 400px. At 767px and below, mobile layouts should activate. No jank during transition.
2. **Mobile reader.** On iPhone, open `/chapter/1/the-retina`. Confirm: single-column flow, slim app bar at top, illustrations inline with expand button, demos inline as section cards. Scroll fluidly.
3. **Bottom sheet.** Tap the peek handle. Sheet expands smoothly to 90vh. Swipe down — collapses. Backdrop dims while expanded. Tap backdrop — collapses.
4. **Illustration inline + expand.** For a chapter with at least 3 different `Illus/*` components: confirm each renders inline. Tap expand — fullscreen viewer opens. Tap close — returns to inline view, scroll position preserved.
5. **Illustration fullscreen-fallback.** For at least one component flagged `mobileFallback = 'fullscreen'`: inline renders a tap-to-view card; tapping opens fullscreen.
6. **Chapter index.** Open `/chapters` on iPhone. Single-column grid, featured card stacks above. Tap a chapter — lands on overview.
7. **Chapter overview.** Stacked layout. Tap a section — lands on the reader.
8. **Settings.** Open `/settings` on iPhone. Cards stack, controls have comfortable tap targets, no horizontal scroll.
9. **Theme switching.** Flip theme to dark from mobile Settings. Reader, index, overview all re-render in dark immediately.
10. **No `MediaQueryWarning`.** After D8, confirm the warning doesn't appear on any mobile viewport.
11. **iPad landscape.** At iPad's ~1024px landscape, confirm we use the desktop layout (above 768px branch). At iPad portrait (~768px-820px depending on model) we're right at the boundary — verify the branch decision feels right.
12. **Performance.** On a mid-range Android device (or throttled CPU), confirm scroll is smooth at 60fps on chapter view, no input lag on bottom sheet.

Cypress: defer to Track 5.1. Mobile viewport tests are doable in Cypress but the touch-gesture testing is fiddly — manual is fine for this round.

## Handover checklist

- [ ] `useMediaQuery` composable ships.
- [ ] Mobile reader (`ChapterViewMobile` or branched `ChapterView`) renders all sections cleanly on iPhone + Android Chrome.
- [ ] Bottom sheet works: peek/expanded transitions, swipe gestures, backdrop.
- [ ] `IllustrationInline` wrapper handles inline + fullscreen-fallback variants.
- [ ] At least 3 `Illus/*` components confirmed inline-friendly; problem children flagged with `mobileFallback`.
- [ ] Chapter index responsive on mobile.
- [ ] Chapter overview responsive on mobile.
- [ ] Settings page comfortable on mobile.
- [ ] `MediaQueryWarning` removed or behind feature flag.
- [ ] Test plan steps 1–12 pass on at least one iPhone and one Android.
- [ ] PR description names which devices were used for testing.

## Risks and call-outs

1. **`MediaQueryWarning` retirement is one-way.** Once gone, users with broken mobile layouts can't fall back. Mitigation: keep the feature flag fallback for one release; revisit removal after no mobile-bug reports come in.

2. **`Illus/*` mobile rendering is unpredictable.** Some components rely on absolute positioning + viewport-relative units. They may render fine inline at full container width or they may collapse oddly. The `mobileFallback = 'fullscreen'` escape hatch is intentional — accept that some illustrations need it. Plan to spend a session triaging which ones.

3. **Bottom sheet gestures conflict with scroll.** When the sheet is in peek state, swipe-up on the handle should expand the sheet, but swipe-up on the prose below should scroll the page. The boundary is the handle's hit zone. Verify on real devices, not just devtools — touch event interception differs.

4. **iPad portrait is awkward.** At ~810px wide (iPad mini), we're above the 768px branch and using desktop layout — but the figure pane gets cramped. Two options: (a) raise the breakpoint to 900px so iPad portrait uses mobile, (b) tune the desktop layout to work below 900px. Decide during D2.

5. **`ChapterView` already does a lot.** Forking into a mobile variant doubles the surface area. Compromise: extract shared logic (highlights, notes, references, reading progress) into a `useChapterReader` mega-composable; both desktop and mobile views consume it. Adds an abstraction layer but keeps both views thin.

6. **Demos as inline cards may be too prominent on mobile.** Inline quiz/flashcard checkpoints can derail reading flow if too tall. Consider a collapsed default state with a "tap to take quiz" prompt; user expands to play. Decide during D2.

7. **Font-size + tap-target accessibility.** New typography (Newsreader) at mobile size needs verification — ensure body text is at least 16px equivalent (browsers prevent zoom on inputs below that). Tap targets minimum 44×44px per Apple HIG.

## Definition of done

Track 5 is done when:
- A user on iPhone Safari can read any chapter end-to-end, take notes, view illustrations, and navigate the index and overview — without any layout that requires horizontal scrolling or pinch-zoom.
- The two-state bottom sheet replaces the desktop right-side sidebar cleanly.
- `MediaQueryWarning` no longer triggers on supported mobile viewports.
- Across iPhone + Android, every key surface (reader, index, overview, settings) is usable and visually consistent with the desktop design language.
