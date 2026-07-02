# Typography System & Normalization Plan

Status: **System built** (tokens + role classes + specimen page live). Migration of
existing components onto it is the remaining work. Updated 2026-06-30.

---

## Direction (locked with stakeholder)

- **Dark mode + font choice are retired.** Back to the originals: **IBM Plex,
  light theme only.** The pref *machinery* (refs, watchers, localStorage +
  Supabase sync) is kept intact in the background for possible future revival —
  only the *applied value* is pinned and the UI controls are gone.
- **One unified type scale** for the whole app (book + admin) — not a book/admin
  split.
- **Modular ratio: Perfect Fourth (1.333), base 20px.**
  Steps (px): `11 · 13 · 17 · 20 · 27 · 36 · 47 · 63 · 84 · 112`.

---

## The system (what now exists)

### Tokens — `src/styles/brand.css` (single source of truth for sizes)
A `--type-*` block defines size / line-height / letter-spacing for each role.
Because the project root is `font-size: 62.5%` (1rem = 10px), each token's rem is
`px ÷ 10` (e.g. body = `2rem` = 20px).

### Role classes — `src/index.css` `@layer components`
The public API. Components apply these, never raw Tailwind `text-*` or the legacy
`.text-base` scale. The `t-` prefix is the collision firewall — Tailwind ships no
`t-*` text utilities, so they can't be shadowed.

| Class        | px            | Family | Weight | Role |
| ------------ | ------------- | ------ | ------ | ---- |
| `.t-display` | 112           | body   | 700    | Hero / cover |
| `.t-h1`      | 84            | body   | 700    | Chapter title |
| `.t-h2`      | 63            | body   | 600    | Section heading |
| `.t-h3`      | 47            | body   | 600    | Subsection |
| `.t-subhead` | 36            | body   | 600    | Subhead / lead-in |
| `.t-body-lg` | 27            | body   | 400    | Standfirst / intro |
| `.t-body`    | 20 ×reading-size | body| 400    | **Base reading** |
| `.t-body-sm` | 17            | body   | 400    | Secondary / table cell |
| `.t-caption` | 13            | mono   | 400    | Caption / footnote |
| `.t-label`   | 11            | mono   | 500    | Eyebrow / badge (uppercase) |

`.t-body` multiplies by `--reading-size` so the (now hidden) reading-size pref
still scales body prose — and only body prose.

### Specimen page — `src/views/StyleGuideView.vue` at `/styleguide`
Renders the scale, families, weights, and a legacy→new mapping table at true
rendered size. Theme/font toggles removed (no longer meaningful).

**Verified live:** root 10px; `data-theme=light`, `data-fontpair=ibm-plex-legacy`,
accent magenta; `.t-h1`=84px, `.t-caption`=13px mono, `.t-label`=11px mono upper.

---

## What was already done before this session
- The theme / font-pair / accent **controls were already removed** from the live
  Settings UI (`SettingsPanels.vue:5` + `SettingsView.vue:4` note it). The control
  components (`ThemeCards.vue`, `FontPairPicker.vue`, `AccentSwatches.vue`) remain
  on disk but are **orphaned** (nothing renders them). Left in place intentionally
  so the features are revivable.

## What this session changed
- `usePreferences.js` — pinned `resolvedTheme()`→`light` and `applyFontPair()`→
  `ibm-plex-legacy` via `FORCE_LIGHT_THEME` / `FORCE_LEGACY_FONTPAIR` flags
  (pinned at the *apply* layer so stale stored "dark" values don't leak through).
- `index.html` pre-paint script — same pins, to avoid a first-paint flash.
- `brand.css` — added the `--type-*` modular-scale token block.
- `index.css` — added the `.t-*` role classes in `@layer components`.
- `StyleGuideView.vue` — rebuilt as the system reference.

---

## Remaining work — migrating components onto `.t-*`

Each step is independently shippable; verify against `/styleguide` + `npm run build`.

1. **Book**: replace the legacy `index.css` scale.
   - `.text-base` → `.t-body` (start at `App.vue:48`; it's the global prose wrapper).
   - book `h1/h2/h3` element rules → `.t-h1/.t-h2/.t-h3`.
   - `.text-biggest/.text-blindness` → `.t-display`; `.text-medium` → `.t-body-sm`;
     `.text-small` → `.t-caption`; `.text-smaller` → `.t-label`.
   - **Keep `.text-base` as a 1-line alias to `.t-body` until every consumer moves**,
     then delete it — deleting the name early collapses prose to Tailwind's 10px default.
2. **Fix the prose font bug** (do it in the book pass): `TextComp.vue:259` puts
   `font-sans` on the prose container. With fonts now pinned to IBM Plex this is
   cosmetically moot today, but it's still wrong — `.t-body` should own the family.
   Drop `font-sans` from the wrapper.
3. **Admin token views** (`dashboard/shared/**`): replace ad-hoc scoped rems with
   `.t-*` roles — gives one shared card-title size instead of three (2rem/1.8rem/2rem).
4. **Broken legacy admin views** (`EditorView`, `LabView`): currently raw Tailwind
   `text-*` → ~56% nominal (body 8.75px). Migrate to `.t-*`. **Visible size jump —
   schedule + QA as an intentional fix.** Move dead dark-theme color utilities to tokens.
5. **Mono token-bypass**: scoped regex `'IBM Plex Mono'` → `var(--font-mono)` in
   `.vue` + CSS (NOT `@font-face` src / family names). Less urgent now fonts are
   pinned, but correct.
6. **Delete the overrides** (`.text-base/.text-h2/.text-h3` and dead `.text-*`)
   from `index.css` once nothing references them.
7. **Re-enable `tailwind.config` `fontSize`** keyed to `--type-*` vars only if an
   ad-hoc utility is ever needed — prefer the `.t-*` classes.

### Risks to verify each pass
- `.t-body` must keep `× var(--reading-size)` or the (background) reading-size
  pref goes dead for prose.
- Responsive: the legacy scale had 3 breakpoints; the `.t-*` roles are currently
  single-size. If the reader needs to shrink on narrower viewports, add a
  `clamp()` or a media query to the `--type-*` tokens (one place) — don't
  reintroduce per-class breakpoint blocks.
- Pixel-diff the reader at 1300/1450/1600/1920 before/after the book migration.

---

## Files of record
- `src/styles/brand.css` — `--type-*` tokens (sizes).
- `src/index.css` — `.t-*` role classes; the 62.5% root (line ~234); legacy scale to retire.
- `src/views/StyleGuideView.vue` — specimen (`/styleguide`).
- `src/composables/usePreferences.js` — the theme/font pins (revival point).
- `index.html` — pre-paint pins.
- `tailwind.config.js` — `theme.fontSize` (still commented; re-enable var-keyed if needed).
