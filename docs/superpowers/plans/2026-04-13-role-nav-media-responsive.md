# Open Brain: Role Switcher, Navigation, Media Viewer & Responsive — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dev role switcher, improve textbook navigation with a mini TOC, enhance the media viewer, and make the entire site responsive from 375px to 1920px+.

**Architecture:** Mobile-first responsive CSS using Tailwind breakpoints. Desktop experience (>= 1300px) is preserved exactly. Illustrations hidden on mobile/tablet with "View illustration" tap-to-expand buttons. Dev role switcher uses an in-memory override ref in useAuth, tree-shaken from production.

**Tech Stack:** Vue 3, Vite, Pinia, Tailwind CSS, GSAP/ScrollTrigger, Lottie, Supabase REST API

**Spec:** `docs/superpowers/specs/2026-04-13-session-role-nav-media-responsive-design.md`

---

## Task 1: Git Housekeeping — Commit & Branch Cleanup

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add screenshot exclusions to .gitignore**

Add to the end of `.gitignore`:

```
# Debug screenshots (root level)
/auth-modal-open.png
/chapter1-loaded.png
/chapter1-scrolled.png
/chapter2-loading.png
/creator-chapter-expanded.png
/creator-chapters.png
/creator-dashboard.png
/dashboard-current.png
/editor-view.png
/home-after-enter.png
/home-initial-load.png
/logged-in-auth-panel.png
/test-chapter.md
```

- [ ] **Step 2: Stage all files except screenshots**

```bash
git add -A
git reset HEAD auth-modal-open.png chapter1-loaded.png chapter1-scrolled.png chapter2-loading.png creator-chapter-expanded.png creator-chapters.png creator-dashboard.png dashboard-current.png editor-view.png home-after-enter.png home-initial-load.png logged-in-auth-panel.png test-chapter.md
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: reader UI, chapter wizard, navigation, media admin, citations, responsive prep

- Add ReaderTopBar, ReaderSidebar, BottomNav, MenuNav components
- Add chapter creation wizard (4-step: meta, import, structure, review)
- Add CitationTooltip and references system for Supabase chapters
- Add useAnimations, useBibParser, useContentParser, useHighlightRenderer composables
- Migrate all chapters to load from Supabase (remove local JSON fallback)
- Improve media admin with filters, details panel, states/variants
- Add admin theme styles and dashboard constants
- Add Supabase migrations for references, highlight tags, demo features, animations
- Delete legacy MenuChapter.vue and MenuChapters.vue"
```

- [ ] **Step 4: Delete stale local branches**

```bash
git branch -d feature/professor-dashboard
git branch -d feature/role-based-dashboard
git branch -d claude/review-creator-admin-01EUbqBfoRVhQEEVHw4KmBQT
```

- [ ] **Step 5: Delete stale remote branch**

```bash
git push origin --delete claude/review-creator-admin-01EUbqBfoRVhQEEVHw4KmBQT
```

- [ ] **Step 6: Verify**

```bash
git status
git branch -a
git log --oneline -3
```

Expected: clean working tree, only `dev` and `main` local branches, latest commit visible.

---

## Task 2: Dev-Only Role Switcher

**Files:**
- Modify: `src/composables/useAuth.js`
- Modify: `src/router/index.js`
- Create: `src/components/dev/DevToolbar.vue`
- Modify: `src/App.vue`

- [ ] **Step 1: Add devRoleOverride to useAuth.js**

In `src/composables/useAuth.js`, add a module-scope ref after line 5 (`const profileLoading = ref(false);`):

```js
// Dev-only role override (in-memory, never touches DB)
const devRoleOverride = ref(null);
```

Export it as a named export so the router can import it directly:

```js
export { devRoleOverride };
```

Place this export right after the `initializeAuth()` call (around line 78), before the `export function useAuth()` declaration.

- [ ] **Step 2: Modify userRole computed to check override**

In `src/composables/useAuth.js`, replace the `userRole` computed (lines 83-87):

```js
  const userRole = computed(() => {
    // Dev override takes precedence (only in dev mode)
    if (import.meta.env.DEV && devRoleOverride.value) {
      return devRoleOverride.value;
    }
    // Primary source: profiles table. Fallback: user_metadata
    return profile.value?.role ?? user.value?.user_metadata?.role ?? null;
  });
```

- [ ] **Step 3: Add setter functions to the composable return**

In `src/composables/useAuth.js`, add these to the return object of `useAuth()` (after `refreshProfile`):

```js
    // Dev-only role override (no-ops in production due to tree-shaking)
    ...(import.meta.env.DEV ? {
      devRoleOverride,
      setDevRole: (role) => { devRoleOverride.value = role; },
      clearDevRole: () => { devRoleOverride.value = null; },
    } : {}),
```

- [ ] **Step 4: Make router guard respect the override**

In `src/router/index.js`, add this import at the top (after the existing imports, around line 3):

```js
import { devRoleOverride } from "@/composables/useAuth";
```

Then inside the `router.beforeEach` callback, right after the `if (to.meta.requiredRole || to.name === "dashboard") {` check (line 153), add a short-circuit before the `try` block:

```js
      // Dev role override — skip REST fetch when active
      if (import.meta.env.DEV && devRoleOverride?.value) {
        const userRole = devRoleOverride.value;
        if (to.name === "dashboard" && userRole !== "creator") {
          if (userRole === "student") return { path: "/student" };
          if (userRole === "professor") return { path: "/professor" };
        }
        if (to.meta.requiredRole) {
          const requiredRoles = Array.isArray(to.meta.requiredRole)
            ? to.meta.requiredRole
            : [to.meta.requiredRole];
          if (!requiredRoles.includes(userRole)) {
            if (userRole === "student") return { path: "/student" };
            if (userRole === "professor") return { path: "/professor" };
            return { path: "/dashboard" };
          }
        }
        return; // Allow navigation, skip REST fetch
      }
```

