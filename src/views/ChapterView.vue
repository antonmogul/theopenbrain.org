<script setup>
import { onMounted, watch, computed, ref, nextTick } from "vue";
import { useRoute } from "vue-router";
import Text from "@/components/chapter/TextComp.vue";
import ExportField from "@/components/chapter/ExportField.vue";
import Illustration from "@/components/chapter/Illus/IllustrationsComp.vue";
import EyeStart from "@/components/chapter/text/EyeStart.vue";

import { useGeneral, useText, useCom } from "@/stores";
import ActionButton from "../components/UI/ActionButton.vue";
import Comment from "../components/chapter/text/CommentComp.vue";
import FootNotesWindow from "../components/chapter/text/FootNotesWindow.vue";
import MenuTutorial from "../components/Navigation/MenuTutorial.vue";
import { useChapter } from "@/composables/useChapter";
import jsonText from "@/assets/json_backend/text.json";

// Phase 3A: Highlighting System Components
import HighlightToolbar from "@/components/chapter/HighlightToolbar.vue";
import NoteModal from "@/components/chapter/NoteModal.vue";
import NotesSidebar from "@/components/chapter/NotesSidebar.vue";
import TrendingHighlights from "@/components/chapter/TrendingHighlights.vue";

// Phase 3A: Composables for highlighting
import { useTextSelection } from "@/composables/useTextSelection";
import { useHighlights } from "@/composables/useHighlights";
import { useNotes } from "@/composables/useNotes";
import { useAuth } from "@/composables/useAuth";

const route = useRoute();
const store = useGeneral();
const storeText = useText();
const commentStore = useCom();

// Phase 3A: Authentication and highlighting composables
const { user, isAuthenticated } = useAuth();

// Text selection for highlighting
const { selection, toolbarPosition, showToolbar, clearSelection } =
    useTextSelection();

// Highlights management
const {
    highlights,
    loading: highlightsLoading,
    highlightsByParagraph,
    fetchHighlights,
    createHighlight,
    deleteHighlight,
} = useHighlights();

// Notes management
const { notes, fetchNotes, createNote } = useNotes();

// UI state for highlighting system
const showNotesSidebar = ref(false);
const showNoteModal = ref(false);
const pendingHighlightForNote = ref(null);

// Extract route params
const chapterNumber = route.params.number;
const chapterSlug = route.params.slug;

// Computed module ID for Supabase chapters
const currentModuleId = computed(() => {
    // For Chapter 1 (the-retina), return null or a placeholder
    // For other chapters, we need to get the module ID from the fetched data
    if (chapterSlug === "the-retina") {
        return null;
    }
    return transformedData.value?.moduleId || null;
});

// Track if chapter data is loaded
const chapterDataLoaded = ref(false);

// For Supabase chapters (number > 1)
const { fetchChapter, transformedData, loading, error } = useChapter();

