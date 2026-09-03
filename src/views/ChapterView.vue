<script setup>
import { onMounted, watch, computed, ref, nextTick, provide } from "vue";
import { onBeforeRouteLeave, useRoute } from "vue-router";
import Text from "@/components/chapter/TextComp.vue";
import Illustration from "@/components/chapter/Illus/IllustrationsComp.vue";
import EyeStart from "@/components/chapter/text/EyeStart.vue";
import CloseIcon from "@/icons/custom/CloseIcon.vue";

import { useGeneral, useText, useCom } from "@/stores";
import Comment from "../components/chapter/text/CommentComp.vue";
import FootNotesWindow from "../components/chapter/text/FootNotesWindow.vue";
import MenuTutorial from "../components/Navigation/MenuTutorial.vue";
import { useChapter } from "@/composables/useChapter";
import { useReferences } from "@/composables/useReferences";

// Phase 3A: Highlighting System Components
import HighlightToolbar from "@/components/chapter/HighlightToolbar.vue";

// Unified Reader UI
import ReaderTopBar from "@/components/chapter/ReaderTopBar.vue";
import ReaderSidebar from "@/components/chapter/ReaderSidebar.vue";
import CitationTooltip from "@/components/chapter/CitationTooltip.vue";
import EndOfChapterCallout from "@/components/chapter/EndOfChapterCallout.vue";

// Phase 3A: Composables for highlighting
import { useTextSelection } from "@/composables/useTextSelection";
import { useHighlights } from "@/composables/useHighlights";
import { useHighlightRenderer } from "@/composables/useHighlightRenderer";
import { useNotes } from "@/composables/useNotes";
import { useReadingProgress } from "@/composables/useReadingProgress";
import { useAuth } from "@/composables/useAuth";
import { useReaderSidebar } from "@/composables/useReaderSidebar";
import { useChapterCatalog } from "@/composables/useChapterCatalog";
import { toSlug } from "@/helper/general.js";
import {
  restoreAfterLayout,
  scrollTopForReadingPercent,
} from "@/helper/readingProgress";

const route = useRoute();
const store = useGeneral();
const storeText = useText();
const commentStore = useCom();

// Phase 3A: Authentication and highlighting composables
const { user, isAuthenticated } = useAuth();
const { toggle: toggleStudentTools, isOpen: studentToolsOpen } =
  useReaderSidebar();

// Text selection for highlighting
const {
  selection,
  toolbarPosition,
  showToolbar,
  activeHighlight,
  toolbarMode,
  clearSelection,
} = useTextSelection();

// Highlights management
const {
  highlights,
  loading: highlightsLoading,
  highlightsByParagraph,
  fetchHighlights,
  createHighlight,
  updateHighlight,
  deleteHighlight,
} = useHighlights();

// Notes management
const { notes, fetchNotes, createNote, updateNote, deleteNote } = useNotes();

// Visual highlight rendering — applies <mark> overlays to DOM paragraphs
const { renderAllHighlights } = useHighlightRenderer(highlightsByParagraph);

// Reading progress tracking (initialized lazily after chapter loads)
const {
  initForModule: initReadingProgress,
  progress: readingProgress,
  scrollPercent: readingScrollPercent,
  timeSpent: readingTimeSpent,
  saveError: readingSaveError,
  identityVersion: readingIdentityVersion,
  readyIdentityVersion: readyReadingIdentityVersion,
  retrySave: retryReadingProgressSave,
  stopTracking: stopReadingProgress,
} = useReadingProgress();

// References for Supabase chapters (citations system)
const {
  references,
  loading: referencesLoading,
  fetchRefs,
  getReference,
} = useReferences();

// Provide highlights and notes to sidebar tabs (avoids duplicate API calls)
provide("highlights", {
  highlights,
  highlightsByParagraph,
  fetchHighlights,
  createHighlight,
  updateHighlight,
  deleteHighlight,
});
provide("notes", {
  notes,
  fetchNotes,
  createNote,
  updateNote,
  deleteNote,
});
provide("references", {
  references,
  getReference,
});
provide("readingProgress", {
  progress: readingScrollPercent,
  timeSpent: readingTimeSpent,
});

// Route params remain reactive when Vue Router reuses this view instance for
// chapter-to-chapter navigation.
const chapterNumber = computed(() => route.params.number);
const chapterSlug = computed(() => route.params.slug);
const courseId = computed(() => {
  const value = route.query.courseId;
  return Array.isArray(value) ? value[0] || null : value || null;
});

