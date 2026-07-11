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

**Rounding rule (revised per Codex — precision-preserving, not a fixed cap):**

Because `1/1.6 = 0.625 = 5/8`, multiplying **any finite decimal** by `0.625` **always terminates** (5/8 is `5 / 2³`, and dividing by a power of two adds at most 3 decimal places per source decimal place). So the exact result is representable exactly in decimal. The script therefore:
1. Computes `converted = value * 0.625` (equivalent to `/1.6`, but `0.625` is exactly representable in IEEE-754, avoiding a division-rounding artifact).
2. Formats with `toFixed(6)` then **strips trailing zeros** (6 dp is more than the exact result ever needs for the source precisions present — max source precision here is 2 dp → exact result ≤ 5 dp).
3. **Asserts round-trip:** `parseFloat(newStr) * 1.6` must equal `value` within `1e-9`, else the script aborts on that token (guards against any formatting loss).

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
- `i` flag: case-insensitive, so `1REM`/`1Rem` are also caught (Codex catch). *(None exist today, but the guard is free.)*

**Defensive pre-scan (script aborts if any is found):** before converting, the script scans for malformed / unsupported forms it refuses to touch — `\d+e[-+]?\d+rem` (exponent), `\d+\.\d+\.\d+rem` (multi-dot), uppercase-mixed weirdness — and **fails loudly** rather than silently converting. Verified today: zero such tokens exist, so the script proceeds; the guard protects future re-runs.

**Enumeration ≡ codemod guarantee:** the file list is produced by the script itself (`REM.test(content)`), not by a separate `grep`, so the set of files scanned for conversion is exactly the set enumerated. No drift possible.

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
| l | **Exponent literals** `1e-3rem` | Negative-lookbehind `(?<![\w.])` prevents matching the `-3rem` tail; defensive pre-scan aborts if any exist | Verified 0 present; guard protects re-runs |
| m | **Uppercase `1REM`/`1Rem`** | `i` flag matches them; verified 0 present | Guard is free |
| n | **Multi-dot `1.2.3rem`** | Lookbehind forbids a `.` before the number | Verified 0 present |

**File integrity:** the codemod is a pure string-replace on file contents (read → `String.replace(REM, fn)` → write only if changed). It never parses/re-serializes CSS or Vue AST, so it **cannot** reorder, drop, or restructure anything — the only bytes that change are the digits inside `Nrem` tokens. This is the safest possible transform for "change numbers, touch nothing else."

