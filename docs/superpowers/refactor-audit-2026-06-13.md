# The Open Brain — Refactoring Audit (size & DRY focus)

**Date:** 2026-06-13
**Branch:** `audit/refactor-opportunities` (read-only audit; no code changed)
**Method:** 5 parallel domain auditors + synthesis, then key deletion claims independently re-verified by hand (see "Verification" notes).

**Baseline:** 217 source files, ~44,120 LOC. Largest files: `DashboardView.vue` (3,246), `ProfessorDashboardView.vue` (1,514), `HighlightToolbar.vue` (825), `NotebookTab.vue` (808), `NavDrawer.vue` (752), `QuizView.vue` (724), `TipTapEditor.vue` (711).

---

## Executive summary

Three moves dominate:

1. **Collapse the 15 hand-copied `supabaseRest()` wrappers onto the already-built-but-unused shared client** (`src/services/api/client.js`) — ~390 LOC of duplicate HTTP transport. The only blocker is that the client's session holder (`setSession`/`getSession`) is **never wired** (verified: zero importers).
2. **Delete confirmed dead code** — 4 orphan Navigation components (772 LOC), `NotesSidebar.vue` + `NoteModal.vue` (978 LOC), 4 zero-consumer API service modules (797 LOC), plus dead helpers — **~2,617 LOC removable at near-zero risk** (every claim re-verified: no import statements anywhere).
3. **Split the two section-monolith views** (`DashboardView.vue` 3,246, `ProfessorDashboardView.vue` 1,514) using the per-section extraction pattern the chapter wizard already proves.

Tiers 1–2 alone remove ~3,200 LOC outright and relocate ~3,000 more out of the four biggest files.

**Verification reality:** `npm run build` is the only working gate (lint is broken — missing `prettier`; no unit tests, 3 e2e specs only). Gate every step on build; browser-check UI-touching pulls.

---

## Prioritized table (ranked by leverage-to-risk)

| Rank | Opportunity | Files (key cites) | Payoff | Effort | Risk |
|---|---|---|---|---|---|
| 1 | Delete 4 dead Navigation components | `Navigation/{MenuNav(356),MenuAbout(180),MenuHome(98),BottomNav(138)}.vue` | ~772 LOC; **verified zero imports** | S | low |
| 2 | Delete orphan `NotesSidebar.vue`(699) + `NoteModal.vue`(279) | `chapter/NotesSidebar.vue`, `chapter/NoteModal.vue` | ~978 LOC; **verified zero imports**; superseded by `sidebar/NotebookTab.vue` | S | low |
| 3 | Delete 4 zero-consumer API service modules | `services/api/{media,users,quizzes,analytics}.js` + barrel re-exports | ~797 LOC; **verified zero imports**, barrel `@/services/api` itself unimported | S | low |
| 4 | Fix/strip broken helper + debug logs | `helper/marking.js`, `helper/sections.js`, `stores/index.js:64,70,77`, `TextComp.vue` (9 logs) | ~70 LOC + **fixes a latent bug** (see below) | S | low |
| 5 | Centralize date/relative-time formatter | new `utils/format.js` ← 11 copies (Student/Professor/Dashboard views, ProgressCard, useTrendingHighlights, ChatTab, NotebookTab, AITutorSidebar, FlashcardDeck, CourseCard) | ~100 LOC → ~30; consistent phrasing | S | low |
| 6 | Centralize highlight-color hex map | `useHighlights.js:11-17` (add `hex`); kill 5 inline maps (NotebookTab, HighlightToolbar, HighlightRenderer, useHighlightRenderer) | 5 maps → 1 source | S | low |
| 7 | Prune dead store state/getters | `comments.js:6,22-24`; `stores/index.js:26,35,36` (`count`/`getactiveMenu`/`doubleCount`) | shrinks store surface (verified 0-use; KEEP `getCom()` — used by CommentComp) | S | low |
| 8 | **Consolidate 15 `supabaseRest()` onto shared client** | `services/api/client.js:18-68` (0 consumers) + 15 copies | ~390 LOC; ends silent behavioral drift | L | med |
| 9 | Extract `ChapterBlockEditor` from DashboardView | `DashboardView.vue` tmpl 2086-2204, logic 363-757/188-249/763-781, CSS 3042-3240 | ~800-900 LOC out of the 3,246 file in one move | L | med |
| 10 | Move dashboard per-section fetch/CRUD into composables | `DashboardView.vue` 783-1500; `ProfessorDashboardView.vue` 174-470 | precondition that makes #11/#12 trivial; mechanical | M | low |
| 11 | Split DashboardView remaining sections | `DashboardView.vue` analytics/quizzes/media/users/versions blocks | sheds >1,000 more LOC; parent → shell | L | med |
| 12 | Split ProfessorDashboardView sections | `ProfessorDashboardView.vue` 917-1392 | ~400-500 LOC; reuses #11 pattern | M | med |
| 13 | `withAsyncState()` for loading/error/data triple | 15 data composables (~28 try/catch scaffolds) | ~150-200 LOC; standardizes error handling | M | med |
| 14 | Adopt `dashboard/shared` primitives in sidebar tabs | `NotebookTab.vue`, `ChatTab.vue:197-425` ← shared EmptyState/ConfirmDialog/Button/LoadingState | shrinks style blocks; unifies look | M | low |
| 15 | Extract shared `CloseIcon` (14 inline copies) | NavDrawer, ReaderSidebar, AITutorSidebar, QuizView, FlashcardView, ChapterView, … | 14 copies → 1 (pattern: `DashboardNavIcon`) | M | low |
| 16 | Split `QuizView` screens + trim CSS | `QuizView.vue` screens 184-360, style 381-724 (47%) | 724 → ~150; logic already in `useQuizzes` | M | low |
| 17 | Tokenize `HighlightToolbar` | `HighlightToolbar.vue:510-797` (44 hardcoded hex) | **fixes a real theming bug** (toolbar ignores dark mode/accent) | M | med |
| 18 | Split `HighlightToolbar.vue` (825) | panels 419-493, 6 toggle fns 109-186, style 499-824 | 825 → ~300; isolates riskiest selection code | M | med |
| 19 | Dedup auth form (NavDrawer ↔ MenuAuth) | `NavDrawer.vue:111-419,634-726` vs `MenuAuth.vue:19-441` | ~200 LOC; unifies drifted validation | M | med |
| 20 | Collapse CRUD composables via factory | `useHighlights`/`useNotes`/`useTrendingHighlights` | ~150-200 LOC — **only after** #5/#8/#13 | M | med |