// Computed module ID — all chapters now load from Supabase
const currentModuleId = computed(() => {
  return transformedData.value?.moduleId || null;
});

// All chapters are now Supabase chapters
const isSupabaseChapter = computed(() => true);

// Breadcrumb sections for ReaderTopBar
const breadcrumbSections = computed(() => {
  return (storeText.text?.sections || []).map((s) => ({
    title: s.title,
    slug: toSlug(s.title),
  }));
});

// Chapter title for ReaderTopBar
const chapterTitle = computed(() => storeText.text?.intro?.[0]?.title || "");

// Chapter catalog — used to look up next chapter for the end-of-chapter callout
const { fetchCatalog, nextAfter, findById } = useChapterCatalog();
fetchCatalog();

const nextChapterInfo = computed(() => {
  if (!currentModuleId.value) return null;
  const next = nextAfter(currentModuleId.value);
  if (!next) return null;
  return {
    number: next.order_index,
    slug: next.slug,
    title: next.title,
  };
});

const currentModuleMeta = computed(() =>
  currentModuleId.value ? findById(currentModuleId.value) : null
);

const calloutProgressPercent = computed(() => readingScrollPercent.value);
const calloutTimeSpent = computed(() => readingTimeSpent.value || 0);

watch(
  readingScrollPercent,
  (percent) => {
    // Keep legacy reader consumers on the same document-level percentage as
    // persistence, the dashboard and the Continue Reading card.
    store.progress = percent / 100;
  },
  { immediate: true }
);

// Track if chapter data is loaded
const chapterDataLoaded = ref(false);

// All chapters load from Supabase
const { fetchChapter, transformedData, loading, error } = useChapter();

function nextAnimationFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function waitForImage(image, timeoutMs = 4000) {
  if (image.complete) {
    return image.decode?.().catch(() => {}) || Promise.resolve();
  }

  return new Promise((resolve) => {
    let timeout;
    const finish = () => {
      clearTimeout(timeout);
      image.removeEventListener("load", finish);
      image.removeEventListener("error", finish);
      resolve();
    };

    image.addEventListener("load", finish, { once: true });
    image.addEventListener("error", finish, { once: true });
    timeout = setTimeout(finish, timeoutMs);
  });
}

async function settleChapterContent() {
  await nextTick();
  if (document.fonts?.ready) {
    await document.fonts.ready.catch(() => {});
  }

  const reader = document.querySelector(".chapter-reader");
  const images = Array.from(reader?.querySelectorAll("img") || []);
  await Promise.all(images.map((image) => waitForImage(image)));

  // Fonts and images can trigger more than one layout pass. Require the
  // document height to be stable across consecutive frames before converting
  // a persisted percentage back into a pixel offset.
  let previousHeight = -1;
  let stableFrames = 0;
  for (let frame = 0; frame < 30 && stableFrames < 3; frame += 1) {
    await nextAnimationFrame();
    const height = document.documentElement.scrollHeight;
    stableFrames = height === previousHeight ? stableFrames + 1 : 0;
    previousHeight = height;
  }
}

async function restorePersistedReadingPosition({
  moduleId: expectedModuleId,
  courseId: expectedCourseId,
  identity: expectedIdentity,
}) {
  if (route.query.resume !== "1") return;

  const percent = readingProgress.value?.scroll_position;
  if (!Number.isFinite(Number(percent)) || Number(percent) <= 0) return;

  await restoreAfterLayout({
    waitForLayout: settleChapterContent,
    isCurrent: () =>
      currentModuleId.value === expectedModuleId &&
      courseId.value === expectedCourseId &&
      readingIdentityVersion.value === expectedIdentity &&
      route.query.resume === "1",
    restore: () =>
      window.scrollTo({
        top: scrollTopForReadingPercent(
          percent,
          document.documentElement.scrollHeight,
          window.innerHeight
        ),
        behavior: "auto",
      }),
  });
}

async function initializeChapterExperience() {
  const moduleId = currentModuleId.value;
  if (!moduleId) return;

  await initReadingProgress(moduleId, courseId.value);
}

function clearUserReaderState() {
  highlights.value = [];
  notes.value = [];
  clearSelection();
}

