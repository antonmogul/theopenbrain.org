<script setup>
// Creator dashboard — reskinned to the unified token design (sub-project D).
// Adopts DashboardShell (accent=magenta, the default) + the shared component
// library. All fetch/CRUD/wizard logic is preserved verbatim; supabaseRest is
// kept local. Only chrome/markup changed. The abandoned DashboardViewRefactored
// stays dead code — this is the live monolith, reskinned in place.
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { useAuth } from "@/composables/useAuth";
import { useRouter, useRoute } from "vue-router";
import { relativeLong as formatDate } from "@/utils/format";
import TipTapEditor from "@/components/Editor/TipTapEditor.vue";

// Shared dashboard library (token-based)
import {
    DashboardShell,
    SectionHeader,
    BaseCard,
    StatCard,
    StatGrid,
    ListRow,
    StatusBadge,
    EmptyState,
    LoadingState,
    ErrorState,
    BaseModal,
    Button,
    SearchInput,
    FilterChips,
    SegmentedControl,
    FormField,
} from "@/components/dashboard/shared";

// Wizard step components
import WizardStepMeta from "@/components/dashboard/chapters/WizardStepMeta.vue";
import WizardStepImport from "@/components/dashboard/chapters/WizardStepImport.vue";
import WizardStepStructure from "@/components/dashboard/chapters/WizardStepStructure.vue";
import WizardStepReview from "@/components/dashboard/chapters/WizardStepReview.vue";

// Wizard API functions
import {
    createChapter as apiCreateChapter,
    createSection as apiCreateSection,
    createParagraph as apiCreateParagraph,
    createReference as apiCreateReference,
    fetchChapters as apiFetchChapters,
} from "@/services/api/chapters";
import {
    fetchVersions as apiFetchVersions,
    createVersion as apiCreateVersion,
} from "@/services/api/versions";

const router = useRouter();
const route = useRoute();
const {
    user,
    profile,
    loading,
    profileLoading,
    isAuthenticated,
    userRole,
    isCreator,
    isProfessor,
    isStudent,
    signOut,
    session,
} = useAuth();

// Supabase REST API config
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY;

