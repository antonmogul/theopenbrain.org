# Track 3 — Reader layout refinements

**Date:** 2026-05-22
**Status:** Draft — pending review
**Parent:** `2026-05-11-design-refresh-overview.md`
**Depends on:** Track 1 (tokens + typography). Benefits from Track 2 (settings page exists so users can experience the typography they pick here), but structurally independent.

## Purpose

The reader already has the right shape: `ChapterView` hosts an `IllustrationsComp` (sticky left figure pane) + `TextComp` (right prose) + `ReaderTopBar` + `ReaderSidebar` (right-side floating panel with Info/Notebook/Chat tabs). Track 3 refines the visual treatment, confirms scroll-coupled behavior, adds the end-of-chapter callout, and audits demo-panel placement.

This is **not a rewrite.** It's a polish pass on existing components.

## Scope

In scope:
- Confirm and tune the 1.5fr / 1fr split (figure pane vs prose).
- Confirm scroll-coupled figure swap behavior. **Correction (2026-05-22 audit):** the file `IllustrationOnScrollLinked.vue` was referenced in the umbrella spec as the home of this logic, but it was dead code (unimported, syntactically broken) and has been deleted. The actual scroll-coupled behavior lives in `IllustrationsComp.vue` via GSAP `ScrollTrigger` (not `IntersectionObserver`). Figure-pin work needs to integrate there.
- Add a bottom dot-indicator strip showing which sections map to which figure.
- Add a figure-picker dropdown + "● Tracking scroll" / pinned-figure UI to the top of the sticky pane.
- End-of-chapter callout block: teal-tinted "Key takeaways" + reading-stats strip + CTAs (Take quiz / Review flashcards / Chapter overview) + "Up Next" card linking to next chapter.
- Audit `DemoModal` placement + transitions; refresh visual dressing without changing API.
- Visual refresh of `ReaderSidebar` (right-side Info/Notebook/Chat panel) — keep structure, refresh chrome.

Out of scope:
- Mobile reader (single-column stream, bottom sheet) → **Track 5**.
- Chapter overview page (`/chapter/:n`) → **Track 4**.
- Diagram redesign — `Illus/*` internals stay as-is.
- New quiz/flashcard/lab content — only their *display placement* inside the reader.
- Highlight/notes UX — already working; revisit only if a refresh touch breaks them.

Explicitly deferred:
- Per-section reading-time estimates beyond the simple word-count heuristic.
- Animated transitions between figure swaps (current snap behavior is fine; revisit if it feels rough).

## Current state (as of 2026-05-22)

| Piece | File | Status |
|---|---|---|
| Two-column layout | `ChapterView.vue` + Tailwind `w-text`/`w-illus` | Working. Uses `xl:fixed xl:w-illus` for the figure pane. Token-correct after Track 1 aliases. |
| Sticky figure pane | `IllustrationsComp.vue` | Working. Sticky positioning, full-height. |
| Scroll-coupled figure swap | `IllustrationsComp.vue` (GSAP ScrollTrigger, not the dead `IllustrationOnScrollLinked.vue`) | Working. |
| Top bar | `ReaderTopBar.vue` | Working. ~300 LOC, has chapter title, progress, controls. |
| Right floating panel | `ReaderSidebar.vue` (Info/Notebook/Chat tabs) | Working. ~450 LOC. |
| Demo modal | `chapter/demos/DemoModal.vue` + `ConeExplorerPanel`/`FlashcardPanel`/`LabPanel`/`QuizPanel` | Working. |
| End-of-chapter callout | — | **Missing.** No equivalent component today. |
| Figure-picker dropdown | — | **Missing.** No way to pin a figure or pick from a list. |
| Bottom dot-indicator | — | **Missing.** |

## Target deliverables

### D1. Confirm + tune figure/prose split

The umbrella spec calls for `1.5fr / 1fr` (figure : prose). Current Tailwind uses `w-illus` (figure) = `max(50vw, calc(100vw - 780px - 11rem))` and `w-text` (prose) = `min(50vw, calc(780px + 11rem))`. At 1500px viewport: figure ≈ 750px, text ≈ 750px → 1:1, not 1.5:1.

Decision: pick one of:
- **(a)** Update `tailwind.config.js` `width.text`/`width.illus` to match the 1.5:1 ratio at large viewports. Cleanest.
- **(b)** Leave today's 1:1 and update the umbrella spec to ratify it. Cheaper if 1:1 is visually right.

Recommendation: spend 15 min in the browser comparing both ratios on Chapter 1 with the new typography; pick the one that feels right; document the choice in the PR. The "right" answer here is subjective and design-led.

Also confirm:
- Sticky-top offset of the figure pane relative to `ReaderTopBar` height. Today: figure is `xl:top-0 xl:h-screen`, so it sits behind / overlaps the top bar. Fix: add `top: var(--reader-topbar-h)` and a matching `h: calc(100vh - var(--reader-topbar-h))` once the top-bar height is known.
- Outer padding on the prose column. With user-selectable `--reading-measure` (set in Track 1), the prose column should respect line-length while maintaining a comfortable gutter against the figure pane.