let hydrationRun = 0;
async function hydrateAuthenticatedReader(identity) {
  const run = ++hydrationRun;
  const moduleId = currentModuleId.value;
  const expectedCourseId = courseId.value;
  if (!isAuthenticated.value || !moduleId) return;

  await fetchHighlights();
  if (
    run !== hydrationRun ||
    readingIdentityVersion.value !== identity ||
    currentModuleId.value !== moduleId ||
    !isAuthenticated.value
  )
    return;
  await fetchNotes();
  if (
    run !== hydrationRun ||
    readingIdentityVersion.value !== identity ||
    currentModuleId.value !== moduleId ||
    !isAuthenticated.value
  )
    return;
  await restorePersistedReadingPosition({
    moduleId,
    courseId: expectedCourseId,
    identity,
  });
  await nextTick();
  if (
    run !== hydrationRun ||
    readingIdentityVersion.value !== identity ||
    currentModuleId.value !== moduleId ||
    !isAuthenticated.value
  )
    return;
  renderAllHighlights();
}

watch(readingIdentityVersion, () => {
  hydrationRun += 1;
  clearUserReaderState();
});

watch(
  [readyReadingIdentityVersion, readingIdentityVersion, isAuthenticated],
  ([readyIdentity, identity, authenticated]) => {
    if (!authenticated || readyIdentity !== identity) return;
    void hydrateAuthenticatedReader(identity);
  }
);

// Load chapter data from Supabase by slug
async function loadChapter() {
  const currentNumber = route.params.number;
  const currentSlug = route.params.slug;

  console.log("ChapterView: Loading chapter:", currentNumber, currentSlug);
  chapterDataLoaded.value = false;

  if (!currentSlug) return false;

  // Clear stale localStorage data from a previous chapter: selections and
  // comments are keyed to that chapter's paragraph ids. The cached chapter
  // carries its module slug (useChapter); caches from before it did are
  // cleared unconditionally.
  let storedData = null;
  try {
    storedData = JSON.parse(localStorage.getItem("sections") || "null");
  } catch {
    storedData = null;
  }
  if (storedData && storedData.slug !== currentSlug) {
    localStorage.removeItem("sections");
    localStorage.removeItem("selection");
    localStorage.removeItem("comments");
  }

  // Clear store text for clean state
  storeText.text = null;
  await nextTick();

  // Fetch from Supabase
  const { data, error: fetchError } = await fetchChapter(currentSlug);
  console.log("ChapterView: Fetched data:", data?.intro?.[0]?.title);

  if (data) {
    storeText.updateText("*", data);
    if (typeof document !== "undefined" && data.title) {
      document.title = `The Open Brain – ${data.title}`;
    }
    await nextTick();
    chapterDataLoaded.value = true;
    return true;
  } else if (fetchError) {
    console.error("ChapterView: Failed to load chapter:", fetchError);
  }

  return false;
}

// Computed property to determine if content should be shown
const showContent = computed(() => {
  return (
    !loading.value &&
    !error.value &&
    transformedData.value &&
    chapterDataLoaded.value
  );
});

const chapterNotFound = computed(() => error.value?.includes("not found"));
let chapterExperienceGeneration = 0;

// Load chapter on mount and when route changes
onMounted(async () => {
  const generation = ++chapterExperienceGeneration;
  const loaded = await loadChapter();
  if (generation !== chapterExperienceGeneration) return;
  if (!loaded) return;
  // Fetch references for Supabase chapters (available for all users)
  if (currentModuleId.value) {
    fetchRefs(currentModuleId.value);
  }
  // Track live progress for every reader; authenticated readers also hydrate
  // persistence, highlights and notes.
  if (currentModuleId.value) {
    await initializeChapterExperience();
  }
});

watch(
  () => [route.params.number, route.params.slug, route.query.courseId],
  async () => {
    const generation = ++chapterExperienceGeneration;
    clearUserReaderState();
    void fetchRefs(null);
    // Finalize the previous module while its document is still mounted. Saving
    // after loadChapter() would measure the new chapter against the old ID.
    await stopReadingProgress();
    if (generation !== chapterExperienceGeneration) return;
    const loaded = await loadChapter();
    if (generation !== chapterExperienceGeneration) return;
    // A missing/failed destination has no module to hydrate. useChapter also
    // clears its old refs, so the preceding module cannot leak into this path.
    if (!loaded) {
      await initReadingProgress(null, null);
      return;
    }
    // Fetch references for Supabase chapters
    if (currentModuleId.value) {
      fetchRefs(currentModuleId.value);
    }
    if (currentModuleId.value) {
      await initializeChapterExperience();
    }
  }
);

