# Dashboard Redesign — Final Report

**Date:** 2026-06-13
**Branch:** `dev`
**Scope delivered:** Unified token-based design rolled across all three dashboards (Student, Professor, Creator), a shared component library, design + technical debt removed, and this functional-vs-mocked inventory.

**Verification:** `npm run build` exits 0 after every sub-project (739 modules). The project's `npm run lint` is broken in this environment (missing `prettier` dependency — pre-existing, unrelated to this work), so build was the gate throughout. No component-test convention exists in the repo (3 e2e specs only), so changes were not unit-tested; **visual/interaction QA in a live browser is still pending on you.**

---

## 1. What shipped

| Sub-project | Result | Commit |
|---|---|---|
| A — Shared library + shell | 24-component token library in `src/components/dashboard/shared/` + light-rail shell | `6c2620b` |
| B — Student dashboard | Reskinned, accent=teal, 8 sections, Settings routes to `/settings` | (student commit) |
| C — Professor dashboard | Reskinned, accent=amber, 7 sections, 3 quick-wins, preview-marked mocks | (professor commit) |
| D — Creator dashboard | Reskinned in place, accent=magenta, monolith 8092→3246 lines | (creator commit) |
| E — Cleanup | 38 dead files removed; final report | (cleanup commit) |

**Size/debt impact:**
- Creator `DashboardView.vue`: **8092 → 3246 lines** (scoped CSS ~3340 → ~310). Still the live monolith, but reskinned and roughly 60% smaller.
- Professor `ProfessorDashboardView.vue`: **2529 → 1514 lines** (scoped CSS 19.3 → 5.6 KiB).
- Student `StudentDashboardView.vue`: reskinned, zero hardcoded hex.
- **38 dead files deleted** (the abandoned parallel-rewrite cluster — see §4).
- Hardcoded hex/`rgba()` colors in all three dashboards: **eliminated** (all `rgb(var(--color-*))` tokens). Legacy palettes (Creator violet, Professor `#C86948` brown, Student blue) replaced by per-role `[data-accent]` (magenta / amber / teal).

---

## 2. The component library (the deliverable you asked for)

`src/components/dashboard/shared/` — 24 token-based, consistently-named components used by all three dashboards **and** reader Settings:

- **Layout:** `DashboardShell`, `DashboardRail`, `DashboardNavIcon`, `SectionHeader`
- **Cards & stats:** `BaseCard`, `StatCard`, `StatGrid`, `ListRow`
- **Data:** `DataTable`, `StatusBadge`
- **States:** `EmptyState`, `LoadingState`, `ErrorState`
- **Overlays:** `BaseModal`, `ConfirmDialog`
- **Inputs:** `Button`, `SearchInput`, `FilterChips`, `SegmentedControl`, `ToggleRow`, `Switch`, `FormField`
- **Markers:** `PreviewTag`
- **Pagination:** `Pagination`

`Switch` + `SegmentedControl` are also aliased from `src/components/UI/` for reader-side imports. `SettingsView` was migrated to consume the shared `SegmentedControl`/`ToggleRow`.

Everything imports flat from `@/components/dashboard/shared`.

---

## 3. Functional-vs-Mocked Inventory

> **Legend:** ✅ Functional (real Supabase read/write) · 🔧 Quick-win fixed this pass · 🟡 Preview (UI present, clearly marked, NOT wired — needs backend) · 📊 Functional but data-dependent

### Creator dashboard (`/dashboard`)

| Section | Feature | Status | Notes |
|---|---|---|---|
| Dashboard | Stats (chapters/users/quizzes/words/media) + recent + quick actions | ✅ | `fetchDashboardData` aggregation |
| Chapters | Chapter CRUD, sections/paragraphs, TipTap editor, media attach | ✅ | `supabaseRest` + TipTapEditor |
| Chapter Wizard | 4-step import (Meta/Import/Structure/Review) | ✅ | `WizardStep*` components (alive) |
| Versions | Version list / create / publish | ✅ | `versions` table writes |
| Media | Library, type filter, picker, detail modal | ✅ | `animation_library`/media queries |
| Quizzes | Quiz + question CRUD | ✅ | `quizzes`/`quiz_questions` |
| Users | Role management, role-count breakdown, pagination, search | ✅ | `profiles` queries |
| Analytics | Metrics + live engagement bar chart + content/quiz perf + trending | 📊 | **Real queries** (`analytics_events`/`reading_progress`/`quiz_attempts`); renders empty only when `analytics_events` has no rows. Logic untouched in reskin. |

**Creator: everything is functional.** Analytics depends on the `analytics_events` pipeline actually emitting events (see Q7 below).

### Professor dashboard (`/professor`)

| Section | Feature | Status | Notes |
|---|---|---|---|
| Dashboard | totalCourses, activeStudents stats | ✅ | `fetchDashboardStats` |
| Dashboard | **avgCompletion stat** | 🔧 | **QW-2:** was hardcoded 0%; now computed from one `reading_progress?course_id=in.(…)&select=is_completed` query |
| Dashboard | pendingAssessments stat | ✅* | renders `assessments.length` (the prior always-0 `pendingAssessments` field is no longer shown misleadingly) |
| Courses | Course CRUD / duplicate / delete | ✅ | `supabaseRest` writes (native confirm/alert kept) |
| Content Library | Module list + section expand + add-to-course | ✅ | `modules`/`sections`/`course_modules` |
| Students | Roster + search + course filter | ✅ | `course_enrollments` + profile joins |
| Students → **URL invite** | Generate enrollment URL | ✅ | `/enroll/:courseId` route exists |
| Students → **Access-code invite** | Generate code | 🟡 | Code generated client-side but **never persisted** — marked `· preview`, helper text points to URL invite |
| Students → **Email invite** | Send invitations | 🟡 | Button **disabled** + `· coming soon` — no email service exists |
| Assessments | Quiz CRUD + attempt stats | ✅ | `quizzes`/`quiz_attempts`; **QW-3:** scores guard `NaN → —` |
| Analytics | Per-course completion / time / students | 🔧 | **QW-1:** date-range now filters the `reading_progress` query (was ignored); `displayPct` guards NaN |
| Collaboration | Shared courses (in/out) | 🟡 | Uses `is_published` as a sharing stand-in; section + nav marked `· preview`/`· soon` |