### D2. Figure-picker + tracking-state UI

Add to the top of the sticky figure pane (`IllustrationsComp.vue` or a new wrapper):
- A pill / chip that says either `● Tracking scroll` (if the scroll-linked picker is active) or `📌 Pinned: <figure name>` (if user has chosen a specific figure).
- Click the pill → a dropdown listing all figures for this chapter, with the currently-tracked one marked. Picking one pins it; clicking "Resume tracking" returns to scroll-coupled mode.

Backed by:
- A new tiny composable `useFigurePin` returning `{ pinnedFigureId, pinFigure, unpin }`.
- `IllustrationsComp` updated to skip its ScrollTrigger-driven swap when `pinnedFigureId.value` is non-null.

State is per-chapter, not persisted — pin clears on chapter navigation.

### D3. Bottom dot-indicator strip

Below the figure pane, a horizontal strip of dots, one per chapter section. The dot for the currently-visible section is filled / accent-colored. Clicking a dot scrolls the prose column to that section's first paragraph.

This mirrors the existing `useReadingProgress` data we already collect — reuse the per-section visited state.

Component: new `FigureNavDots.vue`. Lives at the bottom of `IllustrationsComp`'s sticky container.

### D4. End-of-chapter callout

After the last `SectionComp` in `TextComp.vue`, append a callout block:

```
┌──────────────────────────────────────┐
│  ✓ Key takeaways                     │ ← teal-tinted band (var(--color-complete))
│  • <takeaway 1>                      │
│  • <takeaway 2>                      │
│  • <takeaway 3>                      │
├──────────────────────────────────────┤
│  📖 12 min   ✎ 4 notes   ⊙ 2 highlights  ⚡ 78%  │ ← stats strip
├──────────────────────────────────────┤
│  [Take quiz]  [Review flashcards]    │
│  [Chapter overview]                  │ ← CTAs
├──────────────────────────────────────┤
│  Up Next: Chapter 2 — <title>    →  │ ← link card
└──────────────────────────────────────┘
```

Data sources:
- **Takeaways** — new content field on the chapter (Supabase `modules` table, JSON column `key_takeaways text[]`). Chapter 1 (legacy JSON-based) hard-codes them in `assets/json_backend/text.json` under a new top-level key.
- **Stats** — already in `useReadingProgress` + `useHighlights` + `useNotes`.
- **CTAs** — link to `/quiz/:moduleQuizId`, `/flashcards/:moduleId`, `/chapter/:n` (overview, ships in Track 4).
- **Up Next** — derived from chapter ordering (Supabase `modules.order` field, fallback to numeric chapter ID).

Component: new `EndOfChapterCallout.vue`. Receives chapter context via props, fetches own stats via composables.

If the data isn't there yet (chapter has no takeaways saved), show only the stats + CTAs, hiding the takeaways band. No empty-state placeholder needed.

### D5. Demo panel placement audit

`DemoModal` currently floats over content when triggered. Confirm:
- Trigger mechanism (currently `data-demo="..."` markers in prose) — works on all chapters or only Chapter 1?
- Backdrop dim + escape-to-close behavior — present, correct.
- Mobile-friendly — defer to Track 5; for now confirm desktop is fine.
- Visual chrome — teal accent on quiz panel, magenta on lab, etc. Currently uses hard-coded colors; migrate to accent tokens.

Likely scope: small CSS polish, not structural.

### D6. ReaderSidebar visual refresh

Right-side panel (`ReaderSidebar.vue`) keeps its Info/Notebook/Chat tab structure. Refresh:
- Tab strip styling — closer to the umbrella's "floating panel" mock (subtle border, accent underline on active tab).
- Notebook tab content density (likely fine; eyeball with new typography).
- Chat tab AI-tutor message bubbles — accent for user, paper for assistant, mono for code blocks.
- Width/padding — confirm it doesn't crowd the prose column when open.

No structural changes; tokens only.

### D7. Reading-progress dot in top bar

Already exists in `ReaderTopBar`. Confirm it animates smoothly with the new tokens; if it uses `var(--violet)` legacy, migrate to `var(--color-accent)` directly.

## Files touched

New:
- `docs/superpowers/specs/2026-05-11-reader-layout-refinements.md` (this file)
- `src/components/chapter/EndOfChapterCallout.vue` (D4)
- `src/components/chapter/FigureNavDots.vue` (D3)
- `src/composables/useFigurePin.js` (D2)

