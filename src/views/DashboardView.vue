<script setup>
// Creator dashboard — reskinned to the unified token design (sub-project D).
// Adopts DashboardShell (accent=magenta, the default) + the shared component
// library. All fetch/CRUD/wizard logic is preserved verbatim; supabaseRest is
// kept local. Only chrome/markup changed. The abandoned DashboardViewRefactored
// stays dead code — this is the live monolith, reskinned in place.
import { ref, computed, watch, onMounted } from "vue";
import { useAuth } from "@/composables/useAuth";
import { useVersions } from "@/composables/useVersions";
import { useDashboardMedia } from "@/composables/useDashboardMedia";
import { useDashboardUsers } from "@/composables/useDashboardUsers";
import { useDashboardAnalytics } from "@/composables/useDashboardAnalytics";
import { useDashboardQuizzes } from "@/composables/useDashboardQuizzes";
import { useRouter, useRoute } from "vue-router";
import { authedRequest as supabaseRest } from "@/services/api/client";
import { relativeLong as formatDate } from "@/utils/format";
import ChapterBlockEditor from "@/components/dashboard/chapters/ChapterBlockEditor.vue";
import VersionsSection from "@/components/dashboard/sections/VersionsSection.vue";
import MediaSection from "@/components/dashboard/sections/MediaSection.vue";
import UsersSection from "@/components/dashboard/sections/UsersSection.vue";
import AnalyticsSection from "@/components/dashboard/sections/AnalyticsSection.vue";
import QuizzesSection from "@/components/dashboard/sections/QuizzesSection.vue";

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
} = useAuth();

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

// Expanded chapter content (passed to ChapterBlockEditor as props)
const expandedChapterSections = ref([]);
const expandedChapterParagraphs = ref([]);

// Save state (passed to the editor; set by onBlockSave)
const saving = ref(false);
const saveStatus = ref("");

// ============ VERSIONS SECTION ============
// State + CRUD extracted to useVersions composable (#10).
const {
    versions,
    versionsLoading,
    versionsError,
    showNewVersionModal,
    newVersionForm,
    editingVersion,
    fetchVersions,
    createVersion,
    updateVersionStatus,
    deleteVersion,
} = useVersions(profile);

// ============ MEDIA SECTION ============
// Library state + CRUD extracted to useDashboardMedia (#10). The media picker
// below stays in the view — it is glue to the chapters section.
const {
    mediaItems,
    mediaLoading,
    mediaError,
    mediaFilter,
    mediaSearch,
    selectedMedia,
    showMediaUploadModal,
    filteredMedia,
    mediaByType,
    fetchMedia,
    selectMedia,
    deleteMedia,
    formatFileSize,
} = useDashboardMedia();

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
        showMediaPicker.value = false;
        mediaPickerTarget.value = null;
        // Refresh content so ChapterBlockEditor rebuilds with the new media badge.
        await fetchChapterContent(expandedChapterId.value);
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
        // Refresh content so ChapterBlockEditor rebuilds without the media badge.
        await fetchChapterContent(expandedChapterId.value);
    } catch (err) {
        console.error("Error detaching media:", err);
    }
}

// ============ USERS SECTION ============
// State (incl. userRoleBreakdown) + CRUD extracted to useDashboardUsers (#10).
const {
    users,
    usersLoading,
    usersError,
    usersFilter,
    usersSearch,
    usersPage,
    usersPerPage,
    usersTotalCount,
    selectedUser,
    userRoleBreakdown,
    usersTotalPages,
    fetchUsers,
    nextUsersPage,
    prevUsersPage,
    selectUser,
    updateUserRole,
} = useDashboardUsers();

// ============ ANALYTICS SECTION ============
// State + fetch extracted to useDashboardAnalytics (#10). The cross-section
// aggregates (dashboardStats, maxRoleCount) and fetchDashboardData orchestrator
// stay in the view as shell logic. userRoleBreakdown lives in useDashboardUsers.
const {
    analyticsLoading,
    analyticsError,
    analyticsDateRange,
    analyticsMetrics,
    analyticsChartData,
    contentPerformance,
    quizPerformance,
    trendingHighlights,
    fetchAnalytics,
    formatDuration,
} = useDashboardAnalytics();

// ============ QUIZZES SECTION ============
// State (quiz + question editors) + CRUD extracted to useDashboardQuizzes (#10).
const {
    quizzes,
    quizzesLoading,
    quizzesError,
    showQuizEditor,
    editingQuiz,
    quizForm,
    showQuestionEditor,
    editingQuestion,
    questionForm,
    fetchQuizzes,
    openQuizEditor,
    fetchQuizQuestions,
    closeQuizEditor,
    saveQuiz,
    deleteQuiz,
    openQuestionEditor,
    closeQuestionEditor,
    saveQuestion,
    deleteQuestion,
} = useDashboardQuizzes(profile);

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
        // Collapse (ChapterBlockEditor unmounts and resets its own state)
        expandedChapterId.value = null;
        expandedChapterSections.value = [];
        expandedChapterParagraphs.value = [];
        return;
    }

    // Expand new chapter
    expandedChapterId.value = chapterId;
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
        // ChapterBlockEditor rebuilds its flat block list from these props.
    } catch (err) {
        console.error("Error fetching chapter content:", err);
    }
}

// ============ CHAPTER BLOCK EDITOR HANDLERS ============
// ChapterBlockEditor owns the editing UI + pure transforms; the DB writes that
// need a content refresh are handled here so the parent stays the data owner.

