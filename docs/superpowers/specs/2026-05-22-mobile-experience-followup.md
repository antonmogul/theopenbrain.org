# Track 5.1 — Mobile experience (follow-up)

**Date:** 2026-05-22
**Status:** Draft — deferred from Track 5 initial commit
**Parent:** `2026-05-11-mobile-experience.md`

## What landed in Track 5

- `useMediaQuery` composable shipped.
- Dead `MediaQueryWarning.vue` deleted (was already unreferenced).
- New views from Tracks 2, 3, 4 (`SettingsView`, `EndOfChapterCallout`, `ChaptersView`, `ChapterOverviewView`) all include responsive `@media (max-width: 767px)` rules out of the box.

## What this follow-up should ship

The remaining mobile work the Track 5 spec called for. Each item needs real-device testing (iPhone Safari, Android Chrome) to validate — that's why it didn't ship in the initial Track 5 commit.

### D2. Mobile reader (single integrated stream)

A `ChapterView`-mobile variant or in-place branch that:
- Renders prose as a single column.
- Inline-illustration wrapper around each `Illus/*` figure (uses D4 below).
- Inline demo cards instead of `DemoModal` overlay.
- Slim sticky app bar with menu / chapter title / progress dot.

Branch on `useMediaQuery("(max-width: 767px)")`. Recommendation from spec: separate `ChapterViewMobile.vue` file, dispatched from `ChapterView` via `v-if`/component-is, to avoid `v-if` spaghetti.

### D3. Two-state bottom sheet

Replaces `ReaderSidebar` on mobile. Peek (12vh) / expanded (90vh). Touch-gesture driven, no drag library. Wraps existing `InfoTab` / `NotebookTab` / `ChatTab` content.

### D4. `IllustrationInline` wrapper

Renders any `Illus/*` component in-flow at full container width with a fullscreen-expand button. Per-component `mobileFallback = 'fullscreen'` escape hatch for components that genuinely break inline.

Sub-work: triage which `Illus/*` components work inline and which need the fallback flag. Likely candidates for fallback: `FullScreenIllustrationSplit`, anything with `position: absolute` + viewport-relative units.

### Already-deferred (from Track 3)

These are independent of mobile but live in the same general "follow-up" bucket:
- Figure-picker pin UI + scroll-tracking chip
- `FigureNavDots` strip
- `ReaderSidebar` and `DemoModal` visual refresh
- Adjusting the figure/prose split ratio per Track 3 D1

## Suggested order

1. `IllustrationInline` wrapper + per-component triage (D4) — visible payoff for any mobile or small-viewport user, doesn't depend on anything else.
2. Mobile reader branch (D2) — uses D4.
3. Bottom sheet (D3) — uses D2's slim app bar.
4. Track 3 follow-ups (figure pin, dots, demo polish).

Each can be its own commit / PR.

## Risks carried forward

- iPad portrait (~810px) sits awkwardly between mobile and desktop layouts. Decide during D2 whether to raise the breakpoint to ~900px or tune desktop to work at smaller widths.
- Inline quiz/flashcard demo cards may derail reading flow if too tall — consider a collapsed default state with "tap to take" prompt.
- Tap-target accessibility (44×44px minimum) and 16px+ body text to prevent zoom-on-input.