- [ ] **Step 5: Create DevToolbar.vue**

Create `src/components/dev/DevToolbar.vue`:

```vue
<script setup>
import { useAuth } from "@/composables/useAuth";

const { userRole, setDevRole, clearDevRole, isAuthenticated } = useAuth();

const roles = ["creator", "professor", "student"];
</script>

<template>
  <div class="fixed bottom-6 right-6 z-[9999] bg-gray-900/90 backdrop-blur-sm text-white rounded-xl p-3 shadow-2xl border border-gray-700 font-sans">
    <div class="text-[10px] uppercase tracking-widest text-yellow-400 font-bold mb-2 text-center">DEV ROLE</div>
    <div v-if="!isAuthenticated" class="text-[11px] text-gray-400 text-center px-2">
      Sign in first
    </div>
    <div v-else class="flex gap-1.5">
      <button
        v-for="role in roles"
        :key="role"
        @click="setDevRole(role)"
        class="px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all capitalize"
        :class="userRole === role
          ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'"
      >
        {{ role }}
      </button>
      <button
        @click="clearDevRole()"
        class="px-2 py-1.5 text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
        title="Reset to DB role"
      >
        &times;
      </button>
    </div>
    <div class="text-[10px] text-gray-500 text-center mt-1.5">
      Active: <span class="text-gray-300 font-medium capitalize">{{ userRole || 'none' }}</span>
    </div>
  </div>
</template>
```

- [ ] **Step 6: Mount DevToolbar in App.vue**

In `src/App.vue`, add the conditional import in `<script setup>` (after existing imports, around line 14):

```js
import { defineAsyncComponent } from "vue";

const DevToolbar = import.meta.env.DEV
    ? defineAsyncComponent(() => import("./components/dev/DevToolbar.vue"))
    : null;
```

Then in the template, add it as the last child inside the `v-if="isLargeScreen"` div, right before the closing `</div>` (after `<BottomNav />`):

```html
        <DevToolbar v-if="DevToolbar" />
```

- [ ] **Step 7: Verify**

```bash
npm start
```

1. Sign in with anton@mogul.global
2. DevToolbar should appear bottom-right showing "Active: creator"
3. Click "student" — should redirect to /student
4. Click "professor" — should redirect to /professor
5. Click "creator" — should redirect to /dashboard
6. Click "x" (reset) — should revert to DB role

- [ ] **Step 8: Commit**

```bash
git add src/composables/useAuth.js src/router/index.js src/components/dev/DevToolbar.vue src/App.vue
git commit -m "feat: add dev-only role switcher for testing Creator/Professor/Student views"
```

---

## Task 3: Run Supabase Migrations

**Files:**
- Read-only: `supabase/migrations/*.sql`

This task requires user interaction with Supabase.

- [ ] **Step 1: Check which migrations are applied**

```bash
npx supabase migration list
```

If Supabase CLI is not configured, the user should run each SQL file manually via the Supabase SQL Editor at their project dashboard.

- [ ] **Step 2: Run pending migrations in order**

The 5 potentially unrun migrations, in order:

1. `supabase/migrations/20250219000000_create_references_table.sql`
2. `supabase/migrations/20250220000000_add_highlight_tags.sql`
3. `supabase/migrations/20250220000001_seed_chapter2_references.sql`
4. `supabase/migrations/20250220000002_demo_features_setup.sql`
5. `supabase/migrations/20260406000000_seed_chapter1_animations.sql`

For each, copy the SQL into the Supabase SQL Editor and execute. The last one (`seed_chapter1_animations`) may require running as the `service_role` to bypass RLS.

- [ ] **Step 3: Verify**

Load the app and navigate to `/chapter/1/the-retina`. Chapter 1 should load with content from Supabase. Check browser console for `useChapter: Transformed` log showing section/paragraph counts.

---

## Task 4: Navigation — Mini TOC + Sidebar Cleanup

**Files:**
- Create: `src/components/chapter/TableOfContents.vue`
- Modify: `src/components/Navigation/MenuNav.vue`
- Modify: `src/components/chapter/ReaderTopBar.vue`
- Modify: `src/views/ChapterView.vue`
- Modify: `src/stores/index.js`

- [ ] **Step 1: Add allSections cache to useGeneral store**

In `src/stores/index.js`, add to the `useGeneral` state (after `savedPosition: undefined,` on line 32):

```js
    allSections: {},  // { moduleId: [{ id, title, slug, order_index }] }
```

- [ ] **Step 2: Create TableOfContents.vue**

Create `src/components/chapter/TableOfContents.vue`:

```vue
<script setup>
import { computed } from "vue";
import { useGeneral, useText } from "@/stores";
import { toSlug } from "@/helper/general.js";

const store = useGeneral();
const textStore = useText();

const sections = computed(() => {
  return (textStore.text?.sections || []).map((s) => ({
    title: s.title,
    slug: toSlug(s.title),
  }));
});

function scrollToSection(slug) {
  const el = document.getElementById(slug);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function isActive(slug) {
  return slug === store.currentSubChapter;
}
</script>

<template>
  <div
    v-if="sections.length > 0 && !store.activeMenu"
    class="fixed left-[calc(100vw-min(50vw,calc(780px+11rem))-3rem)] top-1/2 -translate-y-1/2 z-40 flex flex-col gap-3 items-center"
  >
    <button
      v-for="(section, idx) in sections"
      :key="section.slug"
      @click="scrollToSection(section.slug)"
      class="group relative w-3 h-3 rounded-full border-2 transition-all duration-200 cursor-pointer"
      :class="isActive(section.slug)
        ? 'bg-violet border-violet scale-125'
        : 'bg-transparent border-gray-400 hover:border-violet hover:scale-110'"
      :title="section.title"
    >
      <!-- Tooltip on hover -->
      <span
        class="absolute right-6 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-[11px] font-medium px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg"
      >
        {{ section.title }}
      </span>
    </button>
  </div>
</template>
```