async function onBlockSave({ paragraphId, content, contentText }) {
    saving.value = true;
    saveStatus.value = "";
    try {
        await supabaseRest(`paragraphs?id=eq.${paragraphId}`, {
            method: "PATCH",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({
                content,
                content_text: contentText,
                updated_at: new Date().toISOString(),
            }),
        });
        saveStatus.value = "Saved!";
        // Refresh the expanded chapter content + the chapters list stats.
        await fetchChapterContent(expandedChapterId.value);
        await fetchAllChapters();
    } catch (err) {
        console.error("Error saving block:", err);
        saveStatus.value = "Error: " + err.message;
    } finally {
        saving.value = false;
    }
}

async function onBlockReorder({ orderedIds }) {
    try {
        for (let i = 0; i < orderedIds.length; i++) {
            await supabaseRest(`paragraphs?id=eq.${orderedIds[i]}`, {
                method: "PATCH",
                headers: { Prefer: "return=minimal" },
                body: JSON.stringify({
                    order_index: i,
                    updated_at: new Date().toISOString(),
                }),
            });
        }
        await fetchChapterContent(expandedChapterId.value);
    } catch (err) {
        console.error("Error reordering blocks:", err);
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
                        <ChapterBlockEditor
                            :sections="expandedChapterSections"
                            :paragraphs="expandedChapterParagraphs"
                            :media-items="mediaItems"
                            :saving="saving"
                            :save-status="saveStatus"
                            @save="onBlockSave"
                            @reorder="onBlockReorder"
                            @attach-media="openMediaPicker"
                            @detach-media="detachMedia"
                        />
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
        <VersionsSection
            v-else-if="activeSection === 'versions'"
            :versions="versions"
            :versions-loading="versionsLoading"
            :versions-error="versionsError"
            v-model:show-new-version-modal="showNewVersionModal"
            v-model:new-version-form="newVersionForm"
            @fetch="fetchVersions"
            @create="createVersion"
            @update-status="updateVersionStatus"
            @delete="deleteVersion"
        />

        <MediaSection
            v-else-if="activeSection === 'media'"
            :media-filter="mediaFilter"
            :media-filter-options="mediaFilterOptions"
            :media-loading="mediaLoading"
            :media-error="mediaError"
            :filtered-media="filteredMedia"
            :media-by-type="mediaByType"
            :format-file-size="formatFileSize"
            v-model:media-search="mediaSearch"
            v-model:selected-media="selectedMedia"
            @fetch="fetchMedia"
            @filter="onMediaFilter"
            @select="selectMedia"
            @delete="deleteMedia"
        />

        <QuizzesSection
            v-else-if="activeSection === 'quizzes'"
            :quizzes="quizzes"
            :quizzes-loading="quizzesLoading"
            :quizzes-error="quizzesError"
            :editing-quiz="editingQuiz"
            :editing-question="editingQuestion"
            v-model:show-quiz-editor="showQuizEditor"
            v-model:quiz-form="quizForm"
            v-model:show-question-editor="showQuestionEditor"
            v-model:question-form="questionForm"
            @fetch="fetchQuizzes"
            @open-quiz="openQuizEditor"
            @close-quiz="closeQuizEditor"
            @save-quiz="saveQuiz"
            @delete-quiz="deleteQuiz"
            @open-question="openQuestionEditor"
            @close-question="closeQuestionEditor"
            @save-question="saveQuestion"
            @delete-question="deleteQuestion"
        />

        <UsersSection
            v-else-if="activeSection === 'users'"
            :users="users"
            :users-loading="usersLoading"
            :users-error="usersError"
            :users-filter="usersFilter"
            :users-filter-options="usersFilterOptions"
            :users-search="usersSearch"
            :users-page="usersPage"
            :users-total-pages="usersTotalPages"
            :users-total-count="usersTotalCount"
            :user-role-breakdown="userRoleBreakdown"
            :role-select-options="roleSelectOptions"
            v-model:selected-user="selectedUser"
            @fetch="fetchUsers"
            @filter="onUsersFilter"
            @search="onUsersSearch"
            @select="selectUser"
            @page="goToUsersPage"
            @update-role="updateUserRole"
        />

        <AnalyticsSection
            v-else-if="activeSection === 'analytics'"
            :analytics-loading="analyticsLoading"
            :analytics-error="analyticsError"
            :analytics-date-range="analyticsDateRange"
            :analytics-range-options="analyticsRangeOptions"
            :analytics-metrics="analyticsMetrics"
            :analytics-chart-data="analyticsChartData"
            :content-performance="contentPerformance"
            :quiz-performance="quizPerformance"
            :trending-highlights="trendingHighlights"
            :format-duration="formatDuration"
            @fetch="fetchAnalytics"
            @range-change="onAnalyticsRange"
        />

        <!-- Media picker modal — section-independent: opened from
             ChapterBlockEditor (chapters section), so it must render
             regardless of activeSection. Bridges chapters <-> media. -->
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
    </DashboardShell>
</template>

<style scoped>
/*
 * Shared section layout/visual classes live in
 * src/styles/dashboard-sections.css (imported below) so the per-section
 * components (#11 split) and this view render identically from one source.
 * Only scoped-only rules remain here: full-screen states and :deep() targets
 * that reach into shared library components.
 *
 * NOTE: this project uses font-size: 62.5% on html/body so 1rem = 10px.
 */
@import "@/styles/dashboard-sections.css";

/* Full-screen states (loading / access denied) */
.screen {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgb(var(--color-bg));
}

/* Clickable StatCards (dashboard metrics, users role filters) — class falls
   through to the StatCard root, so :deep targets it through the StatGrid slot. */
:deep(.stat-click) { cursor: pointer; transition: background 0.12s ease; }
:deep(.stat-click:hover) { background: rgb(var(--color-ink) / 0.03); }

/* Lottie SVG fill inside the media modal preview (scoped :deep). */
.media-modal-lottie :deep(svg) { width: 100%; height: 100%; }
</style>
