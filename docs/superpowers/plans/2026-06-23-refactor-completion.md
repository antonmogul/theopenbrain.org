# Refactor Completion + Test Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the remaining refactoring audit items (#11/#12 view splits, then #16 QuizView split), each backed by Vitest unit coverage of the extracted composables — closing the audit's "no test coverage" gap.

**Architecture:** Phase 1 locks current behavior with Vitest unit tests on the 5 dashboard composables extracted in #10 (mock the `authedRequest` API-client boundary). Phase 2 uses those tests as a safety net to split `DashboardView.vue` (#11) and `ProfessorDashboardView.vue` (#12) into per-section components. Phase 3 splits `QuizView.vue` (#16). Every task gates on `npm test` (Vitest) and `npm run build`.

**Tech Stack:** Vue 3 `<script setup>`, Vite 3, Vitest 1.6 (unit), Cypress (existing e2e), Supabase REST via `@/services/api/client` (`authedRequest`).

## Global Constraints

- **Build gate:** `npm run build` must exit 0 after every task (the audit's primary gate; lint is broken — missing prettier).
- **Test gate:** `npm test` (`vitest run`) must be green after every task.
- **`--legacy-peer-deps`** required for any npm install (enforced via committed `.npmrc`).
- **API boundary:** all Supabase calls go through `authedRequest` from `@/services/api/client`. Never reintroduce inline `supabaseRest`.
- **Composable contract (from #10):** each `useDashboard*` takes `profile` where it needs `created_by`; returns refs + fns; owns data + form/UI state. Tests mock `@/services/api/client`.
- **No Creator login available:** the Creator dashboard is role-gated and cannot be browser-clicked in this environment. Vitest unit tests are the substitute verification for Creator-dashboard CRUD. State this limitation honestly; do not claim browser verification of Creator CRUD.
- **Verified test pattern** (proven in `useVersions.test.js`): `vi.mock("@/services/api/client", () => ({ authedRequest: vi.fn() }))`, then `authedRequest.mockImplementation(...)` / `.mockResolvedValue(...)`, drive the composable's fns, assert refs + `authedRequest.mock.calls`.

---

## Phase 1 — Unit coverage for the #10 composables

`useVersions` is already covered (`src/composables/__tests__/useVersions.test.js`, 5 tests). Tasks 1–4 cover the other four. Co-locate tests in `src/composables/__tests__/`.

### Task 1: Test useDashboardMedia

**Files:**
- Test: `src/composables/__tests__/useDashboardMedia.test.js`
- Reference (read-only): `src/composables/useDashboardMedia.js`

**Interfaces:**
- Consumes: `useDashboardMedia()` → `{ mediaItems, mediaLoading, mediaError, mediaFilter, mediaSearch, selectedMedia, filteredMedia, mediaByType, fetchMedia, selectMedia, deleteMedia, formatFileSize }`
- Produces: nothing (test-only).

- [ ] **Step 1: Write the failing test**

```javascript
import { describe, it, expect, beforeEach, vi } from "vitest";
vi.mock("@/services/api/client", () => ({ authedRequest: vi.fn() }));
import { authedRequest } from "@/services/api/client";
import { useDashboardMedia } from "@/composables/useDashboardMedia";

describe("useDashboardMedia", () => {
    beforeEach(() => vi.clearAllMocks());

    it("fetchMedia loads items and appends media_type filter when set", async () => {
        authedRequest.mockResolvedValue([{ id: "a1", media_type: "lottie", title: "X" }]);
        const { mediaItems, mediaFilter, fetchMedia } = useDashboardMedia();
        mediaFilter.value = "lottie";
        await fetchMedia();
        expect(authedRequest).toHaveBeenCalledWith(
            "animations?select=*&order=media_type,title&media_type=eq.lottie",
        );
        expect(mediaItems.value).toHaveLength(1);
    });

    it("filteredMedia matches title/animation_key/description by search", async () => {
        const { mediaItems, mediaSearch, filteredMedia } = useDashboardMedia();
        mediaItems.value = [
            { id: "1", title: "Retina", animation_key: "anim1" },
            { id: "2", title: "Cortex", animation_key: "anim2" },
        ];
        mediaSearch.value = "retina";
        expect(filteredMedia.value).toHaveLength(1);
        expect(filteredMedia.value[0].id).toBe("1");
    });

    it("mediaByType groups filtered items into known buckets", async () => {
        const { mediaItems, mediaByType } = useDashboardMedia();
        mediaItems.value = [
            { id: "1", media_type: "lottie" },
            { id: "2", media_type: "video" },
            { id: "3", media_type: "lottie" },
        ];
        expect(mediaByType.value.lottie).toHaveLength(2);
        expect(mediaByType.value.video).toHaveLength(1);
    });

    it("formatFileSize renders B/KB/MB and Unknown", () => {
        const { formatFileSize } = useDashboardMedia();
        expect(formatFileSize(0)).toBe("Unknown");
        expect(formatFileSize(512)).toBe("512 B");
        expect(formatFileSize(2048)).toBe("2.0 KB");
        expect(formatFileSize(2 * 1024 * 1024)).toBe("2.0 MB");
    });

    it("deleteMedia DELETEs then refetches and clears selection", async () => {
        vi.spyOn(window, "confirm").mockReturnValue(true);
        authedRequest.mockResolvedValue([]);
        const { selectedMedia, deleteMedia } = useDashboardMedia();
        selectedMedia.value = { id: "a1" };
        await deleteMedia("a1");
        expect(authedRequest).toHaveBeenCalledWith("animations?id=eq.a1", { method: "DELETE" });
        expect(selectedMedia.value).toBe(null);
    });
});
```

- [ ] **Step 2: Run to verify it passes** — `npm test -- useDashboardMedia` → Expected: 5 passed. (If `confirm` is undefined in happy-dom, the `vi.spyOn(window,"confirm")` line stubs it.)
- [ ] **Step 3: Run full suite** — `npm test` → Expected: all green.
- [ ] **Step 4: Commit** — `git add src/composables/__tests__/useDashboardMedia.test.js && git commit -m "test: cover useDashboardMedia composable"`

### Task 2: Test useDashboardUsers

**Files:**
- Test: `src/composables/__tests__/useDashboardUsers.test.js`

**Interfaces:**
- Consumes: `useDashboardUsers()` → `{ users, usersLoading, usersError, usersFilter, usersSearch, usersPage, usersPerPage, usersTotalCount, selectedUser, userRoleBreakdown, usersTotalPages, fetchUsers, nextUsersPage, prevUsersPage, selectUser, updateUserRole }`

- [ ] **Step 1: Write the failing test**

```javascript
import { describe, it, expect, beforeEach, vi } from "vitest";
vi.mock("@/services/api/client", () => ({ authedRequest: vi.fn() }));
import { authedRequest } from "@/services/api/client";
import { useDashboardUsers } from "@/composables/useDashboardUsers";

describe("useDashboardUsers", () => {
    beforeEach(() => vi.clearAllMocks());

    it("fetchUsers populates users, count, and role breakdown", async () => {
        authedRequest.mockImplementation((endpoint) => {
            if (endpoint.startsWith("profiles?select=*")) {
                return Promise.resolve([{ id: "u1", role: "student" }]);
            }
            if (endpoint === "profiles?select=id") {
                return Promise.resolve([{ id: "u1" }, { id: "u2" }]);
            }
            if (endpoint === "profiles?select=role") {
                return Promise.resolve([
                    { role: "creator" }, { role: "student" }, { role: "student" },
                ]);
            }
            return Promise.resolve([]);
        });
        const { users, usersTotalCount, userRoleBreakdown, fetchUsers } = useDashboardUsers();
        await fetchUsers();
        expect(users.value).toHaveLength(1);
        expect(usersTotalCount.value).toBe(2);
        expect(userRoleBreakdown.value).toEqual({ creators: 1, professors: 0, students: 2 });
    });

    it("usersTotalPages computes from count / perPage", () => {
        const { usersTotalCount, usersTotalPages } = useDashboardUsers();
        usersTotalCount.value = 45; // perPage 20
        expect(usersTotalPages.value).toBe(3);
    });

    it("nextUsersPage advances only within bounds", async () => {
        authedRequest.mockResolvedValue([]);
        const { usersPage, usersTotalCount, nextUsersPage } = useDashboardUsers();
        usersTotalCount.value = 60; // 3 pages
        nextUsersPage();
        expect(usersPage.value).toBe(2);
    });

    it("updateUserRole PATCHes role then refetches", async () => {
        authedRequest.mockResolvedValue([]);
        const { selectedUser, updateUserRole } = useDashboardUsers();
        selectedUser.value = { id: "u1", role: "student" };
        await updateUserRole("u1", "professor");
        expect(authedRequest).toHaveBeenCalledWith("profiles?id=eq.u1", {
            method: "PATCH",
            body: JSON.stringify({ role: "professor" }),
        });
        expect(selectedUser.value.role).toBe("professor");
    });
});
```

- [ ] **Step 2: Run** — `npm test -- useDashboardUsers` → Expected: 4 passed.
- [ ] **Step 3: Full suite** — `npm test` → green.
- [ ] **Step 4: Commit** — `git commit -m "test: cover useDashboardUsers composable"`

### Task 3: Test useDashboardAnalytics

**Files:**
- Test: `src/composables/__tests__/useDashboardAnalytics.test.js`

**Interfaces:**
- Consumes: `useDashboardAnalytics()` → `{ analyticsLoading, analyticsError, analyticsDateRange, analyticsMetrics, analyticsChartData, contentPerformance, quizPerformance, trendingHighlights, fetchAnalytics, formatDuration }`

- [ ] **Step 1: Write the failing test**

```javascript
import { describe, it, expect, beforeEach, vi } from "vitest";
vi.mock("@/services/api/client", () => ({ authedRequest: vi.fn() }));
import { authedRequest } from "@/services/api/client";
import { useDashboardAnalytics } from "@/composables/useDashboardAnalytics";

describe("useDashboardAnalytics", () => {
    beforeEach(() => vi.clearAllMocks());

    it("formatDuration renders s / m s / h m", () => {
        const { formatDuration } = useDashboardAnalytics();
        expect(formatDuration(0)).toBe("0s");
        expect(formatDuration(45)).toBe("45s");
        expect(formatDuration(90)).toBe("1m 30s");
        expect(formatDuration(3661)).toBe("1h 1m");
    });

    it("fetchAnalytics computes activeUsers + pageViews from events", async () => {
        authedRequest.mockImplementation((endpoint) => {
            if (endpoint.startsWith("analytics_events")) {
                return Promise.resolve([
                    { user_id: "a", event_type: "page_view", created_at: "2026-06-20T00:00:00Z" },
                    { user_id: "a", event_type: "page_view", created_at: "2026-06-20T01:00:00Z" },
                    { user_id: "b", event_type: "click", created_at: "2026-06-20T00:00:00Z" },
                ]);
            }
            return Promise.resolve([]); // progress, attempts, modules, quizzes, highlights
        });
        const { analyticsMetrics, fetchAnalytics } = useDashboardAnalytics();
        await fetchAnalytics();
        expect(analyticsMetrics.value.activeUsers).toBe(2);
        expect(analyticsMetrics.value.totalPageViews).toBe(2);
    });

    it("fetchAnalytics sets error and resets loading on failure", async () => {
        authedRequest.mockRejectedValueOnce(new Error("net"));
        const { analyticsError, analyticsLoading, fetchAnalytics } = useDashboardAnalytics();
        await fetchAnalytics();
        expect(analyticsError.value).toBe("net");
        expect(analyticsLoading.value).toBe(false);
    });
});
```

- [ ] **Step 2: Run** — `npm test -- useDashboardAnalytics` → Expected: 3 passed.
- [ ] **Step 3: Full suite** — `npm test` → green.
- [ ] **Step 4: Commit** — `git commit -m "test: cover useDashboardAnalytics composable"`

### Task 4: Test useDashboardQuizzes

**Files:**
- Test: `src/composables/__tests__/useDashboardQuizzes.test.js`

**Interfaces:**
- Consumes: `useDashboardQuizzes(profile)` → `{ quizzes, quizzesLoading, quizzesError, showQuizEditor, editingQuiz, quizForm, showQuestionEditor, editingQuestion, questionForm, fetchQuizzes, openQuizEditor, fetchQuizQuestions, closeQuizEditor, saveQuiz, deleteQuiz, openQuestionEditor, closeQuestionEditor, saveQuestion, deleteQuestion }`

- [ ] **Step 1: Write the failing test**

```javascript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
vi.mock("@/services/api/client", () => ({ authedRequest: vi.fn() }));
import { authedRequest } from "@/services/api/client";
import { useDashboardQuizzes } from "@/composables/useDashboardQuizzes";

describe("useDashboardQuizzes", () => {
    let profile;
    beforeEach(() => {
        vi.clearAllMocks();
        profile = ref({ id: "creator-1" });
    });

    it("openQuizEditor(null) resets form and opens editor", () => {
        const { openQuizEditor, showQuizEditor, editingQuiz, quizForm } =
            useDashboardQuizzes(profile);
        openQuizEditor(null);
        expect(showQuizEditor.value).toBe(true);
        expect(editingQuiz.value).toBe(null);
        expect(quizForm.value.title).toBe("");
        expect(quizForm.value.passing_score).toBe(70);
    });

    it("saveQuiz POSTs with created_by when creating new", async () => {
        authedRequest.mockResolvedValue([]);
        const { quizForm, saveQuiz } = useDashboardQuizzes(profile);
        quizForm.value.title = "Quiz A";
        await saveQuiz();
        const postCall = authedRequest.mock.calls.find((c) => c[0] === "quizzes");
        expect(postCall).toBeTruthy();
        const body = JSON.parse(postCall[1].body);
        expect(body.created_by).toBe("creator-1");
        expect(body.title).toBe("Quiz A");
    });

    it("saveQuestion is a no-op when no quiz is being edited", async () => {
        const { saveQuestion } = useDashboardQuizzes(profile);
        await saveQuestion();
        expect(authedRequest).not.toHaveBeenCalled();
    });

    it("deleteQuiz removes questions, attempts, then quiz", async () => {
        vi.spyOn(window, "confirm").mockReturnValue(true);
        authedRequest.mockResolvedValue([]);
        const { deleteQuiz } = useDashboardQuizzes(profile);
        await deleteQuiz("q1");
        const endpoints = authedRequest.mock.calls.map((c) => c[0]);
        expect(endpoints).to.include.members([
            "quiz_questions?quiz_id=eq.q1",
            "quiz_attempts?quiz_id=eq.q1",
            "quizzes?id=eq.q1",
        ]);
    });
});
```

(Note: `expect(...).to.include.members` is Chai — Vitest's `expect` supports it. If unavailable, replace with `endpoints.forEach`-style asserts: `expect(endpoints).toContain("quizzes?id=eq.q1")` etc.)

- [ ] **Step 2: Run** — `npm test -- useDashboardQuizzes` → Expected: 4 passed.
- [ ] **Step 3: Full suite** — `npm test` → green (should now be ~21 tests across 5 files).
- [ ] **Step 4: Commit** — `git commit -m "test: cover useDashboardQuizzes composable — Phase 1 complete"`

---

## Phase 2 — View splits (#11/#12)

With the composables under test, splitting the views into per-section components is mechanical: each section component receives the composable's refs/fns as props or calls the composable directly. The tests guarantee the data layer is unchanged.

**Verification reality:** these are template/markup moves. Build-gate every task. The composable tests already cover the logic. Because there's no Creator login, do a render-smoke check via Vitest + `@vue/test-utils` mount of each new section component (shallow, with a stubbed composable) — assert it renders its root and key slots without throwing.

### Task 5: Add @vue/test-utils + a render-smoke helper

**Files:**
- Modify: `package.json` (devDependency)
- Create: `src/test/mountSection.js` (helper)

**Interfaces:**
- Produces: `mountSection(Component, props)` → wrapper, for shallow render-smoke tests.

- [ ] **Step 1:** Install — `npm install -D @vue/test-utils@^2 --legacy-peer-deps --no-audit --no-fund`
- [ ] **Step 2:** Write helper:

```javascript
// src/test/mountSection.js
import { mount } from "@vue/test-utils";
export function mountSection(Component, props = {}, global = {}) {
    return mount(Component, { props, global: { stubs: { teleport: true }, ...global } });
}
```

- [ ] **Step 3:** Smoke-verify the dep resolves — `npm test` (no new specs yet) → green.
- [ ] **Step 4:** Commit — `git commit -m "test: add @vue/test-utils render-smoke helper"`

### Task 6: Extract VersionsSection component from DashboardView

**Files:**
- Create: `src/components/dashboard/sections/VersionsSection.vue`
- Modify: `src/views/DashboardView.vue` (replace the inline Versions `<section>` markup with `<VersionsSection ... />`, pass composable refs/fns as props/events)
- Test: `src/components/dashboard/sections/__tests__/VersionsSection.smoke.test.js`

**Interfaces:**
- Consumes: the `useVersions` return (passed from the view as props: `versions`, `versionsLoading`, `versionsError`, `showNewVersionModal`, `newVersionForm`; events: `@create`, `@update-status`, `@delete`).
- Produces: a self-contained section component the view renders.

- [ ] **Step 1: Read** the Versions `<section>` block in `DashboardView.vue` template (search `activeSection === 'versions'`). Note every ref/fn it references.
- [ ] **Step 2: Write the smoke test (failing — component doesn't exist):**

```javascript
import { describe, it, expect } from "vitest";
import { mountSection } from "@/test/mountSection";
import VersionsSection from "@/components/dashboard/sections/VersionsSection.vue";

describe("VersionsSection", () => {
    it("renders empty state with no versions", () => {
        const w = mountSection(VersionsSection, {
            versions: [], versionsLoading: false, versionsError: null,
            showNewVersionModal: false, newVersionForm: { version_number: "", release_notes: "" },
        });
        expect(w.exists()).toBe(true);
    });
    it("renders a row per version", () => {
        const w = mountSection(VersionsSection, {
            versions: [{ id: "v1", version_number: "1.0", status: "draft", moduleCount: 2 }],
            versionsLoading: false, versionsError: null,
            showNewVersionModal: false, newVersionForm: { version_number: "", release_notes: "" },
        });
        expect(w.text()).toContain("1.0");
    });
});
```

- [ ] **Step 3: Run — fails** (`Cannot find module VersionsSection.vue`).
- [ ] **Step 4: Create `VersionsSection.vue`** — move the Versions section template + its scoped styles out of `DashboardView.vue`. Declare `defineProps` for the consumed refs and `defineEmits(['create','update-status','delete'])`. Replace internal fn calls with `$emit`.
- [ ] **Step 5: Wire into `DashboardView.vue`** — import + render `<VersionsSection :versions="versions" ... @create="createVersion" @delete="deleteVersion" @update-status="updateVersionStatus" />`. Remove the inline markup + moved styles.
- [ ] **Step 6: Run tests** — `npm test` → green (smoke passes, composable tests still pass).
- [ ] **Step 7: Build gate** — `npm run build` → exit 0, `dist/index.html` present.
- [ ] **Step 8: Commit** — `git commit -m "refactor(#11): extract VersionsSection from DashboardView"`

### Tasks 7–11: Extract remaining DashboardView sections

Repeat Task 6's exact pattern, one section per task, in this order (simplest → most coupled), build- and test-gating each:

- [ ] **Task 7: `MediaSection.vue`** — consumes `useDashboardMedia` refs; keep the media-*picker* in the view (it bridges to chapters). Emits `@select`, `@delete`, `@filter`.
- [ ] **Task 8: `UsersSection.vue`** — consumes `useDashboardUsers` refs incl. `userRoleBreakdown`; emits `@page`, `@filter`, `@search`, `@update-role`.
- [ ] **Task 9: `AnalyticsSection.vue`** — consumes `useDashboardAnalytics` refs; emits `@range-change`. Passes `maxRoleCount` (stays in view) as a prop.
- [ ] **Task 10: `QuizzesSection.vue`** — consumes `useDashboardQuizzes` refs; the quiz + question editor modals move with it. Emits the editor open/close/save/delete events.
- [ ] **Task 11: Verify DashboardView is now a shell** — confirm `DashboardView.vue` template is mostly `<XSection />` tags + the dashboard-home overview. Record final LOC. `npm test` + `npm run build` green. Commit `refactor(#11): DashboardView reduced to section-shell`.

### Task 12: Split ProfessorDashboardView (#12)

**Files:**
- Create: `src/composables/useProfessorCourses.js` (+ test) and `src/components/dashboard/sections/professor/*.vue`
- Modify: `src/views/ProfessorDashboardView.vue`

- [ ] **Step 1: Map** `ProfessorDashboardView.vue` sections (read the file; it's 1467 LOC). Identify the section state/fetch/CRUD blocks (mirror of #10).
- [ ] **Step 2: Extract** the per-section fetch/CRUD into composable(s) following the #10 pattern (`profile` arg, refs+fns, `authedRequest`).
- [ ] **Step 3: Test** the composable(s) with Vitest mocking `@/services/api/client` (mirror Phase 1).
- [ ] **Step 4: Split** the sections into components (mirror Tasks 6–11).
- [ ] **Step 5: Gate** — `npm test` + `npm run build` green after each extraction; commit per section.

---

## Phase 3 — QuizView split (#16)

### Task 13: Split QuizView screens + trim CSS

**Files:**
- Create: `src/components/quiz/{QuizStart,QuizQuestion,QuizResults}.vue` (the three screens, per audit cites 184–360)
- Modify: `src/views/QuizView.vue` (becomes a screen-router; logic already in `useQuizzes`)

- [ ] **Step 1: Read** `QuizView.vue`; the screens are gated by a state machine (start/question/results). Logic lives in `useQuizzes` already.
- [ ] **Step 2: Extract** each screen's template + its scoped CSS into a component, props in / events out.
- [ ] **Step 3: Smoke-test** each screen component renders (Vitest + mountSection).
- [ ] **Step 4: Gate** — `npm test` + `npm run build` green. Commit `refactor(#16): split QuizView into screen components`.

---

## Phase 4 — Final verification

### Task 14: Full-suite + build + browser smoke

- [ ] **Step 1:** `npm test` → all green; record test count.
- [ ] **Step 2:** `npm run build` → exit 0.
- [ ] **Step 3:** Browser-smoke the **non-gated** surfaces that the refactor can reach: landing, `/chapters`, the **student** dashboard (login `anton@mogul.global`), and the **quiz** flow (QuizView, #16). Confirm 0 new console errors beyond the known font 404s.
- [ ] **Step 4:** Honest verification note: Creator/Professor dashboard CRUD is covered by Vitest unit tests (not browser-clicked — no creator/professor login available). Record this in the final summary and in memory.
- [ ] **Step 5:** Commit any remaining docs; update `MEMORY.md` with the test-harness fact.

---

## Self-Review notes

- **Spec coverage:** Phase 1 → audit "test coverage" gap; Phase 2 → #11/#12; Phase 3 → #16. Items #13–#15, #17–#20 are explicitly **out of scope** for this plan (audit defers #17–#19 as higher-risk visual changes; #13/#20 depend on broader work). If the goal requires them, they need a follow-up plan — flag to user.
- **Type consistency:** composable return shapes copied verbatim from the #10 implementations. `authedRequest` mock pattern identical across all specs.
- **Placeholder scan:** every test step contains runnable code; every split task names exact files + events.
- **Known risk:** `vi.spyOn(window,"confirm")` requires happy-dom (configured). Section-split smoke tests are shallow render checks, not full interaction — the composable tests carry the behavioral load.
