# Track 1 — Design tokens and typography

**Date:** 2026-05-22 (drafted retroactively — partial implementation already on `dev`)
**Status:** Draft — pending review
**Parent:** `2026-05-11-design-refresh-overview.md`
**Implementation state:** ~60% landed; this spec documents what's in, what's missing, and what "done" looks like.

## Purpose

Replace the current ad-hoc palette and IBM-Plex-only type system with a token-driven design system that:
- Centralizes all color/spacing/radius values as CSS custom properties.
- Supports light / dark / system theme via `[data-theme]` on `<html>`.
- Supports user-selectable accent color via `[data-accent]` on `<html>`.
- Supports user-selectable font pair via `[data-fontpair]` on `<html>` — including a "IBM Plex (legacy)" option as a single-toggle revert path.
- Keeps Tailwind utility classes working through the migration via legacy color name aliases that resolve to the new tokens.

Track 1 is the foundation every other track consumes. Nothing downstream renders correctly until Track 1 is stable.

## Scope

In scope:
- A single `brand.css` file that owns every token.
- Tailwind config wired to consume those tokens via `rgb(var(--token) / <alpha-value>)`.
- `@font-face` declarations for the new font families (Newsreader, Inter Tight, JetBrains Mono).
- `[data-fontpair]` rules that swap the active body / UI / mono font families.
- `[data-theme]` light + dark token sets.
- `[data-accent]` accent token overrides.
- A pre-paint inline script in `index.html` that sets `data-theme`, `data-accent`, `data-fontpair`, `data-reduce-motion` from `localStorage` before CSS loads.
- Migration of the existing custom Tailwind color names to point at the new tokens (`magenta` → accent, `green` → complete, `lightest`/`light`/`dark` → bg/mute/ink, etc.) so the existing 155 utility usages keep compiling.

Out of scope (handled by other tracks):
- The Settings page UI and the `usePreferences` composable → **Track 2**.
- `user_preferences` Supabase migration → **Track 2**.
- Reader layout that consumes `--reading-measure` → **Track 3**.
- Mobile-specific token overrides → **Track 5**.

Explicitly deferred:
- Removing legacy aliases (`lightest`, `lighter`, `light`, `med`, `dark`, `darker`, `magenta`, `violet`, `green`, `lightDark`). They stay as aliases through Tracks 2–5; we audit and remove only when the consuming components are themselves being touched. No big-bang rename.

## Current state (as of 2026-05-22)

What's already on `dev`:

| Piece | File | Status |
|---|---|---|
| Token definitions | `src/styles/brand.css` | **Done.** RGB triplet channels; light + dark; magenta/teal/amber/mono accent variants; reduce-motion via `[data-reduce-motion]`; `--reading-size` and `--reading-measure`. |
| Tailwind token wiring | `tailwind.config.js` | **Done.** Semantic names (`bg`, `paper`, `ink`, `mute`, `line`, `accent`, `complete`, `warn`) and legacy aliases all point at tokens. |
| Light theme palette | `:root` in brand.css | **Done at target values** — paper-warm `#f7f5f0`, ink `#0a0a0a`, mute `#6b6b66`, line `#e5e5e0`. |
| Dark theme palette | `[data-theme="dark"]` | **Done at target values** — bg `#0e1313`, paper `#161c1c`, ink `#f3efe6`. |
| Accent variants | `[data-accent]` rules | **Done** — magenta (default in `:root`), teal, amber, mono. |
| Highlighter palette | `--color-mark1..4` | **Done.** Note: current values are bold green/red/blue/yellow, not the umbrella's "yellow/pink/blue/green" — see Risk 3. |
| Pre-paint script | `index.html` | **Done** for theme, accent, fontpair. Does NOT pre-apply `--reading-size` or `--reading-measure`. |
| Legacy `--violet` alias | brand.css | **Done.** Routed to `rgb(var(--color-accent))` to keep existing `var(--violet)` usages in `index.css` working. |
| `data-fontpair` font swap rules | brand.css | **NOT DONE.** No `[data-fontpair="newsreader"]` selector, no font swap. |
| New font `@font-face` | (would live in a new file) | **NOT DONE.** Newsreader / Inter Tight / JetBrains Mono not loaded. |
| IBM Plex Sans @font-face | `src/ibm-plex.css` (Mono only currently) | **Partial.** Only Mono is loaded; Sans is referenced in Tailwind but resolves via fallback. |

