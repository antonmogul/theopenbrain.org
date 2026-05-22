<script setup>
import { onMounted, watch, computed, ref, nextTick, provide } from "vue";
import { useRoute } from "vue-router";
import Text from "@/components/chapter/TextComp.vue";
import Illustration from "@/components/chapter/Illus/IllustrationsComp.vue";
import EyeStart from "@/components/chapter/text/EyeStart.vue";

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

const route = useRoute();
const store = useGeneral();
const storeText = useText();
const commentStore = useCom();

// Phase 3A: Authentication and highlighting composables
const { user, isAuthenticated } = useAuth();
const { toggle: toggleStudentTools, isOpen: studentToolsOpen } = useReaderSidebar();

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
    timeSpent: readingTimeSpent,
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

// Extract route params
const chapterNumber = route.params.number;
const chapterSlug = route.params.slug;

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
        number: (next.order_index ?? 0) + 1,
        slug: next.slug,
        title: next.title,
    };
});

const currentModuleMeta = computed(() =>
    currentModuleId.value ? findById(currentModuleId.value) : null
);

const calloutProgressPercent = computed(
    () => readingProgress.value?.scroll_position || 0
);
const calloutTimeSpent = computed(
    () =>
        (readingProgress.value?.time_spent_seconds || 0) +
        (readingTimeSpent.value || 0)
);

// Track if chapter data is loaded
const chapterDataLoaded = ref(false);

// All chapters load from Supabase
const { fetchChapter, transformedData, loading, error } = useChapter();

// Load chapter data from Supabase by slug
async function loadChapter() {
    const currentNumber = route.params.number;
    const currentSlug = route.params.slug;

    console.log("ChapterView: Loading chapter:", currentNumber, currentSlug);
    chapterDataLoaded.value = false;

    if (!currentSlug) return;

    // Clear stale localStorage data from previous chapter
    const storedData = localStorage.getItem("sections")
        ? JSON.parse(localStorage.getItem("sections"))
        : null;
    const storedTitle = storedData?.intro?.[0]?.title;
    const incomingTitle =
        currentSlug === "the-retina" ? "The Retina" : null;
    if (storedTitle && storedTitle !== incomingTitle) {
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
        await nextTick();
        chapterDataLoaded.value = true;
    } else if (fetchError) {
        console.error("ChapterView: Failed to load chapter:", fetchError);
    }
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

// Load chapter on mount and when route changes
onMounted(async () => {
    await loadChapter();
    // Fetch references for Supabase chapters (available for all users)
    if (currentModuleId.value) {
        fetchRefs(currentModuleId.value);
    }
    // Fetch highlights and start tracking for authenticated users on Supabase chapters
    if (isAuthenticated.value && currentModuleId.value) {
        await fetchHighlights();
        await fetchNotes();
        initReadingProgress(currentModuleId.value);
        // Render highlights after DOM has updated with chapter content
        await nextTick();
        renderAllHighlights();
    }
});

watch(
    () => [route.params.number, route.params.slug],
    async () => {
        await loadChapter();
        // Fetch references for Supabase chapters
        if (currentModuleId.value) {
            fetchRefs(currentModuleId.value);
        }
        // Re-fetch highlights when chapter changes
        if (isAuthenticated.value && currentModuleId.value) {
            await fetchHighlights();
            await fetchNotes();
            initReadingProgress(currentModuleId.value);
            await nextTick();
            renderAllHighlights();
        }
    },
);

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
    <div>
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
                    Error loading Chapter {{ chapterNumber }}
                </p>
                <p class="text-gray-600 mb-4">{{ error }}</p>
                <p class="text-sm text-gray-500">
                    Make sure:
                    <br />1. The seed script has been run in Supabase <br />2.
                    RLS policies allow reads (run the RLS fix script) <br />3.
                    Your Supabase credentials are correct
                </p>
            </div>
        </div>

        <!-- Chapter content -->
        <template v-if="showContent">
            <!-- Unified Reader Top Bar (Supabase chapters only) -->
            <ReaderTopBar
                v-if="isAuthenticated && isSupabaseChapter"
                :chapter-title="chapterTitle"
                :chapter-number="chapterNumber"
                :sections="breadcrumbSections"
            />

            <div
                :class="
                    store.isScrolling
                        ? 'backdrop-blur-[0] grayscale	opacity-100'
                        : 'backdrop-blur-[0] graysclae-0 duration-300 opacity-0'
                "
                class="pointer-events-none bg-gray-900/20 fixed w-[200vw] h-[200vh] -top-[0] -left-[0] z-[50] duration-Fix"
            ></div>
            <!-- text -->
            <Illustration />
            <EyeStart />
            <Text
                :key="`chapter-${chapterNumber}-${chapterSlug || 'default'}`"
            />

            <!-- End-of-chapter callout (Track 3) -->
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
                <svg v-if="!studentToolsOpen" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 8h10"/><path d="M7 12h4"/></svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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
    bottom: 2rem;
    right: 2rem;
    z-index: 180;
    display: flex;
    align-items: center;
    gap: 0.8rem;
    padding: 1rem 1.8rem;
    border-radius: 12px;
    border: 1.5px solid rgba(0, 0, 0, 0.15);
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(8px);
    color: #343434;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.1rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.25s ease;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
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