async function supabaseRest(endpoint, options = {}) {
    const { headers: optionHeaders, ...restOptions } = options;

    const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
        ...restOptions,
        headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${session.value?.access_token || supabaseKey}`,
            "Content-Type": "application/json",
            ...optionHeaders,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    if (options.method === "PATCH" || options.method === "DELETE") {
        return { success: true };
    }

    return response.json();
}

// Current active section in sidebar
const activeSection = ref("dashboard");

// Mobile sidebar toggle
const sidebarOpen = ref(false);

// Dashboard home loading state
const dashboardLoading = ref(true);

// Navigation items for Creator role
const creatorNavItems = [
    { id: "dashboard", label: "Dashboard", icon: "grid" },
    { id: "chapters", label: "Chapters", icon: "book" },
    { id: "versions", label: "Versions", icon: "layers" },
    { id: "media", label: "Media", icon: "image" },
    { id: "quizzes", label: "Quizzes", icon: "quiz" },
    { id: "users", label: "Users", icon: "users" },
    { id: "analytics", label: "Analytics", icon: "chart" },
];

// Filter/segmented-control option sets (shared components)
const mediaFilterOptions = [
    { value: "all", label: "All types" },
    { value: "lottie", label: "Lottie" },
    { value: "video", label: "Video" },
    { value: "image", label: "Image" },
    { value: "youtube", label: "YouTube" },
];
const usersFilterOptions = [
    { value: "all", label: "All" },
    { value: "creator", label: "Creators" },
    { value: "professor", label: "Professors" },
    { value: "student", label: "Students" },
];
const analyticsRangeOptions = [
    { value: "7days", label: "7 days" },
    { value: "30days", label: "30 days" },
    { value: "90days", label: "90 days" },
];
const roleSelectOptions = [
    { value: "student", label: "Student" },
    { value: "professor", label: "Professor" },
    { value: "creator", label: "Creator" },
];

// ============ CHAPTERS SECTION STATE ============
const chapters = ref([]);
const chaptersLoading = ref(false);
const chaptersError = ref(null);
const expandedChapterId = ref(null);

// Expanded chapter content
const expandedChapterSections = ref([]);
const expandedChapterParagraphs = ref([]);
const flatBlocks = ref([]);

// Editor state
const selectedBlock = ref(null);
const editorContent = ref("");
const saving = ref(false);
const saveStatus = ref("");

// Scroll sync
const highlightedBlockId = ref(null);
const contentPreviewRef = ref(null);

// Drag and drop
const draggedBlockId = ref(null);
const dragOverBlockId = ref(null);

// ============ VERSIONS SECTION STATE ============
const versions = ref([]);
const versionsLoading = ref(false);
const versionsError = ref(null);
const showNewVersionModal = ref(false);
const newVersionForm = ref({
    version_number: "",
    release_notes: "",
});
const editingVersion = ref(null);

// ============ MEDIA SECTION STATE ============
const mediaItems = ref([]);
const mediaLoading = ref(false);
const mediaError = ref(null);
const mediaFilter = ref("all"); // all, lottie, video, image, youtube
const mediaSearch = ref("");
const selectedMedia = ref(null);
const showMediaUploadModal = ref(false);

// ============ MEDIA PICKER (for attaching to content blocks) ============
const showMediaPicker = ref(false);
const mediaPickerTarget = ref(null); // the block we're attaching media to
const mediaPickerSearch = ref("");

const mediaPickerFiltered = computed(() => {
    if (!mediaPickerSearch.value) return mediaItems.value;
    const q = mediaPickerSearch.value.toLowerCase();
    return mediaItems.value.filter(
        (m) =>
            (m.title || "").toLowerCase().includes(q) ||
            (m.animation_key || "").toLowerCase().includes(q),
    );
});

function openMediaPicker(block) {
    mediaPickerTarget.value = block;
    mediaPickerSearch.value = "";
    showMediaPicker.value = true;
    // Ensure media is loaded
    if (mediaItems.value.length === 0) fetchMedia();
}

async function attachMedia(animation) {
    if (!mediaPickerTarget.value) return;
    const blockId = mediaPickerTarget.value.id;
    const trigger = animation.animation_key.replace("animation", "");
    try {
        await supabaseRest(`paragraphs?id=eq.${blockId}`, {
            method: "PATCH",
            body: JSON.stringify({
                animation_id: animation.id,
                animation_trigger: trigger,
            }),
        });
        // Update local state
        mediaPickerTarget.value.animationId = animation.id;
        mediaPickerTarget.value.animationTrigger = trigger;
        mediaPickerTarget.value.animationTitle = animation.title || animation.animation_key;
        showMediaPicker.value = false;
        mediaPickerTarget.value = null;
    } catch (err) {
        console.error("Error attaching media:", err);
    }
}

async function detachMedia(block) {
    try {
        await supabaseRest(`paragraphs?id=eq.${block.id}`, {
            method: "PATCH",
            body: JSON.stringify({
                animation_id: null,
                animation_trigger: null,
            }),
        });
        block.animationId = null;
        block.animationTrigger = null;
        block.animationTitle = null;
    } catch (err) {
        console.error("Error detaching media:", err);
    }
}

// ============ USERS SECTION STATE ============
const users = ref([]);
const usersLoading = ref(false);
const usersError = ref(null);
const usersFilter = ref("all"); // all, creator, professor, student
const usersSearch = ref("");
const usersPage = ref(1);
const usersPerPage = 20;
const usersTotalCount = ref(0);
const selectedUser = ref(null);

// ============ ANALYTICS SECTION STATE ============
const analyticsLoading = ref(false);
const analyticsError = ref(null);
const analyticsDateRange = ref("7days"); // 7days, 30days, 90days
const analyticsMetrics = ref({
    activeUsers: 0,
    totalPageViews: 0,
    avgTimeOnContent: 0,
    quizCompletionRate: 0,
});
const analyticsChartData = ref({
    labels: [],
    datasets: [],
});
const contentPerformance = ref([]);
const quizPerformance = ref([]);
const trendingHighlights = ref([]);
const userRoleBreakdown = ref({ creators: 0, professors: 0, students: 0 });

// ============ QUIZZES SECTION STATE ============
const quizzes = ref([]);
const quizzesLoading = ref(false);
const quizzesError = ref(null);
const showQuizEditor = ref(false);
const editingQuiz = ref(null);
const quizForm = ref({
    title: "",
    description: "",
    module_id: null,
    section_id: null,
    time_limit_minutes: 15,
    passing_score: 70,
    allow_multiple_attempts: true,
    show_correct_answers: true,
    questions: [],
});
const showQuestionEditor = ref(false);
const editingQuestion = ref(null);
const questionForm = ref({
    question_text: "",
    question_type: "multiple_choice",
    options: ["", "", "", ""],
    correct_answer: "",
    points: 1,
});

// ============ FETCH ALL CHAPTERS ============
async function fetchAllChapters() {
    chaptersLoading.value = true;
    chaptersError.value = null;

    try {
        // Fetch all modules (chapters)
        const modules = await supabaseRest(
            "modules?select=id,title,slug,order_index,status,updated_at&order=order_index.asc",
        );

        // For each module, fetch section and paragraph counts
        const chaptersWithStats = await Promise.all(
            modules.map(async (mod) => {
                const sections = await supabaseRest(
                    `sections?module_id=eq.${mod.id}&select=id`,
                );
                const sectionIds = sections.map((s) => s.id);

                let paragraphCount = 0;
                let wordCount = 0;

                if (sectionIds.length > 0) {
                    const idsParam = sectionIds
                        .map((id) => `"${id}"`)
                        .join(",");
                    const paragraphs = await supabaseRest(
                        `paragraphs?section_id=in.(${idsParam})&select=id,content_text`,
                    );
                    paragraphCount = paragraphs.length;
                    wordCount = paragraphs.reduce((sum, p) => {
                        const text = p.content_text || "";
                        return sum + text.split(/\s+/).filter(Boolean).length;
                    }, 0);
                }

                return {
                    ...mod,
                    sectionCount: sections.length,
                    paragraphCount,
                    wordCount,
                    readingTime: Math.ceil(wordCount / 200),
                };
            }),
        );

        chapters.value = chaptersWithStats;
    } catch (err) {
        console.error("Error fetching chapters:", err);
        chaptersError.value = err.message;
    } finally {
        chaptersLoading.value = false;
    }
}

// ============ EXPAND/COLLAPSE CHAPTER ============
async function toggleChapter(chapterId) {
    if (expandedChapterId.value === chapterId) {
        // Collapse
        expandedChapterId.value = null;
        expandedChapterSections.value = [];
        expandedChapterParagraphs.value = [];
        flatBlocks.value = [];
        selectedBlock.value = null;
        return;
    }

    // Expand new chapter
    expandedChapterId.value = chapterId;
    selectedBlock.value = null;
    await fetchChapterContent(chapterId);
}

async function fetchChapterContent(moduleId) {
    try {
        // Fetch sections
        const sections = await supabaseRest(
            `sections?module_id=eq.${moduleId}&select=id,title,slug,order_index&order=order_index.asc`,
        );
        expandedChapterSections.value = sections;

        // Fetch paragraphs
        const sectionIds = sections.map((s) => s.id);
        let paragraphs = [];

        if (sectionIds.length > 0) {
            const idsParam = sectionIds.map((id) => `"${id}"`).join(",");
            paragraphs = await supabaseRest(
                `paragraphs?section_id=in.(${idsParam})&select=id,order_index,content,content_text,section_id,is_subsection_header,animation_id,animation_trigger&order=order_index.asc`,
            );
        }
        expandedChapterParagraphs.value = paragraphs;

        // Build flat blocks list
        buildFlatBlocks();
    } catch (err) {
        console.error("Error fetching chapter content:", err);
    }
}

function buildFlatBlocks() {
    const blocks = [];

    expandedChapterSections.value.forEach((section, sectionIndex) => {
        // Add section as a block
        blocks.push({
            type: "section",
            id: section.id,
            title: section.title,
            slug: section.slug,
            depth: 0,
            sectionId: section.id,
            sectionIndex: sectionIndex,
            orderIndex: section.order_index,
        });

        // Add paragraphs for this section
        const sectionParagraphs = expandedChapterParagraphs.value
            .filter((p) => p.section_id === section.id)
            .sort((a, b) => a.order_index - b.order_index);

        sectionParagraphs.forEach((p, paraIndex) => {
            const wordCount = (p.content_text || "")
                .split(/\s+/)
                .filter(Boolean).length;
            // Convert JSONB blocks to HTML for preview
            const jsonBlocks = p.content?.blocks || [];
            const htmlContent = blocksToHtml(jsonBlocks);
            blocks.push({
                type: "paragraph",
                id: p.id,
                content: p.content,
                contentText: p.content_text,
                htmlContent: htmlContent,
                preview: getBlockPreview(p),
                depth: 1,
                sectionId: section.id,
                sectionTitle: section.title,
                orderIndex: p.order_index,
                paraIndex: paraIndex,
                isSubsectionHeader: p.is_subsection_header,
                wordCount: wordCount,
                animationId: p.animation_id || null,
                animationTrigger: p.animation_trigger || null,
                animationTitle: p.animation_id
                    ? (mediaItems.value.find(m => m.id === p.animation_id)?.title ||
                       mediaItems.value.find(m => m.id === p.animation_id)?.animation_key ||
                       p.animation_trigger || 'Media')
                    : null,
            });
        });
    });

    flatBlocks.value = blocks;
    console.log("Built flat blocks:", blocks.length, "items");
}

function getBlockPreview(paragraph) {
    // Get first 60 chars of content text
    const text = paragraph.content_text || "";
    const stripped = text.replace(/<[^>]*>/g, "").trim();
    return stripped.length > 60 ? stripped.slice(0, 60) + "..." : stripped;
}

// ============ BLOCK SELECTION & EDITING ============
function selectBlock(block) {
    if (block.type === "section") return; // Sections not editable

    selectedBlock.value = block;
    saveStatus.value = "";

    // Convert JSONB blocks to HTML
    const blocks = block.content?.blocks || [];
    editorContent.value = blocksToHtml(blocks);
}

function clearSelection() {
    selectedBlock.value = null;
    editorContent.value = "";
    saveStatus.value = "";
}

// Convert JSONB blocks to HTML (from EditorView pattern)
function blocksToHtml(blocks) {
    if (!blocks || !Array.isArray(blocks)) return "";

    return blocks
        .map((block) => {
            switch (block.type) {
                case "heading":
                    const level = block.level || 2;
                    return `<h${level}>${block.content || ""}</h${level}>`;
                case "paragraph":
                case "text":
                    return `<p>${block.content || ""}</p>`;
                case "list":
                    const items = (block.items || [])
                        .map((item) => `<li>${item}</li>`)
                        .join("");
                    return block.ordered
                        ? `<ol>${items}</ol>`
                        : `<ul>${items}</ul>`;
                case "blockquote":
                    return `<blockquote><p>${block.content || ""}</p></blockquote>`;
                case "code":
                    return `<pre><code>${block.content || ""}</code></pre>`;
                case "image":
                    return `<img src="${block.src || ""}" alt="${block.alt || ""}" />`;
                default:
                    return `<p>${block.content || ""}</p>`;
            }
        })
        .join("\n");
}

// Convert HTML back to JSONB blocks
function htmlToBlocks(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const blocks = [];

    doc.body.childNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase();

            if (tagName.match(/^h[1-6]$/)) {
                blocks.push({
                    type: "heading",
                    level: parseInt(tagName[1]),
                    content: node.textContent,
                });
            } else if (tagName === "p") {
                blocks.push({
                    type: "paragraph",
                    content: node.innerHTML,
                });
            } else if (tagName === "ul") {
                blocks.push({
                    type: "list",
                    ordered: false,
                    items: Array.from(node.querySelectorAll("li")).map(
                        (li) => li.textContent,
                    ),
                });
            } else if (tagName === "ol") {
                blocks.push({
                    type: "list",
                    ordered: true,
                    items: Array.from(node.querySelectorAll("li")).map(
                        (li) => li.textContent,
                    ),
                });
            } else if (tagName === "blockquote") {
                blocks.push({
                    type: "blockquote",
                    content: node.textContent,
                });
            } else if (tagName === "pre") {
                blocks.push({
                    type: "code",
                    content: node.textContent,
                });
            } else if (tagName === "img") {
                blocks.push({
                    type: "image",
                    src: node.getAttribute("src"),
                    alt: node.getAttribute("alt") || "",
                });
            }
        }
    });

    return blocks;
}

// ============ SAVE BLOCK ============
async function saveBlock() {
    if (!selectedBlock.value) return;

    saving.value = true;
    saveStatus.value = "";

    try {
        const blocks = htmlToBlocks(editorContent.value);
        const contentText = blocks
            .map((b) => b.content || b.items?.join(" ") || "")
            .join(" ")
            .replace(/<[^>]*>/g, "");

        await supabaseRest(`paragraphs?id=eq.${selectedBlock.value.id}`, {
            method: "PATCH",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({
                content: { blocks },
                content_text: contentText,
                updated_at: new Date().toISOString(),
            }),
        });

        saveStatus.value = "Saved!";

        // Update local state
        selectedBlock.value.content = { blocks };
        selectedBlock.value.contentText = contentText;
        selectedBlock.value.preview = getBlockPreview({
            content_text: contentText,
        });

        // Refresh the expanded chapter
        await fetchChapterContent(expandedChapterId.value);

        // Re-select the block to update preview
        const updatedBlock = flatBlocks.value.find(
            (b) => b.id === selectedBlock.value.id,
        );
        if (updatedBlock) {
            selectedBlock.value = updatedBlock;
        }

        // Refresh chapter stats
        await fetchAllChapters();
    } catch (err) {
        console.error("Error saving block:", err);
        saveStatus.value = "Error: " + err.message;
    } finally {
        saving.value = false;
    }
}

// ============ DRAG AND DROP ============
function handleDragStart(e, block) {
    if (block.type === "section") return;
    draggedBlockId.value = block.id;
    e.dataTransfer.effectAllowed = "move";
}

function handleDragOver(e, block) {
    e.preventDefault();
    if (block.type === "section") return;
    if (draggedBlockId.value && draggedBlockId.value !== block.id) {
        dragOverBlockId.value = block.id;
    }
}

function handleDragLeave() {
    dragOverBlockId.value = null;
}

async function handleDrop(e, targetBlock) {
    e.preventDefault();

    if (!draggedBlockId.value || targetBlock.type === "section") {
        draggedBlockId.value = null;
        dragOverBlockId.value = null;
        return;
    }

    const draggedBlock = flatBlocks.value.find(
        (b) => b.id === draggedBlockId.value,
    );

    if (!draggedBlock || draggedBlock.sectionId !== targetBlock.sectionId) {
        // Only allow reordering within same section for now
        draggedBlockId.value = null;
        dragOverBlockId.value = null;
        return;
    }

    // Calculate new order
    const sectionBlocks = flatBlocks.value
        .filter(
            (b) =>
                b.type === "paragraph" && b.sectionId === targetBlock.sectionId,
        )
        .sort((a, b) => a.orderIndex - b.orderIndex);

    const draggedIndex = sectionBlocks.findIndex(
        (b) => b.id === draggedBlock.id,
    );
    const targetIndex = sectionBlocks.findIndex((b) => b.id === targetBlock.id);

    if (draggedIndex === targetIndex) {
        draggedBlockId.value = null;
        dragOverBlockId.value = null;
        return;
    }

    // Reorder in array
    sectionBlocks.splice(draggedIndex, 1);
    sectionBlocks.splice(targetIndex, 0, draggedBlock);

    // Update order_index for all affected blocks
    try {
        for (let i = 0; i < sectionBlocks.length; i++) {
            if (sectionBlocks[i].orderIndex !== i) {
                await supabaseRest(`paragraphs?id=eq.${sectionBlocks[i].id}`, {
                    method: "PATCH",
                    headers: { Prefer: "return=minimal" },
                    body: JSON.stringify({
                        order_index: i,
                        updated_at: new Date().toISOString(),
                    }),
                });
            }
        }

        // Refresh content
        await fetchChapterContent(expandedChapterId.value);
    } catch (err) {
        console.error("Error reordering blocks:", err);
    }

    draggedBlockId.value = null;
    dragOverBlockId.value = null;
}

function handleDragEnd() {
    draggedBlockId.value = null;
    dragOverBlockId.value = null;
}

// ============ SCROLL SYNC ============
function setupScrollObserver() {
    if (!contentPreviewRef.value) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    highlightedBlockId.value =
                        entry.target.dataset.blockId || null;
                }
            });
        },
        {
            root: contentPreviewRef.value,
            threshold: 0.5,
        },
    );

    // Observe all block elements
    nextTick(() => {
        const blockElements =
            contentPreviewRef.value?.querySelectorAll("[data-block-id]");
        blockElements?.forEach((el) => observer.observe(el));
    });

    return observer;
}

// ============ COMPUTED ============
const expandedChapter = computed(() => {
    return chapters.value.find((c) => c.id === expandedChapterId.value);
});

const chapterStats = computed(() => {
    if (!expandedChapter.value) return null;

    const sectionCount = expandedChapterSections.value.length;
    const paragraphCount = flatBlocks.value.filter(
        (b) => b.type === "paragraph",
    ).length;
    const wordCount = expandedChapterParagraphs.value.reduce((sum, p) => {
        const text = p.content_text || "";
        return sum + text.split(/\s+/).filter(Boolean).length;
    }, 0);

    return {
        sections: sectionCount,
        paragraphs: paragraphCount,
        words: wordCount,
        readingTime: Math.ceil(wordCount / 200),
    };
});

// ============ VERSIONS FUNCTIONS ============
async function fetchVersions() {
    versionsLoading.value = true;
    versionsError.value = null;

    try {
        const data = await supabaseRest(
            "content_versions?select=*&order=created_at.desc",
        );

        // Get module counts for each version
        const versionsWithCounts = await Promise.all(
            data.map(async (version) => {
                const modules = await supabaseRest(
                    `modules?content_version_id=eq.${version.id}&select=id`,
                );
                return {
                    ...version,
                    moduleCount: modules.length,
                };
            }),
        );

        versions.value = versionsWithCounts;
    } catch (err) {
        console.error("Error fetching versions:", err);
        versionsError.value = err.message;
    } finally {
        versionsLoading.value = false;
    }
}

async function createVersion() {
    if (!newVersionForm.value.version_number) return;

    try {
        await supabaseRest("content_versions", {
            method: "POST",
            body: JSON.stringify({
                version_number: newVersionForm.value.version_number,
                release_notes: newVersionForm.value.release_notes,
                status: "draft",
                created_by: profile.value?.id,
            }),
        });

        showNewVersionModal.value = false;
        newVersionForm.value = { version_number: "", release_notes: "" };
        await fetchVersions();
    } catch (err) {
        console.error("Error creating version:", err);
        alert("Failed to create version: " + err.message);
    }
}

async function updateVersionStatus(versionId, status) {
    try {
        const updates = { status };
        if (status === "published") {
            updates.published_at = new Date().toISOString();
        }

        await supabaseRest(`content_versions?id=eq.${versionId}`, {
            method: "PATCH",
            body: JSON.stringify(updates),
        });

        await fetchVersions();
    } catch (err) {
        console.error("Error updating version:", err);
        alert("Failed to update version: " + err.message);
    }
}

async function deleteVersion(versionId) {
    if (!confirm("Are you sure you want to delete this version?")) return;

    try {
        await supabaseRest(`content_versions?id=eq.${versionId}`, {
            method: "DELETE",
        });
        await fetchVersions();
    } catch (err) {
        console.error("Error deleting version:", err);
        alert("Failed to delete version: " + err.message);
    }
}

// ============ MEDIA FUNCTIONS ============
async function fetchMedia() {
    mediaLoading.value = true;
    mediaError.value = null;

    try {
        let endpoint = "animations?select=*&order=media_type,title";

        if (mediaFilter.value !== "all") {
            endpoint += `&media_type=eq.${mediaFilter.value}`;
        }

        const data = await supabaseRest(endpoint);
        mediaItems.value = data;
    } catch (err) {
        console.error("Error fetching media:", err);
        mediaError.value = err.message;
    } finally {
        mediaLoading.value = false;
    }
}

const filteredMedia = computed(() => {
    if (!mediaSearch.value) return mediaItems.value;
    const search = mediaSearch.value.toLowerCase();
    return mediaItems.value.filter(
        (item) =>
            item.title?.toLowerCase().includes(search) ||
            item.animation_key?.toLowerCase().includes(search) ||
            item.description?.toLowerCase().includes(search),
    );
});

const mediaByType = computed(() => {
    const groups = {
        lottie: [],
        video: [],
        image: [],
        youtube: [],
        gsap: [],
        css: [],
    };

    filteredMedia.value.forEach((item) => {
        const type = item.media_type || "other";
        if (groups[type]) {
            groups[type].push(item);
        }
    });

    return groups;
});

async function selectMedia(item) {
    selectedMedia.value = item;

    // Load Lottie preview for lottie items
    if (item.media_type === 'lottie' && item.lottie_file_url) {
        await nextTick();
        const container = document.getElementById('lottie-preview-' + item.id);
        if (container) {
            container.innerHTML = '';
            try {
                const lottieModule = await import('lottie-web');
                const lottie = lottieModule.default;
                lottie.loadAnimation({
                    container,
                    renderer: 'svg',
                    loop: true,
                    autoplay: true,
                    path: item.lottie_file_url,
                });
            } catch (err) {
                console.error('Failed to load lottie preview:', err);
                container.innerHTML = '<p style="color: rgb(var(--color-mute)); text-align: center; padding: 2rem;">Failed to load animation</p>';
            }
        }
    }
}

async function deleteMedia(mediaId) {
    if (!confirm("Are you sure you want to delete this media asset?")) return;

    try {
        await supabaseRest(`animations?id=eq.${mediaId}`, {
            method: "DELETE",
        });
        selectedMedia.value = null;
        await fetchMedia();
    } catch (err) {
        console.error("Error deleting media:", err);
        alert("Failed to delete media: " + err.message);
    }
}

function formatFileSize(bytes) {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// ============ USERS FUNCTIONS ============
async function fetchUsers() {
    usersLoading.value = true;
    usersError.value = null;

    try {
        let endpoint = `profiles?select=*&order=created_at.desc&limit=${usersPerPage}&offset=${(usersPage.value - 1) * usersPerPage}`;

        if (usersFilter.value !== "all") {
            endpoint += `&role=eq.${usersFilter.value}`;
        }

        if (usersSearch.value) {
            endpoint += `&or=(full_name.ilike.*${usersSearch.value}*,email.ilike.*${usersSearch.value}*)`;
        }

        const data = await supabaseRest(endpoint);
        users.value = data;

        // Get total count
        let countEndpoint = "profiles?select=id";
        if (usersFilter.value !== "all") {
            countEndpoint += `&role=eq.${usersFilter.value}`;
        }
        const countData = await supabaseRest(countEndpoint);
        usersTotalCount.value = countData.length;

        // Get role breakdown
        const allProfiles = await supabaseRest("profiles?select=role");
        userRoleBreakdown.value = {
            creators: allProfiles.filter((p) => p.role === "creator").length,
            professors: allProfiles.filter((p) => p.role === "professor")
                .length,
            students: allProfiles.filter((p) => p.role === "student").length,
        };
    } catch (err) {
        console.error("Error fetching users:", err);
        usersError.value = err.message;
    } finally {
        usersLoading.value = false;
    }
}

const usersTotalPages = computed(() => {
    return Math.ceil(usersTotalCount.value / usersPerPage);
});

function nextUsersPage() {
    if (usersPage.value < usersTotalPages.value) {
        usersPage.value++;
        fetchUsers();
    }
}

function prevUsersPage() {
    if (usersPage.value > 1) {
        usersPage.value--;
        fetchUsers();
    }
}

function selectUser(user) {
    selectedUser.value = user;
}

async function updateUserRole(userId, newRole) {
    try {
        await supabaseRest(`profiles?id=eq.${userId}`, {
            method: "PATCH",
            body: JSON.stringify({ role: newRole }),
        });
        await fetchUsers();
        if (selectedUser.value?.id === userId) {
            selectedUser.value.role = newRole;
        }
    } catch (err) {
        console.error("Error updating user role:", err);
        alert("Failed to update user role: " + err.message);
    }
}

// ============ ANALYTICS FUNCTIONS ============
async function fetchAnalytics() {
    analyticsLoading.value = true;
    analyticsError.value = null;

    try {
        const now = new Date();
        let startDate;

        switch (analyticsDateRange.value) {
            case "7days":
                startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
                break;
            case "30days":
                startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
                break;
            case "90days":
                startDate = new Date(now - 90 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        }

        const startDateStr = startDate.toISOString();

        // Fetch analytics events
        const events = await supabaseRest(
            `analytics_events?select=*&created_at=gte.${startDateStr}&order=created_at.desc`,
        );

        // Calculate metrics
        const uniqueUsers = new Set(
            events.filter((e) => e.user_id).map((e) => e.user_id),
        );
        analyticsMetrics.value.activeUsers = uniqueUsers.size;
        analyticsMetrics.value.totalPageViews = events.filter(
            (e) => e.event_type === "page_view",
        ).length;

        // Fetch reading progress for avg time
        const progress = await supabaseRest(
            `reading_progress?select=time_spent_seconds&last_accessed_at=gte.${startDateStr}`,
        );
        const totalTime = progress.reduce(
            (sum, p) => sum + (p.time_spent_seconds || 0),
            0,
        );
        analyticsMetrics.value.avgTimeOnContent = progress.length
            ? Math.round(totalTime / progress.length)
            : 0;

        // Fetch quiz completion rate
        const quizAttempts = await supabaseRest(
            `quiz_attempts?select=status,score,total_points,quiz_id&started_at=gte.${startDateStr}`,
        );
        const completedAttempts = quizAttempts.filter(
            (a) => a.status === "completed",
        );
        const passingAttempts = completedAttempts.filter(
            (a) => a.total_points && (a.score / a.total_points) * 100 >= 70,
        );
        analyticsMetrics.value.quizCompletionRate = completedAttempts.length
            ? Math.round(
                  (passingAttempts.length / completedAttempts.length) * 100,
              )
            : 0;

        // Build chart data (daily active users)
        const dailyData = {};
        const days =
            analyticsDateRange.value === "7days"
                ? 7
                : analyticsDateRange.value === "30days"
                  ? 30
                  : 90;

        for (let i = 0; i < days; i++) {
            const date = new Date(now - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split("T")[0];
            dailyData[dateStr] = new Set();
        }

        events.forEach((event) => {
            if (event.user_id && event.created_at) {
                const dateStr = event.created_at.split("T")[0];
                if (dailyData[dateStr]) {
                    dailyData[dateStr].add(event.user_id);
                }
            }
        });

        const sortedDates = Object.keys(dailyData).sort();
        analyticsChartData.value = {
            labels: sortedDates.map((d) => {
                const date = new Date(d);
                return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                });
            }),
            datasets: [
                {
                    label: "Active Users",
                    data: sortedDates.map((d) => dailyData[d].size),
                    // Bars render via CSS (.chart-bar → rgb(var(--color-accent)));
                    // these dataset colors resolve to the same accent token.
                    borderColor: "rgb(var(--color-accent))",
                    backgroundColor: "rgb(var(--color-accent) / 0.1)",
                    fill: true,
                    tension: 0.4,
                },
            ],
        };

        // Fetch content performance (views by module)
        const moduleViews = {};
        events
            .filter((e) => e.event_type === "page_view" && e.module_id)
            .forEach((e) => {
                moduleViews[e.module_id] = (moduleViews[e.module_id] || 0) + 1;
            });

        const moduleIds = Object.keys(moduleViews);
        if (moduleIds.length > 0) {
            const modules = await supabaseRest(
                `modules?id=in.(${moduleIds.join(",")})&select=id,title`,
            );
            contentPerformance.value = modules
                .map((m) => ({
                    title: m.title,
                    views: moduleViews[m.id] || 0,
                }))
                .sort((a, b) => b.views - a.views)
                .slice(0, 5);
        }

        // Fetch quiz performance
        const quizScores = {};
        quizAttempts.forEach((a) => {
            if (a.status === "completed" && a.total_points) {
                if (!quizScores[a.quiz_id]) {
                    quizScores[a.quiz_id] = { total: 0, count: 0 };
                }
                quizScores[a.quiz_id].total += (a.score / a.total_points) * 100;
                quizScores[a.quiz_id].count++;
            }
        });

        const quizIds = Object.keys(quizScores);
        if (quizIds.length > 0) {
            const quizzesData = await supabaseRest(
                `quizzes?id=in.(${quizIds.join(",")})&select=id,title`,
            );
            quizPerformance.value = quizzesData
                .map((q) => ({
                    title: q.title,
                    avgScore: Math.round(
                        quizScores[q.id].total / quizScores[q.id].count,
                    ),
                }))
                .sort((a, b) => b.avgScore - a.avgScore)
                .slice(0, 5);
        }

        // Fetch trending highlights
        const highlights = await supabaseRest(
            "trending_highlights?select=*&order=highlight_count.desc&limit=5",
        );
        trendingHighlights.value = highlights;
    } catch (err) {
        console.error("Error fetching analytics:", err);
        analyticsError.value = err.message;
    } finally {
        analyticsLoading.value = false;
    }
}

function formatDuration(seconds) {
    if (!seconds) return "0s";
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes < 60) return `${minutes}m ${secs}s`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
}

// ============ QUIZZES FUNCTIONS ============
async function fetchQuizzes() {
    quizzesLoading.value = true;
    quizzesError.value = null;

    try {
        const data = await supabaseRest(
            "quizzes?select=*,modules(title)&order=created_at.desc",
        );

        // Get stats for each quiz
        const quizzesWithStats = await Promise.all(
            data.map(async (quiz) => {
                const questions = await supabaseRest(
                    `quiz_questions?quiz_id=eq.${quiz.id}&select=id`,
                );
                const attempts = await supabaseRest(
                    `quiz_attempts?quiz_id=eq.${quiz.id}&select=score,total_points,status`,
                );

                const completedAttempts = attempts.filter(
                    (a) => a.status === "completed",
                );
                const avgScore = completedAttempts.length
                    ? Math.round(
                          completedAttempts.reduce(
                              (sum, a) =>
                                  sum + (a.score / a.total_points) * 100,
                              0,
                          ) / completedAttempts.length,
                      )
                    : 0;
                const passRate = completedAttempts.length
                    ? Math.round(
                          (completedAttempts.filter(
                              (a) =>
                                  (a.score / a.total_points) * 100 >=
                                  quiz.passing_score,
                          ).length /
                              completedAttempts.length) *
                              100,
                      )
                    : 0;

                return {
                    ...quiz,
                    questionCount: questions.length,
                    attemptCount: attempts.length,
                    avgScore,
                    passRate,
                };
            }),
        );

        quizzes.value = quizzesWithStats;
    } catch (err) {
        console.error("Error fetching quizzes:", err);
        quizzesError.value = err.message;
    } finally {
        quizzesLoading.value = false;
    }
}

function openQuizEditor(quiz = null) {
    if (quiz) {
        editingQuiz.value = quiz;
        quizForm.value = {
            title: quiz.title,
            description: quiz.description || "",
            module_id: quiz.module_id,
            section_id: quiz.section_id,
            time_limit_minutes: quiz.time_limit_minutes || 15,
            passing_score: quiz.passing_score || 70,
            allow_multiple_attempts: quiz.allow_multiple_attempts ?? true,
            show_correct_answers: quiz.show_correct_answers ?? true,
            questions: [],
        };
        // Fetch questions
        fetchQuizQuestions(quiz.id);
    } else {
        editingQuiz.value = null;
        quizForm.value = {
            title: "",
            description: "",
            module_id: null,
            section_id: null,
            time_limit_minutes: 15,
            passing_score: 70,
            allow_multiple_attempts: true,
            show_correct_answers: true,
            questions: [],
        };
    }
    showQuizEditor.value = true;
}

async function fetchQuizQuestions(quizId) {
    try {
        const questions = await supabaseRest(
            `quiz_questions?quiz_id=eq.${quizId}&select=*&order=order_index.asc`,
        );
        quizForm.value.questions = questions;
    } catch (err) {
        console.error("Error fetching quiz questions:", err);
    }
}

function closeQuizEditor() {
    showQuizEditor.value = false;
    editingQuiz.value = null;
}

async function saveQuiz() {
    try {
        const quizData = {
            title: quizForm.value.title,
            description: quizForm.value.description,
            module_id: quizForm.value.module_id,
            section_id: quizForm.value.section_id,
            time_limit_minutes: quizForm.value.time_limit_minutes,
            passing_score: quizForm.value.passing_score,
            allow_multiple_attempts: quizForm.value.allow_multiple_attempts,
            show_correct_answers: quizForm.value.show_correct_answers,
        };

        if (editingQuiz.value) {
            await supabaseRest(`quizzes?id=eq.${editingQuiz.value.id}`, {
                method: "PATCH",
                body: JSON.stringify(quizData),
            });
        } else {
            quizData.created_by = profile.value?.id;
            await supabaseRest("quizzes", {
                method: "POST",
                headers: { Prefer: "return=representation" },
                body: JSON.stringify(quizData),
            });
        }

        closeQuizEditor();
        await fetchQuizzes();
    } catch (err) {
        console.error("Error saving quiz:", err);
        alert("Failed to save quiz: " + err.message);
    }
}

async function deleteQuiz(quizId) {
    if (
        !confirm(
            "Are you sure you want to delete this quiz? All questions and attempts will be lost.",
        )
    )
        return;

    try {
        // Delete questions first
        await supabaseRest(`quiz_questions?quiz_id=eq.${quizId}`, {
            method: "DELETE",
        });
        // Delete attempts
        await supabaseRest(`quiz_attempts?quiz_id=eq.${quizId}`, {
            method: "DELETE",
        });
        // Delete quiz
        await supabaseRest(`quizzes?id=eq.${quizId}`, {
            method: "DELETE",
        });
        await fetchQuizzes();
    } catch (err) {
        console.error("Error deleting quiz:", err);
        alert("Failed to delete quiz: " + err.message);
    }
}

function openQuestionEditor(question = null) {
    if (question) {
        editingQuestion.value = question;
        questionForm.value = {
            question_text: question.question_text,
            question_type: question.question_type,
            options: question.options || ["", "", "", ""],
            correct_answer: question.correct_answer || "",
            points: question.points || 1,
        };
    } else {
        editingQuestion.value = null;
        questionForm.value = {
            question_text: "",
            question_type: "multiple_choice",
            options: ["", "", "", ""],
            correct_answer: "",
            points: 1,
        };
    }
    showQuestionEditor.value = true;
}

function closeQuestionEditor() {
    showQuestionEditor.value = false;
    editingQuestion.value = null;
}

async function saveQuestion() {
    if (!editingQuiz.value) return;

    try {
        const questionData = {
            quiz_id: editingQuiz.value.id,
            question_text: questionForm.value.question_text,
            question_type: questionForm.value.question_type,
            options:
                questionForm.value.question_type === "multiple_choice"
                    ? questionForm.value.options
                    : null,
            correct_answer: questionForm.value.correct_answer,
            points: questionForm.value.points,
            order_index: editingQuestion.value
                ? editingQuestion.value.order_index
                : quizForm.value.questions.length,
        };

        if (editingQuestion.value) {
            await supabaseRest(
                `quiz_questions?id=eq.${editingQuestion.value.id}`,
                {
                    method: "PATCH",
                    body: JSON.stringify(questionData),
                },
            );
        } else {
            await supabaseRest("quiz_questions", {
                method: "POST",
                body: JSON.stringify(questionData),
            });
        }

        closeQuestionEditor();
        await fetchQuizQuestions(editingQuiz.value.id);
    } catch (err) {
        console.error("Error saving question:", err);
        alert("Failed to save question: " + err.message);
    }
}

async function deleteQuestion(questionId) {
    if (!confirm("Delete this question?")) return;

    try {
        await supabaseRest(`quiz_questions?id=eq.${questionId}`, {
            method: "DELETE",
        });
        await fetchQuizQuestions(editingQuiz.value.id);
    } catch (err) {
        console.error("Error deleting question:", err);
        alert("Failed to delete question: " + err.message);
    }
}

// ============ UTILITIES ============

// Get current date formatted
const currentDate = computed(() => {
    const options = { weekday: "long", month: "short", day: "numeric" };
    return new Date().toLocaleDateString("en-US", options).toUpperCase();
});

// User display name
const displayName = computed(() => {
    return (
        profile.value?.full_name || user.value?.email?.split("@")[0] || "User"
    );
});

const handleLogout = async () => {
    await signOut();
    router.push("/");
};

const goToBook = () => {
    router.push("/chapter/1/the-retina");
};

const setActiveSection = (sectionId) => {
    activeSection.value = sectionId;
    sidebarOpen.value = false;
};

// Shared-control change handlers (FilterChips/SegmentedControl emit
// update:modelValue, not native @change — these wrap the old inline handlers).
function onMediaFilter(value) {
    mediaFilter.value = value;
    fetchMedia();
}
function onUsersFilter(value) {
    usersFilter.value = value;
    usersPage.value = 1;
    fetchUsers();
}
function onAnalyticsRange(value) {
    analyticsDateRange.value = value;
    fetchAnalytics();
}
function onUsersSearch(value) {
    usersSearch.value = value;
    usersPage.value = 1;
    fetchUsers();
}
function goToUsersPage(page) {
    if (page < 1 || page > usersTotalPages.value) return;
    usersPage.value = page;
    fetchUsers();
}

// ============ CHAPTER WIZARD STATE ============
const wizardCurrentStep = ref(1);
const wizardSteps = [
    { number: 1, label: "Details" },
    { number: 2, label: "Import" },
    { number: 3, label: "Structure" },
    { number: 4, label: "Review" },
];

const wizardMeta = ref({
    title: "",
    description: "",
    slug: "",
    order_index: 0,
});

const wizardSections = ref([]);
const wizardReferences = ref([]);
const wizardCreating = ref(false);
const wizardCreateError = ref(null);
const wizardCreatedChapter = ref(null);
const stepMetaRef = ref(null);

async function initWizardOrderIndex() {
    try {
        const chapters = await apiFetchChapters();
        const maxOrder = chapters.reduce((max, ch) => Math.max(max, ch.order_index), 1);
        wizardMeta.value.order_index = maxOrder + 1;
    } catch {
        wizardMeta.value.order_index = 3;
    }
}

function startChapterWizard() {
    // Reset wizard state
    wizardCurrentStep.value = 1;
    wizardMeta.value = { title: "", description: "", slug: "", order_index: 0 };
    wizardSections.value = [];
    wizardReferences.value = [];
    wizardCreating.value = false;
    wizardCreateError.value = null;
    wizardCreatedChapter.value = null;
    activeSection.value = "chapter-wizard";
    initWizardOrderIndex();
}

const wizardCanGoNext = computed(() => {
    switch (wizardCurrentStep.value) {
        case 1: return wizardMeta.value.title.trim().length > 0;
        case 2: return wizardSections.value.length > 0;
        case 3: return wizardSections.value.length > 0;
        case 4: return !wizardCreating.value;
        default: return false;
    }
});

function wizardNextStep() {
    if (wizardCurrentStep.value < 4 && wizardCanGoNext.value) {
        wizardCurrentStep.value++;
    }
}

function wizardPrevStep() {
    if (wizardCurrentStep.value > 1) {
        wizardCurrentStep.value--;
    }
}

function wizardGoToStep(step) {
    if (step <= wizardCurrentStep.value) {
        wizardCurrentStep.value = step;
    }
    if (step === 2 && wizardMeta.value.title.trim()) wizardCurrentStep.value = 2;
    if (step === 3 && wizardSections.value.length > 0) wizardCurrentStep.value = 3;
    if (step === 4 && wizardSections.value.length > 0) wizardCurrentStep.value = 4;
}

function onWizardContentParsed(result) {
    if (result.sections) {
        wizardSections.value = result.sections;
    }
}

async function handleWizardCreate() {
    wizardCreating.value = true;
    wizardCreateError.value = null;

    try {
        // 1. Get or create a content version
        const versions = await apiFetchVersions();
        let contentVersionId;

        const draftVersion = versions.find((v) => v.status === "draft");
        if (draftVersion) {
            contentVersionId = draftVersion.id;
        } else {
            const newVersion = await apiCreateVersion(
                {
                    version_number: `v${versions.length + 1}.0`,
                    release_notes: `Created for chapter: ${wizardMeta.value.title}`,
                },
                user.value?.id,
            );
            contentVersionId = newVersion.id;
        }

        // 2. Create the module (chapter)
        const chapter = await apiCreateChapter({
            title: wizardMeta.value.title,
            slug: wizardMeta.value.slug,
            order_index: wizardMeta.value.order_index,
            status: "draft",
            content_version_id: contentVersionId,
            created_by: user.value?.id,
        });

        // 3. Create sections and paragraphs
        for (const section of wizardSections.value) {
            const createdSection = await apiCreateSection({
                module_id: chapter.id,
                title: section.title,
                slug: section.slug,
                order_index: section.order_index,
            });

            await Promise.all(
                section.paragraphs.map((para) =>
                    apiCreateParagraph({
                        section_id: createdSection.id,
                        content: para.content,
                        content_text: para.content_text,
                        order_index: para.order_index,
                        is_subsection_header: para.is_subsection_header,
                        subsection_level: para.subsection_level,
                    }),
                ),
            );
        }

        // 4. Create references if any
        if (wizardReferences.value.length > 0) {
            await Promise.all(
                wizardReferences.value.map((ref) =>
                    apiCreateReference({
                        module_id: chapter.id,
                        number: ref.number,
                        authors: ref.authors,
                        title: ref.title,
                        journal: ref.journal,
                        year: ref.year,
                        volume: ref.volume,
                        pages: ref.pages,
                        doi: ref.doi,
                        url: ref.url,
                        pub_type: ref.pub_type,
                        raw_text: ref.raw_text,
                    }),
                ),
            );
        }

        wizardCreatedChapter.value = chapter;

        // Refresh the chapters list
        await fetchAllChapters();
    } catch (err) {
        wizardCreateError.value = err.message || "Failed to create chapter. Please try again.";
        console.error("Chapter creation error:", err);
    } finally {
        wizardCreating.value = false;
    }
}

// Watch for section changes to fetch data
watch(activeSection, (newSection) => {
    switch (newSection) {
        case "chapters":
            if (chapters.value.length === 0) fetchAllChapters();
            break;
        case "versions":
            if (versions.value.length === 0) fetchVersions();
            break;
        case "media":
            if (mediaItems.value.length === 0) fetchMedia();
            break;
        case "users":
            if (users.value.length === 0) fetchUsers();
            break;
        case "analytics":
            fetchAnalytics(); // Always refresh analytics
            break;
        case "quizzes":
            if (quizzes.value.length === 0) fetchQuizzes();
            break;
    }
});

// Watch for expanded chapter to setup scroll observer
watch(expandedChapterId, () => {
    nextTick(() => {
        if (expandedChapterId.value && !selectedBlock.value) {
            setupScrollObserver();
        }
    });
});

// Dashboard stats computed from fetched data
const dashboardStats = computed(() => ({
    chapters: chapters.value.length,
    totalSections: chapters.value.reduce((s, c) => s + (c.sectionCount || 0), 0),
    totalParagraphs: chapters.value.reduce((s, c) => s + (c.paragraphCount || 0), 0),
    totalWords: chapters.value.reduce((s, c) => s + (c.wordCount || 0), 0),
    totalUsers: usersTotalCount.value,
    totalQuizzes: quizzes.value.length,
    totalMedia: mediaItems.value.length,
    publishedChapters: chapters.value.filter(c => c.status === 'published').length,
    draftChapters: chapters.value.filter(c => c.status === 'draft').length,
    avgReadingTime: chapters.value.length
        ? Math.round(chapters.value.reduce((s, c) => s + (c.readingTime || 0), 0) / chapters.value.length)
        : 0,
}));

// Sorted chapters for dashboard display
const recentChapters = computed(() => {
    return [...chapters.value].sort((a, b) => {
        const dateA = a.updated_at ? new Date(a.updated_at) : 0;
        const dateB = b.updated_at ? new Date(b.updated_at) : 0;
        return dateB - dateA;
    });
});

// Max role count for bar chart scaling
const maxRoleCount = computed(() => {
    const b = userRoleBreakdown.value;
    return Math.max(b.creators, b.professors, b.students, 1);
});

async function fetchDashboardData() {
    dashboardLoading.value = true;
    await Promise.allSettled([
        fetchAllChapters(),
        fetchUsers(),
        fetchQuizzes(),
        fetchMedia(),
        fetchAnalytics(),
    ]);
    dashboardLoading.value = false;
}

onMounted(() => {
    // Check for query param to open a specific section (e.g., from redirect)
    if (route.query.section === "chapter-wizard") {
        startChapterWizard();
        return;
    }

    if (activeSection.value === "dashboard") {
        fetchDashboardData();
    } else if (activeSection.value === "chapters") {
        fetchAllChapters();
    }
});
</script>


<template>
    <!-- Loading -->
    <div v-if="loading || profileLoading" class="screen">
        <LoadingState message="Loading…" size="lg" />
    </div>

    <!-- Not authenticated -->
    <div v-else-if="!isAuthenticated" class="screen">
        <ErrorState
            title="Access denied"
            message="Please log in to access your dashboard."
            retry-label="Go home"
            @retry="router.push('/')"
        />
    </div>

    <!-- Authenticated dashboard -->
    <DashboardShell
        v-else
        :nav-items="creatorNavItems"
        :active-section="activeSection"
        :display-name="displayName"
        :email="user?.email"
        role="Creator"
        accent="magenta"
        :back-to="'/chapter/1/the-retina'"
        back-label="Read book"
        @update:active-section="setActiveSection"
    >
        <!-- DASHBOARD -->
        <section v-if="activeSection === 'dashboard'" class="section">
            <SectionHeader eyebrow="01 · Overview" title="Creator console" />

            <LoadingState v-if="dashboardLoading" message="Loading dashboard data…" />

            <template v-else>
                <!-- A. Top metrics -->
                <StatGrid :columns="5">
                    <StatCard
                        class="stat-click"
                        :value="dashboardStats.chapters"
                        label="Chapters"
                        @click="setActiveSection('chapters')"
                    />
                    <StatCard
                        class="stat-click"
                        :value="dashboardStats.totalUsers"
                        label="Users"
                        @click="setActiveSection('users')"
                    />
                    <StatCard
                        class="stat-click"
                        :value="dashboardStats.totalQuizzes"
                        label="Quizzes"
                        @click="setActiveSection('quizzes')"
                    />
                    <StatCard :value="dashboardStats.totalWords" label="Words" />
                    <StatCard
                        class="stat-click"
                        :value="dashboardStats.totalMedia"
                        label="Media assets"
                        @click="setActiveSection('media')"
                    />
                </StatGrid>

                <!-- B. Recent chapters -->
                <div>
                    <div class="card-head">
                        <h3 class="card-title">Recent chapters</h3>
                        <Button variant="ghost" size="sm" @click="setActiveSection('chapters')">View all</Button>
                    </div>
                    <EmptyState
                        v-if="recentChapters.length === 0"
                        title="No chapters yet"
                        message="Create your first chapter to get started."
                        action-label="New chapter"
                        @action="startChapterWizard()"
                    />
                    <BaseCard v-else>
                        <ListRow
                            v-for="ch in recentChapters"
                            :key="ch.id"
                            :label="ch.title"
                            :hint="`Ch ${ch.order_index} · ${ch.sectionCount} sections · ${ch.readingTime} min read`"
                            interactive
                            @click="setActiveSection('chapters')"
                        >
                            <StatusBadge :status="ch.status || 'draft'" />
                        </ListRow>
                    </BaseCard>
                </div>

                <!-- C. Users by role + quick actions -->
                <div class="grid-2">
                    <BaseCard>
                        <h3 class="card-title">Users by role</h3>
                        <div class="role-bars">
                            <div class="role-bar-row">
                                <span class="role-bar-label">Creators</span>
                                <span class="role-bar-count">{{ userRoleBreakdown.creators }}</span>
                                <div class="role-bar-track">
                                    <div class="role-bar-fill" :style="{ width: (userRoleBreakdown.creators / maxRoleCount * 100) + '%' }"></div>
                                </div>
                            </div>
                            <div class="role-bar-row">
                                <span class="role-bar-label">Professors</span>
                                <span class="role-bar-count">{{ userRoleBreakdown.professors }}</span>
                                <div class="role-bar-track">
                                    <div class="role-bar-fill" :style="{ width: (userRoleBreakdown.professors / maxRoleCount * 100) + '%' }"></div>
                                </div>
                            </div>
                            <div class="role-bar-row">
                                <span class="role-bar-label">Students</span>
                                <span class="role-bar-count">{{ userRoleBreakdown.students }}</span>
                                <div class="role-bar-track">
                                    <div class="role-bar-fill" :style="{ width: (userRoleBreakdown.students / maxRoleCount * 100) + '%' }"></div>
                                </div>
                            </div>
                        </div>
                    </BaseCard>

                    <BaseCard>
                        <h3 class="card-title">Quick actions</h3>
                        <div class="qa-list">
                            <Button variant="outline" size="sm" block @click="startChapterWizard()">+ New chapter</Button>
                            <Button variant="outline" size="sm" block @click="setActiveSection('quizzes'); showQuizEditor = true;">+ New quiz</Button>
                            <Button variant="outline" size="sm" block @click="setActiveSection('users')">Manage users</Button>
                            <Button variant="outline" size="sm" block @click="setActiveSection('analytics')">View analytics</Button>
                        </div>
                    </BaseCard>
                </div>

                <!-- D. Quiz performance -->
                <div>
                    <h3 class="card-title">Quiz performance</h3>
                    <EmptyState v-if="quizzes.length === 0" title="No quizzes created yet" />
                    <BaseCard v-else padding="none" class="mt-3">
                        <table class="data-tbl">
                            <thead>
                                <tr>
                                    <th>Quiz name</th>
                                    <th>Questions</th>
                                    <th>Attempts</th>
                                    <th>Avg score</th>
                                    <th>Pass rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="q in quizzes" :key="q.id">
                                    <td class="cell-strong">{{ q.title }}</td>
                                    <td>{{ q.questionCount }}</td>
                                    <td>{{ q.attemptCount }}</td>
                                    <td>{{ q.avgScore }}%</td>
                                    <td>{{ q.passRate }}%</td>
                                </tr>
                            </tbody>
                        </table>
                    </BaseCard>
                </div>

                <!-- E. Content stats + trending highlights -->
                <div class="grid-2">
                    <BaseCard>
                        <h3 class="card-title">Content stats</h3>
                        <div class="mini-stats wrap mt-3">
                            <div class="mini-stat">
                                <span class="mini-value">{{ dashboardStats.totalSections }}</span>
                                <span class="mini-label">Total sections</span>
                            </div>
                            <div class="mini-stat">
                                <span class="mini-value">{{ dashboardStats.totalParagraphs }}</span>
                                <span class="mini-label">Total paragraphs</span>
                            </div>
                            <div class="mini-stat">
                                <span class="mini-value">{{ dashboardStats.avgReadingTime }} min</span>
                                <span class="mini-label">Avg reading time</span>
                            </div>
                            <div class="mini-stat">
                                <span class="mini-value">{{ dashboardStats.publishedChapters }} / {{ dashboardStats.draftChapters }}</span>
                                <span class="mini-label">Published / draft</span>
                            </div>
                        </div>
                    </BaseCard>

                    <BaseCard>
                        <h3 class="card-title">Trending highlights</h3>
                        <EmptyState v-if="trendingHighlights.length === 0" title="No highlights yet" />
                        <div v-else class="mt-3">
                            <ListRow
                                v-for="(h, i) in trendingHighlights.slice(0, 5)"
                                :key="i"
                                :label="`“${(h.highlighted_text || h.text || '').slice(0, 80)}${(h.highlighted_text || h.text || '').length > 80 ? '…' : ''}”`"
                            >
                                <StatusBadge variant="accent">{{ h.highlight_count || h.count || 0 }}</StatusBadge>
                            </ListRow>
                        </div>
                    </BaseCard>
                </div>
            </template>
        </section>

        <!-- CHAPTERS -->
        <section v-else-if="activeSection === 'chapters'" class="section">
            <SectionHeader eyebrow="02 · Chapters" title="Book content">
                <template #actions>
                    <Button variant="solid" size="sm" @click="startChapterWizard()">New chapter</Button>
                </template>
            </SectionHeader>

            <LoadingState v-if="chaptersLoading" message="Loading chapters…" />
            <ErrorState v-else-if="chaptersError" :message="chaptersError" @retry="fetchAllChapters" />

            <div v-else class="stack">
                <BaseCard
                    v-for="chapter in chapters"
                    :key="chapter.id"
                    padding="none"
                    :class="{ 'chapter-expanded': expandedChapterId === chapter.id }"
                >
                    <!-- Chapter header (always visible) -->
                    <div class="chapter-head" @click="toggleChapter(chapter.id)">
                        <div class="chapter-head-main">
                            <span class="eyebrow-mono">Chapter {{ chapter.order_index }}</span>
                            <h3 class="card-title sm">{{ chapter.title }}</h3>
                            <div v-if="expandedChapterId !== chapter.id" class="meta-row mt-1">
                                <span>{{ chapter.sectionCount }} sections</span>
                                <span>{{ chapter.paragraphCount }} paragraphs</span>
                                <span>{{ chapter.wordCount.toLocaleString() }} words</span>
                                <span>{{ chapter.readingTime }} min read</span>
                            </div>
                            <span v-if="expandedChapterId !== chapter.id" class="muted-mono">
                                Last edited: {{ formatDate(chapter.updated_at) }}
                            </span>
                        </div>
                        <StatusBadge :status="chapter.status || 'draft'" />
                        <button
                            v-if="expandedChapterId === chapter.id"
                            type="button"
                            class="chev-btn"
                            @click.stop="toggleChapter(chapter.id)"
                            aria-label="Collapse"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"></polyline></svg>
                        </button>
                        <svg v-else class="chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>

                    <!-- Expanded content -->
                    <div v-if="expandedChapterId === chapter.id" class="chapter-body">
                        <div class="chapter-editor-layout">
                            <!-- Left: block list -->
                            <div class="blocks-sidebar">
                                <div class="blocks-list">
                                    <div
                                        v-for="block in flatBlocks"
                                        :key="block.id"
                                        class="block-item"
                                        :class="{
                                            section: block.type === 'section',
                                            paragraph: block.type === 'paragraph',
                                            selected: selectedBlock?.id === block.id,
                                            highlighted: highlightedBlockId === block.id && !selectedBlock,
                                            'drag-over': dragOverBlockId === block.id,
                                        }"
                                        :draggable="block.type === 'paragraph'"
                                        @click="selectBlock(block)"
                                        @dragstart="handleDragStart($event, block)"
                                        @dragover="handleDragOver($event, block)"
                                        @dragleave="handleDragLeave"
                                        @drop="handleDrop($event, block)"
                                        @dragend="handleDragEnd"
                                    >
                                        <template v-if="block.type === 'section'">
                                            <svg class="block-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                                            <span class="block-title">{{ block.title }}</span>
                                        </template>
                                        <template v-else>
                                            <svg class="drag-handle" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.5"></circle><circle cx="15" cy="5" r="1.5"></circle><circle cx="9" cy="12" r="1.5"></circle><circle cx="15" cy="12" r="1.5"></circle><circle cx="9" cy="19" r="1.5"></circle><circle cx="15" cy="19" r="1.5"></circle></svg>
                                            <span class="block-index">P{{ block.paraIndex + 1 }}</span>
                                            <span class="block-preview">{{ block.preview || "Empty paragraph" }}</span>
                                            <span
                                                v-if="block.animationId"
                                                class="media-badge"
                                                @click.stop="detachMedia(block)"
                                                title="Click to remove media"
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                                {{ block.animationTrigger || 'Media' }}
                                                <span class="media-badge-x">&times;</span>
                                            </span>
                                            <button
                                                v-else
                                                type="button"
                                                class="attach-media-btn"
                                                @click.stop="openMediaPicker(block)"
                                                title="Attach animation or media"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                            </button>
                                            <svg v-if="selectedBlock?.id === block.id" class="selected-arrow" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 18l6-6-6-6"></path></svg>
                                        </template>
                                    </div>
                                </div>
                            </div>

                            <!-- Right: stats panel or editor -->
                            <div class="editor-panel">
                                <!-- Stats panel (no selection) -->
                                <div v-if="!selectedBlock" class="stats-panel">
                                    <StatGrid :columns="4">
                                        <StatCard :value="chapterStats?.sections || 0" label="Sections" />
                                        <StatCard :value="chapterStats?.paragraphs || 0" label="Paragraphs" />
                                        <StatCard :value="chapterStats?.words || 0" label="Words" />
                                        <StatCard :value="chapterStats?.readingTime || 0" label="Min read" />
                                    </StatGrid>

                                    <div class="content-preview" ref="contentPreviewRef">
                                        <h4 class="preview-title">Content preview</h4>
                                        <div class="preview-content">
                                            <div
                                                v-for="block in flatBlocks"
                                                :key="block.id"
                                                :data-block-id="block.id"
                                                class="preview-block"
                                                :class="{ section: block.type === 'section', paragraph: block.type === 'paragraph' }"
                                            >
                                                <template v-if="block.type === 'section'">
                                                    <div class="preview-section-header">
                                                        <div class="preview-section-meta">
                                                            <span class="meta-badge section-badge">Section {{ block.sectionIndex + 1 }}</span>
                                                            <span class="meta-slug">{{ block.slug }}</span>
                                                        </div>
                                                        <h5 class="preview-section-title">{{ block.title }}</h5>
                                                    </div>
                                                </template>
                                                <template v-else>
                                                    <div class="preview-para-wrapper">
                                                        <div class="preview-para-meta">
                                                            <span class="meta-index">P{{ block.paraIndex + 1 }}</span>
                                                            <span class="meta-words">{{ block.wordCount }} words</span>
                                                            <span v-if="block.isSubsectionHeader" class="meta-badge subsection-badge">Subsection</span>
                                                        </div>
                                                        <div class="preview-para-content" v-html="block.htmlContent || block.contentText || block.preview"></div>
                                                    </div>
                                                </template>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Editor panel (with selection) -->
                                <div v-else class="editor-content">
                                    <div class="editor-head">
                                        <Button variant="ghost" size="sm" @click="clearSelection">← Back to overview</Button>
                                        <h4 class="editing-title">Editing: {{ selectedBlock.preview || "Paragraph" }}</h4>
                                    </div>

                                    <TipTapEditor v-model="editorContent" placeholder="Start writing..." />

                                    <div class="editor-footer">
                                        <span v-if="saveStatus" class="save-status" :class="{ error: saveStatus.includes('Error') }">{{ saveStatus }}</span>
                                        <Button variant="solid" size="sm" :loading="saving" @click="saveBlock">{{ saving ? "Saving…" : "Save" }}</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </BaseCard>

                <Button variant="outline" size="md" @click="startChapterWizard()">+ Add new chapter</Button>
            </div>
        </section>

        <!-- CHAPTER WIZARD (sub-view of Chapters) -->
        <section v-else-if="activeSection === 'chapter-wizard'" class="section">
            <div class="wizard-head-row">
                <Button variant="ghost" size="sm" @click="activeSection = 'chapters'">← Back to chapters</Button>
                <h2 class="wizard-title">New chapter</h2>
            </div>

            <!-- Stepper -->
            <div class="wizard-stepper">
                <button
                    v-for="step in wizardSteps"
                    :key="step.number"
                    type="button"
                    class="wizard-step"
                    :class="{
                        active: wizardCurrentStep === step.number,
                        completed: wizardCurrentStep > step.number,
                        clickable: step.number <= wizardCurrentStep,
                    }"
                    @click="wizardGoToStep(step.number)"
                >
                    <span class="wizard-step-num">
                        <template v-if="wizardCurrentStep > step.number">&#10003;</template>
                        <template v-else>{{ step.number }}</template>
                    </span>
                    <span class="wizard-step-label">{{ step.label }}</span>
                </button>
            </div>

            <!-- Step content -->
            <div class="wizard-content">
                <WizardStepMeta
                    v-if="wizardCurrentStep === 1"
                    ref="stepMetaRef"
                    v-model="wizardMeta"
                    :existing-chapter-count="wizardMeta.order_index"
                />
                <WizardStepImport
                    v-if="wizardCurrentStep === 2"
                    :sections="wizardSections"
                    :references="wizardReferences"
                    @update:sections="wizardSections = $event"
                    @update:references="wizardReferences = $event"
                    @parsed="onWizardContentParsed"
                />
                <WizardStepStructure
                    v-if="wizardCurrentStep === 3"
                    :sections="wizardSections"
                    :references="wizardReferences"
                    @update:sections="wizardSections = $event"
                    @update:references="wizardReferences = $event"
                />
                <WizardStepReview
                    v-if="wizardCurrentStep === 4"
                    :meta="wizardMeta"
                    :sections="wizardSections"
                    :references="wizardReferences"
                    :creating="wizardCreating"
                    :create-error="wizardCreateError"
                    :created-chapter="wizardCreatedChapter"
                    @create="handleWizardCreate"
                />
            </div>

            <!-- Footer nav -->
            <div v-if="!wizardCreatedChapter" class="wizard-footer">
                <Button v-if="wizardCurrentStep > 1" variant="outline" size="sm" @click="wizardPrevStep">Back</Button>
                <div class="wizard-footer-spacer" />
                <Button
                    v-if="wizardCurrentStep < 4"
                    variant="solid"
                    size="sm"
                    :disabled="!wizardCanGoNext"
                    @click="wizardNextStep"
                >
                    Continue
                </Button>
            </div>

            <div v-if="wizardCreatedChapter" class="wizard-footer">
                <div class="wizard-footer-spacer" />
                <Button variant="solid" size="sm" @click="activeSection = 'chapters'">View chapters</Button>
            </div>
        </section>

        <!-- VERSIONS -->
        <section v-else-if="activeSection === 'versions'" class="section">
            <SectionHeader eyebrow="03 · Versions" title="Content versions">
                <template #actions>
                    <Button variant="solid" size="sm" @click="showNewVersionModal = true">New version</Button>
                </template>
            </SectionHeader>

            <LoadingState v-if="versionsLoading" message="Loading versions…" />
            <ErrorState v-else-if="versionsError" :message="versionsError" @retry="fetchVersions" />
            <EmptyState
                v-else-if="versions.length === 0"
                title="No versions yet"
                message="Create your first content version to get started."
                action-label="Create version"
                @action="showNewVersionModal = true"
            />

            <div v-else class="stack">
                <BaseCard v-for="version in versions" :key="version.id" padding="md">
                    <div class="card-head">
                        <div class="vh-info">
                            <h3 class="card-title sm">v{{ version.version_number }}</h3>
                            <StatusBadge :status="version.status" />
                        </div>
                        <div class="btn-row">
                            <Button
                                v-if="version.status === 'draft'"
                                variant="outline"
                                size="sm"
                                @click="updateVersionStatus(version.id, 'published')"
                            >
                                Publish
                            </Button>
                            <Button
                                v-if="version.status === 'published'"
                                variant="outline"
                                size="sm"
                                @click="updateVersionStatus(version.id, 'archived')"
                            >
                                Archive
                            </Button>
                            <Button variant="danger" size="sm" @click="deleteVersion(version.id)">Delete</Button>
                        </div>
                    </div>
                    <div class="meta-row">
                        <span>{{ version.moduleCount }} modules</span>
                        <span>Created {{ formatDate(version.created_at) }}</span>
                        <span v-if="version.published_at">Published {{ formatDate(version.published_at) }}</span>
                    </div>
                    <p v-if="version.release_notes" class="muted">{{ version.release_notes }}</p>
                </BaseCard>
            </div>

            <!-- New version modal -->
            <BaseModal v-model="showNewVersionModal" title="Create new version" size="lg">
                <div class="form-stack">
                    <FormField label="Version number">
                        <input v-model="newVersionForm.version_number" type="text" placeholder="e.g., 2.0" />
                    </FormField>
                    <FormField label="Release notes">
                        <textarea v-model="newVersionForm.release_notes" placeholder="What's new in this version…" rows="4"></textarea>
                    </FormField>
                </div>
                <template #footer>
                    <Button variant="ghost" size="sm" @click="showNewVersionModal = false">Cancel</Button>
                    <Button variant="solid" size="sm" @click="createVersion">Create version</Button>
                </template>
            </BaseModal>
        </section>

        <!-- MEDIA -->
        <section v-else-if="activeSection === 'media'" class="section">
            <SectionHeader eyebrow="04 · Media" title="Images & assets" />

            <div class="filters-bar">
                <FilterChips :options="mediaFilterOptions" :model-value="mediaFilter" @update:model-value="onMediaFilter" />
                <SearchInput v-model="mediaSearch" placeholder="Search media…" class="search-grow" />
            </div>

            <LoadingState v-if="mediaLoading" message="Loading media…" />
            <ErrorState v-else-if="mediaError" :message="mediaError" @retry="fetchMedia" />
            <EmptyState
                v-else-if="filteredMedia.length === 0"
                title="No media found"
                message="Upload animations, images, and videos to use in your content."
            />

            <div v-else class="stack-lg">
                <div v-if="mediaByType.lottie.length > 0">
                    <h3 class="card-title sm">Lottie animations ({{ mediaByType.lottie.length }})</h3>
                    <div class="media-grid mt-3">
                        <BaseCard
                            v-for="item in mediaByType.lottie"
                            :key="item.id"
                            padding="none"
                            interactive
                            class="media-card"
                            :class="{ selected: selectedMedia?.id === item.id }"
                            @click="selectMedia(item)"
                        >
                            <div class="media-thumb">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                            </div>
                            <div class="media-info">
                                <span class="media-title">{{ item.title || item.animation_key }}</span>
                                <span class="media-size">{{ formatFileSize(item.file_size_bytes) }}</span>
                            </div>
                        </BaseCard>
                    </div>
                </div>

                <div v-if="mediaByType.video.length > 0">
                    <h3 class="card-title sm">Videos ({{ mediaByType.video.length }})</h3>
                    <div class="media-grid mt-3">
                        <BaseCard
                            v-for="item in mediaByType.video"
                            :key="item.id"
                            padding="none"
                            interactive
                            class="media-card"
                            :class="{ selected: selectedMedia?.id === item.id }"
                            @click="selectMedia(item)"
                        >
                            <div class="media-thumb">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
                            </div>
                            <div class="media-info">
                                <span class="media-title">{{ item.title || item.animation_key }}</span>
                                <span class="media-size">{{ formatFileSize(item.file_size_bytes) }}</span>
                            </div>
                        </BaseCard>
                    </div>
                </div>

                <div v-if="mediaByType.image.length > 0">
                    <h3 class="card-title sm">Images ({{ mediaByType.image.length }})</h3>
                    <div class="media-grid mt-3">
                        <BaseCard
                            v-for="item in mediaByType.image"
                            :key="item.id"
                            padding="none"
                            interactive
                            class="media-card"
                            :class="{ selected: selectedMedia?.id === item.id }"
                            @click="selectMedia(item)"
                        >
                            <div class="media-thumb">
                                <img v-if="item.image_file_url" :src="item.image_file_url" :alt="item.title" />
                                <svg v-else width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                            </div>
                            <div class="media-info">
                                <span class="media-title">{{ item.title || item.animation_key }}</span>
                                <span class="media-size">{{ formatFileSize(item.file_size_bytes) }}</span>
                            </div>
                        </BaseCard>
                    </div>
                </div>

                <div v-if="mediaByType.youtube.length > 0">
                    <h3 class="card-title sm">YouTube ({{ mediaByType.youtube.length }})</h3>
                    <div class="media-grid mt-3">
                        <BaseCard
                            v-for="item in mediaByType.youtube"
                            :key="item.id"
                            padding="none"
                            interactive
                            class="media-card"
                            :class="{ selected: selectedMedia?.id === item.id }"
                            @click="selectMedia(item)"
                        >
                            <div class="media-thumb">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                            </div>
                            <div class="media-info">
                                <span class="media-title">{{ item.title || item.animation_key }}</span>
                                <span class="media-size">{{ item.youtube_id }}</span>
                            </div>
                        </BaseCard>
                    </div>
                </div>
            </div>

            <!-- Media detail modal -->
            <BaseModal
                :model-value="!!selectedMedia"
                size="full"
                :title="selectedMedia ? (selectedMedia.title || selectedMedia.animation_key) : ''"
                @update:model-value="selectedMedia = null"
            >
                <template v-if="selectedMedia">
                    <span class="muted-mono">{{ selectedMedia.media_type }} · {{ formatFileSize(selectedMedia.file_size_bytes) }}</span>
                    <div class="media-modal-preview">
                        <div v-if="selectedMedia.media_type === 'lottie'" :id="'lottie-preview-' + selectedMedia.id" class="media-modal-lottie"></div>
                        <img v-else-if="selectedMedia.media_type === 'image'" :src="selectedMedia.lottie_file_url || selectedMedia.file_path" class="media-modal-img" />
                        <video v-else-if="selectedMedia.media_type === 'video'" :src="selectedMedia.lottie_file_url || selectedMedia.file_path" controls class="media-modal-video"></video>
                        <div v-else class="media-modal-placeholder"><span>{{ selectedMedia.media_type }}</span></div>
                    </div>
                    <div class="kv-list">
                        <div class="kv-row"><span class="kv-key">Animation key</span><span class="kv-val">{{ selectedMedia.animation_key }}</span></div>
                        <div class="kv-row"><span class="kv-key">Interaction</span><span class="kv-val">{{ selectedMedia.interaction_type || '-' }}</span></div>
                        <div class="kv-row"><span class="kv-key">Component</span><span class="kv-val">{{ selectedMedia.component_name || '-' }}</span></div>
                        <div class="kv-row"><span class="kv-key">Priority</span><span class="kv-val">{{ selectedMedia.load_priority || 'normal' }}</span></div>
                        <div class="kv-row"><span class="kv-key">Domain</span><span class="kv-val">{{ selectedMedia.scientific_domain || '-' }}</span></div>
                        <div v-if="selectedMedia.description" class="kv-row kv-full"><span class="kv-key">Description</span><p class="kv-val">{{ selectedMedia.description }}</p></div>
                    </div>
                </template>
                <template #footer>
                    <Button variant="ghost" size="sm" @click="selectedMedia = null">Close</Button>
                    <Button v-if="selectedMedia" variant="danger" size="sm" @click="deleteMedia(selectedMedia.id)">Delete asset</Button>
                </template>
            </BaseModal>

            <!-- Media picker modal (attach to content block) -->
            <BaseModal v-model="showMediaPicker" title="Attach media" size="xl">
                <p class="muted">Select an animation or media to attach to this content block.</p>
                <SearchInput v-model="mediaPickerSearch" placeholder="Search animations…" class="mt-3" />
                <div class="media-picker-grid mt-3">
                    <BaseCard
                        v-for="item in mediaPickerFiltered"
                        :key="item.id"
                        padding="sm"
                        interactive
                        class="media-picker-item"
                        @click="attachMedia(item)"
                    >
                        <div class="media-picker-thumb">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        </div>
                        <div class="media-info">
                            <span class="media-title">{{ item.title || item.animation_key }}</span>
                            <span class="media-size">{{ item.interaction_type }} · {{ item.media_type }}</span>
                        </div>
                    </BaseCard>
                    <EmptyState v-if="mediaPickerFiltered.length === 0" title="No media found" />
                </div>
                <template #footer>
                    <Button variant="ghost" size="sm" @click="showMediaPicker = false">Close</Button>
                </template>
            </BaseModal>
        </section>

        <!-- QUIZZES -->
        <section v-else-if="activeSection === 'quizzes'" class="section">
            <SectionHeader eyebrow="05 · Quizzes" title="Assessments">
                <template #actions>
                    <Button v-if="!showQuizEditor" variant="solid" size="sm" @click="openQuizEditor()">New quiz</Button>
                </template>
            </SectionHeader>

            <LoadingState v-if="quizzesLoading" message="Loading quizzes…" />
            <ErrorState v-else-if="quizzesError" :message="quizzesError" @retry="fetchQuizzes" />

            <EmptyState
                v-else-if="quizzes.length === 0 && !showQuizEditor"
                title="No quizzes yet"
                message="Create quizzes to test student understanding."
                action-label="Create quiz"
                @action="openQuizEditor()"
            />

            <!-- Quiz editor (inline panel) -->
            <BaseCard v-else-if="showQuizEditor" padding="lg">
                <div class="card-head">
                    <h3 class="card-title">{{ editingQuiz ? "Edit quiz" : "New quiz" }}</h3>
                    <Button variant="ghost" size="sm" @click="closeQuizEditor">← Back to quizzes</Button>
                </div>
                <div class="form-stack">
                    <FormField label="Quiz title">
                        <input v-model="quizForm.title" type="text" placeholder="e.g., Chapter 1 Quiz" />
                    </FormField>
                    <FormField label="Description">
                        <textarea v-model="quizForm.description" placeholder="Quiz description…" rows="2"></textarea>
                    </FormField>
                    <div class="grid-2">
                        <FormField label="Time limit (min)">
                            <input v-model.number="quizForm.time_limit_minutes" type="number" min="1" />
                        </FormField>
                        <FormField label="Passing score (%)">
                            <input v-model.number="quizForm.passing_score" type="number" min="0" max="100" />
                        </FormField>
                    </div>
                    <label class="check-row">
                        <input type="checkbox" v-model="quizForm.allow_multiple_attempts" />
                        <span>Allow multiple attempts</span>
                    </label>
                    <label class="check-row">
                        <input type="checkbox" v-model="quizForm.show_correct_answers" />
                        <span>Show correct answers after submission</span>
                    </label>
                    <div class="form-actions">
                        <Button variant="ghost" size="sm" @click="closeQuizEditor">Cancel</Button>
                        <Button variant="solid" size="sm" @click="saveQuiz">{{ editingQuiz ? "Save changes" : "Create quiz" }}</Button>
                    </div>
                </div>

                <!-- Questions (only when editing existing quiz) -->
                <div v-if="editingQuiz" class="questions-section">
                    <div class="card-head">
                        <h4 class="card-title sm">Questions ({{ quizForm.questions.length }})</h4>
                        <Button variant="outline" size="sm" @click="openQuestionEditor()">+ Add question</Button>
                    </div>

                    <EmptyState
                        v-if="quizForm.questions.length === 0"
                        title="No questions yet"
                        message="Add your first question to get started."
                    />

                    <div v-else class="stack">
                        <BaseCard v-for="(question, index) in quizForm.questions" :key="question.id" padding="md">
                            <div class="card-head">
                                <div class="q-head-meta">
                                    <span class="eyebrow-mono">Q{{ index + 1 }}</span>
                                    <StatusBadge variant="neutral">{{ question.question_type }}</StatusBadge>
                                    <span class="muted-mono">{{ question.points }} pt{{ question.points !== 1 ? "s" : "" }}</span>
                                </div>
                                <div class="btn-row">
                                    <Button variant="outline" size="sm" @click="openQuestionEditor(question)">Edit</Button>
                                    <Button variant="danger" size="sm" @click="deleteQuestion(question.id)">Delete</Button>
                                </div>
                            </div>
                            <p class="q-text">{{ question.question_text }}</p>
                            <div v-if="question.options" class="q-options">
                                <div
                                    v-for="(option, optIndex) in question.options"
                                    :key="optIndex"
                                    class="q-option"
                                    :class="{ correct: option === question.correct_answer }"
                                >
                                    {{ String.fromCharCode(65 + optIndex) }}. {{ option }}
                                </div>
                            </div>
                        </BaseCard>
                    </div>
                </div>

                <!-- Question editor modal -->
                <BaseModal v-model="showQuestionEditor" :title="editingQuestion ? 'Edit question' : 'Add question'" size="lg">
                    <div class="form-stack">
                        <FormField label="Question type">
                            <select v-model="questionForm.question_type">
                                <option value="multiple_choice">Multiple choice</option>
                                <option value="true_false">True/False</option>
                                <option value="short_answer">Short answer</option>
                            </select>
                        </FormField>
                        <FormField label="Question">
                            <textarea v-model="questionForm.question_text" placeholder="Enter your question…" rows="3"></textarea>
                        </FormField>

                        <div v-if="questionForm.question_type === 'multiple_choice'">
                            <span class="field-label-static">Options</span>
                            <div
                                v-for="(option, index) in questionForm.options"
                                :key="index"
                                class="option-input-row"
                            >
                                <span class="option-letter">{{ String.fromCharCode(65 + index) }}</span>
                                <input
                                    v-model="questionForm.options[index]"
                                    type="text"
                                    :placeholder="'Option ' + String.fromCharCode(65 + index)"
                                    class="option-text-input"
                                />
                                <label class="radio-label">
                                    <input type="radio" :value="questionForm.options[index]" v-model="questionForm.correct_answer" />
                                    Correct
                                </label>
                            </div>
                        </div>

                        <FormField v-else-if="questionForm.question_type === 'true_false'" label="Correct answer">
                            <div class="radio-row">
                                <label class="radio-label"><input type="radio" value="true" v-model="questionForm.correct_answer" /> True</label>
                                <label class="radio-label"><input type="radio" value="false" v-model="questionForm.correct_answer" /> False</label>
                            </div>
                        </FormField>

                        <FormField v-else label="Expected answer (keywords)">
                            <input v-model="questionForm.correct_answer" type="text" placeholder="Keywords separated by commas" />
                        </FormField>

                        <FormField label="Points">
                            <input v-model.number="questionForm.points" type="number" min="1" />
                        </FormField>
                    </div>
                    <template #footer>
                        <Button variant="ghost" size="sm" @click="closeQuestionEditor">Cancel</Button>
                        <Button variant="solid" size="sm" @click="saveQuestion">{{ editingQuestion ? "Save changes" : "Add question" }}</Button>
                    </template>
                </BaseModal>
            </BaseCard>

            <!-- Quizzes list -->
            <div v-else class="card-grid">
                <BaseCard v-for="quiz in quizzes" :key="quiz.id" padding="md">
                    <div class="card-head">
                        <div>
                            <h3 class="card-title sm">{{ quiz.title }}</h3>
                            <span v-if="quiz.modules" class="muted-mono">{{ quiz.modules.title }}</span>
                        </div>
                        <div class="btn-row">
                            <Button variant="outline" size="sm" @click="openQuizEditor(quiz)">Edit</Button>
                            <Button variant="danger" size="sm" @click="deleteQuiz(quiz.id)">Delete</Button>
                        </div>
                    </div>
                    <div class="meta-row">
                        <span>{{ quiz.questionCount }} questions</span>
                        <span>{{ quiz.time_limit_minutes }} min</span>
                        <span>Pass: {{ quiz.passing_score }}%</span>
                    </div>
                    <div class="mini-stats">
                        <div class="mini-stat">
                            <span class="mini-value">{{ quiz.attemptCount }}</span>
                            <span class="mini-label">Attempts</span>
                        </div>
                        <div class="mini-stat">
                            <span class="mini-value">{{ quiz.avgScore }}%</span>
                            <span class="mini-label">Avg score</span>
                        </div>
                        <div class="mini-stat">
                            <span class="mini-value">{{ quiz.passRate }}%</span>
                            <span class="mini-label">Pass rate</span>
                        </div>
                    </div>
                </BaseCard>
            </div>
        </section>

        <!-- USERS -->
        <section v-else-if="activeSection === 'users'" class="section">
            <SectionHeader eyebrow="06 · Users" title="Accounts & roles">
                <template #actions>
                    <span class="muted-mono">{{ usersTotalCount }} total</span>
                </template>
            </SectionHeader>

            <!-- Role breakdown stats (also act as filters) -->
            <StatGrid :columns="4">
                <StatCard
                    class="stat-click"
                    :value="userRoleBreakdown.creators"
                    label="Creators"
                    :tone="usersFilter === 'creator' ? 'accent' : 'auto'"
                    @click="onUsersFilter('creator')"
                />
                <StatCard
                    class="stat-click"
                    :value="userRoleBreakdown.professors"
                    label="Professors"
                    :tone="usersFilter === 'professor' ? 'accent' : 'auto'"
                    @click="onUsersFilter('professor')"
                />
                <StatCard
                    class="stat-click"
                    :value="userRoleBreakdown.students"
                    label="Students"
                    :tone="usersFilter === 'student' ? 'accent' : 'auto'"
                    @click="onUsersFilter('student')"
                />
                <StatCard
                    class="stat-click"
                    :value="userRoleBreakdown.creators + userRoleBreakdown.professors + userRoleBreakdown.students"
                    label="All users"
                    :tone="usersFilter === 'all' ? 'accent' : 'auto'"
                    @click="onUsersFilter('all')"
                />
            </StatGrid>

            <div class="filters-bar">
                <FilterChips :options="usersFilterOptions" :model-value="usersFilter" @update:model-value="onUsersFilter" />
                <SearchInput :model-value="usersSearch" placeholder="Search by name or email…" class="search-grow" @update:model-value="onUsersSearch" />
            </div>

            <LoadingState v-if="usersLoading" message="Loading users…" />
            <ErrorState v-else-if="usersError" :message="usersError" @retry="fetchUsers" />
            <EmptyState v-else-if="users.length === 0" title="No users found" />

            <div v-else class="stack">
                <BaseCard v-for="u in users" :key="u.id" padding="md" interactive @click="selectUser(u)">
                    <div class="user-row">
                        <div class="user-avatar" aria-hidden="true">{{ (u.full_name || u.email || "?")[0].toUpperCase() }}</div>
                        <div class="user-info-col">
                            <span class="card-title sm">{{ u.full_name || "Unnamed user" }}</span>
                            <span class="muted-mono">{{ u.email }}</span>
                        </div>
                        <div class="user-meta-col">
                            <StatusBadge variant="accent">{{ u.role }}</StatusBadge>
                            <span class="muted-mono">{{ u.institution || "—" }}</span>
                            <span class="muted-mono">Joined {{ formatDate(u.created_at) }}</span>
                        </div>
                    </div>
                </BaseCard>

                <!-- Pagination -->
                <div v-if="usersTotalPages > 1" class="pager">
                    <Button variant="outline" size="sm" :disabled="usersPage === 1" @click="goToUsersPage(usersPage - 1)">‹ Prev</Button>
                    <span class="muted-mono">Page {{ usersPage }} of {{ usersTotalPages }}</span>
                    <Button variant="outline" size="sm" :disabled="usersPage === usersTotalPages" @click="goToUsersPage(usersPage + 1)">Next ›</Button>
                </div>
            </div>

            <!-- User detail modal -->
            <BaseModal
                :model-value="!!selectedUser"
                size="lg"
                :title="selectedUser ? (selectedUser.full_name || 'Unnamed user') : ''"
                @update:model-value="selectedUser = null"
            >
                <template v-if="selectedUser">
                    <div class="user-detail-head">
                        <div class="user-avatar lg" aria-hidden="true">{{ (selectedUser.full_name || selectedUser.email || "?")[0].toUpperCase() }}</div>
                        <div>
                            <span class="muted-mono">{{ selectedUser.email }}</span>
                            <div class="mt-2"><StatusBadge variant="accent">{{ selectedUser.role }}</StatusBadge></div>
                        </div>
                    </div>
                    <div class="kv-list mt-3">
                        <div class="kv-row"><span class="kv-key">Institution</span><span class="kv-val">{{ selectedUser.institution || "—" }}</span></div>
                        <div class="kv-row"><span class="kv-key">Joined</span><span class="kv-val">{{ formatDate(selectedUser.created_at) }}</span></div>
                        <div v-if="selectedUser.role === 'professor'" class="kv-row"><span class="kv-key">Department</span><span class="kv-val">{{ selectedUser.professor_department || "—" }}</span></div>
                        <div v-if="selectedUser.role === 'student'" class="kv-row"><span class="kv-key">Year</span><span class="kv-val">{{ selectedUser.student_year || "—" }}</span></div>
                        <div v-if="selectedUser.role === 'student'" class="kv-row"><span class="kv-key">Major</span><span class="kv-val">{{ selectedUser.student_major || "—" }}</span></div>
                        <div v-if="selectedUser.role === 'creator'" class="kv-row"><span class="kv-key">Bio</span><span class="kv-val">{{ selectedUser.creator_bio || "—" }}</span></div>
                    </div>
                    <FormField label="Change role" class="mt-3">
                        <select :value="selectedUser.role" @change="updateUserRole(selectedUser.id, $event.target.value)">
                            <option v-for="opt in roleSelectOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                        </select>
                    </FormField>
                </template>
                <template #footer>
                    <Button variant="ghost" size="sm" @click="selectedUser = null">Close</Button>
                </template>
            </BaseModal>
        </section>

        <!-- ANALYTICS -->
        <section v-else-if="activeSection === 'analytics'" class="section">
            <SectionHeader eyebrow="07 · Analytics" title="Platform analytics">
                <template #actions>
                    <SegmentedControl
                        :model-value="analyticsDateRange"
                        :options="analyticsRangeOptions"
                        aria-label="Analytics date range"
                        @update:model-value="onAnalyticsRange"
                    />
                </template>
            </SectionHeader>

            <LoadingState v-if="analyticsLoading" message="Loading analytics…" />
            <ErrorState v-else-if="analyticsError" :message="analyticsError" @retry="fetchAnalytics" />

            <template v-else>
                <!-- Overview metrics -->
                <StatGrid :columns="4">
                    <StatCard :value="analyticsMetrics.activeUsers" label="Active users" />
                    <StatCard :value="analyticsMetrics.totalPageViews" label="Page views" />
                    <StatCard :value="formatDuration(analyticsMetrics.avgTimeOnContent)" label="Avg time on content" />
                    <StatCard :value="analyticsMetrics.quizCompletionRate" suffix="%" label="Quiz pass rate" />
                </StatGrid>

                <!-- Engagement chart -->
                <BaseCard padding="lg">
                    <h3 class="card-title">User engagement over time</h3>
                    <div class="chart-wrapper mt-3">
                        <EmptyState
                            v-if="analyticsChartData.labels.length === 0"
                            title="No engagement data for this period"
                            message="Active-user data will appear here once readers visit the book in this window."
                        />
                        <div v-else class="chart-bars">
                            <div
                                v-for="(value, index) in analyticsChartData.datasets[0]?.data || []"
                                :key="index"
                                class="chart-bar-col"
                            >
                                <div
                                    class="chart-bar"
                                    :style="{ height: Math.max(4, (value / Math.max(...analyticsChartData.datasets[0].data, 1)) * 100) + '%' }"
                                >
                                    <span class="bar-value">{{ value }}</span>
                                </div>
                                <span class="bar-label">{{ analyticsChartData.labels[index] }}</span>
                            </div>
                        </div>
                    </div>
                </BaseCard>

                <!-- Two-column performance tables -->
                <div class="grid-2">
                    <BaseCard padding="md">
                        <h3 class="card-title sm">Content performance</h3>
                        <EmptyState v-if="contentPerformance.length === 0" title="No content views recorded" />
                        <div v-else class="mt-3">
                            <ListRow
                                v-for="(item, index) in contentPerformance"
                                :key="index"
                                :label="`${index + 1}. ${item.title}`"
                                :hint="`${item.views} views`"
                            />
                        </div>
                    </BaseCard>

                    <BaseCard padding="md">
                        <h3 class="card-title sm">Quiz performance</h3>
                        <EmptyState v-if="quizPerformance.length === 0" title="No quiz attempts recorded" />
                        <div v-else class="mt-3">
                            <ListRow
                                v-for="(item, index) in quizPerformance"
                                :key="index"
                                :label="`${index + 1}. ${item.title}`"
                                :hint="`${item.avgScore}% avg`"
                            />
                        </div>
                    </BaseCard>
                </div>

                <BaseCard padding="md">
                    <h3 class="card-title sm">Trending highlights</h3>
                    <EmptyState v-if="trendingHighlights.length === 0" title="No highlights recorded" />
                    <div v-else class="mt-3">
                        <ListRow
                            v-for="(item, index) in trendingHighlights"
                            :key="index"
                            :label="`“${item.selected_text?.slice(0, 100) || ''}…”`"
                        >
                            <StatusBadge variant="accent">{{ item.highlight_count }} users</StatusBadge>
                        </ListRow>
                    </div>
                </BaseCard>
            </template>
        </section>
    </DashboardShell>
</template>

<style scoped>
/*
 * NOTE: this project uses font-size: 62.5% on html/body so 1rem = 10px.
 * Sidebar, metric cards, status badges, loading/empty/error states, buttons,
 * modals and form inputs are now owned by the shared dashboard library — their
 * old bespoke CSS was deleted. What remains are layout helpers the Creator
 * sections still need (chapter editor, content preview, wizard stepper, media
 * grid/modal, analytics chart), all tokenized.
 */

/* Full-screen states (loading / access denied) */
.screen {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgb(var(--color-bg));
}

/* Section layout helpers (mirror Student/Professor vocabulary) */
.section { display: flex; flex-direction: column; gap: 24px; }
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
.stack { display: flex; flex-direction: column; gap: 12px; }
.stack-lg { display: flex; flex-direction: column; gap: 28px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
@media (max-width: 1100px) { .grid-2 { grid-template-columns: 1fr; } }
.mt-1 { margin-top: 4px; }
.mt-2 { margin-top: 8px; }
.mt-3 { margin-top: 12px; }

/* Clickable StatCards (dashboard metrics, users role filters) — class falls
   through to the StatCard root, so :deep targets it through the StatGrid slot. */
:deep(.stat-click) { cursor: pointer; transition: background 0.12s ease; }
:deep(.stat-click:hover) { background: rgb(var(--color-ink) / 0.03); }

.card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.card-title { font-family: var(--font-body); font-size: 1.8rem; font-weight: 500; color: rgb(var(--color-ink)); margin: 0; }
.card-title.sm { font-size: 1.6rem; margin: 0 0 4px; }

.muted { font-family: var(--font-body); font-size: 1.4rem; color: rgb(var(--color-mute)); margin: 8px 0 0; line-height: 1.5; }
.muted-mono { font-family: var(--font-mono); font-size: 1.2rem; color: rgb(var(--color-mute)); }
.eyebrow-mono {
    font-family: var(--font-mono); font-size: 1.1rem; text-transform: uppercase;
    letter-spacing: 0.1em; color: rgb(var(--color-accent));
}

.meta-row {
    display: flex; flex-wrap: wrap; gap: 16px; font-family: var(--font-mono);
    font-size: 1.3rem; color: rgb(var(--color-mute)); margin-bottom: 16px;
}
.btn-row { display: flex; flex-wrap: wrap; gap: 8px; }
.chev { color: rgb(var(--color-mute)); flex: none; }
.chev-btn { border: 0; background: transparent; color: rgb(var(--color-mute)); cursor: pointer; padding: 0; display: flex; }
.chev-btn:hover { color: rgb(var(--color-ink)); }

/* Forms */
.form-stack { display: flex; flex-direction: column; gap: 18px; }
.form-actions {
    display: flex; justify-content: flex-end; gap: 8px;
    padding-top: 16px; border-top: 1px solid rgb(var(--color-line));
}
.check-row, .radio-label {
    display: flex; align-items: center; gap: 8px;
    font-family: var(--font-body); font-size: 1.4rem; color: rgb(var(--color-ink)); cursor: pointer;
}
.radio-row { display: flex; flex-wrap: wrap; gap: 20px; }
.check-row input[type="checkbox"], .radio-label input { accent-color: rgb(var(--color-accent)); }
.field-label-static {
    display: block; font-family: var(--font-mono); font-size: 1rem; text-transform: uppercase;
    letter-spacing: 0.1em; color: rgb(var(--color-mute)); margin-bottom: 8px;
}

/* Filters bar */
.filters-bar { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
.search-grow { flex: 1; min-width: 240px; }

/* Quick actions */
.qa-list { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }

/* Users-by-role bars (dashboard) */
.role-bars { display: flex; flex-direction: column; gap: 16px; margin-top: 12px; }
.role-bar-row { display: grid; grid-template-columns: 90px 40px 1fr; align-items: center; gap: 12px; }
.role-bar-label { font-family: var(--font-body); font-size: 1.4rem; color: rgb(var(--color-ink)); }
.role-bar-count { font-family: var(--font-mono); font-size: 1.4rem; color: rgb(var(--color-mute)); text-align: right; }
.role-bar-track { height: 10px; background: rgb(var(--color-ink) / 0.06); border-radius: 999px; overflow: hidden; }
.role-bar-fill { height: 100%; background: rgb(var(--color-accent)); border-radius: 999px; transition: width 0.3s ease; }

/* Simple data table (dashboard quiz performance) */
.data-tbl { width: 100%; border-collapse: collapse; }
.data-tbl thead th {
    text-align: left; font-family: var(--font-mono); font-size: 1rem; text-transform: uppercase;
    letter-spacing: 0.1em; color: rgb(var(--color-mute)); padding: 12px 16px;
    border-bottom: 1px solid rgb(var(--color-line)); white-space: nowrap;
}
.data-tbl tbody td {
    font-family: var(--font-body); font-size: 1.4rem; color: rgb(var(--color-ink));
    padding: 14px 16px; border-bottom: 1px solid rgb(var(--color-line));
}
.data-tbl tbody tr:last-child td { border-bottom: 0; }
.data-tbl tbody tr:hover { background: rgb(var(--color-ink) / 0.03); }
.cell-strong { font-weight: 500; }

/* Mini stat rows (quiz / content-stats cards) */
.mini-stats { display: flex; gap: 28px; margin-top: 8px; }
.mini-stats.wrap { flex-wrap: wrap; gap: 24px 40px; }
.mini-stat { display: flex; flex-direction: column; }
.mini-value { font-family: var(--font-body); font-size: 2rem; font-weight: 500; color: rgb(var(--color-ink)); line-height: 1; }
.mini-label { font-family: var(--font-mono); font-size: 1rem; text-transform: uppercase; letter-spacing: 0.1em; color: rgb(var(--color-mute)); margin-top: 6px; }

/* ============ CHAPTERS: expandable card + editor ============ */
.chapter-expanded { border-color: rgb(var(--color-accent) / 0.4); }
.chapter-head { display: flex; align-items: flex-start; gap: 16px; padding: 20px; cursor: pointer; }
.chapter-head-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.chapter-body { border-top: 1px solid rgb(var(--color-line)); }

.chapter-editor-layout { display: grid; grid-template-columns: 340px 1fr; min-height: 480px; }
@media (max-width: 1100px) { .chapter-editor-layout { grid-template-columns: 1fr; } }

.blocks-sidebar { border-right: 1px solid rgb(var(--color-line)); }
@media (max-width: 1100px) { .blocks-sidebar { border-right: 0; border-bottom: 1px solid rgb(var(--color-line)); } }
.blocks-list { max-height: 600px; overflow-y: auto; padding: 8px; }
.blocks-list::-webkit-scrollbar { width: 8px; }
.blocks-list::-webkit-scrollbar-track { background: transparent; }
.blocks-list::-webkit-scrollbar-thumb { background: rgb(var(--color-ink) / 0.15); border-radius: 999px; }

.block-item {
    display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 4px;
    cursor: pointer; font-family: var(--font-body); transition: background 0.12s ease;
}
.block-item.section { margin-top: 12px; }
.block-item.section:first-child { margin-top: 0; }
.block-item.paragraph:hover { background: rgb(var(--color-ink) / 0.04); }
.block-item.selected { background: rgb(var(--color-accent) / 0.1); }
.block-item.highlighted { background: rgb(var(--color-accent) / 0.05); }
.block-item.drag-over { box-shadow: inset 0 2px 0 rgb(var(--color-accent)); }

.block-icon { color: rgb(var(--color-accent)); flex: none; }
.block-title { font-size: 1.4rem; font-weight: 500; color: rgb(var(--color-ink)); }
.drag-handle { color: rgb(var(--color-mute)); flex: none; cursor: grab; }
.drag-handle:active { cursor: grabbing; }
.block-index { font-family: var(--font-mono); font-size: 1.1rem; color: rgb(var(--color-mute)); flex: none; }
.block-preview {
    font-size: 1.3rem; color: rgb(var(--color-ink)); flex: 1; min-width: 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.selected-arrow { color: rgb(var(--color-accent)); flex: none; }

.media-badge {
    display: inline-flex; align-items: center; gap: 4px; flex: none;
    font-family: var(--font-mono); font-size: 1rem; padding: 2px 7px; border-radius: 999px;
    background: rgb(var(--color-accent) / 0.12); color: rgb(var(--color-accent)); cursor: pointer;
}
.media-badge:hover { background: rgb(var(--color-accent) / 0.2); }
.media-badge-x { font-size: 1.3rem; line-height: 1; }
.attach-media-btn {
    flex: none; border: 1px solid rgb(var(--color-line)); border-radius: 999px; background: transparent;
    color: rgb(var(--color-mute)); cursor: pointer; padding: 4px; display: flex; opacity: 0;
    transition: opacity 0.12s ease, color 0.12s ease;
}
.block-item:hover .attach-media-btn { opacity: 1; }
.attach-media-btn:hover { color: rgb(var(--color-accent)); border-color: rgb(var(--color-accent)); }

.editor-panel { padding: 20px; min-width: 0; }
.stats-panel { display: flex; flex-direction: column; gap: 20px; }

.content-preview { border: 1px solid rgb(var(--color-line)); border-radius: 4px; overflow: hidden; }
.preview-title {
    font-family: var(--font-mono); font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.1em;
    color: rgb(var(--color-mute)); margin: 0; padding: 12px 16px; border-bottom: 1px solid rgb(var(--color-line));
}
.preview-content { max-height: 480px; overflow-y: auto; padding: 16px; }
.preview-content::-webkit-scrollbar { width: 8px; }
.preview-content::-webkit-scrollbar-track { background: transparent; }
.preview-content::-webkit-scrollbar-thumb { background: rgb(var(--color-ink) / 0.15); border-radius: 999px; }

.preview-block.paragraph { padding: 12px 0; border-bottom: 1px solid rgb(var(--color-line)); }
.preview-block.paragraph:last-child { border-bottom: 0; }
.preview-section-header { padding: 16px 0 8px; }
.preview-block.section:first-child .preview-section-header { padding-top: 0; }
.preview-section-meta { display: flex; align-items: center; gap: 10px; }
.meta-badge {
    font-family: var(--font-mono); font-size: 1rem; text-transform: uppercase; letter-spacing: 0.08em;
    padding: 2px 8px; border-radius: 999px;
}
.meta-badge.section-badge { background: rgb(var(--color-accent) / 0.12); color: rgb(var(--color-accent)); }
.meta-badge.subsection-badge { background: rgb(var(--color-complete) / 0.14); color: rgb(var(--color-complete)); }
.meta-slug { font-family: var(--font-mono); font-size: 1.1rem; color: rgb(var(--color-mute)); }
.preview-section-title { font-family: var(--font-body); font-size: 1.7rem; font-weight: 500; color: rgb(var(--color-ink)); margin: 8px 0 0; }

.preview-para-meta { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.meta-index { font-family: var(--font-mono); font-size: 1.1rem; color: rgb(var(--color-accent)); }
.meta-words { font-family: var(--font-mono); font-size: 1.1rem; color: rgb(var(--color-mute)); }
.preview-para-content { font-family: var(--font-body); font-size: 1.4rem; color: rgb(var(--color-ink)); line-height: 1.6; }
.preview-para-content :deep(h1), .preview-para-content :deep(h2), .preview-para-content :deep(h3) {
    font-weight: 500; color: rgb(var(--color-ink)); margin: 8px 0;
}
.preview-para-content :deep(h1) { font-size: 1.9rem; }
.preview-para-content :deep(h2) { font-size: 1.7rem; }
.preview-para-content :deep(h3) { font-size: 1.5rem; }

.editor-content { display: flex; flex-direction: column; gap: 16px; }
.editor-head { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
.editing-title { font-family: var(--font-body); font-size: 1.6rem; font-weight: 500; color: rgb(var(--color-ink)); margin: 0; }
.editor-content :deep(.tiptap-editor) { border: 1px solid rgb(var(--color-line)); border-radius: 4px; min-height: 280px; }
.editor-footer { display: flex; align-items: center; justify-content: flex-end; gap: 12px; }
.save-status { font-family: var(--font-mono); font-size: 1.2rem; color: rgb(var(--color-complete)); }
.save-status.error { color: rgb(var(--color-accent)); }

/* ============ CHAPTER WIZARD ============ */
.wizard-head-row { display: flex; align-items: center; gap: 16px; }
.wizard-title { font-family: var(--font-body); font-size: 2.4rem; font-weight: 500; color: rgb(var(--color-ink)); margin: 0; }
.wizard-stepper { display: flex; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.wizard-step {
    display: flex; align-items: center; gap: 10px; background: transparent; border: 0;
    padding: 0; cursor: default; font-family: var(--font-body);
}
.wizard-step.clickable { cursor: pointer; }
.wizard-step-num {
    width: 30px; height: 30px; border-radius: 999px; display: grid; place-items: center; flex: none;
    border: 1px solid rgb(var(--color-line)); font-family: var(--font-mono); font-size: 1.3rem;
    color: rgb(var(--color-mute)); transition: all 0.12s ease;
}
.wizard-step.active .wizard-step-num { border-color: rgb(var(--color-accent)); color: rgb(var(--color-accent)); }
.wizard-step.completed .wizard-step-num { background: rgb(var(--color-accent)); border-color: rgb(var(--color-accent)); color: rgb(var(--color-paper)); }
.wizard-step-label { font-size: 1.4rem; color: rgb(var(--color-mute)); }
.wizard-step.active .wizard-step-label, .wizard-step.completed .wizard-step-label { color: rgb(var(--color-ink)); }
.wizard-content { padding: 8px 0; }
.wizard-footer { display: flex; align-items: center; gap: 12px; padding-top: 16px; border-top: 1px solid rgb(var(--color-line)); }
.wizard-footer-spacer { flex: 1; }

/* ============ MEDIA ============ */
.media-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
@media (max-width: 1023px) { .media-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); } }
.media-card.selected { border-color: rgb(var(--color-accent)); }
.media-thumb {
    aspect-ratio: 16 / 10; display: grid; place-items: center; color: rgb(var(--color-mute));
    background: rgb(var(--color-ink) / 0.04); border-bottom: 1px solid rgb(var(--color-line));
}
.media-thumb img { width: 100%; height: 100%; object-fit: cover; }
.media-info { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; }
.media-title { font-family: var(--font-body); font-size: 1.3rem; color: rgb(var(--color-ink)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.media-size { font-family: var(--font-mono); font-size: 1rem; color: rgb(var(--color-mute)); }

.media-modal-preview {
    margin: 16px 0; min-height: 280px; display: grid; place-items: center;
    background: rgb(var(--color-ink) / 0.04); border: 1px solid rgb(var(--color-line)); border-radius: 4px; overflow: hidden;
}
.media-modal-lottie { width: 100%; max-width: 480px; height: 320px; }
.media-modal-lottie :deep(svg) { width: 100%; height: 100%; }
.media-modal-img { max-width: 100%; max-height: 420px; object-fit: contain; }
.media-modal-video { max-width: 100%; max-height: 420px; }
.media-modal-placeholder { font-family: var(--font-mono); font-size: 1.4rem; color: rgb(var(--color-mute)); text-transform: uppercase; letter-spacing: 0.08em; }

.kv-list { display: flex; flex-direction: column; }
.kv-row { display: flex; gap: 16px; padding: 10px 0; border-bottom: 1px solid rgb(var(--color-line)); }
.kv-row:last-child { border-bottom: 0; }
.kv-full { flex-direction: column; gap: 4px; }
.kv-key { font-family: var(--font-mono); font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.08em; color: rgb(var(--color-mute)); min-width: 130px; }
.kv-val { font-family: var(--font-body); font-size: 1.4rem; color: rgb(var(--color-ink)); margin: 0; }

.media-picker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.media-picker-item { display: flex; align-items: center; gap: 12px; }
.media-picker-thumb {
    width: 40px; height: 40px; border-radius: 4px; flex: none; display: grid; place-items: center;
    background: rgb(var(--color-accent) / 0.1); color: rgb(var(--color-accent));
}

/* ============ QUIZZES: editor questions ============ */
.questions-section { margin-top: 24px; padding-top: 24px; border-top: 1px solid rgb(var(--color-line)); display: flex; flex-direction: column; gap: 16px; }
.q-head-meta { display: flex; align-items: center; gap: 10px; }
.q-text { font-family: var(--font-body); font-size: 1.5rem; color: rgb(var(--color-ink)); line-height: 1.5; margin: 0 0 12px; }
.q-options { display: flex; flex-direction: column; gap: 6px; }
.q-option {
    font-family: var(--font-body); font-size: 1.3rem; color: rgb(var(--color-ink));
    padding: 8px 12px; border: 1px solid rgb(var(--color-line)); border-radius: 4px;
}
.q-option.correct { border-color: rgb(var(--color-complete)); background: rgb(var(--color-complete) / 0.1); color: rgb(var(--color-complete)); }
.option-input-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.option-letter {
    width: 28px; height: 28px; border-radius: 999px; flex: none; display: grid; place-items: center;
    background: rgb(var(--color-ink) / 0.06); font-family: var(--font-mono); font-size: 1.2rem; color: rgb(var(--color-mute));
}
.option-text-input {
    flex: 1; border: 1px solid rgb(var(--color-line)); border-radius: 4px; background: transparent;
    padding: 9px 12px; font-family: var(--font-body); font-size: 1.4rem; color: rgb(var(--color-ink)); outline: none;
    transition: border-color 0.12s ease;
}
.option-text-input:focus { border-color: rgb(var(--color-ink)); }

/* ============ USERS ============ */
.user-row { display: flex; align-items: center; gap: 16px; }
.user-avatar {
    width: 44px; height: 44px; border-radius: 999px; flex: none; display: grid; place-items: center;
    background: rgb(var(--color-accent)); color: rgb(var(--color-paper));
    font-family: var(--font-mono); font-size: 1.6rem; font-weight: 600;
}
.user-avatar.lg { width: 56px; height: 56px; font-size: 2rem; }
.user-info-col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.user-meta-col { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.user-detail-head { display: flex; align-items: center; gap: 16px; }
.pager { display: flex; align-items: center; justify-content: center; gap: 16px; padding-top: 12px; }

/* ============ ANALYTICS: chart ============ */
.chart-wrapper { min-height: 220px; }
.chart-bars { display: flex; align-items: flex-end; gap: 6px; height: 220px; padding-top: 16px; }
.chart-bar-col { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; }
.chart-bar {
    width: 100%; max-width: 36px; background: rgb(var(--color-accent)); border-radius: 4px 4px 0 0;
    position: relative; display: flex; align-items: flex-start; justify-content: center; margin-top: auto;
    transition: height 0.3s ease;
}
.bar-value { font-family: var(--font-mono); font-size: 1rem; color: rgb(var(--color-ink)); position: absolute; top: -16px; }
.bar-label { font-family: var(--font-mono); font-size: 0.9rem; color: rgb(var(--color-mute)); white-space: nowrap; }
</style>