**Discrepancy to note:** `brand.css` opens with a comment claiming "Phase A: values intentionally mirror today's palette so visual diff = 0." This is no longer accurate — the values *are* the new target palette. The visual diff is already shipped for any component using `bg-magenta`/`bg-violet`/`bg-green`/`bg-lightest` etc. This spec ratifies that: we are not doing a two-phase color migration. Tokens shipped at target values from the start.

## Target deliverables (what "done" looks like)

### D1. `brand.css` is the only source of truth for tokens

No hard-coded hex outside `brand.css`. Pre-existing hard-coded colors in `index.css` and `.vue` files are tolerated through this track but become opportunistic cleanups during Tracks 2–5.

Required additions to `brand.css`:

```css
/* Font pair bindings — selected by [data-fontpair] on <html>.
   Default (:root) = IBM Plex, matching today's behavior. A later commit
   flips usePreferences default to "newsreader" to ship the visible change. */
:root {
  --font-body: "IBM Plex Sans", system-ui, sans-serif;
  --font-ui: "IBM Plex Sans", system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
}

[data-fontpair="ibm-plex-legacy"] { /* default — no override needed */ }

[data-fontpair="newsreader"] {
  --font-body: "Newsreader", "Source Serif Pro", Georgia, serif;
  --font-ui: "Inter Tight", "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace;
}

[data-fontpair="literata"] {
  --font-body: "Literata", Georgia, serif;
  --font-ui: "Inter", system-ui, sans-serif;
}

[data-fontpair="georgia"] {
  --font-body: Georgia, "Times New Roman", serif;
  --font-ui: system-ui, sans-serif;
}

[data-fontpair="sans"] {
  --font-body: "Inter Tight", "Inter", system-ui, sans-serif;
  --font-ui: "Inter Tight", "Inter", system-ui, sans-serif;
}

html { font-family: var(--font-body); }
code, pre, .mono { font-family: var(--font-mono); }
```

### D2. New web fonts loaded

New file `src/styles/fonts.css` (or extend `ibm-plex.css` — TBD by implementer):
- `@font-face` for Newsreader (regular 400, italic 400, bold 700, italic-bold 700).
- `@font-face` for Inter Tight (regular 400, medium 500, bold 700).
- `@font-face` for JetBrains Mono (regular 400, bold 700).
- All declared with `font-display: swap` so render isn't blocked.
- Fonts hosted locally under `public/publicAssets/fonts/` (consistent with current IBM Plex layout). Self-hosted, not Google Fonts CDN, to keep the site working offline and to keep response times predictable.
- Subsetting: at minimum a Latin subset (~U+0000–024F) plus Latin Extended-A/B. No CJK / Cyrillic unless content actually uses them. Keep file weight under ~150KB total per pair.

Imported from `src/index.css` near the top, before `brand.css`.

### D3. Tailwind config exposes new font families

`tailwind.config.js` `fontFamily` updated:

```js
fontFamily: {
  sans: ["var(--font-ui)", /* ...system fallbacks */],
  mono: ["var(--font-mono)", /* ...system fallbacks */],
  serif: ["var(--font-body)", /* serif fallbacks */],
}
```

This lets components use `font-sans` / `font-mono` / `font-serif` and have them respond to the active font pair.

### D4. `index.html` pre-paint script complete

Update the inline `<script>` to also set `--reading-size` and `--reading-measure` from `ob.typeSize` and `ob.lineLength` localStorage keys before first paint, mirroring the JS logic in `usePreferences.js`. Eliminates the flash where prose width snaps from default to user preference on hydration.

### D5. Legacy aliases documented

`tailwind.config.js` already aliases `lightest`, `lighter`, `light`, `med`, `dark`, `darker`, `lightDark`, `magenta`, `violet`, `green` to the new tokens. Confirm the mapping table is correct against the umbrella spec and add a comment block above the `colors:` object naming each alias and its intended replacement, so future cleanup PRs know what to grep for:

```js
// Legacy → new (drop once usages migrated):
//   lightest, lighter -> bg, line
//   light, med, lightDark -> mute
//   dark, darker -> ink
//   magenta, violet -> accent
//   green -> complete
```

### D6. Risk audit pass

A single pass across `src/**/*.{vue,js,css}` to identify the few load-bearing visual elements where the color shift from old-purple-magenta (~`#A75BFF`) to new-pink-magenta (`#E91E8C`) materially changes brand feel. Candidates to spot-check (not necessarily change):
- `App.vue` global wordmark / brand color
- `MenuHome.vue` hero treatment
- `HomeView.vue` Matisse parallax cards (likely fine — uses image art, not the magenta token)
- Reader's `--violet` usages (highlight backgrounds, active animation triggers, citation refs)

