# Unified Dashboard Redesign — Design Spec

**Date:** 2026-06-13
**Status:** Awaiting approval
**Scope:** Roll the token-based SettingsView design language across all three dashboards (Student, Professor, Creator), build one shared component library, remove design + technical debt, mark non-functional UI, take small safe quick-wins, and produce a functional-vs-mocked report.

---

## 1. Goal & Decisions

We have a new, clean settings page for students (`SettingsView.vue` + `src/components/settings/*`) built on the design tokens. This is the target aesthetic. We will roll it across **all three** dashboards as **one unified system**, build a reusable component library, and shed accumulated debt — moving these three surfaces closer to production-ready.

**Locked-in decisions (from brainstorming):**

1. **Reskin all three dashboards fully** to one unified token-based system. This **overrides** the earlier "Creator/Professor keep their own palettes" decision. Per-role color survives only as an accent (`[data-accent]`); layout and components are unified.
2. **Creator: per-section judgment.** For each Creator section, assess whether to adopt the abandoned-but-real refactor module or reskin the monolith's inline version; report the choice per section.
3. **Component library lives in `src/components/dashboard/shared/`**, rebuilt to the new token design (overwrite the old Tailwind components). One folder.
4. **Mocked UI:** reskin + clearly mark "preview"/"coming soon" (the SettingsView `.soon` pattern); take only **small safe quick-wins**; no large new backend. Produce a full functional-vs-mocked report at the end.
5. **One combined spec** (this doc) → approve once → execute the whole loop with checkpoints.
6. **Verification:** `npm run build` + lint after each dashboard; user does visual QA.

---

## 2. Target Aesthetic (the design language being rolled out)

From `SettingsView.vue` + `src/components/settings/*` + `src/styles/brand.css`:

- **Token surfaces only:** `rgb(var(--color-bg|paper|ink|mute|line))`, never hardcoded hex. Accents via `rgb(var(--color-accent|complete|warn))`. Fonts via `var(--font-body|ui|mono)`.
- **Sticky light left rail** (NOT the dark `#1a1a1a` sidebar): user card → nav with a 4px accent bar on the active item → hairline rule → "← Back to book".
- **Numbered-eyebrow section headers:** mono uppercase kicker (`01 · Profile`) → `<h2>` (3.2rem, weight 500) → muted subtitle.
- **Bordered cards** (`1px solid line`, paper bg, 4px radius), **stat grids** (divided bordered cells), **mono uppercase micro-labels**, **pill buttons** (mono uppercase), **segmented controls**, **toggle rows + switch**, and a **`· preview` marker** for not-yet-wired UI.
- **Per-role accent** via `[data-accent]` on the dashboard root: `brand.css` already defines `magenta` (default), `teal`, `amber`, `mono`.

---

## 3. Architecture

### 3.1 Unified shell (replaces 3 sidebar variants)

Three new files in `src/components/dashboard/shared/`:

- **`DashboardShell.vue`** — outer 2-column grid. Owns sticky behavior, responsive stacking (mirrors SettingsView: stacked < 900px, `28rem 1fr` ≥ 900px, `124rem` max-width centered), and the per-role accent via `:data-accent` on its root. Renders `DashboardRail` + a default content slot.
  - **Props:** `navItems: Array` (`[{ id, label, icon?, count?, soon? }]`), `activeSection: String`, `displayName: String`, `email: String`, `role: String`, `accent: 'magenta'|'teal'|'amber'|'mono'`, `backLabel: String`, `backTo: String|Object`, `showBack: Boolean`.
  - **Slots:** `default` (content), `brand`, `user`, `footer`.
  - **Emits:** `update:activeSection`, `back`. (Preserves the existing `v-model:active-section` contract.)
- **`DashboardRail.vue`** — the light rail itself (user card, nav with accent-bar active state, back-link). SettingsView `.rail` aesthetic, tab-switch behavior (not scroll-spy — dashboards swap panels).
  - User card: 2-letter initials (SettingsView logic), accent-tinted avatar, name, role/email meta line. No dated greeting.
- **`DashboardNavIcon.vue`** — extracts the `v-if/v-else-if` SVG icon switch from `DashboardSidebar.vue`. Supported names: `grid · book · layers · image · quiz · flashcard · highlight · notes · progress · users · chart · folder · clipboard · graduation · share · settings` (extended with the Student glyphs that currently fall through to the default).