**Note:** This is desktop-only. The `left` value positions it to the left of the text column using the same `calc()` as the existing layout. On mobile/tablet (Tasks 7+), this component won't render because its parent will be gated with a breakpoint class.

- [ ] **Step 3: Render TableOfContents in ChapterView.vue**

In `src/views/ChapterView.vue`, add the import (after the existing imports, around line 22):

```js
import TableOfContents from "@/components/chapter/TableOfContents.vue";
```

Then in the template, add it inside `<template v-if="showContent">`, right after the `<ReaderTopBar>` block (around line 341):

```html
            <!-- Mini TOC (desktop only) -->
            <TableOfContents />
```

- [ ] **Step 4: Fix MenuNav sidebar width**

In `src/components/Navigation/MenuNav.vue`, change the sidebar container class (line 150). Replace:

```
'w-[50vw]'
```

With:

```
'w-full max-w-[480px]'
```

The full `:class` binding becomes:

```js
:class="[
    store.activeMenu
        ? route.name === 'chapter'
            ? 'w-full max-w-[480px]'
            : 'w-[0]'
        : 'w-0',
]"
```

- [ ] **Step 5: Pre-fetch sections for all chapters in MenuNav**

In `src/components/Navigation/MenuNav.vue`, add a ref and fetch for all sections. After `const allModules = ref([]);` (line 17), add:

```js
const allSections = ref({});  // { moduleId: [sections] }
```

After the modules fetch succeeds (after line 41 `allModules.value = data || [];`), add:

```js
            // Pre-fetch section titles for all modules
            if (data.length > 0) {
                const moduleIds = data.map((m) => `"${m.id}"`).join(",");
                const secResponse = await fetch(
                    `${url}/rest/v1/sections?module_id=in.(${moduleIds})&select=id,title,slug,module_id,order_index&order=order_index.asc`,
                    {
                        headers: {
                            apikey: key,
                            Authorization: `Bearer ${key}`,
                            "Content-Type": "application/json",
                        },
                    },
                );
                if (secResponse.ok) {
                    const secData = await secResponse.json();
                    const grouped = {};
                    for (const sec of secData) {
                        if (!grouped[sec.module_id]) grouped[sec.module_id] = [];
                        grouped[sec.module_id].push(sec);
                    }
                    allSections.value = grouped;
                }
            }
```

- [ ] **Step 6: Update getSections to use pre-fetched data**

In `src/components/Navigation/MenuNav.vue`, replace the `getSections` function (lines 66-80):

```js
function getSections(chapter) {
    if (chapter.number === 1) {
        return menu.Part2?.parts || [];
    }
    // Use pre-fetched sections for all chapters
    const preFetched = allSections.value[chapter.id];
    if (preFetched && preFetched.length > 0) {
        return preFetched.map((s) => ({
            title: s.title,
            id: toSlug(s.title),
        }));
    }
    // Fallback: current chapter from textStore
    if (String(chapter.number) === String(chapterNumber.value)) {
        const sections = textStore.text?.sections || [];
        return sections.map((s) => ({
            title: s.title,
            id: toSlug(s.title),
        }));
    }
    return [];
}
```

- [ ] **Step 7: Add prev/next chapter to ReaderTopBar**

In `src/components/chapter/ReaderTopBar.vue`, add to `<script setup>`:

After the existing props (line 19), add:

```js
const emit = defineEmits(["navigate-chapter"]);
```