// Load chapter data based on slug (not number)
// 'the-retina' is the only chapter that loads from JSON (legacy)
// All other chapters load from Supabase
async function loadChapter() {
    // Get current route params reactively
    const currentNumber = route.params.number;
    const currentSlug = route.params.slug;

    console.log("ChapterView: Loading chapter:", currentNumber, currentSlug);
    chapterDataLoaded.value = false;

    if (currentSlug === "the-retina") {
        // Chapter 1 "The Retina": Load from JSON (legacy)
        // Clear any previous chapter data from localStorage to prevent conflicts
        const storedData = localStorage.getItem("sections")
            ? JSON.parse(localStorage.getItem("sections"))
            : null;
        const storedTitle = storedData?.intro?.[0]?.title;

        // If stored data is not Chapter 1, clear it
        if (storedTitle && storedTitle !== "The Retina") {
            localStorage.removeItem("sections");
            localStorage.removeItem("selection");
            localStorage.removeItem("comments");
        }

        console.log(
            "ChapterView: Store text before clearing:",
            storeText.text?.intro?.[0]?.title,
        );

        // Clear store text first to ensure clean state (same as Chapter 2+)
        storeText.text = null;
        await nextTick();

        console.log("ChapterView: Loading Chapter 1 from JSON");
        storeText.updateText("*", jsonText);
        await nextTick(); // Wait for reactivity to update
        console.log(
            "ChapterView: Store text after update:",
            storeText.text?.intro?.[0]?.title,
        );
        chapterDataLoaded.value = true;
    } else {
        // Chapter 2+: Load from Supabase
        if (currentSlug) {
            // Clear Chapter 1 data from localStorage when loading Chapter 2+
            const storedData = localStorage.getItem("sections")
                ? JSON.parse(localStorage.getItem("sections"))
                : null;
            const storedTitle = storedData?.intro?.[0]?.title;

            // If stored data is Chapter 1, clear it
            if (storedTitle === "The Retina") {
                console.log(
                    "ChapterView: Clearing Chapter 1 data from localStorage",
                );
                localStorage.removeItem("sections");
                localStorage.removeItem("selection");
                localStorage.removeItem("comments");
            }

            console.log(
                "ChapterView: Store text before fetch:",
                storeText.text?.intro?.[0]?.title,
            );

            // Clear store text first to ensure clean state
            storeText.text = null;
            await nextTick();

            const { data, error: fetchError } = await fetchChapter(currentSlug);
            console.log("ChapterView: Fetched data:", data?.intro?.[0]?.title);

            if (data) {
                console.log("ChapterView: Updating store with new data");
                storeText.updateText("*", data);
                await nextTick(); // Wait for reactivity to update
                console.log(
                    "ChapterView: Store text after update:",
                    storeText.text?.intro?.[0]?.title,
                );
                chapterDataLoaded.value = true;
            } else if (fetchError) {
                console.error(
                    "ChapterView: Failed to load chapter:",
                    fetchError,
                );
            }
        }
    }
}

// Computed property to determine if content should be shown
const showContent = computed(() => {
    if (chapterNumber === "1") {
        return chapterDataLoaded.value;
    } else {
        return (
            !loading.value &&
            !error.value &&
            transformedData.value &&
            chapterDataLoaded.value
        );
    }
});

// Load chapter on mount and when route changes
onMounted(async () => {
    await loadChapter();
    // Fetch highlights for authenticated users on Supabase chapters
    if (isAuthenticated.value && currentModuleId.value) {
        await fetchHighlights();
        await fetchNotes({ moduleId: currentModuleId.value });
    }
});

watch(
    () => [route.params.number, route.params.slug],
    async () => {
        await loadChapter();
        // Re-fetch highlights when chapter changes
        if (isAuthenticated.value && currentModuleId.value) {
            await fetchHighlights();
            await fetchNotes({ moduleId: currentModuleId.value });
        }
    },
);

// === Phase 3A: Highlighting System Handlers ===

// Handle creating a highlight from the toolbar
async function handleCreateHighlight({ color, isPublic, withNote }) {
    if (!selection.value || !isAuthenticated.value) {
        clearSelection();
        return;
    }

    try {
        const newHighlight = await createHighlight({
            paragraphId: selection.value.paragraphId,
            startOffset: selection.value.startOffset,
            endOffset: selection.value.endOffset,
            selectedText: selection.value.text,
            color: color,
            isPublic: isPublic,
            moduleId: currentModuleId.value,
        });

        // If user wants to add a note, show the modal
        if (withNote && newHighlight) {
            pendingHighlightForNote.value = {
                ...newHighlight,
                selectedText: selection.value.text,
            };
            showNoteModal.value = true;
        }

        clearSelection();

        // Refresh highlights to update the display
        if (currentModuleId.value) {
            await fetchHighlights();
        }
    } catch (err) {
        console.error("ChapterView: Error creating highlight:", err);
        clearSelection();
    }
}

// Handle saving a note from the note modal
async function handleSaveNote(noteContent) {
    if (!pendingHighlightForNote.value || !isAuthenticated.value) {
        showNoteModal.value = false;
        pendingHighlightForNote.value = null;
        return;
    }

    try {
        await createNote({
            content: noteContent,
            highlightId: pendingHighlightForNote.value.id,
            paragraphId: pendingHighlightForNote.value.paragraph_id,
            moduleId: currentModuleId.value,
        });

        showNoteModal.value = false;
        pendingHighlightForNote.value = null;

        // Refresh notes
        if (currentModuleId.value) {
            await fetchNotes({ moduleId: currentModuleId.value });
        }
    } catch (err) {
        console.error("ChapterView: Error creating note:", err);
    }
}

