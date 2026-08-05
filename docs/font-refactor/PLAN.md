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

The codemod enumerates candidate files **itself** via `git ls-files src tailwind.config.js`, then filters by extension (`.vue|.css|.js|.ts|.html`) and applies the `REM` regex — so the file set scanned for conversion _is_ the set converted (no drift vs a separate grep).

> **Enumeration bug found & fixed during Step-1 re-check:** the first draft used `git ls-files 'src/**/*.css' …`. A `**` glob does **not** match files directly in `src/`, so it silently **excluded `src/index.css`** — the file that holds the hack itself _and_ 152 rem literals (11% of all tokens). That would have under-converted the north-star page catastrophically. Fixed to a directory pathspec (`src`) + JS extension filter, which cannot miss top-level files. The token count going from 1256 → 1408 after the fix is the proof.

Measured scope (2026-07-10):

- **Total `rem` occurrences converted: 1408** (verified by `node scripts/convert-rem.mjs --check`).
- **Files with rem: 103** (98 `.vue`, 4 `.css` incl. `src/index.css`, 1 `.js`) **+ `tailwind.config.js`** where applicable.
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

**Rounding rule (revised per Codex — precision-preserving, not a fixed cap):**

Because `1/1.6 = 0.625 = 5/8`, multiplying **any finite decimal** by `0.625` **always terminates** (5/8 is `5 / 2³`, and dividing by a power of two adds at most 3 decimal places per source decimal place). So the exact result is representable exactly in decimal. The script therefore:

1. Computes `converted = value * 0.625` (equivalent to `/1.6`, but `0.625` is exactly representable in IEEE-754, avoiding a division-rounding artifact).
2. Formats with **`Number.toString()`** — the shortest decimal string that round-trips to that exact double. Since `×0.625 = ×5/8` always terminates, this is the _exact_ converted value at full precision (e.g. `0.8125 → 0.5078125`, a 4-dp source producing 7 dp). **Correction (found during Step-1 re-check):** an earlier draft used `toFixed(6)`, which silently rounded results longer than 6 dp — `0.8125rem` (present in the repo) became `0.507813` and failed the round-trip. `toString()` is precision-exact and is what the script now uses; a defensive guard aborts if it ever emits exponential form.
3. **Asserts round-trip:** `parseFloat(newStr) * 1.6` must equal `value` within `1e-9`, else the script aborts on that token. (The `×1.6` back-multiply reintroduces sub-`1e-14` float noise for a few values, e.g. `11.2 → 7 → 11.2000000000000011`; the `1e-9` tolerance absorbs that noise while still catching any real formatting loss like the `toFixed` bug above, which was off by `8e-7`.)

This gives **exact** conversions (e.g. `2.5 → 1.5625`, `1.1 → 0.6875`, `1.3 → 0.8125`, `1.7 → 1.0625`, `11.2 → 7`) with **zero rounding error** for every value in this codebase — so the "accumulation" concern (repeated widths, grid tracks, translates summing) is moot: there is no per-token error to accumulate. The round-trip assertion is the machine-checked proof of this for all 1408 tokens.

**Special values:**

- `0rem` → `0 / 1.6 = 0` → emitted as `0rem` (kept as-is; not converted to bare `0` to minimize diff noise, though both render identically).
- Negative values: the `-` is part of the match; `-1.25rem / 1.6 = -0.78125rem`. Handled.

---

## 4. Edge cases — enumerated & handled

The regex used (single source of truth — the **same** constant is used for enumeration, conversion, and the post-run audit; never two divergent regexes):

```js
const REM = /(?<![\w.])(-?\d*\.?\d+)rem\b/gi;
```

- `(?<![\w.])` **negative lookbehind** (Codex catch): the char before the number must NOT be a word char or a dot. This prevents matching the `-3rem` tail of an exponent literal like `1e-3rem`, matching a rem glued to an identifier, or splitting `1.2.3rem`. Only cleanly-delimited numeric literals match.
- `-?` optional leading minus (negative rems: 11 present — letter-spacing, negative margins).
- `\d*\.?\d+` matches `2`, `2.5`, `.5`, `0.01`, `11`. Requires ≥1 digit after any dot.
- `rem\b` requires the literal unit `rem` + word boundary.
- `i` flag: case-insensitive, so `1REM`/`1Rem` are also caught (Codex catch). _(None exist today, but the guard is free.)_

**Defensive pre-scan (script aborts if any is found):** before converting, the script scans for malformed / unsupported forms it refuses to touch — `\d+e[-+]?\d+rem` (exponent), `\d+\.\d+\.\d+rem` (multi-dot), uppercase-mixed weirdness — and **fails loudly** rather than silently converting. Verified today: zero such tokens exist, so the script proceeds; the guard protects future re-runs.