Then add the `allModules` ref and fetch (we'll use a simpler approach — accept modules as a prop). Add a new prop:

```js
  allChapters: {
    type: Array,
    default: () => [],
  },
```

Add computed properties for prev/next:

```js
const currentIndex = computed(() => {
  return props.allChapters.findIndex(
    (c) => String(c.number) === String(props.chapterNumber),
  );
});

const prevChapter = computed(() => {
  const idx = currentIndex.value;
  return idx > 0 ? props.allChapters[idx - 1] : null;
});

const nextChapter = computed(() => {
  const idx = currentIndex.value;
  return idx < props.allChapters.length - 1 ? props.allChapters[idx + 1] : null;
});
```

In the template, update the `.breadcrumb-row` div to add prev/next arrows. Replace the breadcrumb-row contents (lines 64-99):

```html
    <div class="breadcrumb-row">
      <!-- Prev chapter -->
      <button
        v-if="prevChapter"
        @click="emit('navigate-chapter', prevChapter)"
        class="nav-arrow"
        :title="'Previous: ' + prevChapter.title"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>
      <div v-else class="nav-arrow-spacer"></div>

      <!-- Breadcrumb -->
      <div class="breadcrumb" @click="toggleDropdown">
        <span class="chapter-ref">Ch {{ chapterNumber }}</span>
        <template v-if="currentSectionTitle">
          <span class="sep">/</span>
          <span class="section-name">{{ currentSectionTitle }}</span>
        </template>
        <svg
          class="chevron"
          :class="{ rotated: showDropdown }"
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      <div class="flex items-center gap-2">
        <!-- Progress percentage -->
        <span class="text-[12px] text-gray-400 font-mono tabular-nums">{{ Math.round(progressPercent) }}%</span>

        <!-- Next chapter -->
        <button
          v-if="nextChapter"
          @click="emit('navigate-chapter', nextChapter)"
          class="nav-arrow"
          :title="'Next: ' + nextChapter.title"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>

        <!-- Sidebar toggle -->
        <button
          class="sidebar-toggle"
          :class="{ active: sidebarOpen }"
          @click="toggleSidebar()"
          title="Toggle sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="15" y1="3" x2="15" y2="21"></line>
          </svg>
        </button>
      </div>
    </div>
```

Add these styles to the `<style scoped>` block:

```css
.nav-arrow {
  width: 30px;
  height: 30px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  transition: all 0.15s;
  flex-shrink: 0;
}

.nav-arrow:hover {
  background: #f3f4f6;
  color: #374151;
}

.nav-arrow-spacer {
  width: 30px;
  flex-shrink: 0;
}
```

- [ ] **Step 8: Wire up chapter navigation in ChapterView**

In `src/views/ChapterView.vue`, add a ref for all chapters and a navigation handler.

After the existing composable setup (around line 30), add:

```js
import { useRouter } from "vue-router";

const router = useRouter();
```

Add a ref and fetch for all modules (after `const chapterDataLoaded = ref(false);` on line 123):

```js
// All chapters for prev/next navigation
const allChapters = ref([]);

async function fetchAllChapters() {
    try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
        const response = await fetch(
            `${supabaseUrl}/rest/v1/modules?select=id,title,slug,order_index&status=eq.published&order=order_index.asc`,
            {
                headers: {
                    apikey: supabaseKey,
                    Authorization: `Bearer ${supabaseKey}`,
                    "Content-Type": "application/json",
                },
            },
        );
        if (response.ok) {
            const data = await response.json();
            allChapters.value = data.map((m) => ({
                id: m.id,
                number: m.order_index,
                title: m.title,
                slug: m.slug,
            }));
        }
    } catch (err) {
        console.error("ChapterView: Failed to fetch all chapters:", err);
    }
}

function handleNavigateChapter(chapter) {
    router.push(`/chapter/${chapter.number}/${chapter.slug}`);
}
```

Call `fetchAllChapters()` in the `onMounted` callback (add it to the beginning of onMounted, line 179):

```js
    fetchAllChapters();
```

Update the `<ReaderTopBar>` in the template to pass the new props:

```html
            <ReaderTopBar
                v-if="isAuthenticated && isSupabaseChapter"
                :chapter-title="chapterTitle"
                :chapter-number="chapterNumber"
                :sections="breadcrumbSections"
                :all-chapters="allChapters"
                @navigate-chapter="handleNavigateChapter"
            />
```

- [ ] **Step 9: Commit**

```bash
git add src/components/chapter/TableOfContents.vue src/components/Navigation/MenuNav.vue src/components/chapter/ReaderTopBar.vue src/views/ChapterView.vue src/stores/index.js
git commit -m "feat: add mini TOC, improve sidebar navigation, add prev/next chapter"
```

---

## Task 5: Improved Media/Diagram Viewer

**Files:**
- Modify: `src/components/dashboard/media/MediaDetails.vue`
- Create: `src/components/dashboard/media/MediaLightbox.vue`
- Modify: `src/components/dashboard/media/MediaSection.vue`

- [ ] **Step 1: Create MediaLightbox.vue**

Create `src/components/dashboard/media/MediaLightbox.vue`:

```vue
<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { MEDIA_TYPES } from "@/constants/dashboard";

const props = defineProps({
  media: { type: Object, default: null },
  visible: { type: Boolean, default: false },
});

const emit = defineEmits(["close"]);

const lottieContainer = ref(null);
let lottieInstance = null;

const isLottie = computed(() => {
  const t = props.media?.media_type || props.media?.animation_type;
  return t === MEDIA_TYPES.LOTTIE || t === "lottie";
});

const isVideo = computed(() => {
  const t = props.media?.media_type || props.media?.animation_type;
  return t === MEDIA_TYPES.VIDEO || t === "video";
});

const isYoutube = computed(() => {
  const t = props.media?.media_type || props.media?.animation_type;
  return t === MEDIA_TYPES.YOUTUBE || t === "youtube";
});

const youtubeEmbedUrl = computed(() => {
  if (!isYoutube.value || !props.media?.file_path) return null;
  const match = props.media.file_path.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/,
  );
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : null;
});

const imageUrl = computed(() => {
  return props.media?.image_file_url || props.media?.file_path || props.media?.thumbnail_path;
});

async function loadLottie() {
  if (!isLottie.value || !props.media?.lottie_file_url) return;
  await nextTick();
  if (!lottieContainer.value) return;

  try {
    const lottie = (await import("lottie-web")).default;
    destroyLottie();
    lottieInstance = lottie.loadAnimation({
      container: lottieContainer.value,
      renderer: "svg",
      loop: true,
      autoplay: true,
      path: props.media.lottie_file_url,
    });
  } catch (err) {
    console.error("MediaLightbox: Lottie load error:", err);
  }
}

function destroyLottie() {
  if (lottieInstance) {
    lottieInstance.destroy();
    lottieInstance = null;
  }
}

function onKeydown(e) {
  if (e.key === "Escape") emit("close");
}

watch(() => props.visible, (v) => {
  if (v && isLottie.value) loadLottie();
  if (!v) destroyLottie();
});

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  if (props.visible && isLottie.value) loadLottie();
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  destroyLottie();
});
</script>

<template>
  <Teleport to="body">
    <Transition name="lightbox">
      <div v-if="visible && media" class="fixed inset-0 z-[10000] flex items-center justify-center" @click.self="emit('close')">
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>

        <div class="relative z-10 w-[90vw] h-[85vh] flex items-center justify-center">
          <!-- Close button -->
          <button
            @click="emit('close')"
            class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-20"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- Title -->
          <div class="absolute top-4 left-4 text-white/70 text-sm font-medium z-20">
            {{ media.title || 'Untitled' }}
          </div>

          <!-- Lottie -->
          <div v-if="isLottie" ref="lottieContainer" class="w-full h-full"></div>

          <!-- Video -->
          <video
            v-else-if="isVideo && media.file_path"
            :src="media.file_path"
            controls
            autoplay
            class="max-w-full max-h-full object-contain"
          ></video>

          <!-- YouTube -->
          <iframe
            v-else-if="isYoutube && youtubeEmbedUrl"
            :src="youtubeEmbedUrl"
            class="w-full h-full rounded-lg"
            frameborder="0"
            allow="autoplay; fullscreen"
            allowfullscreen
          ></iframe>

          <!-- Image -->
          <img
            v-else-if="imageUrl"
            :src="imageUrl"
            :alt="media.title"
            class="max-w-full max-h-full object-contain"
          />

          <!-- Fallback -->
          <div v-else class="text-white/50 text-lg">No preview available</div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 0.2s ease;
}
.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}
</style>
```

- [ ] **Step 2: Add live preview and fullscreen to MediaDetails.vue**

In `src/components/dashboard/media/MediaDetails.vue`, add imports after the existing ones (line 9):

```js
import { onBeforeUnmount, nextTick } from 'vue';
import MediaLightbox from './MediaLightbox.vue';
```

Add computed properties for media types (after `highlightStates` computed, line 85):

```js
const isLottie = computed(() => {
  const t = props.media?.media_type || props.media?.animation_type;
  return t === MEDIA_TYPES.LOTTIE || t === 'lottie';
});

const isVideo = computed(() => {
  const t = props.media?.media_type || props.media?.animation_type;
  return t === MEDIA_TYPES.VIDEO || t === 'video';
});

const isYoutube = computed(() => {
  const t = props.media?.media_type || props.media?.animation_type;
  return t === MEDIA_TYPES.YOUTUBE || t === 'youtube';
});

const imageUrl = computed(() => {
  return props.media?.image_file_url || props.media?.thumbnail_path || props.media?.file_path;
});

const youtubeEmbedUrl = computed(() => {
  if (!isYoutube.value || !props.media?.file_path) return null;
  const match = props.media.file_path.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/,
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
});

// Lottie preview
const lottiePreview = ref(null);
let lottieInstance = null;

async function loadLottiePreview() {
  if (!isLottie.value || !props.media?.lottie_file_url) return;
  await nextTick();
  if (!lottiePreview.value) return;
  try {
    const lottie = (await import('lottie-web')).default;
    destroyLottiePreview();
    lottieInstance = lottie.loadAnimation({
      container: lottiePreview.value,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: props.media.lottie_file_url,
    });
  } catch (err) {
    console.error('MediaDetails: Lottie error:', err);
  }
}

function destroyLottiePreview() {
  if (lottieInstance) {
    lottieInstance.destroy();
    lottieInstance = null;
  }
}

// Fullscreen lightbox
const showLightbox = ref(false);

// Re-load lottie when selected media changes
watch(() => props.media?.id, async () => {
  destroyLottiePreview();
  if (isLottie.value) {
    await loadLottiePreview();
  }
}, { immediate: true });

onBeforeUnmount(() => {
  destroyLottiePreview();
});
```

Replace the existing Preview section in the template (lines 104-116):

```html
    <!-- Preview -->
    <div class="aspect-video bg-gray-100 relative group">
      <!-- Lottie preview -->
      <div v-if="isLottie" ref="lottiePreview" class="w-full h-full"></div>

      <!-- Video preview -->
      <video v-else-if="isVideo && media.file_path" :src="media.file_path" controls class="w-full h-full object-contain"></video>

      <!-- YouTube embed -->
      <iframe v-else-if="isYoutube && youtubeEmbedUrl" :src="youtubeEmbedUrl" class="w-full h-full" frameborder="0" allowfullscreen></iframe>

      <!-- Image preview -->
      <img v-else-if="imageUrl" :src="imageUrl" :alt="media.title" class="w-full h-full object-contain" />

      <!-- Placeholder -->
      <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
        <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>

      <!-- Expand button (overlay) -->
      <button
        @click="showLightbox = true"
        class="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/50 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        title="View fullscreen"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>
    </div>

    <!-- Lightbox -->
    <MediaLightbox
      :media="media"
      :visible="showLightbox"
      @close="showLightbox = false"
    />
```

- [ ] **Step 3: Improve MediaSection layout proportions**

In `src/components/dashboard/media/MediaSection.vue`, replace the main content grid (lines 212-238):

```html
    <!-- Main content -->
    <div v-else class="grid gap-6" :class="selectedItem ? 'lg:grid-cols-2' : ''">
      <!-- Media grid -->
      <div>
        <div class="grid gap-4" :class="selectedItem ? 'sm:grid-cols-2' : 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'">
          <MediaCard
            v-for="media in displayedItems"
            :key="media.id"
            :media="media"
            :selected="selectedItem?.id === media.id"
            @select="handleSelectMedia"
            @delete="handleDeleteMedia"
          />
        </div>
      </div>

      <!-- Details panel -->
      <div v-if="selectedItem">
        <div class="sticky top-4">
          <MediaDetails
            :media="selectedItem"
            @close="mediaStore.clearSelection()"
            @edit="handleSelectMedia"
            @delete="handleDeleteMedia"
          />
        </div>
      </div>
    </div>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/media/MediaDetails.vue src/components/dashboard/media/MediaLightbox.vue src/components/dashboard/media/MediaSection.vue
git commit -m "feat: add live Lottie/video preview and fullscreen lightbox to media viewer"
```

---

## Task 6: Responsive — Tailwind Config + Remove MediaQueryWarning

**Files:**
- Modify: `tailwind.config.js`
- Modify: `src/App.vue`
- Delete: `src/components/UI/MediaQueryWarning.vue`

- [ ] **Step 1: Update Tailwind breakpoints**

In `tailwind.config.js`, replace the `screens` object (lines 35-44):

```js
    screens: {
      xs: "375px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1300px",
      "2xl": "1500px",
    },
```

Add `text-tablet` width utility. In the `width` object (inside `extend`), add:

```js
        "text-tablet": "700px",
```

- [ ] **Step 2: Remove MediaQueryWarning from App.vue**

In `src/App.vue`, remove the `isLargeScreen` import and ref. Delete this line (line 18):

```js
const isLargeScreen = useMediaQuery("(min-width: 1300px)");
```

Also remove `useMediaQuery` from the `@vueuse/core` import (line 10). The updated import:

```js
import { watchDebounced } from "@vueuse/core";
```

Remove the `MediaQueryWarning` import (line 4):

```js
// DELETE: import MediaQueryWarning from "./components/UI/MediaQueryWarning.vue";
```

In the template, replace the `v-if="isLargeScreen"` / `v-else` pattern. Change lines 59-93 to:

```html
    <div class="text-base cursor-default font-sans">
        <OverlayInfo v-if="!store.hasBeenVisited" />
        <div class="bg-img" />
        <RouterView
            v-slot="{ Component }"
            class="z-0 duration-300"
            :class="
                store.activeAbout ||
                store.activeMenu ||
                authStore.activeAuth ||
                !store.hasBeenVisited
                    ? 'blur-md grayscale-0 pointer-events-none'
                    : ''
            "
        >
            <transition :name="route.meta?.transitionName || 'routeT'">
                <component :is="Component" />
            </transition>
        </RouterView>
        <MenuNav />
        <MenuHome />
        <MenuAbout v-if="route.name === 'chapter'" />
        <MenuAuth
            v-if="
                route.name === 'home' ||
                route.name === 'chapter' ||
                route.name === 'dashboard' ||
                route.name === 'editor'
            "
        />
        <BottomNav />
        <DevToolbar v-if="DevToolbar" />
    </div>
```

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.js src/App.vue
git rm src/components/UI/MediaQueryWarning.vue
git commit -m "feat: update Tailwind breakpoints, remove MediaQueryWarning gate"
```

---

## Task 7: Responsive — Chapter View (TextComp + Illustrations)

**Files:**
- Modify: `src/components/chapter/TextComp.vue`
- Modify: `src/components/chapter/Illus/IllustrationsComp.vue`
- Modify: `src/views/ChapterView.vue`
- Modify: `src/index.css`

- [ ] **Step 1: Make TextComp responsive**

In `src/components/chapter/TextComp.vue`, update the outer container (line 282):

Replace:
```html
    class="absolute top-start z-40 w-[50vw] pointer-events-none font-sans"
```
With:
```html
    class="xl:absolute xl:top-start z-40 w-full xl:w-[50vw] pointer-events-none font-sans"
```

Update the `<main>` element (line 300). Replace:
```html
        class="text pointer-events-auto w-full text-left pt-[20vh] ml-text max-w-text z-30 border-l bg-white border-black tracking-wide pl-20 pr-24 duration-300 text-black"
```
With:
```html
        class="text pointer-events-auto w-full text-left pt-[10vh] xl:pt-[20vh] z-30 bg-white tracking-wide px-5 md:px-8 xl:pl-20 xl:pr-24 duration-300 text-black xl:ml-text xl:max-w-text xl:border-l xl:border-black md:max-w-[700px] md:mx-auto"
```

Update the scoped styles (lines 450-458). Replace:

```css
.top-start {
  top: calc(100vh);
}

.ml-text {
  width: min(50vw, calc(780px + 11rem));
  margin-left: calc(100vw - min(50vw, calc(780px + 11rem)));
}
```

With:

```css
@media (min-width: 1300px) {
  .top-start {
    top: calc(100vh);
  }
  .ml-text {
    width: min(50vw, calc(780px + 11rem));
    margin-left: calc(100vw - min(50vw, calc(780px + 11rem)));
  }
}
```

- [ ] **Step 2: Hide illustrations on mobile/tablet**

In `src/components/chapter/Illus/IllustrationsComp.vue`, update the container (line 118):

Replace:
```html
    class="fixed top-0 left-0 h-screen w-illus z-30 pointer-events-none font-mono"
```
With:
```html
    class="hidden xl:fixed xl:block xl:top-0 xl:left-0 xl:h-screen xl:w-illus z-30 pointer-events-none font-mono"
```

- [ ] **Step 3: Gate TableOfContents for desktop only**

In `src/views/ChapterView.vue`, update the TableOfContents rendering:

```html
            <!-- Mini TOC (desktop only, hidden on mobile/tablet) -->
            <div class="hidden xl:block">
                <TableOfContents />
            </div>
```

- [ ] **Step 4: Fix global CSS calculations for mobile**

In `src/index.css`, wrap the desktop-specific calc() rules. Replace the `.punkt, .punktComment` rule (lines 333-348):

```css
.punkt,
.punktComment {
  position: absolute;
  left: -1.25rem;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background-color: black;
  pointer-events: all;
  font-size: 1.5rem;
  line-height: 2.2rem;
  padding: 0px;
  text-align: center;
  transition: none;
}

@media (min-width: 1300px) {
  .punkt,
  .punktComment {
    left: calc(50vw - min(calc(50vw + 0.75rem), calc(780px + 11rem)) - 1.25rem);
  }
}
```

Replace `.marker-start, .marker-end` (lines 441-456):

```css
.marker-start,
.marker-end {
  width: 1rem;
  height: 1rem;
  margin-top: 0.5rem;
  background: #000;
  border-radius: 999999%;
  position: absolute;
  left: -0.5rem;
}

@media (min-width: 1300px) {
  .marker-start,
  .marker-end {
    left: calc(100vw - min(50vw, calc(780px + 11rem)) - 0.5rem);
  }
}

.marker-end {
  margin-top: -0.5rem;
  background-color: white;
  border: solid black;
}
```

Replace `.marker-center` (lines 458-465):

```css
.marker-center {
  width: 1rem;
  height: 1.2px;
  background: #000;
  position: fixed;
  left: -0.5rem;
  top: 50vh;
}

@media (min-width: 1300px) {
  .marker-center {
    left: calc(100vw - min(50vw, calc(780px + 11rem)) - 0.5rem);
  }
}
```

Replace `.-translate-x-custom` (lines 527-529):

```css
.-translate-x-custom {
  transform: none;
}

@media (min-width: 1300px) {
  .-translate-x-custom {
    transform: translateX(min(-50vw, calc(-100vw + 780px + 11rem - 1px)));
  }
}
```

- [ ] **Step 5: Add typography scaling**

In `src/index.css`, after the existing `@media (max-width: 1600px)` block (around line 109), add:

```css
@media (max-width: 1299px) {
  .text-base {
    font-size: 1.8rem;
    line-height: 2.8rem;
  }
  .text-small {
    font-size: 1.25rem;
    line-height: 1.75rem;
  }
  h1 {
    font-size: 3.5rem;
    line-height: 4rem;
    padding-bottom: 3rem;
  }
  h2 {
    font-size: 3.2rem;
    line-height: 4rem;
    padding-bottom: 1.5rem;
  }
  h3 {
    font-size: 2.6rem;
    line-height: 3.2rem;
    padding-top: 1.5rem;
    padding-bottom: 1rem;
  }
}

@media (max-width: 767px) {
  .text-base {
    font-size: 1.6rem;
    line-height: 2.5rem;
  }
  .text-small {
    font-size: 1.15rem;
    line-height: 1.6rem;
  }
  h1 {
    font-size: 2.8rem;
    line-height: 3.2rem;
    padding-bottom: 2rem;
  }
  h2 {
    font-size: 2.6rem;
    line-height: 3.2rem;
    padding-bottom: 1rem;
  }
  h3 {
    font-size: 2.2rem;
    line-height: 2.8rem;
    padding-top: 1rem;
    padding-bottom: 0.8rem;
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/chapter/TextComp.vue src/components/chapter/Illus/IllustrationsComp.vue src/views/ChapterView.vue src/index.css
git commit -m "feat: make chapter view responsive — text stacks full width, illustrations hidden on mobile/tablet"
```

---

## Task 8: Responsive — Navigation Components

**Files:**
- Modify: `src/components/Navigation/BottomNav.vue`
- Modify: `src/components/Navigation/MenuAbout.vue`
- Modify: `src/components/Navigation/MenuAuth.vue`
- Modify: `src/components/chapter/ReaderTopBar.vue`
- Modify: `src/components/chapter/ReaderSidebar.vue`

- [ ] **Step 1: Make BottomNav responsive**

In `src/components/Navigation/BottomNav.vue`, update the button sizing. Replace the `.nav-icon` style (lines 91-102):

```css
.nav-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 9999px;
    background-color: #222;
    border: 1px solid #222;
    cursor: pointer;
    transition: all 0.2s ease;
}

@media (min-width: 768px) {
    .nav-icon {
        width: 3rem;
        height: 3rem;
    }
}

@media (min-width: 1300px) {
    .nav-icon {
        width: 3.5rem;
        height: 3.5rem;
    }
}
```

Update the `.nav-icon-svg` style:

```css
.nav-icon-svg {
    width: 1.2rem;
    height: 1.2rem;
    fill: white;
}

@media (min-width: 1300px) {
    .nav-icon-svg {
        width: 1.5rem;
        height: 1.5rem;
    }
}
```

- [ ] **Step 2: Make MenuAbout responsive**

In `src/components/Navigation/MenuAbout.vue`, update the sidebar width (line 18). Replace:

```html
:class="[store.activeAbout ? 'w-[50vw] ml-0' : 'w-[0]']"
```

With:

```html
:class="[store.activeAbout ? 'w-full md:max-w-[480px] xl:w-[50vw] xl:max-w-none ml-0' : 'w-[0]']"
```

Update the inner content width (line 20). Replace:

```html
<div class="px-24 pt-12 pb-56 w-[50vw] max-w-[800px]">
```

With:

```html
<div class="px-6 md:px-16 xl:px-24 pt-8 md:pt-12 pb-56 w-full max-w-[800px]">
```

- [ ] **Step 3: Make MenuAuth responsive**

In `src/components/Navigation/MenuAuth.vue`, update line 157. Replace:

```html
:class="[authStore.activeAuth ? 'w-[50vw] ml-0' : 'w-[0]']"
```

With:

```html
:class="[authStore.activeAuth ? 'w-full md:max-w-[480px] xl:w-[50vw] xl:max-w-none ml-0' : 'w-[0]']"
```

Also update the inner content width on line 159. Replace:

```html
<div class="px-24 pt-12 pb-56 w-[50vw] max-w-[800px]">
```

With:

```html
<div class="px-6 md:px-16 xl:px-24 pt-8 md:pt-12 pb-56 w-full max-w-[800px]">
```

- [ ] **Step 4: Make ReaderTopBar responsive**

In `src/components/chapter/ReaderTopBar.vue`, update the breadcrumb-row padding for mobile:

```css
.breadcrumb-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  border-bottom: 1px solid #f3f4f6;
}

@media (min-width: 768px) {
  .breadcrumb-row {
    padding: 8px 20px;
  }
}
```

Update `.section-name` to be shorter on mobile:

```css
.section-name {
  font-size: 13px;
  color: #6b7280;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (min-width: 768px) {
  .section-name {
    font-size: 14px;
    max-width: 280px;
  }
}
```

- [ ] **Step 5: Make ReaderSidebar responsive**

In `src/components/chapter/ReaderSidebar.vue`, the sidebar has `width: 400px; max-width: 100vw;` in scoped CSS (line 265-266). Replace:

```css
  width: 400px;
  max-width: 100vw;
```

With:

```css
  width: 100%;
  max-width: 100vw;
}

