# PLAN — Remove the `font-size: 62.5%` root hack

**Branch:** `refactor/remove-font-hack`
**Goal:** Delete the `font-size: 62.5%` declaration on `html, body` (`src/index.css:325`) so that `1rem = 16px` (the real browser default) **without changing the rendered pixel size of anything**.

---

## 1. The problem & the core strategy

`src/index.css:325` sets `font-size: 62.5%` on the root. This makes `1rem = 10px`, and ~1408 `rem` values across the codebase were all authored assuming that base. This:
- breaks accessibility (browser/OS font-size preferences don't scale correctly),
- is fragile and surprising to new contributors.

**Removing the 62.5% line alone would make every `rem` render 1.6× bigger** (10px → 16px base). To keep every element visually identical, **every `rem` literal must be recomputed:**

```
new_rem = old_rem / 1.6        // because 10px / 16px = 0.625 = 1/1.6
```

Proof of invariance: an element sized `X rem` renders at `X * base_px`. Before: `X * 10`. After conversion to `X/1.6` at the new base: `(X/1.6) * 16 = X * 10`. **Identical pixel size.** ∎

This MUST be an **automated, deterministic codemod** (committed under `scripts/`), never hand-editing 1408 values. The script is reviewable and re-runnable (idempotent guard via a marker is not needed because we run once against a clean tree; re-running would double-convert, so the script is run exactly once and the diff is reviewed).

---

## 2. File scope — how the ~107 files are enumerated

The codemod targets exactly the files that contain a `rem` unit literal, enumerated by:

```bash
grep -rElo '\-?[0-9]*\.?[0-9]+rem\b' src/ tailwind.config.js
```

Measured scope (2026-07-10):
- **Total `rem` occurrences: 1408** (`grep -rEon '\-?[0-9]*\.?[0-9]+rem\b' src/ tailwind.config.js | wc -l`)
- **Files: 103 in `src/`** (98 `.vue`, 4 `.css`, 1 `.js`) **+ `tailwind.config.js`** = 104 files.
- File types processed: `.vue`, `.css`, `.js`, `.ts`, `.html` under `src/`, plus the root `tailwind.config.js`.

`tailwind.config.js` is IN scope: it defines width/height utilities in rem (`header: "2.2rem"`, `text: "...calc(780px + 11rem)"`, etc.) that generate Tailwind classes consumed by components. Its **commented-out** rem lines (lines 37–48) are inert; the codemod will still convert the numbers inside comments for consistency (harmless — they're dead code either way). This is called out for the reviewer.

**`index.html`** is NOT in scope: its pre-paint `<script>` contains no rem literals and does not set `font-size` (verified). It only sets `data-*` attrs and the unitless `--reading-size` multiplier.

**`dist/`** and **`node_modules/`** are excluded (build output / vendor).

---

## 3. The conversion rule & rounding

For each matched token `Nrem` (where `N` may be negative and/or decimal):

```
value = parseFloat(N)
converted = value / 1.6
```

**Rounding rule:** format `converted` to at most **5 decimal places**, then strip trailing zeros (so `1.5625rem` stays `1.5625rem`, `0.6875rem` stays, and a value that happens to be integer like `0rem` stays `0rem`). 5 dp caps the absolute error at `< 0.5e-5 rem = < 0.00008 px` at 16px base — visually undetectable (sub-thousandth of a pixel; browsers themselves round to device pixels far more coarsely).

Why 5 dp is safe from *accumulated* drift: each value is converted independently (no chained arithmetic), so errors do not accumulate. The worst single-value error is one half-ULP at the 5th decimal.

Most values divide cleanly because `1/1.6 = 0.625 = 5/8`; multiplying a short decimal by `5/8` terminates within a few places (e.g. `2.5 → 1.5625`, `1.1 → 0.6875`, `1.3 → 0.8125`, `1.7 → 1.0625`). Values that don't terminate (e.g. `2rem/1.6 = 1.25` terminates; `1.6rem/1.6 = 1` exact; a non-terminating case like `X/1.6` where X has many digits) are truncated to 5 dp.

**Special values:**
- `0rem` → `0 / 1.6 = 0` → emitted as `0rem` (kept as-is; not converted to bare `0` to minimize diff noise, though both render identically).
- Negative values: the `-` is part of the match; `-1.25rem / 1.6 = -0.78125rem`. Handled.

---

## 4. Edge cases — enumerated & handled

The regex used is:

```
/(-?\d*\.?\d+)rem\b/g
```

- `-?` optional leading minus (negative rems: 11 present, e.g. letter-spacing, negative margins).
- `\d*\.?\d+` matches `2`, `2.5`, `.5`, `0.01`, `11`, etc. Requires at least one digit after any dot, so it won't match a lone `.`.
- `rem\b` requires the literal unit `rem` followed by a word boundary.

| # | Edge case | Handling | Why safe |
|---|-----------|----------|----------|
| a | **`rem` inside `calc()`** — e.g. `calc(2rem * var(--reading-size))`, `calc(780px + 11rem)` | Each `Nrem` token inside calc is matched & converted independently; surrounding `calc()`, operators, `px`, and `var()` are untouched | The regex matches only the `Nrem` substring; `780px` has no `rem` so is skipped |
| b | **`rem` in media queries** | N/A — verified **zero** rem in any `@media` *condition* (all breakpoints are px, e.g. `min-width: 1300px`). rem *declarations* inside media blocks convert normally | `grep '@media[^{]*rem'` returns 0 |
| c | **Already-correct / 16px-base rems** | None exist — every rem in the repo assumes the hack (confirmed: single base override, no third-party rem CSS in scope) | Only one `font-size` base declaration exists (the hack itself) |
| d | **rem in JS / template strings** | The 1 JS occurrence (`useDashboardMedia.js:100`, an inline-style string `padding: 2rem`) and the 2 inline `style=""` attrs (`DevToolbar.vue`) are plain text → matched by the same text-level regex | No *computed* rem expressions (no `` `${x}rem` `` interpolation) exist — verified. All rem are static literals |
| e | **Shorthand** — `margin: 1rem 2rem`, `padding: 9px 12px 1.4rem` | Global regex (`/g`) converts every `Nrem` token on the line; non-rem tokens (`px`) skipped | Each token matched separately |
| f | **`0rem`** | `0/1.6 = 0` → stays `0rem`, visually identical | Handled by the arithmetic; no special-casing needed |
| g | **Unitless line-heights** (e.g. `line-height: 1.55`, `line-height: 2.1`) | **Never matched** — they carry no `rem` suffix | Regex requires literal `rem`; a bare number has no unit to match |
| h | **`em` values** (159 present, e.g. `letter-spacing: -0.02em`) | **Never matched** — `em` lacks the leading `r`. `0.02em` does not contain `rem` | `rem\b` requires the `r`; `em` is a different token |
| i | **The base `font-size` declaration itself** | Removed in a separate, explicit edit (NOT by the codemod). `font-size: 62.5%` on `html, body` → the declaration is removed (browser default `100% = 16px` applies) | Done by hand as a reviewable 1-line change |
| j | **`rem` as a substring of a word** (e.g. `remove`, `remainder`) | Cannot match — regex requires a **digit** immediately before `rem`. Verified no `<digit>rem<letter>` tokens exist | `grep '[0-9]rem[a-zA-Z]'` returns 0 |
| k | **Tailwind config commented rems** | Converted (inert). Flagged to reviewer | Dead code; conversion is harmless and keeps them consistent if ever re-enabled |

**File integrity:** the codemod is a pure string-replace on file contents (read → `String.replace(regex, fn)` → write only if changed). It never parses/re-serializes CSS or Vue AST, so it **cannot** reorder, drop, or restructure anything — the only bytes that change are the digits inside `Nrem` tokens. This is the safest possible transform for "change numbers, touch nothing else."

---

## 5. The 62.5% removal & comment fixes (manual, post-codemod)

After the codemod runs, three manual edits:
1. `src/index.css:325` — remove `font-size: 62.5%;` from the `html, body` block (browser default 16px applies). Keep the other properties in that block.
2. `src/styles/brand.css:40` — update stale comment `... font-size: 62.5% ... so 1rem = 10px` → reflect `1rem = 16px`.
3. `src/styles/dashboard-sections.css:11` — update stale comment `... font-size: 62.5% on html/body so 1rem = 10px.` → reflect the removal / 16px.

(Note: the `--type-*-size` vars in `brand.css` are rem and will be converted by the codemod; the comment near them is what changes manually.)

---

## 6. Verification strategy (the safety net)

Invariant to prove: **every rendered element is the same pixel size before and after.**

1. **Build gate:** `npm run build` exits 0.
2. **Test gate:** `npm test` (vitest) stays green (baseline: 141 passing). NB: these are smoke/unit tests and do NOT assert computed font-size — they catch syntax/parse breakage, not mis-conversion. Pixel verification below is the real check.
3. **Pixel parity (the real net):** using the Playwright MCP browser, load the same routes on a **main** build and a **branch** build (two `vite preview` servers on different ports, OR sequential checkout). For a sample of elements per page (root html font-size, `h1/h2/h3`, body paragraph, a button, nav item), capture `getComputedStyle(...).fontSize` / `width` / `height` and assert they are **identical** (to within <0.1px). Key pages:
   - `/` (home) → redirects to `/chapter`
   - `/chapter/1` — **Chapter 1 "The Retina" — the north-star page.** Must render identically.
   - dashboard route (if reachable without auth; otherwise style-guide `/styleguide` which exercises the type scale).
   - **First assertion:** computed `font-size` on `<html>` should be `10px` on main and `16px` on branch — this *confirms the base changed*. Every other sampled element's computed px must be **unchanged** — this confirms the rem conversions compensated exactly.
4. **Screenshot diff:** capture full-page screenshots of the key pages on both branches; any visible delta = a bad conversion → STOP and report.
5. **Sample arithmetic audit:** independently verify 10 converted values: `old_rem * 10 == new_rem * 16`.
6. **Local-dev caveat:** local dev has no Supabase (per project memory), so DB-backed Chapter 2+ content won't load locally — verification focuses on Chapter 1 (local JSON) and static/style-driven pages, which is exactly the north-star.

**Stop condition:** if any sampled element's rendered px differs by more than sub-pixel rounding and I can't explain it, STOP and report rather than push.

---

## 7. Commit plan

1. `docs: font-refactor plan` (this file).
2. `refactor(font): add rem÷1.6 codemod script` (script only, no conversions).
3. `refactor(font): convert 1408 rem values (÷1.6) via codemod` (generated conversions).
4. `refactor(font): remove 62.5% root hack + fix stale 1rem=10px comments`.
5. `docs: font-refactor session report`.

---

## 8. Codex review verdicts

### Plan review (Step 2)
_(to be filled after `codex exec` review)_

### Diff review (Step 3b)
_(to be filled after `codex exec` review)_