**Enumeration ≡ codemod guarantee:** the file list is produced by the script itself (`REM.test(content)`), not by a separate `grep`, so the set of files scanned for conversion is exactly the set enumerated. No drift possible.

| #   | Edge case                                                                                  | Handling                                                                                                                                                                                            | Why safe                                                                                                       |
| --- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| a   | **`rem` inside `calc()`** — e.g. `calc(2rem * var(--reading-size))`, `calc(780px + 11rem)` | Each `Nrem` token inside calc is matched & converted independently; surrounding `calc()`, operators, `px`, and `var()` are untouched                                                                | The regex matches only the `Nrem` substring; `780px` has no `rem` so is skipped                                |
| b   | **`rem` in media queries**                                                                 | N/A — verified **zero** rem in any `@media` _condition_ (all breakpoints are px, e.g. `min-width: 1300px`). rem _declarations_ inside media blocks convert normally                                 | `grep '@media[^{]*rem'` returns 0                                                                              |
| c   | **Already-correct / 16px-base rems**                                                       | None exist — every rem in the repo assumes the hack (confirmed: single base override, no third-party rem CSS in scope)                                                                              | Only one `font-size` base declaration exists (the hack itself)                                                 |
| d   | **rem in JS / template strings**                                                           | The 1 JS occurrence (`useDashboardMedia.js:100`, an inline-style string `padding: 2rem`) and the 2 inline `style=""` attrs (`DevToolbar.vue`) are plain text → matched by the same text-level regex | No _computed_ rem expressions (no `` `${x}rem` `` interpolation) exist — verified. All rem are static literals |
| e   | **Shorthand** — `margin: 1rem 2rem`, `padding: 9px 12px 1.4rem`                            | Global regex (`/g`) converts every `Nrem` token on the line; non-rem tokens (`px`) skipped                                                                                                          | Each token matched separately                                                                                  |
| f   | **`0rem`**                                                                                 | `0/1.6 = 0` → stays `0rem`, visually identical                                                                                                                                                      | Handled by the arithmetic; no special-casing needed                                                            |
| g   | **Unitless line-heights** (e.g. `line-height: 1.55`, `line-height: 2.1`)                   | **Never matched** — they carry no `rem` suffix                                                                                                                                                      | Regex requires literal `rem`; a bare number has no unit to match                                               |
| h   | **`em` values** (159 present, e.g. `letter-spacing: -0.02em`)                              | **Never matched** — `em` lacks the leading `r`. `0.02em` does not contain `rem`                                                                                                                     | `rem\b` requires the `r`; `em` is a different token                                                            |
| i   | **The base `font-size` declaration itself**                                                | Removed in a separate, explicit edit (NOT by the codemod). `font-size: 62.5%` on `html, body` → the declaration is removed (browser default `100% = 16px` applies)                                  | Done by hand as a reviewable 1-line change                                                                     |
| j   | **`rem` as a substring of a word** (e.g. `remove`, `remainder`)                            | Cannot match — regex requires a **digit** immediately before `rem`. Verified no `<digit>rem<letter>` tokens exist                                                                                   | `grep '[0-9]rem[a-zA-Z]'` returns 0                                                                            |
| k   | **Tailwind config commented rems**                                                         | Converted (inert). Flagged to reviewer                                                                                                                                                              | Dead code; conversion is harmless and keeps them consistent if ever re-enabled                                 |
| l   | **Exponent literals** `1e-3rem`                                                            | Negative-lookbehind `(?<![\w.])` prevents matching the `-3rem` tail; defensive pre-scan aborts if any exist                                                                                         | Verified 0 present; guard protects re-runs                                                                     |
| m   | **Uppercase `1REM`/`1Rem`**                                                                | `i` flag matches them; verified 0 present                                                                                                                                                           | Guard is free                                                                                                  |
| n   | **Multi-dot `1.2.3rem`**                                                                   | Lookbehind forbids a `.` before the number                                                                                                                                                          | Verified 0 present                                                                                             |

**File integrity:** the codemod is a pure string-replace on file contents (read → `String.replace(REM, fn)` → write only if changed). It never parses/re-serializes CSS or Vue AST, so it **cannot** reorder, drop, or restructure anything — the only bytes that change are the digits inside `Nrem` tokens. This is the safest possible transform for "change numbers, touch nothing else."

**Idempotency guard / dry-run (Codex catch):** the script is deliberately single-shot. To make "run exactly once" robust:

- `node scripts/convert-rem.mjs --check` (dry-run) prints the manifest and writes nothing.
- A run refuses to proceed if `src/index.css` **no longer contains** `font-size: 62.5%` (the presence of the hack is the precondition marker — once removed, the tree is already converted and a second run would double-convert). The script exits non-zero with a clear message.
- The script writes a **manifest** (`docs/font-refactor/conversion-manifest.tsv`): one row per replacement — `file  line  oldToken  newToken  context-snippet`. This is the auditable record of _every_ token changed and is committed alongside the diff. The reviewer (and Codex diff review) reads this to confirm no unexpected context (e.g. a comment or JS string that shouldn't have changed) was touched.

**Text-replacement scope honesty (Codex catch):** the transform changes bytes in comments and any JS/template string too (intentional for static CSS strings like `useDashboardMedia.js:100`). The manifest surfaces every such context so nothing is hidden; the claim is not "only CSS values change" but "only `Nrem` numeric literals change, and here is the full list of where."

---

## 5. The 62.5% removal & comment fixes (manual, post-codemod)

After the codemod runs, manual edits:

1. `src/index.css:325` — the grouped `html, body { font-size: 62.5% }` becomes: **`html`'s** `font-size: 62.5%` is removed (root → 16px). **`body` is pinned explicitly to `font-size: 0.390625rem`** to preserve its old 6.25px computed size exactly (see §4a — this is the deterministic fix, applied unconditionally, not "if a leak is found"). Concretely: split the grouped rule so `html` loses the font-size and `body` gains `font-size: 0.390625rem;`. The other properties (`hyphens`, `background`, `color`) are preserved on both.
2. Update stale `1rem = 10px` / `62.5%` docs to reflect `1rem = 16px`. Two categories (Codex round-3 catch — the earlier "exactly four" claim omitted current docs):
   - **Code comments (4)** — these document live source and MUST be corrected:
     - `src/styles/brand.css:40`
     - `src/styles/dashboard-sections.css:11`
     - `src/views/DashboardView.vue:1230`
     - `src/components/Editor/TipTapEditor.vue:513`
   - **Current design docs (1)** — `docs/typography-normalization.md:25` (and its line ~117 root reference) describes the _active_ root as 62.5%; update to 16px + note the hack was removed.
   - **Historical audit logs (left as-is, they record past state):** `docs/audit-fixes/STATUS.md` (B4 diagnosis) intentionally keeps the 62.5% description — it is a dated work log of the pre-refactor state, not live guidance. Noted so the reviewer knows the omission is deliberate.

(Note: the `--type-*-size` vars in `brand.css` are rem and will be converted by the codemod; the comment near them is what changes manually.)

### 4a. The `body` compounding subtlety (raised by Codex, verified)

The selector is a **grouped** `html, body { font-size: 62.5% }`, so `body` _also_ gets 62.5%. Computed:

- `<html>` = 62.5% × 16px = **10px** → `1rem = 10px` (rem resolves against `<html>` only — this is why the ÷1.6 rem math is correct and unaffected by body).
- `<body>` = 62.5% × 10px (inherits html) = **6.25px**.

`rem` is **immune** to this (root-relative), so the ÷1.6 conversion is unaffected. But `em`, `%`, and _inherited/unitless_ font-sizes on elements whose font-size is NOT explicitly set resolve against their parent chain — which bottoms out at body's 6.25px. Simply deleting the grouped rule would raise that floor 6.25px → 16px and change any body-inheriting text.

**The deterministic fix (applied unconditionally — no "if a leak is found" reasoning):**

Split the grouped rule and **pin `body` to exactly its old computed size**:

```css
html {
  /* font-size removed → 16px */
  hyphens: auto;
  background: …;
  color: …;
}
body {
  font-size: 0.390625rem;
  hyphens: auto;
  background: …;
  color: …;
}
```

`0.390625rem × 16px = 6.25px` — **exactly** the old computed body size (verified: `6.25 / 16 = 0.390625`, exact since `0.390625 = 25/64`). This preserves body's base identically, so **every** em/%/inherited descendant resolves against the same 6.25px floor as before. The `%`-font-size `sup` (index.css:643) and all 159 `em` values are therefore unchanged whether or not they ultimately trace to body.

**Confirmed:** `body` has no other font-size declaration anywhere (grep verified) — the grouped `62.5%` rule is its sole source — so pinning it is sufficient and complete; nothing else competes in the cascade.

**Parity rule (removes the Round-2 contradiction):** because body is pinned to preserve 6.25px, Layer-2 verification requires **every element — including `<body>` — to have identical computed `fontSize`**. Only **`<html>`** is expected to change (10px → 16px, asserted as a ratio). There is no "accept an explainable delta" loophole: a font-size delta on _any_ element other than `<html>` fails verification and stops the push.

---

## 6. Verification strategy (the safety net)

Invariant to prove: **every rendered element is the same pixel size before and after.** Verification has two independent layers — a **mechanical** audit (proves the conversion arithmetic over all 1408 tokens) and a **rendered** audit (proves the DOM actually paints identically, catching cascade/inheritance surprises the arithmetic can't see).

### Layer 1 — Mechanical (exhaustive, not sampled)

1. **Build gate:** `npm run build` exits 0.
2. **Test gate:** `npm test` (vitest) stays green (baseline: 141 passing). NB: smoke/unit tests do NOT assert computed font-size — they catch parse/syntax breakage only.
3. **Full rem-token audit (all 1408, not a sample) — `node scripts/convert-rem.mjs --audit`:** For each scoped file, the audit extracts the **ordered sequence of rem tokens** from the file _at the base revision_ (`main` by default, `AUDIT_BASE` override) and from the working tree. It removes declared manual-added tokens (the body pin) from the working-tree stream by value, then compares the **remaining tokens POSITIONALLY** against `{convertToken(t) for each base token}` — the i-th base rem must equal the i-th surviving working-tree rem.
   - **Positional, not multiset (Codex round-5 catch):** a sorted-multiset compare would let two _balancing_ mis-conversions cancel (e.g. `1rem→1.25rem` and `2rem→0.625rem` swapped — both wrong, set still matches). Positional comparison rejects that. (Unit-verified: the swap case fails positional, passes multiset.)
   - **Why not byte-for-byte (Codex round-4 catch):** `src/index.css` and the comment files carry _manual_ non-rem edits (hack removal, body pin, comment text), so they can never equal a _pure_ codemod of the base. Comparing rem-token sequences ignores non-rem manual edits automatically, while still catching every conversion error.
   - **Manual additions are explicit:** the body pin `font-size: 0.390625rem` (PLAN §4a) is a rem token added by hand with no base counterpart; it's declared in `MANUAL_ADDED_TOKENS`, removed by value before the positional compare, and its presence is asserted.
   - **Proves, for all 1408 tokens:** every base token converted (missing → length/positional mismatch), none double-converted (wrong value → positional mismatch), none swapped/misplaced (→ positional mismatch), no spurious rem (extra → mismatch).
   - **Path reconciliation (Codex round-4/5):** the audit takes the **union** of scoped paths at base and in the working tree — **any** deleted/base-only scoped file (with or without rem) is flagged (deletion is out of scope for this refactor), and a brand-new scoped file with rem fails (no base counterpart to prove it a conversion; must be allowlisted or hand-verified). Nothing slips through unaudited.
     The per-token round-trip assertion inside `convertToken()` still guarantees `old_rem * 10 == new_rem * 16` (relative tolerance, magnitude-safe). This token audit — not element sampling — proves all conversions correct and complete.

### Layer 2 — Rendered (Playwright MCP, main vs branch)

Load the same routes on a **main** preview build and a **branch** preview build (sequential checkout + `vite preview`, or two ports). Compare via `getComputedStyle`:

4. **Base-change confirmation via RATIO, not hardcoded px** (Codex catch — don't assume 16px browser default): `<html>` is the **only** element whose computed `fontSize` is expected to change; assert `computed(html).fontSize_branch / computed(html).fontSize_main == 1.6` (the expected 10px→16px ratio regardless of the user's actual browser base). Record both absolute values for the report.
5. **Exhaustive computed-style traversal — every element AND pseudo-element:** walk _all_ rendered nodes on each key page (`document.querySelectorAll('*')`) **plus `::before`/`::after`** (skip pseudo-elements whose computed `content` is `none` — Codex #4), and compare the full set of size-affecting properties between main and branch. The property list is **derived from the rem-bearing properties actually present in the codebase** (Codex #3), not a guess — it includes at minimum: `fontSize`, `lineHeight`, `letterSpacing`, `width`, `height`, `minWidth`, `maxWidth`, `minHeight`, `maxHeight`, `marginTop/Right/Bottom/Left`, `paddingTop/Right/Bottom/Left`, `top/right/bottom/left`, `gap`, `rowGap`, `columnGap`, `borderTopWidth/RightWidth/BottomWidth/LeftWidth`, `borderTopLeftRadius/TopRightRadius/BottomRightRadius/BottomLeftRadius`, `gridTemplateColumns`, `gridTemplateRows`, `transform` (computed matrix — catches `translateX(11rem)`), `backgroundPosition`, `backgroundSize`, `textIndent`, `outlineWidth`, `outlineOffset`. Actual repo examples the earlier list missed: `max-width: 64rem`, `border-radius: 0.8rem`, `translateX(...11rem...)`, `grid-template-columns: 28rem 1fr`. **DOM pairing (Codex #4):** first assert both trees have identical `querySelectorAll('*').length`; abort the comparison as inconclusive (→ STOP, investigate) if counts differ, rather than index-aligning mismatched nodes. Stabilize fonts (`document.fonts.ready`), viewport, `data-reduce-motion=1`, and app state before sampling. **Parity rule:** every paired node's every property must match within `<0.1px` (compare `transform` matrices numerically) — with the **single exception of `<html>`'s `fontSize`** (expected 1.6× per step 4). A delta on **any other node or pseudo-element, including `<body>`,** fails verification → STOP. This is exhaustive (not sampled) and includes em/%/inherited nodes, so a §4a body-inheritance regression or any missed/double-converted rem shows up as a hard failure, not a judgment call.
6. **Key pages:**
   - `/` (redirects to `/chapter`)
   - `/chapter/1` — **Chapter 1 "The Retina" — the north-star page. Must render pixel-identical.**
   - `/styleguide` — exercises the full type scale (`--type-*`), accent/theme, specimens.
   - dashboard/settings routes if reachable without auth; else noted as deferred (local dev has no Supabase — see caveat).
7. **Interactive/responsive states:** for at least the north-star page, also compare at the desktop width the app targets (≥1300px, per CLAUDE.md the app warns below that) and check one hover/focus state (a button) so hover-only rem sizing is covered. (Mobile <1300px shows a media-query warning screen, so full mobile parity is lower value, but the warning screen itself is sampled.)
8. **Screenshot diff (secondary — the computed-style traversal in step 5 is the authoritative numeric gate):** full-page screenshots of key pages on both branches, with animations stabilized (`animation-stopper` class per CLAUDE.md; also `data-reduce-motion=1` and wait for `document.fonts.ready` + Lottie idle). **Numeric acceptance rule (Codex #5):** the traversal in step 5 is the deterministic gate (any non-`<html>` delta ≥0.1px = STOP). Screenshots are a defense-in-depth cross-check for anything a computed-style walk can't see (e.g. a glyph shift). Because pixel-diff tooling may not be wired locally, screenshots are compared by (a) the step-5 numeric traversal already having passed, and (b) visual inspection of the paired full-page captures; any _stable_ visible delta not explained by `<html>`'s expected base change = STOP. If a pixel-diff tool is available, threshold = 0 stable differing pixels outside masked dynamic regions (none expected on Chapter 1).

### Caveats & stop condition

- **Local-dev caveat:** local dev has no Supabase (per project memory `local-dev-no-supabase`), so DB-backed Chapter 2+ content won't load locally — rendered verification focuses on Chapter 1 (local JSON) and static/style-driven pages (styleguide, home). This is exactly the north-star, so it's the right focus; Chapter 2+ parity is asserted mechanically (Layer 1) since we can't render it locally.
- **Stop condition:** if the mechanical audit fails on any token, OR any rendered element's px differs beyond sub-pixel rounding and I can't explain it, **STOP and report** — do not push a broken refactor.

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

**Round 1 — VERDICT: REVISE.** Codex raised, and this revision addresses:

1. **`body` compounding** (`html, body` grouped → body = 6.25px): verified real; added §4a analysis + em/%/inheritance verification + decision-after-empirical-check (no hard-coded fix). ✅
2. **"Every rem assumes the hack" unproven**: strengthened — Layer-1 mechanical audit + Layer-2 full computed-style traversal would surface any already-16px-base value as a rendered delta; verified no third-party rem CSS in scope. ✅
3. **Regex corruption** (`1e-3rem`, uppercase `1REM`, multi-dot): added negative-lookbehind `(?<![\w.])` + `i` flag + defensive pre-scan abort. Verified 0 such tokens present today. ✅ (edge-case table rows l/m/n)
4. **Text-replacement honesty + manifest**: added committed `conversion-manifest.tsv` of every token/context; reframed the claim. ✅
5. **Idempotency**: added `--check` dry-run + precondition guard (refuses if `62.5%` already gone). ✅
6. **Rounding accumulation**: switched to exact `×0.625` + per-token round-trip assertion → provably zero error, accumulation moot. ✅
7. **Missed stale comment** `DashboardView.vue:1230`: added; full sweep found a **4th** (`TipTapEditor.vue:513`) — all four now listed. ✅
8. **Verification insufficient**: replaced sampling with (a) exhaustive mechanical token audit over all 1408, (b) full `querySelectorAll('*')` computed-style traversal incl. html/body/em/%, (c) ratio-not-hardcoded base assertion, (d) responsive + hover states, (e) stabilized screenshots. ✅

**Round 2 — VERDICT: REVISE.** Codex found §4a still had a correctness gap (my fault — muddled body-fix math + a contradiction). Fixed:

1. **Wrong body-fix math** (I wrote `0.625rem`/`1rem`/`1.6rem`, all wrong): corrected to the exact value **`body { font-size: 0.390625rem }`** = 6.25px at 16px root (`6.25/16 = 25/64 = 0.390625`, exact). ✅
2. **Contradiction** (Layer 2 required body to match _and_ change): resolved — body is now **pinned** to preserve 6.25px, so the parity rule is "**only `<html>` changes; every other node including `<body>` must match**." No contradiction. ✅
3. **"Accept if explainable" loophole + missing pseudo-elements + partial property set:** removed the loophole entirely (any non-html delta = STOP); traversal now includes `::before`/`::after` and a full size-property set. ✅

**Round 3 — VERDICT: REVISE.** Codex confirmed the core codemod (calc, shorthand, negatives, `0rem`, static JS/template literals, media-block declarations, untouched unitless line-heights, the body pin) is correct, but flagged the verification/audit layer. All addressed:

1. **`--audit` was a stub** (re-ran the conversion in memory without a real diff comparison): reimplemented as a **diff-based audit** — reconstructs each file from the base ref, converts it with the same `convertContent()`, and asserts byte-for-byte equality with the working tree. Proves completeness + no-double-convert + no-stray-edit positionally. ✅
2. **"Leftover old token" scan ill-defined** (an old token can equal another's converted value): dropped entirely in favor of the positional byte-for-byte audit above. ✅
3. **Rendered property list incomplete** (missed `max/min-width/height`, `transform`, `grid-template-*`, `border-radius`): property list is now derived from rem-bearing properties actually in the repo; expanded accordingly. ✅
4. **DOM pairing by index unsafe:** assert identical node counts first, stabilize fonts/viewport/motion/state, skip `content:none` pseudo-elements. ✅
5. **Screenshot rule subjective:** demoted to a secondary cross-check; the numeric computed-style traversal (step 5, ≥0.1px = STOP) is the authoritative gate. ✅
6. **"Exactly four stale comments" false** (omitted current doc `typography-normalization.md`): split into 4 code comments + 1 current doc (both fixed) vs. historical audit logs (left as dated records). ✅
7. **Minor:** manifest fields now escape tab/CR/newline (`tsvField`); `--check` now also refuses once the hack is gone; the audit inconsistency ("regex used for post-run audit" that didn't exist) is resolved by the real audit. `1.rem` malformed form verified absent (grep). ✅

**Round 4 — VERDICT: REVISE.** Codex confirmed all round-3 fixes landed but found the diff-based audit had a blocking flaw: byte-for-byte file equality can _never_ pass for `src/index.css` + the comment files, which carry manual non-rem edits. Also flagged: new files skipped, base/current path set not reconciled, `1.rem` not in FORBIDDEN, absolute round-trip tolerance. All fixed:

1. **Audit reworked to rem-token-sequence comparison** (not byte equality): per file, working-tree rem multiset must equal `{÷1.6 of each base token} ∪ {declared manual additions}`. Manual non-rem edits no longer break the audit; the body pin `0.390625rem` is an explicit declared addition. ✅
2. **Path reconciliation:** audit iterates the **union** of scoped paths at base and current; deleted/base-only/new rem-bearing files are accounted for or flagged. ✅
3. **New files audited:** a new file's tokens must all be already-correct (no base counterpart to convert) or it fails. ✅
4. **`1.rem` trailing-dot form** added to `FORBIDDEN` (verified: REM would silently skip it; guard now aborts). ✅
5. **Round-trip tolerance** made relative (`1e-9 × max(1,|value|)`) — magnitude-safe. ✅

**Round 5 — VERDICT: REVISE.** Codex confirmed `convertToken`/`remTokens`/`FORBIDDEN`/enumeration sound, but found the audit's **sorted-multiset** comparison could pass two balancing mis-conversions (a swap). Also: new-file/deleted-file reconciliation didn't match its stated guarantee. Fixed:

1. **Positional comparison** replaces the multiset: manual-added tokens are removed by value, then remaining working-tree tokens are compared position-for-position against the converted base tokens. Unit-verified that the swap case now fails. ✅
2. **Deleted/base-only scoped files** are flagged unconditionally (with or without rem). ✅
3. **New scoped files** with rem fail with a clear "no base counterpart — allowlist or verify by hand" message (this refactor adds no new scoped source files, so it's a guard, not a live case). ✅

**Round 6 — VERDICT: REVISE.** Codex confirmed positional comparison fixed the swap, but flagged that **value-based** removal of the manual token (`indexOf`) is unanchored — a contrived mis-conversion could produce `0.390625` elsewhere while the real pin is mangled, and the unanchored deletion would still leave a matching sequence. Fixed:

- `MANUAL_ADDED_TOKENS` now declares `{value, index}`; removal asserts the token at that **exact rem-stream index** equals the declared value before splicing (highest-index-first so earlier splices don't shift anchors). The body pin is anchored at index 101 (101 base rem tokens precede its line in `index.css`). A stale index fails loudly — the intended tripwire. ✅

**Round 7 — VERDICT: NOT OBTAINED (codex invocation hung server-side ~20min in "Reading additional input from stdin", produced no output; killed).** Round-7 was a _confirmatory_ re-review of the round-6 fix (index-anchored manual-token removal) — a narrow adversarial audit-harness edge, not the conversion. Per the session's execution rule (never wait on a signal that isn't coming) I proceeded. **The empirical `--audit` (0 mismatches over all 1408 tokens) + Layer-2 rendered pixel parity are the authoritative hard gates, independent of any Codex verdict.** During BUILD the audit caught 5 real defects in my _manual_ edits (comment `1rem` literals re-entering the token stream; a duplicate `0.390625` in the pin comment), all fixed — demonstrating the audit works as the safety net it was designed to be. Note: this refactor has run **5 review rounds beyond the initial 2**. Every round found a real issue, converging from substantive conversion bugs (`toFixed` precision loss, `**`-glob excluding `index.css`) to increasingly narrow _audit-harness_ soundness concerns (byte-equality-vs-manual-edits, multiset-vs-swap, unanchored manual-token removal). **The core ÷1.6 conversion math (`convertToken`) and file enumeration have been confirmed sound since round 3** — every subsequent REVISE was about making the _verification proof_ airtight, not about a defect in the actual conversion. The Layer-1 token audit + Layer-2 rendered pixel parity remain the hard gate before any push; the codemod does not ship unless both pass.

### Diff review (Step 3b)

_Superseded by the Layer-2 finding below — the diff review was not the binding gate._

### ⛔ Layer-2 rendered verification: FAILED → HALTED (see SESSION-REPORT.md)

Rendered comparison of Chapter 1 (main vs branch, 1440×900) found **747 elements differing**, with hundreds of sizes shifted **1.6×**. Root cause: **Tailwind's default utility scale** (`gap-2`=`0.5rem`, `px-24`=`6rem`, `h-64`=`16rem`, …) lives in Tailwind core, **out of the codemod's `src/` scope**, so it was not converted. The `62.5%` hack was rendering those utilities at 0.625×; removing it makes them 1.6× larger. ~572 such utility uses exist app-wide.

This is a genuine size regression → **STOP condition triggered → NOT pushed.** The Layer-1 token audit passing (0/1408 mismatches) is correct but insufficient: token correctness ≠ pixel invariance when out-of-scope rem sources (Tailwind defaults, runtime JS-injected rem) depend on the root base. Fix path: override Tailwind's rem scales ÷1.6 in `tailwind.config.js` + sweep runtime rem, then re-gate on Layer-2. Full analysis in `docs/font-refactor/SESSION-REPORT.md`.

---

## Phase 2 — Tailwind default-scale rebase (closes the Layer-2 gap)

**Goal:** make Tailwind's built-in default utilities (`p-*`, `gap-*`, `h-*`, `text-*`, `rounded-*`, `leading-*`, `max-w-*`, …) render the **same pixels at the new 16px base** as they did at the old 10px (`62.5%`) base — pixel-invariant, exactly as Phase 1 did for authored `rem`.

### Why Phase 1 was insufficient

Phase 1's codemod is scoped to `src/` + `tailwind.config.js`. It correctly ÷1.6'd every **authored** rem literal. But Tailwind's default scale (`spacing.4 = 1rem`, `spacing.24 = 6rem`, `borderRadius.DEFAULT = 0.25rem`, `fontSize.base = 1rem`, …) is defined in **Tailwind core**, and this project's config uses `theme.extend`, which **inherits** that default scale unchanged. At the old base `p-4` = 1rem = 10px; removing the hack makes `p-4` = 1rem = 16px = **1.6× too big**. This drove the 747-element Chapter-1 regression.

### Which scales are rebased (and why exactly these)

Enumerated from Tailwind 3.4.19's resolved default theme (`resolveConfig({content:[]}).theme`) as the scales that carry their **own** rem literals, cross-checked against **actual usage in `src/`** (utility-class grep): spacing **585 uses**, fontSize **78**, borderRadius **61**, lineHeight **3**, maxWidth **8**, columns **0** (rebased for safety/completeness).

| Scale          | Rebased?    | Note                                                                                                                                                                                                                                                                                                  |
| -------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spacing`      | ✅ (master) | `padding`, `margin`, `gap`, `inset`, `width`, `height`, `size`, `translate`, `space`, `scroll-margin/padding`, `flex-basis`, `borderSpacing`, etc. are defined in core as `theme => theme('spacing')`, so overriding `spacing` **cascades** to all of them — one override fixes ~15 utility families. |
| `fontSize`     | ✅          | Own rem literals; the `lineHeight`/`letterSpacing` sub-value in each `[size, {…}]` tuple is also rebased. Unitless line-heights (`"1"`) and `em` letter-spacings pass through.                                                                                                                        |
| `lineHeight`   | ✅          | Own rem literals (keys `3`–`10`); unitless keywords (`none`/`tight`/…) pass through.                                                                                                                                                                                                                  |
| `borderRadius` | ✅          | Own rem literals; `none: 0px` / `full: 9999px` pass through.                                                                                                                                                                                                                                          |
| `maxWidth`     | ✅          | Resolved scale = spacing keys **plus** its own `xs`–`7xl` rem keys; both rebased. `ch`/`vw`/`%`/keyword values pass through.                                                                                                                                                                          |
| `columns`      | ✅          | Own `3xs`–`7xl` rem keys (0 uses today; rebased for completeness).                                                                                                                                                                                                                                    |

Scales that are **pure functions of `spacing`** with no independent rem (`padding`, `margin`, `gap`, `inset`, `width`, `height`, `translate`, `size`, `min/maxHeight`, `minWidth`, `scrollMargin/Padding`, `space`, `flexBasis`) are **not** overridden directly — they re-derive from the rebased `spacing` automatically. This is the minimal, complete set.

### How it is derived (generated, not hand-typed)

`scripts/tailwind-rebase.cjs` imports Tailwind's resolved default theme and divides **every rem literal** in the six scales above by 1.6, reusing Phase 1's exact-decimal arithmetic:

- `×0.625` (= 5/8, exactly representable in IEEE-754 — avoids a `/1.6` rounding artifact), then `Number.toString()` (shortest round-tripping decimal). Guards against exponential output.
- **Per-token round-trip assertion:** `converted × 1.6 == original` within `1e-9 × max(1,|value|)`. Magnitude-relative, so large values aren't falsely rejected.
- Non-rem values (`px`, `%`, `vw`, `ch`, keywords, unitless, `calc()` without rem) pass through untouched; rem **inside** a `calc()`/`min()`/`max()` is divided in place (same negative-lookbehind regex as Phase 1).

The result is wired into `tailwind.config.js` as **hard overrides** under `theme` (NOT `theme.extend` — extend would _merge_, leaving the original default rem alive). The config's pre-existing custom `extend` keys (`height.header`, `width.text`, `spacing.text`, `margin.body`, …) are already Phase-1-converted authored values and survive on top of the rebased base — verified via `resolveConfig`.

### Invariance proof (same as Phase 1)

A utility sized `X rem` renders at `X × base_px`. Before: `X × 10`. After ÷1.6 at the new base: `(X/1.6) × 16 = X × 10`. **Identical pixels.** ∎ Spot-checked against the exact regression classes from SESSION-REPORT: `.px-24 → 3.75rem` (60px), `.gap-2 → .3125rem` (5px), `.py-10 → 1.5625rem` (25px), `.-ml-5 → -.78125rem` (-12.5px) — all match `main`'s rendered pixels.

### How it is verified

1. **Rebase self-audit** — `node scripts/tailwind-rebase.cjs --audit`: for every rebased rem token, asserts `rebased × 1.6 == default` (independent re-derivation). **PASS: 126/126 tokens.**
2. **Built-CSS spot-check** — grep the exact SESSION-REPORT regression classes out of `dist/` and confirm the emitted rem × 16px == `main`'s pixels.
3. **Build gate** — `npm run build` exit 0.
4. **Test gate** — `npm test` 141/141.
5. **Layer-2 rendered pixel diff (the hard gate)** — re-run the same main-vs-branch computed-style traversal that caught the regression, on Chapter 1 (1440×900 + a mobile width) and home. The non-`<html>` element-delta count must drop from ~747 to ~0 (sub-pixel rounding only). If any size delta remains, the rebase is incomplete → iterate or STOP; **do not push.**

### Explicitly NOT done (and why it's OK)

- **JS/GSAP runtime-injected inline rem** (e.g. an animation setting `height: 2.0815rem` at runtime) scales with the root by design and is not a Tailwind default; if Layer-2 flags any such element it is investigated separately. These are _not_ Tailwind-scale and are not in Phase-2 scope; Layer-2 is the backstop that would surface them.
- **Reintroducing `62.5%`** — not done. The rebase re-expresses the default scale at the true 16px base; it does not restore the hack.
- **Touching any `src/` authored value** — not done. Those are already correct from Phase 1; Phase 2 is purely the Tailwind-core default scale.