Modified:
- `src/views/ChapterView.vue` — render `<EndOfChapterCallout>` after `<Text>` (D4)
- `src/components/chapter/Illus/IllustrationsComp.vue` — figure-picker chip + dropdown + dot strip wrapper (D2, D3)
- `src/components/chapter/Illus/IllustrationsComp.vue` — respect `pinnedFigureId` (D2)
- `src/components/chapter/TextComp.vue` — `prose-measure` already used; verify with new `--reading-measure`
- `src/components/chapter/ReaderTopBar.vue` — token migration if needed (D7)
- `src/components/chapter/ReaderSidebar.vue` — visual refresh (D6)
- `src/components/chapter/demos/DemoModal.vue` — token cleanup (D5)
- `tailwind.config.js` — possibly update `width.text` / `width.illus` (D1)

Supabase changes (D4):
- New migration `supabase/migrations/<ts>_modules_add_key_takeaways.sql` — `alter table modules add column key_takeaways text[]`.
- Schema-only; no data backfill required (NULL means "no takeaways yet").

## Test plan

Manual:
1. **Split ratio.** Open `/chapter/1/the-retina` on 1300px, 1500px, 1920px viewports. Eyeball the figure/prose ratio at each. Capture screenshots before/after if D1(a) is picked.
2. **Sticky figure offset.** Scroll the reader — figure pane should sit *below* the top bar at all scroll positions, never overlapping.
3. **Figure-picker.** Click the "tracking scroll" chip; dropdown shows all chapter figures. Pick a non-current figure — it pins, chip updates. Scroll the prose — figure stays pinned. Click "Resume tracking" — returns to scroll-linked behavior.
4. **Dot indicator.** Scroll through every section; verify the active dot updates. Click each dot — prose scrolls to that section.
5. **End-of-chapter callout.** Scroll to end of Chapter 1. Confirm the callout renders with: takeaways (or hidden if none), stats showing real values from progress/highlights/notes, three CTAs that navigate correctly, "Up Next" linking to Chapter 2.
6. **Demo modal.** Trigger a demo from a chapter that has one. Confirm: modal opens, dims background, ESC closes, accent colors come from tokens (verify by switching accent in Settings — demo chrome should follow).
7. **Sidebar tabs.** Open `ReaderSidebar`. Confirm: tab underline uses `--color-accent`, active tab visually distinct, content density readable with new typography.
8. **Token sanity.** Switch accent in Settings to teal — confirm reader (especially `EndOfChapterCallout`'s teal "Key takeaways" band) does NOT change to teal, because that band uses `--color-complete` not `--color-accent`. The two should stay independent.
9. **Cross-chapter.** Repeat steps 1, 3, 4 on at least one Supabase-backed chapter (Chapter 2+) — confirm `IntersectionObserver` and figure-picker work against the dynamic chapter structure.

Cypress: defer to Track 3.1.

## Handover checklist

- [ ] D1 ratio decision documented; layout matches.
- [ ] Figure-picker chip + dropdown ships; pin/unpin works.
- [ ] `FigureNavDots.vue` ships; clicks scroll to section.
- [ ] `EndOfChapterCallout.vue` ships with all four sub-blocks.
- [ ] `key_takeaways` migration applied.
- [ ] `DemoModal` uses tokens, not hex.
- [ ] `ReaderSidebar` visual refresh complete.
- [ ] No `var(--violet)` references remain in reader files (use `--color-accent`).
- [ ] Test plan steps 1–9 pass.
- [ ] PR description names which chapters were tested (legacy Chapter 1 + at least one Supabase chapter).

## Risks and call-outs

1. **GSAP `ScrollTrigger` logic in `IllustrationsComp.vue` is the real swap mechanism.** Adding pin-state needs careful integration so the trigger doesn't override the user's pin. Consider extracting the trigger setup into the new `useFigurePin` composable to make pin-aware and pin-unaware code paths explicit.

2. **End-of-chapter component needs data this app doesn't all have yet.**
   - Takeaways: new column, no UI for editing in Creator dashboard yet — Track 3 ships the column but editing is a follow-up (likely a tiny addition in Track 3 or deferred to a Creator-dashboard polish pass).
   - Up Next: depends on consistent `modules.order` values. Sanity-check current data; backfill order if needed.
   - Stats: already collected; just display.

3. **Chapter 1 is legacy JSON.** End-of-chapter takeaways for Chapter 1 live in `text.json`, not Supabase. The callout component needs to handle both sources cleanly. Same pattern as the existing legacy-vs-Supabase branching in chapter loading.

4. **Visual diff scope.** This track touches most of what a user sees on the reader. Big risk that something looks subtly off but no one notices until later. Mitigation: side-by-side screenshots before/after, attached to the PR.

5. **Figure-picker dropdown discoverability.** If the chip is too subtle, users won't know they can pin. If too prominent, it distracts. Iterate after first live test.

## Definition of done

Track 3 is done when:
- A user reading any chapter can pin a figure, see the active section reflected in dots, and reach a polished end-of-chapter callout with takeaways + stats + CTAs.
- Reader visuals consistently use the new tokens; no stray legacy colors.
- The split-ratio decision is documented and applied.
- Chapter 1 (legacy) and at least one Supabase chapter both work end-to-end.