**Idempotency guard / dry-run (Codex catch):** the script is deliberately single-shot. To make "run exactly once" robust:
- `node scripts/convert-rem.mjs --check` (dry-run) prints the manifest and writes nothing.
- A run refuses to proceed if `src/index.css` **no longer contains** `font-size: 62.5%` (the presence of the hack is the precondition marker — once removed, the tree is already converted and a second run would double-convert). The script exits non-zero with a clear message.
- The script writes a **manifest** (`docs/font-refactor/conversion-manifest.tsv`): one row per replacement — `file  line  oldToken  newToken  context-snippet`. This is the auditable record of *every* token changed and is committed alongside the diff. The reviewer (and Codex diff review) reads this to confirm no unexpected context (e.g. a comment or JS string that shouldn't have changed) was touched.

**Text-replacement scope honesty (Codex catch):** the transform changes bytes in comments and any JS/template string too (intentional for static CSS strings like `useDashboardMedia.js:100`). The manifest surfaces every such context so nothing is hidden; the claim is not "only CSS values change" but "only `Nrem` numeric literals change, and here is the full list of where."

---

## 5. The 62.5% removal & comment fixes (manual, post-codemod)

After the codemod runs, manual edits:
1. `src/index.css:325` — the grouped `html, body { font-size: 62.5% }` becomes: **`html`'s** `font-size: 62.5%` is removed (root → 16px). **`body` is pinned explicitly to `font-size: 0.390625rem`** to preserve its old 6.25px computed size exactly (see §4a — this is the deterministic fix, applied unconditionally, not "if a leak is found"). Concretely: split the grouped rule so `html` loses the font-size and `body` gains `font-size: 0.390625rem;`. The other properties (`hyphens`, `background`, `color`) are preserved on both.
2. Update **all four** stale `1rem = 10px` / `62.5%` comments (full-repo sweep confirms exactly these four) → reflect `1rem = 16px`:
   - `src/styles/brand.css:40`
   - `src/styles/dashboard-sections.css:11`
   - `src/views/DashboardView.vue:1230`
   - `src/components/Editor/TipTapEditor.vue:513`

(Note: the `--type-*-size` vars in `brand.css` are rem and will be converted by the codemod; the comment near them is what changes manually.)

### 4a. The `body` compounding subtlety (raised by Codex, verified)

The selector is a **grouped** `html, body { font-size: 62.5% }`, so `body` *also* gets 62.5%. Computed:
- `<html>` = 62.5% × 16px = **10px** → `1rem = 10px` (rem resolves against `<html>` only — this is why the ÷1.6 rem math is correct and unaffected by body).
- `<body>` = 62.5% × 10px (inherits html) = **6.25px**.

`rem` is **immune** to this (root-relative), so the ÷1.6 conversion is unaffected. But `em`, `%`, and *inherited/unitless* font-sizes on elements whose font-size is NOT explicitly set resolve against their parent chain — which bottoms out at body's 6.25px. Simply deleting the grouped rule would raise that floor 6.25px → 16px and change any body-inheriting text.

**The deterministic fix (applied unconditionally — no "if a leak is found" reasoning):**

Split the grouped rule and **pin `body` to exactly its old computed size**:
```css
html { /* font-size removed → 16px */ hyphens: auto; background: …; color: …; }
body { font-size: 0.390625rem; hyphens: auto; background: …; color: …; }
```
`0.390625rem × 16px = 6.25px` — **exactly** the old computed body size (verified: `6.25 / 16 = 0.390625`, exact since `0.390625 = 25/64`). This preserves body's base identically, so **every** em/%/inherited descendant resolves against the same 6.25px floor as before. The `%`-font-size `sup` (index.css:643) and all 159 `em` values are therefore unchanged whether or not they ultimately trace to body.

**Confirmed:** `body` has no other font-size declaration anywhere (grep verified) — the grouped `62.5%` rule is its sole source — so pinning it is sufficient and complete; nothing else competes in the cascade.

**Parity rule (removes the Round-2 contradiction):** because body is pinned to preserve 6.25px, Layer-2 verification requires **every element — including `<body>` — to have identical computed `fontSize`**. Only **`<html>`** is expected to change (10px → 16px, asserted as a ratio). There is no "accept an explainable delta" loophole: a font-size delta on *any* element other than `<html>` fails verification and stops the push.

---

## 6. Verification strategy (the safety net)

Invariant to prove: **every rendered element is the same pixel size before and after.** Verification has two independent layers — a **mechanical** audit (proves the conversion arithmetic over all 1408 tokens) and a **rendered** audit (proves the DOM actually paints identically, catching cascade/inheritance surprises the arithmetic can't see).

### Layer 1 — Mechanical (exhaustive, not sampled)

1. **Build gate:** `npm run build` exits 0.
2. **Test gate:** `npm test` (vitest) stays green (baseline: 141 passing). NB: smoke/unit tests do NOT assert computed font-size — they catch parse/syntax breakage only.
3. **Full token audit (all 1408, not a sample):** a `--audit` mode re-parses `git diff main...HEAD`, extracts every changed `Nrem` token, and asserts **for every one**: `old_rem * 10 == new_rem * 16` within `1e-6` px. Also asserts:
   - **no old rem token was left unconverted** (re-scan the branch tree; the only surviving pre-hack rem values allowed are those that were already `0rem`),
   - **no non-rem numeric text changed** (diff hunks touch only `Nrem` tokens + the 4 comments + the hack line),
   - **no out-of-scope files changed** (diff file list ⊆ enumerated set ∪ {index.css, the 4 comment files, docs, scripts}).
   This mechanical audit — not element sampling — is what proves all 1408 conversions are correct and complete.

### Layer 2 — Rendered (Playwright MCP, main vs branch)

Load the same routes on a **main** preview build and a **branch** preview build (sequential checkout + `vite preview`, or two ports). Compare via `getComputedStyle`:

4. **Base-change confirmation via RATIO, not hardcoded px** (Codex catch — don't assume 16px browser default): `<html>` is the **only** element whose computed `fontSize` is expected to change; assert `computed(html).fontSize_branch / computed(html).fontSize_main == 1.6` (the expected 10px→16px ratio regardless of the user's actual browser base). Record both absolute values for the report.
5. **Exhaustive computed-style traversal — every element AND pseudo-element:** walk *all* rendered nodes on each key page (`document.querySelectorAll('*')`) **plus `::before`/`::after`** (`getComputedStyle(el, '::before')`), and compare the full set of size-affecting properties between main and branch: `fontSize`, `lineHeight`, `letterSpacing`, `width`, `height`, `marginTop/Right/Bottom/Left`, `paddingTop/Right/Bottom/Left`, `top/right/bottom/left`, `gap`, `borderWidth`. **Parity rule:** every node's every property must match within `<0.1px` — with the **single exception of `<html>`'s `fontSize`** (expected 1.6× per step 4). A delta on **any other node or pseudo-element, including `<body>`,** fails verification → STOP. This is exhaustive (not sampled) and includes em/%/inherited nodes, so a §4a body-inheritance regression or any missed/double-converted rem shows up as a hard failure, not a judgment call.
6. **Key pages:**
   - `/` (redirects to `/chapter`)
   - `/chapter/1` — **Chapter 1 "The Retina" — the north-star page. Must render pixel-identical.**
   - `/styleguide` — exercises the full type scale (`--type-*`), accent/theme, specimens.
   - dashboard/settings routes if reachable without auth; else noted as deferred (local dev has no Supabase — see caveat).
7. **Interactive/responsive states:** for at least the north-star page, also compare at the desktop width the app targets (≥1300px, per CLAUDE.md the app warns below that) and check one hover/focus state (a button) so hover-only rem sizing is covered. (Mobile <1300px shows a media-query warning screen, so full mobile parity is lower value, but the warning screen itself is sampled.)
8. **Screenshot diff:** full-page screenshots of key pages on both branches, with animations stabilized (the app has an `animation-stopper` class per CLAUDE.md; also set `data-reduce-motion` and wait for fonts/Lottie idle) to avoid nondeterministic diffs. Any *stable* visible delta = bad conversion → STOP.

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
2. **Contradiction** (Layer 2 required body to match *and* change): resolved — body is now **pinned** to preserve 6.25px, so the parity rule is "**only `<html>` changes; every other node including `<body>` must match**." No contradiction. ✅
3. **"Accept if explainable" loophole + missing pseudo-elements + partial property set:** removed the loophole entirely (any non-html delta = STOP); traversal now includes `::before`/`::after` and a full size-property set. ✅

**Round 3 — VERDICT: (pending re-review).**

### Diff review (Step 3b)
_(to be filled after `codex exec` review)_
