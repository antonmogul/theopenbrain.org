# Design system cleanup backlog

Findings from the design-system programme (30 Sep 2026) that need a designer's decision before code changes. Behaviour-preserving cleanups were done directly: `--ui-size-*` tokens (OPENBRAIN-118, pixel-identical) and Tailwind greys → neutral tokens (OPENBRAIN-119). Each item says what we found, where, and a recommendation to decide on.

## 1. Accessibility: colours that fail as text (priority)

WCAG AA asks for 4.5:1 for small text.

| Colour as text                       | On white | On its badge tint | Where it is text                                            |
| ------------------------------------ | -------- | ----------------- | ----------------------------------------------------------- |
| `--color-complete` (teal `#3DD9B5`)  | 1.78:1   | 1.65:1            | StatusBadge "complete", StatCard up-deltas, takeaways check |
| `--color-warn` (amber `#F4A621`)     | 2.03:1   | 1.87:1            | StatusBadge "warn", StatCard down-deltas                    |
| `--color-accent` (magenta `#E91E8C`) | 4.18:1   | 3.58:1            | links, form errors, footnote markers, eyebrows, chips       |

**Recommend:** keep the three colours for fills, rules and icons, and add a darker text step for each (e.g. `--color-complete-ink`, `--color-warn-ink`, `--color-accent-ink`) that passes 4.5:1, then use those wherever the colour is text. Designers pick the exact values; they go in brand.css, tokens.json and the Figma Theme collection together.

## 2. Reader type vs the type scale

The live reader sets its own sizes rather than using the `.t-*` scale (measured at 1440 / 390):

| Reader element  | Reader today                         | Nearest scale role                        |
| --------------- | ------------------------------------ | ----------------------------------------- |
| Section heading | 47 / 33px, weight 400                | `.t-h3` 47 / 33px, weight 600             |
| Body            | 20 / 17px, 31px line, 0.5px tracking | `.t-body` 20 / 17px, 155%, 0.01em (0.2px) |
| Opener title    | 50 / 27px, weight 450                | —                                         |
| Breakout title  | 49 / 24px, weight 500                | `.t-h3` 47 / 33px                         |
| TOC item / sub  | 20 / 17px, 17 / 15px                 | `.t-body` / `.t-body-sm`                  |

The Figma file mirrors the reader as it is (`Reader/*` styles). **Decide:** either the reader adopts the scale (sections use `.t-h3` weights, body uses `.t-body` tracking), or these become named reader roles in the scale. Either way there should be one set.

## 3. Colours with meaning in components

After OPENBRAIN-119 the remaining literal colours in components are the semantic ones, from Tailwind's palette: error red (`#DC2626`, `#EF4444`, `#FEF2F2`), info/action blue (`#3B82F6`, `#2563EB`, `#1D4ED8`, `#EFF6FF`), violet actions (`#8B5CF6`, `#7C3AED`, `#F3E8FF`: the chapter wizard's buttons and steps), success green (`#16A34A`, `#22C55E`, `#DCFCE7`) and ambers.

**Recommend:** errors → `--color-accent` (FormField already shows errors in magenta); success → `--color-complete`; warnings → `--color-warn`; primary actions (the wizard's violet, the quiz's blue Start) → the Button component (Solid) or the accent. Blue "info" has no token today: decide whether it needs one.

## 4. The highlighter has two palettes

`src/composables/useHighlights.js` uses Tailwind -300 pastels (`#fcd34d`, `#86efac`, `#93c5fd`, `#f9a8d4`, `#c4b5fd`); brand.css defines `--color-mark1…4` (`#FDE73F`, `#E91E8C`, `#1017E2`, `#3DD9B5`) that the highlighter doesn't use. **Decide** one set; the other goes.

## 5. Components that don't use the shared pieces

- **End-of-chapter buttons** (`EndOfChapterCallout .cta`) are 14px sans pills of their own, not the shared Button (mono caps). Adopt Button, or add a "reader call to action" Button variant.
- **Lab panel** (`chapter/demos/LabPanel.vue`) is a dark component on Tailwind greys (light-on-dark). It needs its own mapping onto `--color-dark-surface` and white-at-opacity; the light-surface mapping made its text vanish.
- **Legacy**: 14 files in `src/components/UI/` and 11 Legacy stories are still in use; `.text-h2` / `.text-h3` in index.css are the old type classes. Migrate each to the shared library, then delete.
- **Plain white** (`#FFFFFF`, 27 in components): paper on light surfaces, but text-on-accent elsewhere. Map each to `--color-paper` or a new `--color-on-accent`.

## 6. Sizes still hard-coded

- **Components:** 103 font-size literals at off-scale sizes (8.75, 9, 7.5, 9.38, 11.25, 22, 24, 10.5, 28px…). Round each onto the nearest `--ui-size-*` (a visible change of a pixel or so), or add a size if it is really needed.
- **Views that aren't widget ports:** 16 files with 116 font-size and 47 colour literals (home, chapters, dashboards, settings, editor, quiz, flashcards).
- **Widget views:** the authors' Vue ports carry most of the rest; they are being replaced by widget-kit uploads, so they are left alone.

## 7. Figma and tooling

- **Page templates** in Figma are reference captures (30 Sep): rebuild each from components before redesigning it.
- **Visual regression gate:** `storybook:snapshots:ci` + `storybook:diff` work locally; CI uploads the snapshots but doesn't diff, because baselines must be rendered on CI's own Linux fonts. Next step: keep a baseline artifact from `main` and diff PRs against it.
- **Code Connect** (code snippets in Figma Dev Mode) needs a Figma Organization or Enterprise plan; the teams are on Pro.
- **The designers' file** (`M3Jnv2v4L0TUJX3Z2Rp500`) is view-only for us; the design system lives in "Open Brain — Design System" (`NAjmvySrMHLtWYqn2zi4h4`) until it can be moved or shared into their team.
- `src/helper/retinabox.js` is imported by nothing (the one `graph:check` warning).