**Per-role accent mapping** (confirmed): Student = `teal`, Professor = `amber` (substitutes the legacy `#C86948` brown — no token equivalent), Creator = `magenta` (substitutes the legacy violet). No new tokens.

### 3.2 Shared component library (`src/components/dashboard/shared/`)

Rebuilt to tokens, consistent conventions across the whole set: `<style scoped>` raw-CSS-on-tokens (no Tailwind, no hex); `modelValue`/`update:modelValue` for two-way; `label`/`hint`/`eyebrow` label trio; `size: sm|md|lg`; `variant` enums; `preview: Boolean` marker prop; controlled (emit, don't own canonical state).

| Component | Disposition | Purpose |
|---|---|---|
| `DashboardShell` / `DashboardRail` / `DashboardNavIcon` | **NEW** | Unified shell (replaces dark `DashboardSidebar.vue` + unused `StudentSidebar.vue`). |
| `SectionHeader` | **NEW** | Eyebrow + h2 + subtitle, `actions` slot, `preview` prop. |
| `BaseCard` | **REBUILD** | Bordered token card; `padding` enum, `interactive`, `as`, header/footer slots. |
| `StatCard` (was `MetricCard`) | **REBUILD + RENAME** | Big number + mono label; `delta`/`tone` (semantic tokens, not hardcoded green/red); `icon` slot; `preview`. |
| `StatGrid` | **NEW** | Bordered divided stat row (SettingsView `.stats-grid`); `columns`, `bordered`. |
| `ListRow` | **NEW** | label+hint+action row (from SettingsAccount `.row`); `media`/`action` slots, `interactive`, `divider`. |
| `DataTable` | **REBUILD** | API kept (good); restyle to tokens; `compact`→`dense`; empty slot defaults to `EmptyState`. |
| `StatusBadge` | **REBUILD** | Token `variant` (drops the Tailwind `STATUS_COLORS` map); optional `status` convenience mapping; `dot`. |
| `EmptyState` / `LoadingState` / `ErrorState` | **REBUILD** | Token colors; SVG-map → `icon` slot; spinner respects `[data-reduce-motion]`. |
| `BaseModal` | **REBUILD** | `show`→`modelValue` (keep `show` alias during migration); token chrome; escape/scroll-lock/transition logic preserved. |
| `ConfirmDialog` | **REBUILD** | Built on `BaseModal`; `variant: danger|warn|info`; danger-zone color language. |
| `Button` | **NEW** | Consolidates the scattered `.btn`/`.btn-solid`/`.btn-ghost`/`.btn-danger`; `variant: solid|ghost|outline|danger`, `size`, `loading`, `as`/`to`, `block`, icon slots. |
| `SearchInput` | **REBUILD** | Debounce logic kept; token chrome. |
| `FilterChips` | **REBUILD** | Token accent; optional `multiple`; `showCounts`. |
| `SegmentedControl` | **MOVE/PROMOTE** | From `settings/`; already on-brand, keep as-is. |
| `ToggleRow` (was `SettingsToggleRow`) | **MOVE/PROMOTE** | Add `preview`; otherwise keep. |
| `Switch` (was `SettingsSwitch`) | **MOVE/PROMOTE** | Keep as-is. |
| `FormField` | **NEW** | Mono label + control slot + hint/error (from SettingsProfileSection `.field`). |
| `PreviewTag` | **NEW** | The `· preview` / `· coming soon` marker; consumed by `SectionHeader`/`StatCard`/`ToggleRow` `preview` props. |
| `Pagination` | **REBUILD** | Window logic kept; token chrome. |

**Truly-global primitives** (`Switch`, `SegmentedControl`) used by reader Settings outside dashboards: pick **one canonical home** and alias the other to avoid a layering smell. _See Open Question Q2._

**Barrel:** flat named exports from `src/components/dashboard/shared/index.js`. Add a temporary `MetricCard → StatCard` alias if any dead code still imports it; remove after migration.

**SettingsView convergence:** once `SectionHeader`/`Button`/`FormField`/`ToggleRow`/`Switch`/`SegmentedControl` are shared, `SettingsView.vue` + its section components should consume them so there is one canonical copy. _See Open Question Q4 re: whether SettingsView also adopts `DashboardShell`._

### 3.3 Dead code to delete (verified: zero external importers)

- `src/views/DashboardViewRefactored.vue` — abandoned parallel rewrite, in no route.
- The **old** Tailwind `src/components/dashboard/shared/*` are unused — but they are the **rebuild target**, so overwrite in place rather than blind-delete.
- Per-section refactor modules under `src/components/dashboard/{chapters,versions,media,quizzes,users,analytics}/` are consumed **only** by `DashboardViewRefactored.vue` — **except** the Creator-adopt path may salvage some (see §5). Decide their fate per the adopt-vs-reskin outcome.
- Dark `DashboardSidebar.vue` + `DashboardHeader.vue` + unused `StudentSidebar.vue` — delete after all three views migrate to `DashboardShell`.

---

## 4. Per-Dashboard Section Mapping

Eyebrow numbering restarts at `01` per dashboard, sequential in nav order.

### 4.1 Student — `StudentDashboardView.vue` (in-place reskin, `accent="teal"`)

| Section | Eyebrow + title | Primary shared components | Notes |
|---|---|---|---|
| Dashboard | `01 · Overview` | StatGrid, BaseCard (wraps existing `ProgressCard`/`TrendingHighlights`), ListRow (quiz/deck quick-actions), EmptyState | Keep child components; wrap in BaseCard + SectionHeader. |
| My Courses | `02 · My courses` | BaseCard grid (per course), StatusBadge, EmptyState | Empty → "Browse the book" CTA to `homeRoute`. |
| Quizzes | `03 · Quizzes` | ListRow/BaseCard, StatusBadge, Button, EmptyState | Timed badge = `--color-warn`. |
| Flashcards | `04 · Flashcards` | BaseCard (per deck), StatGrid (due/learning/mastered), Button, EmptyState | SM-2 counts as StatCard values. |
| My Highlights | `05 · Highlights` | ListRow, SearchInput, FilterChips (by chapter), EmptyState | Highlighter color dot. |
| My Notes | `06 · Notes` | ListRow (note variant), SearchInput, ConfirmDialog (delete), EmptyState | Shares ListRow with Highlights. |
| Progress | `07 · Progress` | StatGrid, BaseCard (per-chapter bars) | Detail is **mocked** → PreviewTag (see §6). |
| Settings | `08 · Settings` | (already new design) | Confirm it routes to `/settings`; do not duplicate. _Open Q3._ |

### 4.2 Professor — `ProfessorDashboardView.vue` (in-place reskin, `accent="amber"`, ~13× `#C86948` → `rgb(var(--color-accent))`)

| Section | Eyebrow + title | Primary shared components | Notes |
|---|---|---|---|
| Dashboard | `01 · Overview` | StatGrid, BaseCard (recent activity), Button | `avgCompletion` always 0 (**quick-win QW-2**); `pendingAssessments` always 0 (render `—` or define). Pilot the hex→token find-replace here. |
| Courses | `02 · Courses` | BaseCard (per course), Button (New → BaseModal + FormField), ConfirmDialog, StatusBadge, EmptyState | Functional. (Known BUG-010 exists — reskin only, don't touch save.) |
| Content Library | `03 · Content library` | BaseCard/DataTable, FilterChips (content types), SearchInput, EmptyState | Functional. |
| Students | `04 · Students` | DataTable, SearchInput, StatusBadge, Pagination, EmptyState | Functional. Invite modal: URL invite functional; **code invite + email invite mocked** → PreviewTag (see §6). |
| Assessments | `05 · Assessments` | BaseCard/ListRow, Button (New → BaseModal), StatusBadge, EmptyState | Functional. (Known BUG-011 NaN scores — guard `NaN → "—"` as a small cosmetic quick-win.) |
| Analytics | `06 · Analytics` | StatGrid, DataTable (`courseAnalytics`), SegmentedControl (date range) | **quick-win QW-1**: wire the date-range into the query (currently ignored). |
| Collaboration | `07 · Collaboration` | BaseCard, Button, LoadingState, EmptyState | Uses `is_published` as a sharing stand-in → reskin + PreviewTag. |

### 4.3 Creator — `DashboardView.vue` (8092-line monolith; incremental, section-by-section)

Sections: Dashboard, Chapters, Versions, Media, Quizzes, Users, Analytics (+ internal `chapter-wizard` sub-view), `accent="magenta"`.

**Adopt-vs-reskin decision rule** — ADOPT the refactor module only if ALL four hold:
1. Module + store + `services/api/{section}.js` exist (confirmed: they do).
2. Builds/imports cleanly.
3. Hits the **same** Supabase tables/columns/RLS as the monolith's inline code (diff endpoint-by-endpoint).
4. Renders + round-trips a mutation against a real Creator session.

If any check fails → reskin the monolith's inline `v-else-if` block in place. Both paths consume the same rebuilt `shared/` library, so a mixed strategy is visually seamless.

| Section | Recommended path | Eyebrow + title | Notes |
|---|---|---|---|
| Dashboard (landing) | **Reskin in place** | `01 · Overview` | Pilot. Convert `.dashboard-metric` buttons → StatCard (click → `setActiveSection`). |
| Chapters | **ADOPT** `chapters/ChaptersSection.vue` | `02 · Chapters` | Most-built module (10KB store). Verify chapter-CRUD endpoint parity. Wizard steps adopt with it. |
| Versions | **ADOPT** `versions/VersionsSection.vue` | `03 · Versions` | Real `versions.js`. Confirm `versions` table parity. |
| Media | **ADOPT** `media/MediaSection.vue` | `04 · Media` | Verify **upload path** parity carefully (highest risk after Analytics). |
| Quizzes | **ADOPT** `quizzes/QuizzesSection.vue` | `05 · Quizzes` | Confirm `quizzes`/`quiz_questions` parity. |
| Users | **ADOPT** `users/UsersSection.vue` | `06 · Users` | Role-change is a privileged write — verify RLS parity before cutover. |
| Analytics | **ADOPT** (verify #4 hardest) | `07 · Analytics` | **Functional** (real queries + live bar chart — corrected; NOT a mock). If adopt fails #4, reskin monolith inline. |
| Chapter Wizard | **ADOPT** `WizardStep{Meta,Import,Structure,Review}` | (sub-view, stepper 1–4) | Freshest refactor files. Wire into the Chapters adopt path. |

**Creator execution order:** (1) rebuild `shared/` + shell; (2) reskin Dashboard landing (pilot); (3) run the 4-point check per section, ADOPT where it passes; (4) delete the inline `v-else-if` block only after each adopted section verifies, shrinking the monolith section by section. End-state (router → `DashboardViewRefactored.vue` vs. monolith-as-shell-with-embedded-sections) decided after Chapters + Versions are verified. _Open Q5._

---

## 5. Functional-vs-Mocked Inventory (verified against code)

| Dashboard | Section / Feature | Status | Disposition |
|---|---|---|---|
| Creator | Dashboard, Chapters, Versions, Media, Quizzes, Users | Functional | reskin |
| Creator | **Analytics** | **Functional** (real queries + live chart; data-dependent) | reskin (not a wire-up) |
| Professor | Dashboard core stats, Courses, Content Library, Students roster, Assessments, **URL invite** | Functional | reskin |
| Professor | **`avgCompletion` stat** | Mocked (always 0%) | **quick-win QW-2** |
| Professor | **`pendingAssessments` stat** | Always 0 (never set) | render `—` or define (Open Q) |
| Professor | **Analytics date-range** | Bound to dropdown but ignored in query | **quick-win QW-1** |
| Professor | **Access-code invite** | Mocked (code never persisted) | PreviewTag |
| Professor | **Email invite** | Mocked (button has no `@click`) | PreviewTag + disable |
| Professor | Collaboration | Partial (`is_published` stand-in) | reskin + PreviewTag |
| Student | Dashboard, Courses, Quizzes, Flashcards, Highlights, Notes | Functional | reskin |
| Student | **Progress detail** | Mocked ("coming soon") | PreviewTag |
| Student | Inline Settings rows | Functional but superseded by `SettingsView` | reskin minimally or link to `/settings` (Open Q3) |

### Quick-wins (small, safe, no new backend) — the ONLY functional changes this pass

- **QW-1 — Professor Analytics date-range.** Compute a `startDate` from `analyticsDateRange` and add a `&last_accessed_at=gte.<iso>` filter to the `reading_progress` query in `fetchAnalytics` (`ProfessorDashboardView.vue:348`). Pure read; the dropdown already calls `@change="fetchAnalytics"`. _Note: the current query has no date filter at all, so this adds one filter clause per course query — slightly more than a one-liner but still safe and read-only._
- **QW-2 — Professor `avgCompletion`.** Compute from `reading_progress` `is_completed` (the same data `fetchAnalytics` already reads) and set the reactive stat rendered at `:903`. Aggregate with one `course_id=in.(...)` query to avoid N reads. Guard divide-by-zero.
- **QW-3 — Professor Assessments NaN guard (BUG-011).** Render `NaN → "—"` in the score display. Cosmetic only; no scoring-logic change.

**Explicitly NOT quick-wins (→ PreviewTag):** email invite (needs email provider), access-code invite (needs table + redemption route), Student Progress detail (needs new UI + queries), Professor Collaboration real sharing (needs a sharing model).

### Preview labels

`· COMING SOON` — email invite (disable button), Student Progress detail.
`· PREVIEW` — access-code invite, Professor Collaboration.

---

## 6. Execution Plan (sub-projects, in order)

1. **Sub-project A — Shared library + shell.** Build/rebuild all components in §3.2 + §3.1. Migrate `SettingsView` to consume the promoted primitives. Add the barrel. _Gate: `npm run build` + lint clean._
2. **Sub-project B — Student dashboard.** Adopt `DashboardShell`; reskin all 8 sections per §4.1; PreviewTag the Progress detail; resolve the Settings nav item. Delete `StudentSidebar.vue`. _Gate: build + lint._
3. **Sub-project C — Professor dashboard.** Adopt shell (`accent="amber"`); hex→token sweep (~13× `#C86948`); reskin all 7 sections per §4.2; QW-1/QW-2/QW-3; PreviewTag email/code invite + Collaboration. _Gate: build + lint._
4. **Sub-project D — Creator dashboard.** Rebuild landing (pilot); run the 4-point check per section; ADOPT/reskin per §4.3; shrink the monolith section-by-section; remove the inline dark rail CSS. _Gate: build + lint after each section._
5. **Sub-project E — Cleanup + report.** Delete confirmed dead code (§3.3); write the final functional-vs-mocked report (the §5 table, finalized with what was fixed vs. marked vs. left).

Each sub-project is verified with `npm run build` + `npm run lint` before moving on; you do the visual QA. Per the chosen workflow, all four design layers are approved together in this spec, then executed as one loop with these gates.

---

## 7. Resolved Decisions & Remaining Open Questions

**Resolved (user, 2026-06-13):**
- **Q1 — Per-role accent → token accents.** Student=`teal`, Professor=`amber` (replaces legacy `#C86948` brown), Creator=`magenta` (replaces legacy violet). No new tokens added to `brand.css`.
- **Q3 — Student "Settings" nav item → routes to `/settings`** (the canonical `SettingsView`). No in-panel settings duplicate; remove the inline Settings rows (`StudentDashboardView.vue:648-675`).

**Resolved by default (will report outcome; reversible if you object):**
- **Q2 — `Switch`/`SegmentedControl` canonical in `dashboard/shared`**, with thin re-export shims from `src/components/UI/` for reader-side imports.
- **Q4 — `SettingsView` shares the leaf components** (`SectionHeader`, `Button`, `FormField`, `ToggleRow`, `Switch`, `SegmentedControl`) but keeps its own scroll-spy layout (does NOT adopt `DashboardShell`, which is tab-switch).
- **Q6 — `pendingAssessments` renders `—`** (no agreed product definition of "pending"); revisit if a definition lands.

**Still open (decided during execution, reported):**
- **Q5 — Creator end-state:** if all six sections pass the 4-point check, switch the router to `DashboardViewRefactored.vue` and retire the monolith; else keep the monolith as shell with adopted sections embedded. Decide after Chapters + Versions verify.
- **Q7 — Creator Analytics data pipeline:** code is functional but depends on `analytics_events` being populated. If empty in practice, add a `· preview` tag despite working code; otherwise leave untagged.

---

## 8. Out of Scope

- New backend features (email service, access-code redemption, sharing model, per-module progress UI).
- Mobile/drawer nav (app gates at 1300px+; stacked degradation only).
- Quiz/flashcard *taking* flows (QuizView/FlashcardView) and the TipTap editor internals — reskin their entry points only.
- Fixing known functional bugs beyond the three named cosmetic/read-only quick-wins (e.g. BUG-010 course-field-drop save logic).