// Vue keeps the chapter DOM mounted while this guard runs, so the final
// percentage is measured against the document the user actually read. Awaiting
// also ensures navigation cannot tear it down before the save is queued.
onBeforeRouteLeave(async () => {
  await stopReadingProgress();
});

// === Phase 3A: Highlighting System Handlers ===

// Handle creating a highlight from the toolbar
async function handleCreateHighlight({ color, isPublic }) {
  if (!selection.value || !isAuthenticated.value) {
    clearSelection();
    return;
  }

  try {
    await createHighlight({
      paragraphId: selection.value.paragraphId,
      startOffset: selection.value.startOffset,
      endOffset: selection.value.endOffset,
      selectedText: selection.value.text,
      color: color,
      isPublic: isPublic,
    });

    clearSelection();

    // Refresh highlights and re-render visual marks
    if (currentModuleId.value) {
      await fetchHighlights();
      await nextTick();
      renderAllHighlights();
    }
  } catch (err) {
    console.error("ChapterView: Error creating highlight:", err);
    clearSelection();
  }
}

// Handle updating a highlight (color, tags, etc.)
async function handleUpdateHighlight({ id, updates }) {
  if (!isAuthenticated.value) return;

  try {
    await updateHighlight(id, updates);
    if (currentModuleId.value) {
      await fetchHighlights();
      await nextTick();
      renderAllHighlights();
    }
  } catch (err) {
    console.error("ChapterView: Error updating highlight:", err);
  }
}

// Handle saving a note inline from the toolbar
async function handleSaveNote({ highlightId, paragraphId, content }) {
  if (!isAuthenticated.value) return;

  try {
    if (content) {
      await createNote({
        content,
        highlightId,
        paragraphId,
      });
    }
    if (currentModuleId.value) {
      await fetchNotes();
    }
  } catch (err) {
    console.error("ChapterView: Error saving note:", err);
  }
}

// Handle deleting a highlight
async function handleDeleteHighlight(highlightId) {
  try {
    await deleteHighlight(highlightId);
    clearSelection();
    if (currentModuleId.value) {
      await fetchHighlights();
      await nextTick();
      renderAllHighlights();
    }
  } catch (err) {
    console.error("ChapterView: Error deleting highlight:", err);
  }
}
</script>