// Handle closing the note modal
function handleCancelNoteModal() {
    showNoteModal.value = false;
    pendingHighlightForNote.value = null;
}

// Handle deleting a highlight
async function handleDeleteHighlight(highlightId) {
    try {
        await deleteHighlight(highlightId);
        if (currentModuleId.value) {
            await fetchHighlights();
        }
    } catch (err) {
        console.error("ChapterView: Error deleting highlight:", err);
    }
}

// Toggle notes sidebar
function toggleNotesSidebar() {
    showNotesSidebar.value = !showNotesSidebar.value;
}
</script>

<template>
    <div>
        <!-- Loading state for Supabase chapters -->
        <div
            v-if="chapterNumber !== '1' && loading"
            class="fixed inset-0 flex items-center justify-center bg-white z-50"
        >
            <div class="text-center">
                <p class="text-lg">Loading Chapter {{ chapterNumber }}...</p>
            </div>
        </div>

        <!-- Error state for Supabase chapters -->
        <div
            v-if="chapterNumber !== '1' && error"
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
            <FootNotesWindow />
            <Comment v-if="commentStore.activeCom" />

            <div
                class="fixed z-40 bottom-4 right-6 flex gap-2 justify-end items-end w-full pointer-events-none"
                :class="store.imgActive ? 'opacity-0' : ''"
            >
                <MenuTutorial class="pointer-events-auto" />
                <ActionButton
                    class="pointer-events-auto"
                    :text="'Clear'"
                    :help="helpClear"
                    @action="storeText.clearTextMarking()"
                />
                <ActionButton
                    class="pointer-events-auto"
                    :text="'Export'"
                    :help="helpExport"
                    @action="storeText.saveLocalstorage()"
                />
                <ActionButton
                    class="pointer-events-auto"
                    :text="'Import'"
                    :help="helpImport"
                    @action="store.toggleImport()"
                />
            </div>
            <ExportField />

            <!-- Phase 3A: Highlighting System Components -->

            <!-- Highlight Toolbar (appears on text selection) -->
            <HighlightToolbar
                v-if="isAuthenticated && currentModuleId"
                :visible="showToolbar"
                :position="toolbarPosition"
                :selection="selection"
                @highlight="handleCreateHighlight"
                @cancel="clearSelection"
            />

            <!-- Notes Sidebar -->
            <NotesSidebar
                :is-open="showNotesSidebar && isAuthenticated"
                :module-id="currentModuleId"
                @close="showNotesSidebar = false"
            />

            <!-- Note Modal (for adding notes to highlights) -->
            <NoteModal
                :visible="showNoteModal"
                :highlight="pendingHighlightForNote"
                @save="handleSaveNote"
                @cancel="handleCancelNoteModal"
            />

            <!-- Trending Highlights (fixed position, right side) -->
            <TrendingHighlights
                v-if="isAuthenticated && currentModuleId"
                :module-id="currentModuleId"
                class="fixed right-4 top-24 w-72 max-h-[60vh] overflow-y-auto z-30 hidden xl:block"
            />

            <!-- Notes Toggle Button -->
            <button
                v-if="isAuthenticated && currentModuleId"
                @click="toggleNotesSidebar"
                data-testid="notes-toggle"
                class="fixed right-4 bottom-24 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-all z-40"
                :class="{ 'ring-2 ring-blue-300': showNotesSidebar }"
                title="Toggle Notes"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path
                        d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5"
                    ></path>
                    <path
                        d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                    ></path>
                </svg>
            </button>
        </template>
    </div>
</template>

<script>
export default { components: { Comment, FootNotesWindow, MenuTutorial } };
const helpClear =
    "Clear will <strong>delete all</strong> your personal markings and comments. If you did not export them befor they will be gone.";
const helpExport =
    "Export will export the whole text, with your comments and markings from your local storage as a json-file. This can be then be imported on to an other computer or an other browser.";
const helpImport =
    "Here you can import a previously exported json-file. This will <strong>delete all</strong> your personal markings and comments currently in your local storage.";
</script>

<style scoped>
.duration-Fix {
    transition: all 0s !important;
    transition-delay: 0;
}
</style>