If any of these become visually wrong, the fix is either (a) add a `--violet-legacy: 167 91 255` token and switch the specific component to it, or (b) accept the shift. Decision per component, captured in the PR description.

### D7. Documentation refresh

- Update `CLAUDE.md` (or add a new section) describing the token system, `data-*` attribute conventions, and where to put new color tokens. Currently `CLAUDE.md` doesn't mention the design system at all.
- Add a short "How to add a new accent" / "How to add a new font pair" recipe at the top of `brand.css` as a comment.

## Files touched

New:
- `docs/superpowers/specs/2026-05-11-design-tokens-and-typography.md` (this file)
- `src/styles/fonts.css` (or new `@font-face` block in `ibm-plex.css`)
- `public/publicAssets/fonts/Newsreader/*.woff2` (subsetted)
- `public/publicAssets/fonts/InterTight/*.woff2` (subsetted)
- `public/publicAssets/fonts/JetBrainsMono/*.woff2` (subsetted)

Modified:
- `src/styles/brand.css` — add `--ob-serif/sans/mono`, `--font-body/ui/mono`, all `[data-fontpair]` rules; remove the inaccurate "Phase A mirrors today's palette" comment.
- `src/index.css` — import `fonts.css`; remove duplicated font-size scale once `--font-body` drives `html` (optional cleanup).
- `tailwind.config.js` — add `serif` to `fontFamily`; reference `--font-ui` / `--font-mono` / `--font-body` instead of hard-coded `IBM Plex Sans` / `IBM Plex Mono`.
- `index.html` — extend pre-paint script with `--reading-size` and `--reading-measure`.
- `CLAUDE.md` — design system section.

Not touched:
- `src/composables/usePreferences.js` (Track 2)
- `src/views/SettingsView.vue` and `src/components/settings/*` (Track 2)
- `supabase/migrations/20260521000000_create_user_preferences.sql` (Track 2)
- Any reader/dashboard/chapter component (Tracks 3+)

## Test plan

No existing Cypress specs cover token / theming.

Manual verification before marking done:
1. **Fresh-load smoke test.** Hard-reload `/` with empty `localStorage`. Confirm: paper-warm `#f7f5f0` background, IBM Plex Sans body (default `data-fontpair` = `ibm-plex-legacy`), magenta accent. No flash of wrong color or font.
2. **Theme cycling.** From `/settings`, flip System → Light → Dark → System. Each click should re-render without reload; system mode should track OS preference (toggle OS dark mode and confirm live update).
3. **Accent cycling.** From `/settings`, click each accent. Confirm: citation refs, animation triggers, the wordmark hover, and the `.highlightIllu *` SVG fills all pick up the new color within one frame.
4. **Font pair cycling.** From `/settings`, flip through all 5 pairs. Each pair should swap body + UI fonts immediately; no FOUT longer than one network round-trip on first activation; subsequent flips should be instant.
5. **Pre-paint correctness.** Set `ob.theme=dark`, `ob.fontPair=newsreader` in localStorage, hard-reload `/chapter/1/the-retina`. The first painted frame should be dark + Newsreader, with no white flash.
6. **Reduce-motion respect.** Toggle the OS reduce-motion preference. With `ob.reduceMotion=auto`, scroll animations should respect OS pref. With `ob.reduceMotion=off`, they should run regardless of OS pref.
7. **Reading-size and line-length.** Adjust both sliders; confirm prose width and font size adjust live across `ChapterView`, no jump on reload.
8. **Legacy class compile check.** Run `npm run build` and confirm zero Tailwind compile errors (legacy color names must still resolve).
9. **Visual diff on Chapter 1.** Open `/chapter/1/the-retina`, scroll the full chapter, eye-check that the magenta-color shift doesn't break any specific UI element (active animation states, highlights, citation refs, comment dots). Capture before/after screenshots and attach to the PR.

Add (in this track or as a Track 1 follow-up):
- `cypress/e2e/theming.cy.js` — automated checks for theme switching, accent switching, font-pair switching, persistence across reloads.

## Handover checklist

- [ ] `brand.css` includes `--ob-serif/sans/mono`, `--font-body/ui/mono`, and all five `[data-fontpair]` rules.
- [ ] New `@font-face` declarations for Newsreader, Inter Tight, JetBrains Mono loaded (or explicitly deferred with a `// TODO Phase B` comment and a justification).
- [ ] `tailwind.config.js` `fontFamily` references the new CSS variables.
- [ ] `index.html` pre-paint script handles `--reading-size` and `--reading-measure`.
- [ ] Stale "Phase A mirrors today's palette" comment removed from `brand.css`.
- [ ] Legacy alias comment block added to `tailwind.config.js`.
- [ ] Risk audit pass complete; per-component decisions captured in PR.
- [ ] Manual test plan steps 1–8 pass; step 9 screenshots attached.
- [ ] `CLAUDE.md` design-system section added.
- [ ] `cypress/e2e/theming.cy.js` added (or deferred with an issue link).