<template>
  <div class="chapter-reader">
    <!-- Loading state -->
    <div
      v-if="loading"
      class="fixed inset-0 flex items-center justify-center bg-white z-50"
    >
      <div class="text-center">
        <p class="text-lg">Loading Chapter {{ chapterNumber }}...</p>
      </div>
    </div>

    <!-- Error state -->
    <div
      v-if="error"
      class="fixed inset-0 flex items-center justify-center bg-white z-50"
    >
      <div class="text-center max-w-md p-8">
        <p class="text-xl font-bold mb-4">
          {{
            chapterNotFound
              ? "Chapter not found"
              : `Error loading Chapter ${chapterNumber}`
          }}
        </p>
        <p class="text-gray-600 mb-4">{{ error }}</p>
        <RouterLink
          v-if="chapterNotFound"
          to="/chapters"
          class="text-sm underline underline-offset-4"
        >
          Browse available chapters
        </RouterLink>
        <p v-else class="text-sm text-gray-500">
          Make sure:
          <br />1. The seed script has been run in Supabase <br />2. RLS
          policies allow reads (run the RLS fix script) <br />3. Your Supabase
          credentials are correct
        </p>
      </div>
    </div>

    <!-- Chapter content -->
    <template v-if="showContent">
      <!-- Unified Reader Top Bar — shown to all readers (anonymous too).
                 Auth-only panels (Notebook/Chat) handle their own gating. -->
      <ReaderTopBar
        v-if="isSupabaseChapter"
        :chapter-title="chapterTitle"
        :chapter-number="chapterNumber"
        :sections="breadcrumbSections"
        :progress-percent="readingScrollPercent"
        :is-authenticated="isAuthenticated"
      />

      <div v-if="readingSaveError" class="save-error" role="alert">
        <span>{{ readingSaveError }}</span>
        <button type="button" @click="retryReadingProgressSave">Retry</button>
      </div>

      <div
        :class="
          store.isScrolling
            ? 'grayscale opacity-100'
            : 'grayscale-0 duration-300 opacity-0'
        "
        class="pointer-events-none bg-gray-900/20 fixed inset-0 z-[50] duration-Fix"
      ></div>
      <!-- text -->
      <Illustration />
      <EyeStart />
      <Text :key="`chapter-${chapterNumber}-${chapterSlug || 'default'}`">
        <!-- End-of-chapter callout slot (Track 3) — rendered inside
                     TextComp so absolute positioning doesn't pull it to the
                     top of the document. -->
        <template #end-of-chapter>
          <EndOfChapterCallout
            v-if="showContent"
            :chapter-number="chapterNumber"
            :chapter-title="chapterTitle"
            :module-id="currentModuleId"
            :key-takeaways="currentModuleMeta?.key_takeaways || []"
            :highlight-count="highlights?.length || 0"
            :note-count="notes?.length || 0"
            :time-spent-seconds="calloutTimeSpent"
            :progress-percent="calloutProgressPercent"
            :next-chapter="nextChapterInfo"
          />
        </template>
      </Text>

      <FootNotesWindow />
      <Comment v-if="commentStore.activeCom" />

      <MenuTutorial
        class="fixed z-40 bottom-2 right-2 xl:bottom-4 xl:right-6"
        :class="store.imgActive ? 'opacity-0' : ''"
      />

      <!-- Phase 3A: Highlight Toolbar (appears on text selection or highlight click) -->
      <HighlightToolbar
        v-if="isAuthenticated && currentModuleId"
        :visible="showToolbar"
        :position="toolbarPosition"
        :selection="selection"
        :mode="toolbarMode"
        :active-highlight="activeHighlight"
        @highlight="handleCreateHighlight"
        @cancel="clearSelection"
        @update-highlight="handleUpdateHighlight"
        @delete-highlight="handleDeleteHighlight"
        @save-note="handleSaveNote"
      />

      <!-- Citation tooltip for Supabase chapters -->
      <CitationTooltip v-if="isSupabaseChapter" />

      <!-- Student Tools toggle button -->
      <button
        v-if="isAuthenticated && isSupabaseChapter"
        class="student-tools-toggle"
        :class="{ open: studentToolsOpen }"
        @click="toggleStudentTools()"
      >
        <svg
          v-if="!studentToolsOpen"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M7 8h10" />
          <path d="M7 12h4" />
        </svg>
        <CloseIcon v-else :width="16" :height="16" />
        <span>Student Tools</span>
      </button>

      <!-- Unified Reader Sidebar (Supabase chapters only) -->
      <ReaderSidebar
        v-if="isAuthenticated && isSupabaseChapter"
        :module-id="currentModuleId"
        :is-authenticated="isAuthenticated"
      />
    </template>
  </div>
</template>

<script>
export default {
  components: { Comment, FootNotesWindow, MenuTutorial, CitationTooltip },
};
</script>

<style scoped>
.duration-Fix {
  transition: all 0s !important;
  transition-delay: 0;
}

.student-tools-toggle {
  position: fixed;
  bottom: 1.25rem;
  right: 1.25rem;
  z-index: 180;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.125rem;
  border-radius: 12px;
  border: 1.5px solid rgba(0, 0, 0, 0.15);
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
  color: #343434;
  font-family: "IBM Plex Mono", monospace;
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.save-error {
  position: fixed;
  z-index: 210;
  top: calc(var(--reader-topbar-h) + 0.75rem);
  right: 1rem;
  max-width: min(26rem, calc(100vw - 2rem));
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.875rem;
  border: 1px solid rgb(var(--color-warn));
  border-radius: 6px;
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  box-shadow: 0 8px 24px rgb(var(--color-ink) / 0.14);
  font-family: var(--font-ui);
  font-size: var(--type-caption-size);
  line-height: var(--type-caption-lh);
}

.save-error button {
  min-height: 44px;
  padding: 0 0.875rem;
  border: 1px solid rgb(var(--color-ink));
  border-radius: 4px;
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

@media (max-width: 767px) {
  .student-tools-toggle {
    min-height: 44px;
    right: 0.75rem;
    bottom: 0.75rem;
  }

  .save-error {
    left: 0.75rem;
    right: 0.75rem;
  }
}

.student-tools-toggle:hover {
  border-color: rgba(0, 0, 0, 0.3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.student-tools-toggle.open {
  background: rgb(var(--color-paper));
  border-color: rgb(var(--color-accent));
  color: rgb(var(--color-accent));
}
</style>