@media (min-width: 1300px) {
  /* override the rule — add after the existing closing brace */
  /* NOTE: find the selector that contains the width rule and add this media query */
  .reader-sidebar {
    width: 400px;
  }
```

Alternatively, if the sidebar uses a scoped class, simply change `width: 400px;` to `width: 100%;` and add an `xl:` breakpoint override. The `max-width: 100vw` already prevents overflow on mobile.

- [ ] **Step 6: Commit**

```bash
git add src/components/Navigation/BottomNav.vue src/components/Navigation/MenuAbout.vue src/components/Navigation/MenuAuth.vue src/components/chapter/ReaderTopBar.vue src/components/chapter/ReaderSidebar.vue
git commit -m "feat: make navigation components responsive for phone and tablet"
```

---

## Task 9: Responsive — Dashboard

**Files:**
- Modify: `src/views/DashboardView.vue`

- [ ] **Step 1: Add mobile header and hamburger state**

In `src/views/DashboardView.vue`, add after existing refs (around line 76):

```js
// Mobile sidebar toggle
const dashboardMenuOpen = ref(false);

function toggleDashboardMenu() {
    dashboardMenuOpen.value = !dashboardMenuOpen.value;
}

function closeDashboardMenu() {
    dashboardMenuOpen.value = false;
}
```

- [ ] **Step 2: Update dashboard template layout**

Find the `.dashboard-layout` container in the DashboardView template. Add a mobile header bar before the sidebar:

```html
<!-- Mobile header (visible below md) -->
<div class="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
    <button @click="toggleDashboardMenu" class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100">
        <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
    </button>
    <span class="text-sm font-semibold text-gray-900">Dashboard</span>
    <div class="w-10"></div>
</div>
```

Update the sidebar to be responsive. The sidebar should have these classes:

```html
<aside
    class="sidebar fixed inset-y-0 left-0 z-40 w-[300px] transform transition-transform duration-300 md:relative md:translate-x-0 md:w-[240px] xl:w-[300px]"
    :class="dashboardMenuOpen ? 'translate-x-0' : '-translate-x-full'"
>
```

Add a backdrop for mobile:

```html
<!-- Mobile sidebar backdrop -->
<div
    v-if="dashboardMenuOpen"
    class="fixed inset-0 z-30 bg-black/30 md:hidden"
    @click="closeDashboardMenu"
></div>
```

Add top padding to main content for mobile header:

```html
<main class="main-content flex-1 pt-16 md:pt-0">
```

- [ ] **Step 3: Commit**

```bash
git add src/views/DashboardView.vue
git commit -m "feat: make dashboard responsive with hamburger sidebar on mobile"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Start dev server and test all breakpoints**

```bash
npm start
```

Test at these widths (use browser DevTools responsive mode):

| Width | What to check |
|-------|---------------|
| 375px (iPhone SE) | Chapter text readable, full-width, no horizontal scroll, BottomNav small, MenuNav full-width overlay |
| 768px (iPad) | Chapter text centered at ~700px, dashboard sidebar persistent at 240px, MenuNav 480px |
| 1024px (laptop) | Similar to 768px but more breathing room |
| 1300px (desktop threshold) | Illustrations appear, 50/50 split, mini TOC dots visible, full desktop experience |
| 1920px (full HD) | Same as 1300px, extra space in illustration panel |

- [ ] **Step 2: Test role switcher at each breakpoint**

1. DevToolbar should be visible at all breakpoints (it's fixed bottom-right)
2. Switch to Student — navigate to /student, verify dashboard loads
3. Switch to Professor — navigate to /professor, verify dashboard loads
4. Switch to Creator — navigate to /dashboard, verify all tabs work
5. Reset — verify reverts to DB role

- [ ] **Step 3: Test media viewer**

1. Go to Dashboard > Media
2. Select a Lottie item — verify animation plays in preview
3. Click expand — verify fullscreen lightbox opens with animation
4. Press Escape — verify lightbox closes
5. Select an image — verify image shows in preview

- [ ] **Step 4: Test navigation**

1. On desktop: mini TOC dots should be visible on left margin
2. Scroll through chapter — active dot should track current section
3. Click a dot — should scroll to that section
4. Click prev/next arrows in ReaderTopBar — should navigate chapters
5. Open MenuNav — should show all chapters with pre-fetched sections

- [ ] **Step 5: Final commit**

If any fixes were needed during testing, commit them:

```bash
git add -A
git commit -m "fix: responsive adjustments from manual testing"
```