## Risks and call-outs

1. **Magenta color shift is already live.** Anything using `bg-magenta` / `bg-violet` today already renders the new pink, not the old purple. Track 1's job is not to *introduce* the shift but to make sure no specific component looks wrong because of it. If this becomes a problem post-merge, the lowest-cost fix is per-component opt-in to a `--violet-legacy` token, not a global rollback.

2. **Newsreader line metrics differ from IBM Plex Sans.** Switching the default body font (when we eventually do — currently default is `ibm-plex-legacy` so no change today) will visibly re-flow every chapter. This is a Track 2/3 visible payoff, not a Track 1 regression — but Track 1 is what *enables* it, so any line-height assumptions baked into `index.css` (`text-base` line-height `3.1rem`, etc.) may need a sweep when Newsreader becomes default. Out of scope here; flag for Track 3.

3. **Highlighter palette mismatch.** Umbrella spec says "yellow / pink / blue / green". `brand.css` ships green / red / blue / yellow. Two options: (a) ratify the in-code values and update the umbrella spec, (b) update `brand.css` to match the umbrella. Pick during review. No load-bearing UI uses these yet (highlight components are wired but not styled to these tokens), so changing is cheap.

4. **`--font-body` default vs `ibm-plex-legacy`.** When Newsreader fonts land, `:root` says body uses `--ob-serif` = Newsreader. But the `usePreferences` default is `ibm-plex-legacy`. Either (a) flip the `usePreferences` default to `newsreader` once fonts ship, or (b) make `[data-fontpair="ibm-plex-legacy"]` the default behavior in `:root`. Pick one to avoid the body font being Newsreader on first load before JS hydrates `data-fontpair`. Recommendation: bind `:root` font roles to IBM Plex (today's behavior) and only enable Newsreader explicitly via `[data-fontpair="newsreader"]`. Then defaults flip together when ready.

5. **Font weight on dashboard / editor surfaces.** The dashboards and editor weren't designed against Newsreader. They will look bolder/heavier when body changes. Likely acceptable, but a thing to eyeball in step 9.

## Resolved questions (2026-05-22 review)

- **Q1. Highlighter palette → align with umbrella (yellow / pink / blue / green).** Update `brand.css`:
  - `--color-mark1`: yellow (suggest `253 231 63` — current `#FDE73F` lives in mark4 today, move to mark1)
  - `--color-mark2`: pink (suggest `233 30 140` — same as accent magenta, or pick a softer pink — confirm during implementation)
  - `--color-mark3`: blue (keep current `16 23 226`)
  - `--color-mark4`: green (suggest `61 217 181` — teal complete, or pick a clearer highlighter-green)
  No load-bearing UI uses these yet, so the change is safe.

- **Q2. Self-host fonts in `public/publicAssets/fonts/`.** Consistent with IBM Plex layout; survives Vite rebuilds; no CDN dependency.

- **Q3. Defer `cypress/e2e/theming.cy.js` to Track 1.1.** Keep this PR small. Track 1.1 = follow-up issue covering automated regression coverage for theme/accent/fontpair switching and persistence.

- **Q4. Keep IBM Plex as default body font.** Track 1 makes Newsreader *loadable and selectable*. A subsequent, clearly-flagged commit (Track 1.2 or as part of Track 3) flips `usePreferences` default to `newsreader`. This isolates "fonts are wired" from "fonts are visibly different" as separate reviewable changes.

  Implementation implication: `:root` in `brand.css` should bind `--font-body` / `--font-ui` / `--font-mono` to **IBM Plex** (today's behavior). `[data-fontpair="newsreader"]` then explicitly overrides to Newsreader. The umbrella spec's framing of Newsreader-as-default-with-IBM-Plex-as-legacy is correct in spirit but flipped in the implementation for now.

## Definition of done

Track 1 is done when:
- A new contributor can land a new accent or a new font pair by editing `brand.css` only.
- Every token in the umbrella spec exists as a CSS custom property.
- The five `data-fontpair` values all swap fonts (even if some pairs are visually similar).
- The pre-paint script eliminates flash for all four user prefs.
- A manual run-through of the test plan passes on Chrome + Safari.
- The PR description explicitly addresses each Risk item.