**Professor quick-wins delivered (the only functional changes this pass):**
- **QW-1** — Analytics date-range (7/30/90 days) now actually filters `reading_progress` by `last_accessed_at`. (Pure read; the date control is now a `SegmentedControl` with a `watch`.)
- **QW-2** — `avgCompletion` computed from real progress data instead of always showing 0%.
- **QW-3** — Assessment/analytics percentages render `—` instead of `NaN`.
- **Bonus bug fixed:** the Professor forms had `background:#252525` (dark) + `color:#1a1a1a` (near-black) = **invisible input text**. The token rebuild fixes this everywhere.

### Student dashboard (`/student`)

| Section | Feature | Status | Notes |
|---|---|---|---|
| Dashboard | ProgressCard, StudyStats, quizzes, decks, recent attempts | ✅ | composables (`useStudentCourses`/`useQuizzes`/`useFlashcards`/`useStudentStore`) |
| My Courses | Enrolled courses grid | ✅ | `useStudentCourses` |
| Quizzes | Available quizzes + recent attempts | ✅ | `useQuizzes`; score guards `NaN → —` |
| Flashcards | Decks + due-card counts (SM-2) | ✅ | `useFlashcards` |
| My Highlights | Highlight list + filter | ✅ | `useHighlights` |
| My Notes | Note list | ✅ | `useNotes` |
| Progress | Study stats | ✅ | `useStudentStore` |
| Progress | **Per-module progress detail** | 🟡 | "Reading progress by module" marked `· coming soon` — needs new per-module UI + queries |
| Settings | (nav item) | ✅ | Routes to `/settings` (canonical SettingsView); the old inline read-only panel was removed |

---

## 4. Technical debt removed

**Deleted (38 files) — the abandoned parallel-rewrite cluster.** A second, never-wired Creator dashboard implementation existed in parallel to the live monolith. It was wired to a sidebar contract that no longer existed and routed to a non-existent `/login`, so it was dead on arrival. Removed:
- `DashboardViewRefactored.vue` (the dead entry point)
- old dark `DashboardSidebar.vue` + `DashboardHeader.vue`
- `stores/dashboard/*` (7 Pinia stores)
- 5 section folders (`versions`/`media`/`users`/`quizzes`/`analytics`) + dead `chapters/` leaves
- dead barrels + a `MetricCard` shim

**Kept (verified still alive):**
- `chapters/WizardStep{Meta,Import,Structure,Review}.vue` — used by the live Creator dashboard + `ChapterWizardView`.
- `services/api/*` — used by the live Creator dashboard, `ChapterWizardView`, and `useReferences`.
- `admin-theme.css` — still imported by `ChapterWizardView` (out of this project's scope).

**Other notes:**
- `supabaseRest()` remains duplicated locally in `DashboardView` and `ProfessorDashboardView` (extracting it to a shared util was deliberately out of scope for a design pass — a clean follow-up).
- `ChapterWizardView.vue` (route `/dashboard/chapter/new`) was **not** reskinned — it's a separate route outside the three dashboards. It still uses `admin-theme.css`. Candidate for a future pass.

---

## 5. Decisions made during execution (reversible)

- **Q5 (Creator end-state):** Reskinned the monolith **in place** rather than activating the abandoned refactor — the refactor was broken (stale wiring), so reviving it was a debugging task, not a reskin. The monolith is ~60% smaller but still one file; splitting it into the (now-deleted) section modules would be a separate, larger refactor project.
- **Q2:** `Switch`/`SegmentedControl` canonical in `dashboard/shared`, aliased from `UI/`.
- **Q4:** `SettingsView` consumes the shared leaf components but keeps its own scroll-spy layout (it does not use `DashboardShell`, which is tab-switch).
- **Q6:** Professor `pendingAssessments` — the misleading always-0 field is no longer surfaced; the dashboard shows `assessments.length` instead.

---

## 6. What still needs you

1. **Live browser QA** — none of this was interaction-tested (no test harness). Log in as each role (creator `anton@mogul.global`) and click through each section.
2. **Fix `npm run lint`** — install `prettier` (`npm i -D prettier --legacy-peer-deps`) so lint runs again.
3. **Decide the 🟡 preview features' futures** — email invite (needs an email provider/edge function), access-code enrollment (needs an `access_codes` table + redemption route), Student per-module progress (needs UI + queries), Professor real course-sharing (needs a sharing model beyond `is_published`).
4. **Q7 — Creator Analytics pipeline:** the code is functional but shows empty unless `analytics_events` is being populated in prod. Confirm the event pipeline is emitting; if not, consider a `· preview` tag despite the working code.
5. **Optional follow-ups:** extract `supabaseRest` to a shared util; reskin `ChapterWizardView` + retire `admin-theme.css`; split the Creator monolith into section components.