---

## Tier 1 — high payoff, low risk (do first)

Pure deletions + single-source extractions. No behavior change; `npm run build` catches any missed reference.

- **#1–#4 dead code (~2,617 LOC).** Re-verified by hand: the 4 nav components, `NotesSidebar`/`NoteModal`, and the 4 API service modules have **zero `import` statements** anywhere, and the `@/services/api` barrel that re-exports them is itself never imported.
- **#4 is a correctness fix, not just size:** `helper/marking.js:pointAdderAnimation()` is called live from `TextComp.vue:211`, but it calls `animationStore.enterHoverPunkt`/`leaveHoverPunkt` — which **do not exist** (the store defines `enterHoverPoint`/`enterHoverAnimation`; note the German "Punkt" typo). It would throw, and only survives because it early-returns when `#animation-1-structures` isn't in the DOM. Either fix the method names or delete the dead path. (Line 24's `enterHoverAnimation` call is correct, so the helper is half-broken.)
- **#5–#7 single-source extractions.** Date formatter (11 copies → 1), highlight hex map (5 → 1), dead Pinia getters. KEEP `getCom()` (used by `CommentComp.vue`).

## Tier 2 — high payoff, moderate effort/risk

- **#8 supabaseRest consolidation (the #1 DRY issue, ~390 LOC).** The shared client is fully built but its session holder is never populated. **Wire it first** (a `watch` in `useAuth` calling `setSession(session.value)`), reconcile the documented response-shape differences (client returns `{success:true}` for PATCH/DELETE; some copies return `[]` for empty POST) **into the client before swapping**, then migrate file-by-file, building after each.
- **#9–#12 view splits.** Replicate the proven wizard pattern (`components/dashboard/chapters/` + `services/api/chapters.js`). Do **#10 (logic → composables) before #11/#12** so each section component just calls a composable. `ChapterBlockEditor` (#9) is the single densest cohesive ~850-LOC pull. Do **NOT** revive the deleted `DashboardViewRefactored` — write fresh components, one section per PR, click-through each CRUD path.

## Tier 3 — nice-to-have / larger projects

- **#13** `withAsyncState` wrapper (error semantics vary per composable — per-file, not a sweep).
- **#14–#16** shared-primitive adoption, `CloseIcon`, `QuizView` split — mechanical but need eyeballing (no reader component currently imports `dashboard/shared`).
- **#17–#19** tokenize `HighlightToolbar` (fixes a genuine dark-mode/accent bug — worth doing for correctness), split the 825-line toolbar, dedup the auth form.
- **#20** CRUD-composable factory — **last**; most of its duplication evaporates once #5/#8/#13 land.

---

## Quantified size impact

| Category | LOC | Confidence |
|---|---|---|
| Dead Navigation components (#1) | ~772 | verified |
| Orphan NotesSidebar + NoteModal (#2) | ~978 | verified |
| Dead API service modules (#3) | ~797 | verified |
| Dead helpers + debug logs (#4) | ~70 | verified |
| **Tier 1 dead-code subtotal** | **~2,617** | high |
| supabaseRest dedup (#8) | ~390 | verified |
| Date formatter (#5) + env-read folding | ~200 | high–med |
| **DRY subtotal** | **~590** | high–med |
| DashboardView splits (#9+#11) | ~1,800–1,900 *relocated* | high |
| ProfessorDashboardView split (#12) | ~400–500 *relocated* | high |
| QuizView/HighlightToolbar splits (#16,#18) | ~900 *relocated* | medium |

**Net deletions (code that disappears): ~3,200 LOC.** **Splits relocate ~3,000 more** out of the four biggest files — `DashboardView.vue` 3,246 → a few-hundred-line shell; `HighlightToolbar.vue` 825 → ~300; `QuizView.vue` 724 → ~150.

---

## Suggested sequencing (pick from these first four)

1. **Tier 1 dead-code sweep (#1–#4) — immediately.** ~2,617 LOC deleted, S effort, low risk, one build to verify. Biggest size win for the least work; also fixes the latent `pointAdderAnimation` crasher.
2. **Single-source extractions (#5–#7).** Quick S follow-ons; several later refactors depend on these.
3. **supabaseRest consolidation (#8).** The headline DRY win and the one architectural decision worth making early — wire `setSession` once, migrate incrementally (build-gate each).
4. **`ChapterBlockEditor` (#9) + dashboard composables (#10).** The highest-leverage cut into the 3,246-line monster; #10 first makes the section splits mechanical.

Because lint is broken and there are no unit tests, gate each step on `npm run build` and browser-check the UI-touching ones (sidebar tabs, toolbar create/edit/delete, dashboard CRUD, quiz end-to-end). Defer the higher-risk visual changes (#17–#19) until the cheap deletions and the REST consolidation have landed.
