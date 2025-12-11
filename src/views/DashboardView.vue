<script setup>
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { useAuth } from "@/composables/useAuth";
import { useRouter } from "vue-router";
import TipTapEditor from "@/components/Editor/TipTapEditor.vue";

const router = useRouter();
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
                `paragraphs?section_id=in.(${idsParam})&select=id,order_index,content,content_text,section_id,is_subsection_header&order=order_index.asc`,
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

function selectMedia(item) {
    selectedMedia.value = item;
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
            `quiz_attempts?select=status,score,total_points&created_at=gte.${startDateStr}`,
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
                    borderColor: "rgb(151, 71, 255)",
                    backgroundColor: "rgba(151, 71, 255, 0.1)",
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
function formatDate(dateString) {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    if (diff < 172800000) return "Yesterday";

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
}

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
};

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

onMounted(() => {
    if (activeSection.value === "chapters") {
        fetchAllChapters();
    }
});
</script>

<template>
    <div class="dashboard-layout">
        <!-- Loading State -->
        <div
            v-if="loading || profileLoading"
            class="flex items-center justify-center h-screen bg-darker"
        >
            <div class="text-xl text-light font-mono">Loading...</div>
        </div>

        <!-- Not Authenticated -->
        <div
            v-else-if="!isAuthenticated"
            class="flex flex-col items-center justify-center h-screen bg-darker gap-6"
        >
            <h1 class="text-4xl font-semibold text-white">Access Denied</h1>
            <p class="text-light text-lg">
                Please log in to access your dashboard.
            </p>
            <button
                @click="router.push('/')"
                class="uppercase bg-violet text-white font-mono px-8 py-3 rounded-full hover:bg-white hover:text-black transition-colors"
            >
                Go Home
            </button>
        </div>

        <!-- Authenticated Dashboard -->
        <template v-else>
            <!-- Sidebar -->
            <aside class="sidebar">
                <!-- Logo -->
                <div class="sidebar-logo">
                    <span class="logo-icon">OB</span>
                    <span class="logo-text">INSIDE THE BRAIN</span>
                </div>

                <!-- User Profile Card -->
                <div class="user-profile-card">
                    <div class="user-avatar">
                        <span class="avatar-icon">{{
                            displayName.charAt(0).toUpperCase()
                        }}</span>
                    </div>
                    <div class="user-info">
                        <p class="user-date">{{ currentDate }}</p>
                        <p class="user-name">{{ displayName }}</p>
                    </div>
                    <button class="edit-profile-btn" title="Edit Profile">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path
                                d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                            ></path>
                            <path
                                d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                            ></path>
                        </svg>
                    </button>
                </div>

                <!-- Navigation -->
                <nav class="sidebar-nav">
                    <button
                        v-for="item in creatorNavItems"
                        :key="item.id"
                        @click="setActiveSection(item.id)"
                        class="nav-item"
                        :class="{ active: activeSection === item.id }"
                    >
                        <!-- Icons -->
                        <svg
                            v-if="item.icon === 'grid'"
                            class="nav-icon"
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
                            <rect x="3" y="3" width="7" height="7"></rect>
                            <rect x="14" y="3" width="7" height="7"></rect>
                            <rect x="14" y="14" width="7" height="7"></rect>
                            <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                        <svg
                            v-else-if="item.icon === 'book'"
                            class="nav-icon"
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
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                            <path
                                d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
                            ></path>
                        </svg>
                        <svg
                            v-else-if="item.icon === 'layers'"
                            class="nav-icon"
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
                            <polygon
                                points="12 2 2 7 12 12 22 7 12 2"
                            ></polygon>
                            <polyline points="2 17 12 22 22 17"></polyline>
                            <polyline points="2 12 12 17 22 12"></polyline>
                        </svg>
                        <svg
                            v-else-if="item.icon === 'image'"
                            class="nav-icon"
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
                            <rect
                                x="3"
                                y="3"
                                width="18"
                                height="18"
                                rx="2"
                                ry="2"
                            ></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        <svg
                            v-else-if="item.icon === 'quiz'"
                            class="nav-icon"
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
                            <circle cx="12" cy="12" r="10"></circle>
                            <path
                                d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
                            ></path>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        <svg
                            v-else-if="item.icon === 'users'"
                            class="nav-icon"
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
                                d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                            ></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <svg
                            v-else-if="item.icon === 'chart'"
                            class="nav-icon"
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
                            <line x1="18" y1="20" x2="18" y2="10"></line>
                            <line x1="12" y1="20" x2="12" y2="4"></line>
                            <line x1="6" y1="20" x2="6" y2="14"></line>
                        </svg>
                        <span class="nav-label">{{ item.label }}</span>
                    </button>
                </nav>

                <!-- Read Book Button -->
                <div class="sidebar-footer">
                    <button @click="goToBook" class="read-book-btn">
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
                                d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"
                            ></path>
                            <path
                                d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
                            ></path>
                        </svg>
                        Read Book
                    </button>
                </div>
            </aside>

            <!-- Main Content -->
            <main class="main-content">
                <!-- Header -->
                <header class="content-header">
                    <div class="header-left">
                        <h1 class="page-title">
                            {{
                                creatorNavItems.find(
                                    (i) => i.id === activeSection,
                                )?.label || "Dashboard"
                            }}
                        </h1>
                    </div>
                    <div class="header-right">
                        <button @click="handleLogout" class="logout-btn">
                            Log Out
                        </button>
                    </div>
                </header>

                <!-- Dashboard Overview (default view) -->
                <section
                    v-if="activeSection === 'dashboard'"
                    class="dashboard-content"
                >
                    <!-- Metrics Graph -->
                    <div class="metrics-card">
                        <div class="metrics-header">
                            <div class="metrics-period">
                                <button class="period-btn active">
                                    Last 7 Days
                                </button>
                                <button class="period-btn">Last 30 Days</button>
                                <button class="period-btn">All Time</button>
                            </div>
                        </div>
                        <div class="metrics-chart">
                            <!-- Placeholder chart -->
                            <div class="chart-placeholder">
                                <svg viewBox="0 0 400 150" class="chart-svg">
                                    <!-- Grid lines -->
                                    <line
                                        x1="0"
                                        y1="30"
                                        x2="400"
                                        y2="30"
                                        class="grid-line"
                                    />
                                    <line
                                        x1="0"
                                        y1="60"
                                        x2="400"
                                        y2="60"
                                        class="grid-line"
                                    />
                                    <line
                                        x1="0"
                                        y1="90"
                                        x2="400"
                                        y2="90"
                                        class="grid-line"
                                    />
                                    <line
                                        x1="0"
                                        y1="120"
                                        x2="400"
                                        y2="120"
                                        class="grid-line"
                                    />

                                    <!-- Active users line (violet) -->
                                    <path
                                        d="M0,100 C50,90 100,70 150,75 S250,50 300,40 S380,30 400,25"
                                        class="chart-line-active"
                                        fill="none"
                                    />

                                    <!-- Edits line (lighter) -->
                                    <path
                                        d="M0,110 C50,105 100,95 150,100 S250,80 300,85 S380,70 400,65"
                                        class="chart-line-edits"
                                        fill="none"
                                    />

                                    <!-- Sign ups line (lightest) -->
                                    <path
                                        d="M0,130 C50,125 100,120 150,115 S250,110 300,100 S380,95 400,90"
                                        class="chart-line-signups"
                                        fill="none"
                                    />
                                </svg>
                                <div class="chart-labels">
                                    <span>0</span>
                                    <span>1</span>
                                    <span>2</span>
                                    <span>3</span>
                                    <span>4</span>
                                    <span>5</span>
                                    <span>6</span>
                                    <span>7</span>
                                </div>
                            </div>
                            <div class="chart-legend">
                                <span class="legend-item"
                                    ><span class="legend-dot active"></span>
                                    Active</span
                                >
                                <span class="legend-item"
                                    ><span class="legend-dot edits"></span>
                                    Edits</span
                                >
                                <span class="legend-item"
                                    ><span class="legend-dot signups"></span>
                                    Sign Ups</span
                                >
                            </div>
                        </div>
                    </div>

                    <!-- Quick Access Cards -->
                    <div class="cards-grid">
                        <!-- Chapters Card (Large) -->
                        <button
                            @click="setActiveSection('chapters')"
                            class="quick-card large"
                        >
                            <div class="card-icon">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="32"
                                    height="32"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <path
                                        d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
                                    ></path>
                                    <path
                                        d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
                                    ></path>
                                </svg>
                            </div>
                            <h3 class="card-title">Chapters</h3>
                            <p class="card-subtitle">Manage content</p>
                        </button>

                        <!-- Users Card (Large) -->
                        <button
                            @click="setActiveSection('users')"
                            class="quick-card large"
                        >
                            <div class="card-icon">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="32"
                                    height="32"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <path
                                        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                                    ></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                            </div>
                            <h3 class="card-title">Users</h3>
                            <p class="card-subtitle">Professors & Students</p>
                        </button>

                        <!-- Media Card (Small) -->
                        <button
                            @click="setActiveSection('media')"
                            class="quick-card small"
                        >
                            <div class="card-icon">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <rect
                                        x="3"
                                        y="3"
                                        width="18"
                                        height="18"
                                        rx="2"
                                        ry="2"
                                    ></rect>
                                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                    <polyline
                                        points="21 15 16 10 5 21"
                                    ></polyline>
                                </svg>
                            </div>
                            <h3 class="card-title">Media</h3>
                        </button>

                        <!-- Analytics Card (Small) -->
                        <button
                            @click="setActiveSection('analytics')"
                            class="quick-card small"
                        >
                            <div class="card-icon">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <line
                                        x1="18"
                                        y1="20"
                                        x2="18"
                                        y2="10"
                                    ></line>
                                    <line x1="12" y1="20" x2="12" y2="4"></line>
                                    <line x1="6" y1="20" x2="6" y2="14"></line>
                                </svg>
                            </div>
                            <h3 class="card-title">Analytics</h3>
                        </button>

                        <!-- Versions Card (Small) -->
                        <button
                            @click="setActiveSection('versions')"
                            class="quick-card small"
                        >
                            <div class="card-icon">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <polygon
                                        points="12 2 2 7 12 12 22 7 12 2"
                                    ></polygon>
                                    <polyline
                                        points="2 17 12 22 22 17"
                                    ></polyline>
                                    <polyline
                                        points="2 12 12 17 22 12"
                                    ></polyline>
                                </svg>
                            </div>
                            <h3 class="card-title">Versions</h3>
                        </button>
                    </div>
                </section>

                <!-- Chapters Section -->
                <section
                    v-else-if="activeSection === 'chapters'"
                    class="chapters-section"
                >
                    <!-- Loading State -->
                    <div v-if="chaptersLoading" class="chapters-loading">
                        <span>Loading chapters...</span>
                    </div>

                    <!-- Error State -->
                    <div v-else-if="chaptersError" class="chapters-error">
                        <p>Error loading chapters: {{ chaptersError }}</p>
                        <button @click="fetchAllChapters" class="action-btn">
                            Retry
                        </button>
                    </div>

                    <!-- Chapters List -->
                    <div v-else class="chapters-list">
                        <!-- Chapter Cards -->
                        <div
                            v-for="(chapter, chapterIndex) in chapters"
                            :key="chapter.id"
                            class="chapter-card"
                            :class="{
                                expanded: expandedChapterId === chapter.id,
                            }"
                        >
                            <!-- Chapter Header (always visible) -->
                            <div
                                class="chapter-header"
                                @click="toggleChapter(chapter.id)"
                            >
                                <div class="chapter-title-row">
                                    <span class="chapter-number">
                                        CHAPTER {{ chapter.order_index }}
                                    </span>
                                    <h3 class="chapter-title">
                                        {{ chapter.title }}
                                    </h3>
                                    <span
                                        class="status-badge"
                                        :class="chapter.status"
                                    >
                                        {{ chapter.status }}
                                    </span>
                                    <button
                                        v-if="expandedChapterId === chapter.id"
                                        class="close-btn"
                                        @click.stop="toggleChapter(chapter.id)"
                                    >
                                        Close
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            stroke-width="2"
                                        >
                                            <polyline
                                                points="18 15 12 9 6 15"
                                            ></polyline>
                                        </svg>
                                    </button>
                                    <svg
                                        v-else
                                        class="chevron-icon"
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                    >
                                        <polyline
                                            points="6 9 12 15 18 9"
                                        ></polyline>
                                    </svg>
                                </div>

                                <!-- Stats Row (collapsed state) -->
                                <div
                                    v-if="expandedChapterId !== chapter.id"
                                    class="chapter-stats-row"
                                >
                                    <span
                                        >{{
                                            chapter.sectionCount
                                        }}
                                        sections</span
                                    >
                                    <span class="dot">·</span>
                                    <span
                                        >{{
                                            chapter.paragraphCount
                                        }}
                                        paragraphs</span
                                    >
                                    <span class="dot">·</span>
                                    <span
                                        >{{
                                            chapter.wordCount.toLocaleString()
                                        }}
                                        words</span
                                    >
                                    <span class="dot">·</span>
                                    <span
                                        >{{ chapter.readingTime }} min
                                        read</span
                                    >
                                </div>
                                <div
                                    v-if="expandedChapterId !== chapter.id"
                                    class="chapter-meta"
                                >
                                    Last edited:
                                    {{ formatDate(chapter.updated_at) }}
                                </div>
                            </div>

                            <!-- Expanded Content -->
                            <div
                                v-if="expandedChapterId === chapter.id"
                                class="chapter-content"
                            >
                                <div class="chapter-editor-layout">
                                    <!-- Left: Block List -->
                                    <div class="blocks-sidebar">
                                        <div class="blocks-list">
                                            <div
                                                v-for="block in flatBlocks"
                                                :key="block.id"
                                                class="block-item"
                                                :class="{
                                                    section:
                                                        block.type ===
                                                        'section',
                                                    paragraph:
                                                        block.type ===
                                                        'paragraph',
                                                    selected:
                                                        selectedBlock?.id ===
                                                        block.id,
                                                    highlighted:
                                                        highlightedBlockId ===
                                                            block.id &&
                                                        !selectedBlock,
                                                    'drag-over':
                                                        dragOverBlockId ===
                                                        block.id,
                                                }"
                                                :draggable="
                                                    block.type === 'paragraph'
                                                "
                                                @click="selectBlock(block)"
                                                @dragstart="
                                                    handleDragStart(
                                                        $event,
                                                        block,
                                                    )
                                                "
                                                @dragover="
                                                    handleDragOver(
                                                        $event,
                                                        block,
                                                    )
                                                "
                                                @dragleave="handleDragLeave"
                                                @drop="
                                                    handleDrop($event, block)
                                                "
                                                @dragend="handleDragEnd"
                                            >
                                                <!-- Section -->
                                                <template
                                                    v-if="
                                                        block.type === 'section'
                                                    "
                                                >
                                                    <svg
                                                        class="block-icon"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        width="16"
                                                        height="16"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        stroke-width="2"
                                                    >
                                                        <path
                                                            d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
                                                        ></path>
                                                        <path
                                                            d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
                                                        ></path>
                                                    </svg>
                                                    <span class="block-title">{{
                                                        block.title
                                                    }}</span>
                                                </template>

                                                <!-- Paragraph -->
                                                <template v-else>
                                                    <svg
                                                        class="drag-handle"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        width="14"
                                                        height="14"
                                                        viewBox="0 0 24 24"
                                                        fill="currentColor"
                                                    >
                                                        <circle
                                                            cx="9"
                                                            cy="5"
                                                            r="1.5"
                                                        ></circle>
                                                        <circle
                                                            cx="15"
                                                            cy="5"
                                                            r="1.5"
                                                        ></circle>
                                                        <circle
                                                            cx="9"
                                                            cy="12"
                                                            r="1.5"
                                                        ></circle>
                                                        <circle
                                                            cx="15"
                                                            cy="12"
                                                            r="1.5"
                                                        ></circle>
                                                        <circle
                                                            cx="9"
                                                            cy="19"
                                                            r="1.5"
                                                        ></circle>
                                                        <circle
                                                            cx="15"
                                                            cy="19"
                                                            r="1.5"
                                                        ></circle>
                                                    </svg>
                                                    <span class="block-index"
                                                        >P{{
                                                            block.paraIndex + 1
                                                        }}</span
                                                    >
                                                    <span
                                                        class="block-preview"
                                                        >{{
                                                            block.preview ||
                                                            "Empty paragraph"
                                                        }}</span
                                                    >
                                                    <svg
                                                        v-if="
                                                            selectedBlock?.id ===
                                                            block.id
                                                        "
                                                        class="selected-arrow"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        width="16"
                                                        height="16"
                                                        viewBox="0 0 24 24"
                                                        fill="currentColor"
                                                    >
                                                        <path
                                                            d="M9 18l6-6-6-6"
                                                        ></path>
                                                    </svg>
                                                </template>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Right: Stats Panel or Editor -->
                                    <div class="editor-panel">
                                        <!-- Stats Panel (no selection) -->
                                        <div
                                            v-if="!selectedBlock"
                                            class="stats-panel"
                                        >
                                            <div class="stats-grid">
                                                <div class="stat-item">
                                                    <span class="stat-value">{{
                                                        chapterStats?.sections ||
                                                        0
                                                    }}</span>
                                                    <span class="stat-label"
                                                        >Sections</span
                                                    >
                                                </div>
                                                <div class="stat-item">
                                                    <span class="stat-value">{{
                                                        chapterStats?.paragraphs ||
                                                        0
                                                    }}</span>
                                                    <span class="stat-label"
                                                        >Paragraphs</span
                                                    >
                                                </div>
                                                <div class="stat-item">
                                                    <span class="stat-value">{{
                                                        chapterStats?.words?.toLocaleString() ||
                                                        0
                                                    }}</span>
                                                    <span class="stat-label"
                                                        >Words</span
                                                    >
                                                </div>
                                                <div class="stat-item">
                                                    <span class="stat-value">{{
                                                        chapterStats?.readingTime ||
                                                        0
                                                    }}</span>
                                                    <span class="stat-label"
                                                        >Min Read</span
                                                    >
                                                </div>
                                            </div>

                                            <!-- Content Preview -->
                                            <div
                                                class="content-preview"
                                                ref="contentPreviewRef"
                                            >
                                                <h4 class="preview-title">
                                                    Content Preview
                                                </h4>
                                                <div class="preview-content">
                                                    <div
                                                        v-for="block in flatBlocks"
                                                        :key="block.id"
                                                        :data-block-id="
                                                            block.id
                                                        "
                                                        class="preview-block"
                                                        :class="{
                                                            section:
                                                                block.type ===
                                                                'section',
                                                            paragraph:
                                                                block.type ===
                                                                'paragraph',
                                                        }"
                                                    >
                                                        <!-- Section Header -->
                                                        <template
                                                            v-if="
                                                                block.type ===
                                                                'section'
                                                            "
                                                        >
                                                            <div
                                                                class="preview-section-header"
                                                            >
                                                                <div
                                                                    class="preview-section-meta"
                                                                >
                                                                    <span
                                                                        class="meta-badge section-badge"
                                                                        >Section
                                                                        {{
                                                                            block.sectionIndex +
                                                                            1
                                                                        }}</span
                                                                    >
                                                                    <span
                                                                        class="meta-slug"
                                                                        >{{
                                                                            block.slug
                                                                        }}</span
                                                                    >
                                                                </div>
                                                                <h5
                                                                    class="preview-section-title"
                                                                >
                                                                    {{
                                                                        block.title
                                                                    }}
                                                                </h5>
                                                            </div>
                                                        </template>

                                                        <!-- Paragraph Block -->
                                                        <template v-else>
                                                            <div
                                                                class="preview-para-wrapper"
                                                            >
                                                                <div
                                                                    class="preview-para-meta"
                                                                >
                                                                    <span
                                                                        class="meta-index"
                                                                        >P{{
                                                                            block.paraIndex +
                                                                            1
                                                                        }}</span
                                                                    >
                                                                    <span
                                                                        class="meta-words"
                                                                        >{{
                                                                            block.wordCount
                                                                        }}
                                                                        words</span
                                                                    >
                                                                    <span
                                                                        v-if="
                                                                            block.isSubsectionHeader
                                                                        "
                                                                        class="meta-badge subsection-badge"
                                                                        >Subsection</span
                                                                    >
                                                                </div>
                                                                <div
                                                                    class="preview-para-content"
                                                                    v-html="
                                                                        block.htmlContent ||
                                                                        block.contentText ||
                                                                        block.preview
                                                                    "
                                                                ></div>
                                                            </div>
                                                        </template>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Editor Panel (with selection) -->
                                        <div v-else class="editor-content">
                                            <div class="editor-header">
                                                <button
                                                    class="back-btn"
                                                    @click="clearSelection"
                                                >
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        width="16"
                                                        height="16"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        stroke-width="2"
                                                    >
                                                        <path
                                                            d="M19 12H5M12 19l-7-7 7-7"
                                                        ></path>
                                                    </svg>
                                                    Back to overview
                                                </button>
                                                <h4 class="editing-title">
                                                    Editing:
                                                    {{
                                                        selectedBlock.preview ||
                                                        "Paragraph"
                                                    }}
                                                </h4>
                                            </div>

                                            <TipTapEditor
                                                v-model="editorContent"
                                                placeholder="Start writing..."
                                            />

                                            <div class="editor-footer">
                                                <span
                                                    v-if="saveStatus"
                                                    class="save-status"
                                                    :class="{
                                                        error: saveStatus.includes(
                                                            'Error',
                                                        ),
                                                    }"
                                                >
                                                    {{ saveStatus }}
                                                </span>
                                                <button
                                                    class="save-btn"
                                                    @click="saveBlock"
                                                    :disabled="saving"
                                                >
                                                    {{
                                                        saving
                                                            ? "Saving..."
                                                            : "Save"
                                                    }}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Add New Chapter Button -->
                        <button class="add-chapter-btn">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                            >
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            <span>Add New Chapter</span>
                        </button>
                    </div>
                </section>

                <!-- Versions Section -->
                <section
                    v-else-if="activeSection === 'versions'"
                    class="section-content"
                >
                    <div class="section-header-row">
                        <h2 class="section-title">Versions</h2>
                        <button
                            class="primary-btn"
                            @click="showNewVersionModal = true"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                            >
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            New Version
                        </button>
                    </div>

                    <!-- Loading -->
                    <div v-if="versionsLoading" class="loading-state">
                        <div class="spinner"></div>
                        <p>Loading versions...</p>
                    </div>

                    <!-- Error -->
                    <div v-else-if="versionsError" class="error-state">
                        <p>{{ versionsError }}</p>
                        <button @click="fetchVersions" class="retry-btn">
                            Retry
                        </button>
                    </div>

                    <!-- Empty State -->
                    <div v-else-if="versions.length === 0" class="empty-state">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="48"
                            height="48"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.5"
                        >
                            <polygon
                                points="12 2 2 7 12 12 22 7 12 2"
                            ></polygon>
                            <polyline points="2 17 12 22 22 17"></polyline>
                            <polyline points="2 12 12 17 22 12"></polyline>
                        </svg>
                        <h3>No versions yet</h3>
                        <p>Create your first content version to get started.</p>
                        <button
                            class="primary-btn"
                            @click="showNewVersionModal = true"
                        >
                            Create Version
                        </button>
                    </div>

                    <!-- Versions List -->
                    <div v-else class="versions-list">
                        <div
                            v-for="version in versions"
                            :key="version.id"
                            class="version-card"
                        >
                            <div class="version-header">
                                <div class="version-info">
                                    <h3 class="version-number">
                                        v{{ version.version_number }}
                                    </h3>
                                    <span
                                        class="status-badge"
                                        :class="version.status"
                                    >
                                        {{ version.status }}
                                    </span>
                                </div>
                                <div class="version-actions">
                                    <button
                                        v-if="version.status === 'draft'"
                                        class="action-btn publish"
                                        @click="
                                            updateVersionStatus(
                                                version.id,
                                                'published',
                                            )
                                        "
                                        title="Publish"
                                    >
                                        Publish
                                    </button>
                                    <button
                                        v-if="version.status === 'published'"
                                        class="action-btn archive"
                                        @click="
                                            updateVersionStatus(
                                                version.id,
                                                'archived',
                                            )
                                        "
                                        title="Archive"
                                    >
                                        Archive
                                    </button>
                                    <button
                                        class="action-btn delete"
                                        @click="deleteVersion(version.id)"
                                        title="Delete"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            stroke-width="2"
                                        >
                                            <polyline
                                                points="3 6 5 6 21 6"
                                            ></polyline>
                                            <path
                                                d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                                            ></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div class="version-meta">
                                <span>{{ version.moduleCount }} modules</span>
                                <span
                                    >Created
                                    {{ formatDate(version.created_at) }}</span
                                >
                                <span v-if="version.published_at"
                                    >Published
                                    {{ formatDate(version.published_at) }}</span
                                >
                            </div>
                            <p
                                v-if="version.release_notes"
                                class="version-notes"
                            >
                                {{ version.release_notes }}
                            </p>
                        </div>
                    </div>

                    <!-- New Version Modal -->
                    <div
                        v-if="showNewVersionModal"
                        class="modal-overlay"
                        @click.self="showNewVersionModal = false"
                    >
                        <div class="modal-content">
                            <h3>Create New Version</h3>
                            <div class="form-group">
                                <label>Version Number</label>
                                <input
                                    v-model="newVersionForm.version_number"
                                    type="text"
                                    placeholder="e.g., 2.0"
                                    class="form-input"
                                />
                            </div>
                            <div class="form-group">
                                <label>Release Notes</label>
                                <textarea
                                    v-model="newVersionForm.release_notes"
                                    placeholder="What's new in this version..."
                                    class="form-textarea"
                                    rows="4"
                                ></textarea>
                            </div>
                            <div class="modal-actions">
                                <button
                                    class="secondary-btn"
                                    @click="showNewVersionModal = false"
                                >
                                    Cancel
                                </button>
                                <button
                                    class="primary-btn"
                                    @click="createVersion"
                                >
                                    Create Version
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Media Section -->
                <section
                    v-else-if="activeSection === 'media'"
                    class="section-content"
                >
                    <div class="section-header-row">
                        <h2 class="section-title">Media Library</h2>
                        <div class="header-controls">
                            <select
                                v-model="mediaFilter"
                                @change="fetchMedia"
                                class="filter-select"
                            >
                                <option value="all">All Types</option>
                                <option value="lottie">Lottie</option>
                                <option value="video">Video</option>
                                <option value="image">Image</option>
                                <option value="youtube">YouTube</option>
                            </select>
                            <input
                                v-model="mediaSearch"
                                type="text"
                                placeholder="Search media..."
                                class="search-input"
                            />
                        </div>
                    </div>

                    <!-- Loading -->
                    <div v-if="mediaLoading" class="loading-state">
                        <div class="spinner"></div>
                        <p>Loading media...</p>
                    </div>

                    <!-- Error -->
                    <div v-else-if="mediaError" class="error-state">
                        <p>{{ mediaError }}</p>
                        <button @click="fetchMedia" class="retry-btn">
                            Retry
                        </button>
                    </div>

                    <!-- Empty State -->
                    <div
                        v-else-if="filteredMedia.length === 0"
                        class="empty-state"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="48"
                            height="48"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.5"
                        >
                            <rect
                                x="3"
                                y="3"
                                width="18"
                                height="18"
                                rx="2"
                                ry="2"
                            ></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        <h3>No media found</h3>
                        <p>
                            Upload animations, images, and videos to use in your
                            content.
                        </p>
                    </div>

                    <!-- Media Grid with Detail Panel -->
                    <div v-else class="media-layout">
                        <div class="media-grid-container">
                            <!-- Lottie Section -->
                            <div
                                v-if="mediaByType.lottie.length > 0"
                                class="media-type-section"
                            >
                                <h3 class="media-type-title">
                                    Lottie Animations ({{
                                        mediaByType.lottie.length
                                    }})
                                </h3>
                                <div class="media-grid">
                                    <div
                                        v-for="item in mediaByType.lottie"
                                        :key="item.id"
                                        class="media-card"
                                        :class="{
                                            selected:
                                                selectedMedia?.id === item.id,
                                        }"
                                        @click="selectMedia(item)"
                                    >
                                        <div class="media-thumb lottie">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="32"
                                                height="32"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-width="1.5"
                                            >
                                                <polygon
                                                    points="5 3 19 12 5 21 5 3"
                                                ></polygon>
                                            </svg>
                                        </div>
                                        <div class="media-info">
                                            <span class="media-title">{{
                                                item.title || item.animation_key
                                            }}</span>
                                            <span class="media-size">{{
                                                formatFileSize(
                                                    item.file_size_bytes,
                                                )
                                            }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Video Section -->
                            <div
                                v-if="mediaByType.video.length > 0"
                                class="media-type-section"
                            >
                                <h3 class="media-type-title">
                                    Videos ({{ mediaByType.video.length }})
                                </h3>
                                <div class="media-grid">
                                    <div
                                        v-for="item in mediaByType.video"
                                        :key="item.id"
                                        class="media-card"
                                        :class="{
                                            selected:
                                                selectedMedia?.id === item.id,
                                        }"
                                        @click="selectMedia(item)"
                                    >
                                        <div class="media-thumb video">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="32"
                                                height="32"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-width="1.5"
                                            >
                                                <rect
                                                    x="2"
                                                    y="2"
                                                    width="20"
                                                    height="20"
                                                    rx="2.18"
                                                    ry="2.18"
                                                ></rect>
                                                <line
                                                    x1="7"
                                                    y1="2"
                                                    x2="7"
                                                    y2="22"
                                                ></line>
                                                <line
                                                    x1="17"
                                                    y1="2"
                                                    x2="17"
                                                    y2="22"
                                                ></line>
                                                <line
                                                    x1="2"
                                                    y1="12"
                                                    x2="22"
                                                    y2="12"
                                                ></line>
                                                <line
                                                    x1="2"
                                                    y1="7"
                                                    x2="7"
                                                    y2="7"
                                                ></line>
                                                <line
                                                    x1="2"
                                                    y1="17"
                                                    x2="7"
                                                    y2="17"
                                                ></line>
                                                <line
                                                    x1="17"
                                                    y1="17"
                                                    x2="22"
                                                    y2="17"
                                                ></line>
                                                <line
                                                    x1="17"
                                                    y1="7"
                                                    x2="22"
                                                    y2="7"
                                                ></line>
                                            </svg>
                                        </div>
                                        <div class="media-info">
                                            <span class="media-title">{{
                                                item.title || item.animation_key
                                            }}</span>
                                            <span class="media-size">{{
                                                formatFileSize(
                                                    item.file_size_bytes,
                                                )
                                            }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Image Section -->
                            <div
                                v-if="mediaByType.image.length > 0"
                                class="media-type-section"
                            >
                                <h3 class="media-type-title">
                                    Images ({{ mediaByType.image.length }})
                                </h3>
                                <div class="media-grid">
                                    <div
                                        v-for="item in mediaByType.image"
                                        :key="item.id"
                                        class="media-card"
                                        :class="{
                                            selected:
                                                selectedMedia?.id === item.id,
                                        }"
                                        @click="selectMedia(item)"
                                    >
                                        <div class="media-thumb image">
                                            <img
                                                v-if="item.image_file_url"
                                                :src="item.image_file_url"
                                                :alt="item.title"
                                            />
                                            <svg
                                                v-else
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="32"
                                                height="32"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-width="1.5"
                                            >
                                                <rect
                                                    x="3"
                                                    y="3"
                                                    width="18"
                                                    height="18"
                                                    rx="2"
                                                    ry="2"
                                                ></rect>
                                                <circle
                                                    cx="8.5"
                                                    cy="8.5"
                                                    r="1.5"
                                                ></circle>
                                                <polyline
                                                    points="21 15 16 10 5 21"
                                                ></polyline>
                                            </svg>
                                        </div>
                                        <div class="media-info">
                                            <span class="media-title">{{
                                                item.title || item.animation_key
                                            }}</span>
                                            <span class="media-size">{{
                                                formatFileSize(
                                                    item.file_size_bytes,
                                                )
                                            }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- YouTube Section -->
                            <div
                                v-if="mediaByType.youtube.length > 0"
                                class="media-type-section"
                            >
                                <h3 class="media-type-title">
                                    YouTube ({{ mediaByType.youtube.length }})
                                </h3>
                                <div class="media-grid">
                                    <div
                                        v-for="item in mediaByType.youtube"
                                        :key="item.id"
                                        class="media-card"
                                        :class="{
                                            selected:
                                                selectedMedia?.id === item.id,
                                        }"
                                        @click="selectMedia(item)"
                                    >
                                        <div class="media-thumb youtube">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="32"
                                                height="32"
                                                viewBox="0 0 24 24"
                                                fill="currentColor"
                                            >
                                                <path
                                                    d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"
                                                />
                                            </svg>
                                        </div>
                                        <div class="media-info">
                                            <span class="media-title">{{
                                                item.title || item.animation_key
                                            }}</span>
                                            <span class="media-size">{{
                                                item.youtube_id
                                            }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Detail Panel -->
                        <div v-if="selectedMedia" class="media-detail-panel">
                            <div class="detail-header">
                                <h3>
                                    {{
                                        selectedMedia.title ||
                                        selectedMedia.animation_key
                                    }}
                                </h3>
                                <button
                                    class="close-btn"
                                    @click="selectedMedia = null"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                    >
                                        <line
                                            x1="18"
                                            y1="6"
                                            x2="6"
                                            y2="18"
                                        ></line>
                                        <line
                                            x1="6"
                                            y1="6"
                                            x2="18"
                                            y2="18"
                                        ></line>
                                    </svg>
                                </button>
                            </div>
                            <div class="detail-preview">
                                <div class="preview-placeholder">
                                    <span class="media-type-badge">{{
                                        selectedMedia.media_type
                                    }}</span>
                                </div>
                            </div>
                            <div class="detail-info">
                                <div class="info-row">
                                    <span class="info-label">Key</span>
                                    <span class="info-value">{{
                                        selectedMedia.animation_key
                                    }}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Type</span>
                                    <span class="info-value">{{
                                        selectedMedia.media_type
                                    }}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Size</span>
                                    <span class="info-value">{{
                                        formatFileSize(
                                            selectedMedia.file_size_bytes,
                                        )
                                    }}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Priority</span>
                                    <span class="info-value">{{
                                        selectedMedia.load_priority || "normal"
                                    }}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Domain</span>
                                    <span class="info-value">{{
                                        selectedMedia.scientific_domain || "-"
                                    }}</span>
                                </div>
                                <div
                                    v-if="selectedMedia.description"
                                    class="info-row full"
                                >
                                    <span class="info-label">Description</span>
                                    <p class="info-value">
                                        {{ selectedMedia.description }}
                                    </p>
                                </div>
                            </div>
                            <div class="detail-actions">
                                <button
                                    class="danger-btn"
                                    @click="deleteMedia(selectedMedia.id)"
                                >
                                    Delete Asset
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Quizzes Section -->
                <section
                    v-else-if="activeSection === 'quizzes'"
                    class="section-content"
                >
                    <div class="section-header-row">
                        <h2 class="section-title">Quizzes</h2>
                        <button class="primary-btn" @click="openQuizEditor()">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                            >
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            New Quiz
                        </button>
                    </div>

                    <!-- Loading -->
                    <div v-if="quizzesLoading" class="loading-state">
                        <div class="spinner"></div>
                        <p>Loading quizzes...</p>
                    </div>

                    <!-- Error -->
                    <div v-else-if="quizzesError" class="error-state">
                        <p>{{ quizzesError }}</p>
                        <button @click="fetchQuizzes" class="retry-btn">
                            Retry
                        </button>
                    </div>

                    <!-- Empty State -->
                    <div
                        v-else-if="quizzes.length === 0 && !showQuizEditor"
                        class="empty-state"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="48"
                            height="48"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.5"
                        >
                            <circle cx="12" cy="12" r="10"></circle>
                            <path
                                d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
                            ></path>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        <h3>No quizzes yet</h3>
                        <p>Create quizzes to test student understanding.</p>
                        <button class="primary-btn" @click="openQuizEditor()">
                            Create Quiz
                        </button>
                    </div>

                    <!-- Quiz Editor -->
                    <div v-else-if="showQuizEditor" class="quiz-editor">
                        <div class="editor-header">
                            <button class="back-btn" @click="closeQuizEditor">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <polyline
                                        points="15 18 9 12 15 6"
                                    ></polyline>
                                </svg>
                                Back to Quizzes
                            </button>
                            <h3>
                                {{ editingQuiz ? "Edit Quiz" : "New Quiz" }}
                            </h3>
                        </div>

                        <div class="quiz-form">
                            <div class="form-row">
                                <div class="form-group flex-1">
                                    <label>Quiz Title</label>
                                    <input
                                        v-model="quizForm.title"
                                        type="text"
                                        placeholder="e.g., Chapter 1 Quiz"
                                        class="form-input"
                                    />
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group flex-1">
                                    <label>Description</label>
                                    <textarea
                                        v-model="quizForm.description"
                                        placeholder="Quiz description..."
                                        class="form-textarea"
                                        rows="2"
                                    ></textarea>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Time Limit (minutes)</label>
                                    <input
                                        v-model.number="
                                            quizForm.time_limit_minutes
                                        "
                                        type="number"
                                        min="1"
                                        class="form-input small"
                                    />
                                </div>
                                <div class="form-group">
                                    <label>Passing Score (%)</label>
                                    <input
                                        v-model.number="quizForm.passing_score"
                                        type="number"
                                        min="0"
                                        max="100"
                                        class="form-input small"
                                    />
                                </div>
                            </div>
                            <div class="form-row">
                                <label class="checkbox-label">
                                    <input
                                        type="checkbox"
                                        v-model="
                                            quizForm.allow_multiple_attempts
                                        "
                                    />
                                    Allow multiple attempts
                                </label>
                                <label class="checkbox-label">
                                    <input
                                        type="checkbox"
                                        v-model="quizForm.show_correct_answers"
                                    />
                                    Show correct answers after submission
                                </label>
                            </div>

                            <div class="form-actions">
                                <button
                                    class="secondary-btn"
                                    @click="closeQuizEditor"
                                >
                                    Cancel
                                </button>
                                <button class="primary-btn" @click="saveQuiz">
                                    {{
                                        editingQuiz
                                            ? "Save Changes"
                                            : "Create Quiz"
                                    }}
                                </button>
                            </div>
                        </div>

                        <!-- Questions Section (only when editing existing quiz) -->
                        <div v-if="editingQuiz" class="questions-section">
                            <div class="questions-header">
                                <h4>
                                    Questions ({{ quizForm.questions.length }})
                                </h4>
                                <button
                                    class="secondary-btn"
                                    @click="openQuestionEditor()"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                    >
                                        <line
                                            x1="12"
                                            y1="5"
                                            x2="12"
                                            y2="19"
                                        ></line>
                                        <line
                                            x1="5"
                                            y1="12"
                                            x2="19"
                                            y2="12"
                                        ></line>
                                    </svg>
                                    Add Question
                                </button>
                            </div>

                            <div
                                v-if="quizForm.questions.length === 0"
                                class="empty-questions"
                            >
                                <p>
                                    No questions yet. Add your first question to
                                    get started.
                                </p>
                            </div>

                            <div v-else class="questions-list">
                                <div
                                    v-for="(
                                        question, index
                                    ) in quizForm.questions"
                                    :key="question.id"
                                    class="question-card"
                                >
                                    <div class="question-header">
                                        <span class="question-number"
                                            >Q{{ index + 1 }}</span
                                        >
                                        <span class="question-type-badge">{{
                                            question.question_type
                                        }}</span>
                                        <span class="question-points"
                                            >{{ question.points }} pt{{
                                                question.points !== 1 ? "s" : ""
                                            }}</span
                                        >
                                    </div>
                                    <p class="question-text">
                                        {{ question.question_text }}
                                    </p>
                                    <div
                                        v-if="question.options"
                                        class="question-options"
                                    >
                                        <div
                                            v-for="(
                                                option, optIndex
                                            ) in question.options"
                                            :key="optIndex"
                                            class="option"
                                            :class="{
                                                correct:
                                                    option ===
                                                    question.correct_answer,
                                            }"
                                        >
                                            {{
                                                String.fromCharCode(
                                                    65 + optIndex,
                                                )
                                            }}. {{ option }}
                                        </div>
                                    </div>
                                    <div class="question-actions">
                                        <button
                                            class="icon-btn"
                                            @click="
                                                openQuestionEditor(question)
                                            "
                                            title="Edit"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-width="2"
                                            >
                                                <path
                                                    d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                                                ></path>
                                                <path
                                                    d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                                                ></path>
                                            </svg>
                                        </button>
                                        <button
                                            class="icon-btn danger"
                                            @click="deleteQuestion(question.id)"
                                            title="Delete"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-width="2"
                                            >
                                                <polyline
                                                    points="3 6 5 6 21 6"
                                                ></polyline>
                                                <path
                                                    d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                                                ></path>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Question Editor Modal -->
                        <div
                            v-if="showQuestionEditor"
                            class="modal-overlay"
                            @click.self="closeQuestionEditor"
                        >
                            <div class="modal-content question-modal">
                                <h3>
                                    {{
                                        editingQuestion
                                            ? "Edit Question"
                                            : "Add Question"
                                    }}
                                </h3>
                                <div class="form-group">
                                    <label>Question Type</label>
                                    <select
                                        v-model="questionForm.question_type"
                                        class="form-select"
                                    >
                                        <option value="multiple_choice">
                                            Multiple Choice
                                        </option>
                                        <option value="true_false">
                                            True/False
                                        </option>
                                        <option value="short_answer">
                                            Short Answer
                                        </option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Question</label>
                                    <textarea
                                        v-model="questionForm.question_text"
                                        placeholder="Enter your question..."
                                        class="form-textarea"
                                        rows="3"
                                    ></textarea>
                                </div>
                                <div
                                    v-if="
                                        questionForm.question_type ===
                                        'multiple_choice'
                                    "
                                    class="form-group"
                                >
                                    <label>Options</label>
                                    <div
                                        v-for="(
                                            option, index
                                        ) in questionForm.options"
                                        :key="index"
                                        class="option-input-row"
                                    >
                                        <span class="option-letter">{{
                                            String.fromCharCode(65 + index)
                                        }}</span>
                                        <input
                                            v-model="
                                                questionForm.options[index]
                                            "
                                            type="text"
                                            :placeholder="
                                                'Option ' +
                                                String.fromCharCode(65 + index)
                                            "
                                            class="form-input"
                                        />
                                        <label class="radio-label">
                                            <input
                                                type="radio"
                                                :value="
                                                    questionForm.options[index]
                                                "
                                                v-model="
                                                    questionForm.correct_answer
                                                "
                                            />
                                            Correct
                                        </label>
                                    </div>
                                </div>
                                <div
                                    v-else-if="
                                        questionForm.question_type ===
                                        'true_false'
                                    "
                                    class="form-group"
                                >
                                    <label>Correct Answer</label>
                                    <div class="radio-group">
                                        <label class="radio-label">
                                            <input
                                                type="radio"
                                                value="true"
                                                v-model="
                                                    questionForm.correct_answer
                                                "
                                            />
                                            True
                                        </label>
                                        <label class="radio-label">
                                            <input
                                                type="radio"
                                                value="false"
                                                v-model="
                                                    questionForm.correct_answer
                                                "
                                            />
                                            False
                                        </label>
                                    </div>
                                </div>
                                <div v-else class="form-group">
                                    <label>Expected Answer (keywords)</label>
                                    <input
                                        v-model="questionForm.correct_answer"
                                        type="text"
                                        placeholder="Keywords separated by commas"
                                        class="form-input"
                                    />
                                </div>
                                <div class="form-group">
                                    <label>Points</label>
                                    <input
                                        v-model.number="questionForm.points"
                                        type="number"
                                        min="1"
                                        class="form-input small"
                                    />
                                </div>
                                <div class="modal-actions">
                                    <button
                                        class="secondary-btn"
                                        @click="closeQuestionEditor"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        class="primary-btn"
                                        @click="saveQuestion"
                                    >
                                        {{
                                            editingQuestion
                                                ? "Save Changes"
                                                : "Add Question"
                                        }}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Quizzes List -->
                    <div v-else class="quizzes-list">
                        <div
                            v-for="quiz in quizzes"
                            :key="quiz.id"
                            class="quiz-card"
                        >
                            <div class="quiz-header">
                                <div class="quiz-info">
                                    <h3 class="quiz-title">{{ quiz.title }}</h3>
                                    <span
                                        v-if="quiz.modules"
                                        class="quiz-module"
                                        >{{ quiz.modules.title }}</span
                                    >
                                </div>
                                <div class="quiz-actions">
                                    <button
                                        class="action-btn"
                                        @click="openQuizEditor(quiz)"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        class="action-btn danger"
                                        @click="deleteQuiz(quiz.id)"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                            <div class="quiz-meta">
                                <span>{{ quiz.questionCount }} questions</span>
                                <span>{{ quiz.time_limit_minutes }} min</span>
                                <span>Pass: {{ quiz.passing_score }}%</span>
                            </div>
                            <div class="quiz-stats">
                                <div class="stat">
                                    <span class="stat-value">{{
                                        quiz.attemptCount
                                    }}</span>
                                    <span class="stat-label">Attempts</span>
                                </div>
                                <div class="stat">
                                    <span class="stat-value"
                                        >{{ quiz.avgScore }}%</span
                                    >
                                    <span class="stat-label">Avg Score</span>
                                </div>
                                <div class="stat">
                                    <span class="stat-value"
                                        >{{ quiz.passRate }}%</span
                                    >
                                    <span class="stat-label">Pass Rate</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Users Section -->
                <section
                    v-else-if="activeSection === 'users'"
                    class="section-content"
                >
                    <div class="section-header-row">
                        <h2 class="section-title">Users</h2>
                        <span class="total-count"
                            >{{ usersTotalCount }} total</span
                        >
                    </div>

                    <!-- Role Breakdown Cards -->
                    <div class="role-breakdown">
                        <div
                            class="role-card"
                            :class="{ active: usersFilter === 'creator' }"
                            @click="
                                usersFilter = 'creator';
                                usersPage = 1;
                                fetchUsers();
                            "
                        >
                            <div class="role-icon creator">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <path d="M12 20h9"></path>
                                    <path
                                        d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
                                    ></path>
                                </svg>
                            </div>
                            <div class="role-info">
                                <span class="role-count">{{
                                    userRoleBreakdown.creators
                                }}</span>
                                <span class="role-label">Creators</span>
                            </div>
                        </div>
                        <div
                            class="role-card"
                            :class="{ active: usersFilter === 'professor' }"
                            @click="
                                usersFilter = 'professor';
                                usersPage = 1;
                                fetchUsers();
                            "
                        >
                            <div class="role-icon professor">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <path
                                        d="M22 10v6M2 10l10-5 10 5-10 5z"
                                    ></path>
                                    <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                                </svg>
                            </div>
                            <div class="role-info">
                                <span class="role-count">{{
                                    userRoleBreakdown.professors
                                }}</span>
                                <span class="role-label">Professors</span>
                            </div>
                        </div>
                        <div
                            class="role-card"
                            :class="{ active: usersFilter === 'student' }"
                            @click="
                                usersFilter = 'student';
                                usersPage = 1;
                                fetchUsers();
                            "
                        >
                            <div class="role-icon student">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <path
                                        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                                    ></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                            </div>
                            <div class="role-info">
                                <span class="role-count">{{
                                    userRoleBreakdown.students
                                }}</span>
                                <span class="role-label">Students</span>
                            </div>
                        </div>
                        <div
                            class="role-card"
                            :class="{ active: usersFilter === 'all' }"
                            @click="
                                usersFilter = 'all';
                                usersPage = 1;
                                fetchUsers();
                            "
                        >
                            <div class="role-icon all">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <path
                                        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                                    ></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                            </div>
                            <div class="role-info">
                                <span class="role-count">{{
                                    userRoleBreakdown.creators +
                                    userRoleBreakdown.professors +
                                    userRoleBreakdown.students
                                }}</span>
                                <span class="role-label">All Users</span>
                            </div>
                        </div>
                    </div>

                    <!-- Search -->
                    <div class="users-toolbar">
                        <input
                            v-model="usersSearch"
                            @input="
                                usersPage = 1;
                                fetchUsers();
                            "
                            type="text"
                            placeholder="Search by name or email..."
                            class="search-input wide"
                        />
                    </div>

                    <!-- Loading -->
                    <div v-if="usersLoading" class="loading-state">
                        <div class="spinner"></div>
                        <p>Loading users...</p>
                    </div>

                    <!-- Error -->
                    <div v-else-if="usersError" class="error-state">
                        <p>{{ usersError }}</p>
                        <button @click="fetchUsers" class="retry-btn">
                            Retry
                        </button>
                    </div>

                    <!-- Users List -->
                    <div v-else class="users-list">
                        <div
                            v-for="user in users"
                            :key="user.id"
                            class="user-card"
                            @click="selectUser(user)"
                        >
                            <div class="user-avatar">
                                {{
                                    (user.full_name ||
                                        user.email ||
                                        "?")[0].toUpperCase()
                                }}
                            </div>
                            <div class="user-info">
                                <div class="user-name">
                                    {{ user.full_name || "Unnamed User" }}
                                </div>
                                <div class="user-email">{{ user.email }}</div>
                            </div>
                            <div class="user-meta">
                                <span class="role-badge" :class="user.role">{{
                                    user.role
                                }}</span>
                                <span class="user-institution">{{
                                    user.institution || "-"
                                }}</span>
                                <span class="user-joined"
                                    >Joined
                                    {{ formatDate(user.created_at) }}</span
                                >
                            </div>
                        </div>

                        <!-- Pagination -->
                        <div v-if="usersTotalPages > 1" class="pagination">
                            <button
                                class="page-btn"
                                :disabled="usersPage === 1"
                                @click="prevUsersPage"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <polyline
                                        points="15 18 9 12 15 6"
                                    ></polyline>
                                </svg>
                                Prev
                            </button>
                            <span class="page-info"
                                >Page {{ usersPage }} of
                                {{ usersTotalPages }}</span
                            >
                            <button
                                class="page-btn"
                                :disabled="usersPage === usersTotalPages"
                                @click="nextUsersPage"
                            >
                                Next
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <polyline
                                        points="9 18 15 12 9 6"
                                    ></polyline>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <!-- User Detail Modal -->
                    <div
                        v-if="selectedUser"
                        class="modal-overlay"
                        @click.self="selectedUser = null"
                    >
                        <div class="modal-content user-detail-modal">
                            <div class="user-detail-header">
                                <div class="user-avatar large">
                                    {{
                                        (selectedUser.full_name ||
                                            selectedUser.email ||
                                            "?")[0].toUpperCase()
                                    }}
                                </div>
                                <div class="user-detail-info">
                                    <h3>
                                        {{
                                            selectedUser.full_name ||
                                            "Unnamed User"
                                        }}
                                    </h3>
                                    <p>{{ selectedUser.email }}</p>
                                    <span
                                        class="role-badge"
                                        :class="selectedUser.role"
                                        >{{ selectedUser.role }}</span
                                    >
                                </div>
                                <button
                                    class="close-btn"
                                    @click="selectedUser = null"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                    >
                                        <line
                                            x1="18"
                                            y1="6"
                                            x2="6"
                                            y2="18"
                                        ></line>
                                        <line
                                            x1="6"
                                            y1="6"
                                            x2="18"
                                            y2="18"
                                        ></line>
                                    </svg>
                                </button>
                            </div>
                            <div class="user-detail-body">
                                <div class="detail-row">
                                    <span class="detail-label"
                                        >Institution</span
                                    >
                                    <span class="detail-value">{{
                                        selectedUser.institution || "-"
                                    }}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Joined</span>
                                    <span class="detail-value">{{
                                        formatDate(selectedUser.created_at)
                                    }}</span>
                                </div>
                                <div
                                    v-if="selectedUser.role === 'professor'"
                                    class="detail-row"
                                >
                                    <span class="detail-label">Department</span>
                                    <span class="detail-value">{{
                                        selectedUser.professor_department || "-"
                                    }}</span>
                                </div>
                                <div
                                    v-if="selectedUser.role === 'student'"
                                    class="detail-row"
                                >
                                    <span class="detail-label">Year</span>
                                    <span class="detail-value">{{
                                        selectedUser.student_year || "-"
                                    }}</span>
                                </div>
                                <div
                                    v-if="selectedUser.role === 'student'"
                                    class="detail-row"
                                >
                                    <span class="detail-label">Major</span>
                                    <span class="detail-value">{{
                                        selectedUser.student_major || "-"
                                    }}</span>
                                </div>
                                <div
                                    v-if="selectedUser.role === 'creator'"
                                    class="detail-row"
                                >
                                    <span class="detail-label">Bio</span>
                                    <span class="detail-value">{{
                                        selectedUser.creator_bio || "-"
                                    }}</span>
                                </div>
                            </div>
                            <div class="user-detail-actions">
                                <label>Change Role:</label>
                                <select
                                    :value="selectedUser.role"
                                    @change="
                                        updateUserRole(
                                            selectedUser.id,
                                            $event.target.value,
                                        )
                                    "
                                    class="form-select"
                                >
                                    <option value="student">Student</option>
                                    <option value="professor">Professor</option>
                                    <option value="creator">Creator</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Analytics Section -->
                <section
                    v-else-if="activeSection === 'analytics'"
                    class="section-content"
                >
                    <div class="section-header-row">
                        <h2 class="section-title">Analytics</h2>
                        <select
                            v-model="analyticsDateRange"
                            @change="fetchAnalytics"
                            class="filter-select"
                        >
                            <option value="7days">Last 7 days</option>
                            <option value="30days">Last 30 days</option>
                            <option value="90days">Last 90 days</option>
                        </select>
                    </div>

                    <!-- Loading -->
                    <div v-if="analyticsLoading" class="loading-state">
                        <div class="spinner"></div>
                        <p>Loading analytics...</p>
                    </div>

                    <!-- Error -->
                    <div v-else-if="analyticsError" class="error-state">
                        <p>{{ analyticsError }}</p>
                        <button @click="fetchAnalytics" class="retry-btn">
                            Retry
                        </button>
                    </div>

                    <!-- Analytics Dashboard -->
                    <div v-else class="analytics-dashboard">
                        <!-- Overview Metrics -->
                        <div class="metrics-row">
                            <div class="metric-card">
                                <div class="metric-icon users">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                    >
                                        <path
                                            d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                                        ></path>
                                        <circle cx="9" cy="7" r="4"></circle>
                                    </svg>
                                </div>
                                <div class="metric-info">
                                    <span class="metric-value">{{
                                        analyticsMetrics.activeUsers
                                    }}</span>
                                    <span class="metric-label"
                                        >Active Users</span
                                    >
                                </div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-icon views">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                    >
                                        <path
                                            d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                                        ></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                </div>
                                <div class="metric-info">
                                    <span class="metric-value">{{
                                        analyticsMetrics.totalPageViews
                                    }}</span>
                                    <span class="metric-label">Page Views</span>
                                </div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-icon time">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                    >
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <polyline
                                            points="12 6 12 12 16 14"
                                        ></polyline>
                                    </svg>
                                </div>
                                <div class="metric-info">
                                    <span class="metric-value">{{
                                        formatDuration(
                                            analyticsMetrics.avgTimeOnContent,
                                        )
                                    }}</span>
                                    <span class="metric-label"
                                        >Avg Time on Content</span
                                    >
                                </div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-icon quiz">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="2"
                                    >
                                        <path
                                            d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
                                        ></path>
                                        <polyline
                                            points="22 4 12 14.01 9 11.01"
                                        ></polyline>
                                    </svg>
                                </div>
                                <div class="metric-info">
                                    <span class="metric-value"
                                        >{{
                                            analyticsMetrics.quizCompletionRate
                                        }}%</span
                                    >
                                    <span class="metric-label"
                                        >Quiz Pass Rate</span
                                    >
                                </div>
                            </div>
                        </div>

                        <!-- Chart -->
                        <div class="chart-container">
                            <h3 class="chart-title">
                                User Engagement Over Time
                            </h3>
                            <div class="chart-wrapper">
                                <div
                                    v-if="
                                        analyticsChartData.labels.length === 0
                                    "
                                    class="chart-empty"
                                >
                                    <p>No engagement data for this period</p>
                                </div>
                                <div v-else class="simple-chart">
                                    <div class="chart-bars">
                                        <div
                                            v-for="(
                                                value, index
                                            ) in analyticsChartData.datasets[0]
                                                ?.data || []"
                                            :key="index"
                                            class="chart-bar-container"
                                        >
                                            <div
                                                class="chart-bar"
                                                :style="{
                                                    height:
                                                        Math.max(
                                                            4,
                                                            (value /
                                                                Math.max(
                                                                    ...analyticsChartData
                                                                        .datasets[0]
                                                                        .data,
                                                                    1,
                                                                )) *
                                                                100,
                                                        ) + '%',
                                                }"
                                            >
                                                <span class="bar-value">{{
                                                    value
                                                }}</span>
                                            </div>
                                            <span class="bar-label">{{
                                                analyticsChartData.labels[index]
                                            }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Two Column Stats -->
                        <div class="stats-grid">
                            <!-- Content Performance -->
                            <div class="stats-card">
                                <h3 class="stats-title">Content Performance</h3>
                                <div
                                    v-if="contentPerformance.length === 0"
                                    class="stats-empty"
                                >
                                    <p>No content views recorded</p>
                                </div>
                                <div v-else class="stats-list">
                                    <div
                                        v-for="(
                                            item, index
                                        ) in contentPerformance"
                                        :key="index"
                                        class="stats-item"
                                    >
                                        <span class="stats-rank">{{
                                            index + 1
                                        }}</span>
                                        <span class="stats-name">{{
                                            item.title
                                        }}</span>
                                        <span class="stats-value"
                                            >{{ item.views }} views</span
                                        >
                                    </div>
                                </div>
                            </div>

                            <!-- Quiz Performance -->
                            <div class="stats-card">
                                <h3 class="stats-title">Quiz Performance</h3>
                                <div
                                    v-if="quizPerformance.length === 0"
                                    class="stats-empty"
                                >
                                    <p>No quiz attempts recorded</p>
                                </div>
                                <div v-else class="stats-list">
                                    <div
                                        v-for="(item, index) in quizPerformance"
                                        :key="index"
                                        class="stats-item"
                                    >
                                        <span class="stats-rank">{{
                                            index + 1
                                        }}</span>
                                        <span class="stats-name">{{
                                            item.title
                                        }}</span>
                                        <span class="stats-value"
                                            >{{ item.avgScore }}% avg</span
                                        >
                                    </div>
                                </div>
                            </div>

                            <!-- Trending Highlights -->
                            <div class="stats-card wide">
                                <h3 class="stats-title">Trending Highlights</h3>
                                <div
                                    v-if="trendingHighlights.length === 0"
                                    class="stats-empty"
                                >
                                    <p>No highlights recorded</p>
                                </div>
                                <div v-else class="highlights-list">
                                    <div
                                        v-for="(
                                            item, index
                                        ) in trendingHighlights"
                                        :key="index"
                                        class="highlight-item"
                                    >
                                        <span class="highlight-count"
                                            >{{
                                                item.highlight_count
                                            }}
                                            users</span
                                        >
                                        <p class="highlight-text">
                                            "{{
                                                item.selected_text?.slice(
                                                    0,
                                                    100,
                                                )
                                            }}..."
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </template>
    </div>
</template>

<style scoped>
/*
 * NOTE: This project uses font-size: 62.5% on html/body,
 * making 1rem = 10px instead of 16px.
 * All rem values below are scaled accordingly.
 */

/* Layout */
.dashboard-layout {
    display: flex;
    min-height: 100vh;
    background: #1a1a1a;
}

/* Sidebar */
.sidebar {
    width: 280px;
    height: 100vh;
    position: sticky;
    top: 0;
    background: #141414;
    border-right: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    padding: 2.4rem;
    overflow-y: auto;
}

.sidebar-logo {
    display: flex;
    align-items: center;
    gap: 1.2rem;
    padding-bottom: 2.4rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    margin-bottom: 2.4rem;
}

.logo-icon {
    width: 40px;
    height: 40px;
    background: rgb(151, 71, 255);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: "IBM Plex Mono", monospace;
    font-weight: 600;
    font-size: 1.4rem;
    color: white;
}

.logo-text {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    font-weight: 500;
    color: white;
    letter-spacing: 0.05em;
}

/* User Profile Card */
.user-profile-card {
    background: #202020;
    border-radius: 12px;
    padding: 1.6rem;
    display: flex;
    align-items: center;
    gap: 1.2rem;
    margin-bottom: 2.4rem;
    position: relative;
}

.user-avatar {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, rgb(151, 71, 255) 0%, #6b21a8 100%);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.avatar-icon {
    font-family: "IBM Plex Sans", sans-serif;
    font-weight: 600;
    font-size: 2rem;
    color: white;
}

.user-info {
    flex: 1;
}

.user-date {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.1rem;
    color: #898989;
    margin-bottom: 0.2rem;
    letter-spacing: 0.05em;
}

.user-name {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.6rem;
    font-weight: 500;
    color: white;
}

.edit-profile-btn {
    position: absolute;
    top: 1.2rem;
    right: 1.2rem;
    padding: 0.6rem;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 6px;
    color: #898989;
    cursor: pointer;
    transition: all 0.2s;
}

.edit-profile-btn:hover {
    background: rgba(151, 71, 255, 0.3);
    color: white;
}

/* Navigation */
.sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    flex: 1;
}

.nav-item {
    display: flex;
    align-items: center;
    gap: 1.4rem;
    padding: 1.4rem 1.6rem;
    background: transparent;
    border: none;
    border-radius: 10px;
    color: #898989;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    width: 100%;
}

.nav-item:hover {
    background: rgba(255, 255, 255, 0.05);
    color: white;
}

.nav-item.active {
    background: rgba(151, 71, 255, 0.15);
    color: white;
}

.nav-item.active .nav-icon {
    color: rgb(151, 71, 255);
}

.nav-icon {
    flex-shrink: 0;
}

.nav-label {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.5rem;
    font-weight: 500;
}

/* Sidebar Footer */
.sidebar-footer {
    padding-top: 1.6rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    margin-top: auto;
}

.read-book-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.8rem;
    width: 100%;
    padding: 1.4rem;
    background: #202020;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    color: white;
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.read-book-btn:hover {
    background: rgba(151, 71, 255, 0.2);
    border-color: rgb(151, 71, 255);
}

/* Main Content */
.main-content {
    flex: 1;
    background: #1a1a1a;
    padding: 2.4rem 3.2rem;
    overflow-y: auto;
}

/* Header */
.content-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 3.2rem;
}

.page-title {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 2.8rem;
    font-weight: 600;
    color: white;
}

.logout-btn {
    padding: 1rem 2rem;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 9999px;
    color: #898989;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.3rem;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s;
}

.logout-btn:hover {
    border-color: rgba(255, 255, 255, 0.5);
    color: white;
}

/* Dashboard Content */
.dashboard-content {
    display: flex;
    flex-direction: column;
    gap: 2.4rem;
}

/* Metrics Card */
.metrics-card {
    background: #202020;
    border-radius: 16px;
    padding: 2.4rem;
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.metrics-header {
    display: flex;
    justify-content: flex-start;
    margin-bottom: 2.4rem;
}

.metrics-period {
    display: flex;
    gap: 0.8rem;
}

.period-btn {
    padding: 0.8rem 1.6rem;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #898989;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 0.2s;
}

.period-btn:hover {
    border-color: rgba(255, 255, 255, 0.3);
    color: white;
}

.period-btn.active {
    background: rgba(151, 71, 255, 0.2);
    border-color: rgb(151, 71, 255);
    color: white;
}

/* Chart */
.metrics-chart {
    position: relative;
}

.chart-placeholder {
    height: 200px;
    position: relative;
}

.chart-svg {
    width: 100%;
    height: 160px;
}

.grid-line {
    stroke: rgba(255, 255, 255, 0.05);
    stroke-width: 1;
}

.chart-line-active {
    stroke: rgb(151, 71, 255);
    stroke-width: 2.5;
}

.chart-line-edits {
    stroke: #898989;
    stroke-width: 2;
}

.chart-line-signups {
    stroke: #4a4a4a;
    stroke-width: 2;
}

.chart-labels {
    display: flex;
    justify-content: space-between;
    padding: 0.8rem 0;
    color: #4a4a4a;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
}

.chart-legend {
    display: flex;
    gap: 2.4rem;
    justify-content: flex-end;
    margin-top: 0.8rem;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    color: #898989;
}

.legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
}

.legend-dot.active {
    background: rgb(151, 71, 255);
}

.legend-dot.edits {
    background: #898989;
}

.legend-dot.signups {
    background: #4a4a4a;
}

/* Cards Grid */
.cards-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: auto auto;
    gap: 1.6rem;
}

.quick-card {
    background: #202020;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    padding: 2.4rem;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s;
}

.quick-card:hover {
    background: #262626;
    border-color: rgba(151, 71, 255, 0.3);
}

.quick-card.large {
    grid-row: span 1;
}

.quick-card.large:first-child {
    grid-column: 1;
}

.quick-card.large:nth-child(2) {
    grid-column: 2;
}

.quick-card.small {
    grid-column: 3;
}

.card-icon {
    width: 56px;
    height: 56px;
    background: rgba(151, 71, 255, 0.1);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgb(151, 71, 255);
    margin-bottom: 1.6rem;
}

.quick-card.small .card-icon {
    width: 48px;
    height: 48px;
    margin-bottom: 1.2rem;
}

.card-title {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.8rem;
    font-weight: 600;
    color: white;
    margin-bottom: 0.4rem;
}

.quick-card.small .card-title {
    font-size: 1.6rem;
}

.card-subtitle {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.4rem;
    color: #898989;
}

/* Section Content */
.section-content {
    flex: 1;
}

.section-placeholder {
    background: #202020;
    border-radius: 16px;
    padding: 4.8rem;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.section-placeholder h2 {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 2.4rem;
    font-weight: 600;
    color: white;
    margin-bottom: 1.2rem;
}

.section-placeholder p {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.6rem;
    color: #898989;
    margin-bottom: 2.4rem;
}

.action-btn {
    padding: 1.2rem 2.4rem;
    background: rgb(151, 71, 255);
    border: none;
    border-radius: 9999px;
    color: white;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.4rem;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s;
}

.action-btn:hover {
    background: white;
    color: black;
}

/* ============ CHAPTERS SECTION ============ */
.chapters-section {
    display: flex;
    flex-direction: column;
    gap: 1.6rem;
}

.chapters-loading,
.chapters-error {
    background: #202020;
    border-radius: 12px;
    padding: 4rem;
    text-align: center;
    color: #898989;
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.6rem;
}

.chapters-error p {
    margin-bottom: 2rem;
    color: #ef4444;
}

.chapters-list {
    display: flex;
    flex-direction: column;
    gap: 1.6rem;
}

/* Chapter Card */
.chapter-card {
    background: #202020;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    overflow: hidden;
    transition: all 0.3s ease;
}

.chapter-card:hover:not(.expanded) {
    border-color: rgba(151, 71, 255, 0.3);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.chapter-card.expanded {
    background: #1a1a1a;
    border-color: rgba(151, 71, 255, 0.5);
}

/* Chapter Header */
.chapter-header {
    padding: 2rem 2.4rem;
    cursor: pointer;
    transition: background 0.2s;
}

.chapter-card:not(.expanded) .chapter-header:hover {
    background: rgba(255, 255, 255, 0.02);
}

.chapter-title-row {
    display: flex;
    align-items: center;
    gap: 1.6rem;
}

.chapter-number {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.1rem;
    color: rgb(151, 71, 255);
    letter-spacing: 0.1em;
    font-weight: 500;
}

.chapter-title {
    flex: 1;
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 2rem;
    font-weight: 600;
    color: white;
    margin: 0;
}

.status-badge {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.1rem;
    text-transform: uppercase;
    padding: 0.4rem 1rem;
    border-radius: 4px;
    letter-spacing: 0.05em;
}

.status-badge.draft {
    background: rgba(255, 193, 7, 0.15);
    color: #ffc107;
}

.status-badge.published {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
}

.status-badge.archived {
    background: rgba(156, 163, 175, 0.15);
    color: #9ca3af;
}

.chevron-icon {
    color: #898989;
    transition: transform 0.3s ease;
}

.chapter-card.expanded .chevron-icon {
    transform: rotate(180deg);
}

.close-btn {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.6rem 1.2rem;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 6px;
    color: white;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 0.2s;
}

.close-btn:hover {
    background: rgba(151, 71, 255, 0.3);
}

/* Chapter Stats Row */
.chapter-stats-row {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    margin-top: 1.2rem;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.3rem;
    color: #898989;
}

.chapter-stats-row .dot {
    color: #4a4a4a;
}

.chapter-meta {
    margin-top: 0.8rem;
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.2rem;
    color: #5a5a5a;
}

/* Chapter Content (Expanded) */
.chapter-content {
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding: 2rem;
}

.chapter-editor-layout {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 2rem;
    min-height: 500px;
}

/* Blocks Sidebar */
.blocks-sidebar {
    background: #141414;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    overflow: hidden;
    position: sticky;
    top: 2rem;
    max-height: calc(100vh - 4rem);
    display: flex;
    flex-direction: column;
}

.blocks-list {
    flex: 1;
    overflow-y: auto;
    padding: 1.2rem;
}

.blocks-list::-webkit-scrollbar {
    width: 4px;
}

.blocks-list::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.02);
}

.blocks-list::-webkit-scrollbar-thumb {
    background: rgba(151, 71, 255, 0.3);
    border-radius: 2px;
}

/* Block Item */
.block-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.2rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 0.4rem;
}

.block-item.section {
    background: rgba(255, 255, 255, 0.03);
    cursor: default;
    margin-top: 1.2rem;
}

.block-item.section:first-child {
    margin-top: 0;
}

.block-item.paragraph {
    padding-left: 2.4rem;
}

.block-item.paragraph:hover {
    background: rgba(255, 255, 255, 0.05);
}

.block-item.selected {
    background: rgba(151, 71, 255, 0.2);
    border-left: 3px solid rgb(151, 71, 255);
    padding-left: calc(2.4rem - 3px);
}

.block-item.highlighted {
    box-shadow: 0 0 0 2px rgba(151, 71, 255, 0.3);
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%,
    100% {
        box-shadow: 0 0 0 2px rgba(151, 71, 255, 0.3);
    }
    50% {
        box-shadow: 0 0 0 4px rgba(151, 71, 255, 0.15);
    }
}

.block-item.drag-over {
    border-top: 2px dashed rgb(151, 71, 255);
}

.block-icon {
    color: #898989;
    flex-shrink: 0;
}

.block-title {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.3rem;
    font-weight: 600;
    color: white;
}

.drag-handle {
    color: #4a4a4a;
    flex-shrink: 0;
    cursor: grab;
}

.drag-handle:active {
    cursor: grabbing;
}

.block-index {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1rem;
    color: #5a5a5a;
    background: rgba(255, 255, 255, 0.05);
    padding: 0.2rem 0.5rem;
    border-radius: 3px;
    flex-shrink: 0;
}

.block-preview {
    flex: 1;
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.3rem;
    color: #898989;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.selected-arrow {
    color: rgb(151, 71, 255);
    flex-shrink: 0;
}

/* Editor Panel */
.editor-panel {
    background: #202020;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    overflow: hidden;
}

/* Stats Panel */
.stats-panel {
    padding: 2rem;
    display: flex;
    flex-direction: column;
    height: 100%;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.6rem;
    margin-bottom: 2.4rem;
}

.stat-item {
    background: rgba(151, 71, 255, 0.1);
    border-radius: 12px;
    padding: 1.6rem;
    text-align: center;
}

.stat-value {
    display: block;
    font-family: "IBM Plex Mono", monospace;
    font-size: 2.4rem;
    font-weight: 600;
    color: white;
    margin-bottom: 0.4rem;
}

.stat-label {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.2rem;
    color: #898989;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

/* Content Preview */
.content-preview {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.preview-title {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    color: #898989;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 1.6rem;
    padding-bottom: 1.2rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.preview-content {
    flex: 1;
    overflow-y: auto;
    padding-right: 1rem;
}

.preview-content::-webkit-scrollbar {
    width: 4px;
}

.preview-content::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.02);
}

.preview-content::-webkit-scrollbar-thumb {
    background: rgba(151, 71, 255, 0.3);
    border-radius: 2px;
}

/* Preview Block Base */
.preview-block {
    margin-bottom: 0;
}

.preview-block.paragraph {
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    padding: 1.6rem 0;
}

.preview-block.paragraph:last-child {
    border-bottom: none;
}

/* Section Header */
.preview-section-header {
    background: rgba(151, 71, 255, 0.08);
    margin: 0 -2rem;
    padding: 1.6rem 2rem;
    border-top: 2px solid rgba(151, 71, 255, 0.3);
    margin-top: 2.4rem;
}

.preview-block.section:first-child .preview-section-header {
    margin-top: 0;
    border-top: none;
}

.preview-section-meta {
    display: flex;
    align-items: center;
    gap: 1.2rem;
    margin-bottom: 0.8rem;
}

.meta-badge {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.3rem 0.8rem;
    border-radius: 4px;
}

.meta-badge.section-badge {
    background: rgba(151, 71, 255, 0.2);
    color: rgb(151, 71, 255);
}

.meta-badge.subsection-badge {
    background: rgba(59, 130, 246, 0.2);
    color: #3b82f6;
}

.meta-slug {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.1rem;
    color: #5a5a5a;
}

.preview-section-title {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.8rem;
    font-weight: 600;
    color: white;
    margin: 0;
}

/* Paragraph Block */
.preview-para-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
}

.preview-para-meta {
    display: flex;
    align-items: center;
    gap: 1.2rem;
}

.meta-index {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1rem;
    color: #5a5a5a;
    background: rgba(255, 255, 255, 0.05);
    padding: 0.2rem 0.6rem;
    border-radius: 3px;
}

.meta-words {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.1rem;
    color: #4a4a4a;
}

.preview-para-content {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.4rem;
    line-height: 1.7;
    color: #a0a0a0;
}

.preview-para-content :deep(h1),
.preview-para-content :deep(h2),
.preview-para-content :deep(h3) {
    font-weight: 600;
    color: #c0c0c0;
    margin-bottom: 0.8rem;
}

.preview-para-content :deep(h1) {
    font-size: 1.8rem;
}
.preview-para-content :deep(h2) {
    font-size: 1.6rem;
}
.preview-para-content :deep(h3) {
    font-size: 1.5rem;
}

/* Editor Content */
.editor-content {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.editor-header {
    padding: 1.6rem 2rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.back-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.6rem 1.2rem;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #898989;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 1.2rem;
}

.back-btn:hover {
    border-color: rgba(255, 255, 255, 0.3);
    color: white;
}

.editing-title {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.6rem;
    font-weight: 500;
    color: white;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.editor-content :deep(.tiptap-editor) {
    flex: 1;
    border: none;
    border-radius: 0;
}

.editor-footer {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 1.6rem;
    padding: 1.6rem 2rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(0, 0, 0, 0.2);
}

.save-status {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.3rem;
    color: #22c55e;
}

.save-status.error {
    color: #ef4444;
}

.save-btn {
    padding: 1.2rem 3.2rem;
    background: rgb(151, 71, 255);
    border: none;
    border-radius: 8px;
    color: white;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.4rem;
    font-weight: 500;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s;
}

.save-btn:hover:not(:disabled) {
    background: white;
    color: black;
}

.save-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Add New Chapter Button */
.add-chapter-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.2rem;
    width: 100%;
    padding: 3.2rem;
    background: transparent;
    border: 2px dashed rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    color: #898989;
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.6rem;
    cursor: pointer;
    transition: all 0.2s;
}

.add-chapter-btn:hover {
    border-color: rgb(151, 71, 255);
    background: rgba(151, 71, 255, 0.05);
    color: white;
}

.add-chapter-btn svg {
    opacity: 0.5;
}

.add-chapter-btn:hover svg {
    opacity: 1;
    color: rgb(151, 71, 255);
}

/* ============ SHARED STYLES FOR NEW TABS ============ */

.section-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2.4rem;
}

.section-title {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 2.4rem;
    font-weight: 600;
    color: white;
    margin: 0;
}

.total-count {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.4rem;
    color: #898989;
}

.header-controls {
    display: flex;
    gap: 1.2rem;
    align-items: center;
}

.primary-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.8rem;
    padding: 1rem 2rem;
    background: rgb(151, 71, 255);
    border: none;
    border-radius: 8px;
    color: white;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.4rem;
    cursor: pointer;
    transition: all 0.2s;
}

.primary-btn:hover {
    background: rgb(131, 51, 235);
}

.secondary-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.8rem;
    padding: 1rem 2rem;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    color: #a0a0a0;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.4rem;
    cursor: pointer;
    transition: all 0.2s;
}

.secondary-btn:hover {
    border-color: rgba(255, 255, 255, 0.4);
    color: white;
}

.danger-btn {
    padding: 1rem 2rem;
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    color: #ef4444;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.4rem;
    cursor: pointer;
    transition: all 0.2s;
}

.danger-btn:hover {
    background: rgba(239, 68, 68, 0.25);
}

.filter-select,
.form-select {
    padding: 1rem 1.6rem;
    background: #252525;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: white;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.3rem;
    cursor: pointer;
}

.search-input {
    padding: 1rem 1.6rem;
    background: #252525;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: white;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.3rem;
    min-width: 200px;
}

.search-input.wide {
    min-width: 300px;
}

.search-input::placeholder {
    color: #666;
}

.loading-state,
.error-state,
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 6rem 2rem;
    text-align: center;
}

.loading-state .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(151, 71, 255, 0.2);
    border-top-color: rgb(151, 71, 255);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.loading-state p,
.error-state p,
.empty-state p {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.5rem;
    color: #898989;
    margin-top: 1.6rem;
}

.empty-state svg {
    color: #4a4a4a;
    margin-bottom: 1.6rem;
}

.empty-state h3 {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.8rem;
    font-weight: 500;
    color: #a0a0a0;
    margin: 0 0 0.8rem;
}

.retry-btn {
    margin-top: 1.6rem;
    padding: 1rem 2rem;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    color: #a0a0a0;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.3rem;
    cursor: pointer;
}

.retry-btn:hover {
    border-color: rgba(255, 255, 255, 0.4);
    color: white;
}

/* Modal Styles */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background: #1e1e1e;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 2.4rem;
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
}

.modal-content h3 {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 2rem;
    font-weight: 600;
    color: white;
    margin: 0 0 2rem;
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1.2rem;
    margin-top: 2.4rem;
}

/* Form Styles */
.form-group {
    margin-bottom: 1.6rem;
}

.form-group label {
    display: block;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    color: #898989;
    margin-bottom: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.form-input,
.form-textarea {
    width: 100%;
    padding: 1.2rem 1.6rem;
    background: #252525;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: white;
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.5rem;
    transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus {
    outline: none;
    border-color: rgb(151, 71, 255);
}

.form-input.small {
    width: 120px;
}

.form-textarea {
    resize: vertical;
    min-height: 80px;
}

.form-row {
    display: flex;
    gap: 1.6rem;
    margin-bottom: 1.6rem;
}

.form-row .form-group {
    margin-bottom: 0;
}

.flex-1 {
    flex: 1;
}

.form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1.2rem;
    padding-top: 1.6rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.4rem;
    color: #a0a0a0;
    cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: rgb(151, 71, 255);
}

.radio-label {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.4rem;
    color: #a0a0a0;
    cursor: pointer;
}

.radio-group {
    display: flex;
    gap: 2rem;
}

/* ============ VERSIONS STYLES ============ */

.versions-list {
    display: flex;
    flex-direction: column;
    gap: 1.6rem;
}

.version-card {
    background: #202020;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 2rem;
}

.version-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.2rem;
}

.version-info {
    display: flex;
    align-items: center;
    gap: 1.2rem;
}

.version-number {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 2rem;
    font-weight: 600;
    color: white;
    margin: 0;
}

.version-actions {
    display: flex;
    gap: 0.8rem;
}

.action-btn {
    padding: 0.8rem 1.6rem;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    color: #a0a0a0;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 0.2s;
}

.action-btn:hover {
    border-color: rgba(255, 255, 255, 0.3);
    color: white;
}

.action-btn.publish {
    border-color: rgba(34, 197, 94, 0.3);
    color: #22c55e;
}

.action-btn.publish:hover {
    background: rgba(34, 197, 94, 0.1);
}

.action-btn.archive {
    border-color: rgba(234, 179, 8, 0.3);
    color: #eab308;
}

.action-btn.archive:hover {
    background: rgba(234, 179, 8, 0.1);
}

.action-btn.delete,
.action-btn.danger {
    border-color: rgba(239, 68, 68, 0.3);
    color: #ef4444;
}

.action-btn.delete:hover,
.action-btn.danger:hover {
    background: rgba(239, 68, 68, 0.1);
}

.version-meta {
    display: flex;
    gap: 2rem;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.3rem;
    color: #666;
}

.version-notes {
    margin-top: 1.2rem;
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.4rem;
    color: #898989;
    line-height: 1.5;
}

/* ============ MEDIA STYLES ============ */

.media-layout {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 2.4rem;
}

.media-grid-container {
    display: flex;
    flex-direction: column;
    gap: 3.2rem;
}

.media-type-section {
}

.media-type-title {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.6rem;
    font-weight: 500;
    color: #a0a0a0;
    margin: 0 0 1.6rem;
}

.media-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 1.6rem;
}

.media-card {
    background: #252525;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s;
}

.media-card:hover {
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
}

.media-card.selected {
    border-color: rgb(151, 71, 255);
    box-shadow: 0 0 0 1px rgb(151, 71, 255);
}

.media-thumb {
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1a1a1a;
    color: #4a4a4a;
}

.media-thumb.lottie {
    background: linear-gradient(135deg, #1a1a2e, #16213e);
}
.media-thumb.video {
    background: linear-gradient(135deg, #1a1a1a, #2d1f1f);
}
.media-thumb.image {
    background: linear-gradient(135deg, #1a1f1a, #1f2d1f);
}
.media-thumb.youtube {
    background: linear-gradient(135deg, #2d1f1f, #1a1a1a);
    color: #ff0000;
}

.media-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.media-info {
    padding: 1.2rem;
}

.media-title {
    display: block;
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.3rem;
    color: white;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.media-size {
    display: block;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.1rem;
    color: #666;
    margin-top: 0.4rem;
}

.media-detail-panel {
    background: #1e1e1e;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 2rem;
    height: fit-content;
    position: sticky;
    top: 2rem;
}

.detail-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.6rem;
}

.detail-header h3 {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.6rem;
    font-weight: 500;
    color: white;
    margin: 0;
}

.close-btn {
    background: transparent;
    border: none;
    color: #666;
    cursor: pointer;
    padding: 0.4rem;
}

.close-btn:hover {
    color: white;
}

.detail-preview {
    margin-bottom: 2rem;
}

.preview-placeholder {
    height: 180px;
    background: #252525;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.media-type-badge {
    padding: 0.6rem 1.2rem;
    background: rgba(151, 71, 255, 0.2);
    border-radius: 4px;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    color: rgb(151, 71, 255);
    text-transform: uppercase;
}

.detail-info {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    margin-bottom: 2rem;
}

.info-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}

.info-row.full {
    flex-direction: column;
    gap: 0.6rem;
}

.info-label {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    color: #666;
    text-transform: uppercase;
}

.info-value {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.4rem;
    color: #a0a0a0;
}

.detail-actions {
    padding-top: 1.6rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
}

/* ============ USERS STYLES ============ */

.role-breakdown {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.6rem;
    margin-bottom: 2.4rem;
}

.role-card {
    display: flex;
    align-items: center;
    gap: 1.6rem;
    padding: 2rem;
    background: #202020;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
}

.role-card:hover {
    border-color: rgba(255, 255, 255, 0.2);
}

.role-card.active {
    border-color: rgb(151, 71, 255);
    background: rgba(151, 71, 255, 0.05);
}

.role-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.role-icon.creator {
    background: rgba(151, 71, 255, 0.2);
    color: rgb(151, 71, 255);
}
.role-icon.professor {
    background: rgba(59, 130, 246, 0.2);
    color: rgb(59, 130, 246);
}
.role-icon.student {
    background: rgba(34, 197, 94, 0.2);
    color: rgb(34, 197, 94);
}
.role-icon.all {
    background: rgba(255, 255, 255, 0.1);
    color: #a0a0a0;
}

.role-info {
    display: flex;
    flex-direction: column;
}

.role-count {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 2.4rem;
    font-weight: 600;
    color: white;
}

.role-label {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    color: #666;
}

.users-toolbar {
    margin-bottom: 2rem;
}

.users-list {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
}

.user-card {
    display: flex;
    align-items: center;
    gap: 1.6rem;
    padding: 1.6rem 2rem;
    background: #202020;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
}

.user-card:hover {
    border-color: rgba(255, 255, 255, 0.2);
}

.user-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgb(151, 71, 255), rgb(100, 50, 200));
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.8rem;
    font-weight: 600;
    color: white;
    flex-shrink: 0;
}

.user-avatar.large {
    width: 64px;
    height: 64px;
    font-size: 2.4rem;
}

.user-info {
    flex: 1;
    min-width: 0;
}

.user-name {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.6rem;
    font-weight: 500;
    color: white;
}

.user-email {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.3rem;
    color: #666;
}

.user-meta {
    display: flex;
    align-items: center;
    gap: 2rem;
}

.role-badge {
    padding: 0.4rem 1rem;
    border-radius: 4px;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.1rem;
    text-transform: uppercase;
}

.role-badge.creator {
    background: rgba(151, 71, 255, 0.2);
    color: rgb(151, 71, 255);
}
.role-badge.professor {
    background: rgba(59, 130, 246, 0.2);
    color: rgb(59, 130, 246);
}
.role-badge.student {
    background: rgba(34, 197, 94, 0.2);
    color: rgb(34, 197, 94);
}

.user-institution,
.user-joined {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    color: #666;
}

.pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 2rem;
    margin-top: 2.4rem;
    padding-top: 2.4rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.page-btn {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.8rem 1.6rem;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    color: #a0a0a0;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.3rem;
    cursor: pointer;
}

.page-btn:hover:not(:disabled) {
    border-color: rgba(255, 255, 255, 0.3);
    color: white;
}

.page-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.page-info {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.3rem;
    color: #666;
}

.user-detail-modal {
    max-width: 480px;
}

.user-detail-header {
    display: flex;
    gap: 1.6rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    position: relative;
}

.user-detail-header .close-btn {
    position: absolute;
    top: 0;
    right: 0;
}

.user-detail-info h3 {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 2rem;
    font-weight: 600;
    color: white;
    margin: 0 0 0.4rem;
}

.user-detail-info p {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.3rem;
    color: #666;
    margin: 0 0 1rem;
}

.user-detail-body {
    padding: 2rem 0;
}

.detail-row {
    display: flex;
    justify-content: space-between;
    padding: 1rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.detail-label {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    color: #666;
}

.detail-value {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.4rem;
    color: #a0a0a0;
}

.user-detail-actions {
    display: flex;
    align-items: center;
    gap: 1.2rem;
    padding-top: 1.6rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.user-detail-actions label {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    color: #666;
}

/* ============ ANALYTICS STYLES ============ */

.analytics-dashboard {
    display: flex;
    flex-direction: column;
    gap: 2.4rem;
}

.metrics-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.6rem;
}

.metric-card {
    display: flex;
    align-items: center;
    gap: 1.6rem;
    padding: 2rem;
    background: #202020;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
}

.metric-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.metric-icon.users {
    background: rgba(151, 71, 255, 0.2);
    color: rgb(151, 71, 255);
}
.metric-icon.views {
    background: rgba(59, 130, 246, 0.2);
    color: rgb(59, 130, 246);
}
.metric-icon.time {
    background: rgba(234, 179, 8, 0.2);
    color: rgb(234, 179, 8);
}
.metric-icon.quiz {
    background: rgba(34, 197, 94, 0.2);
    color: rgb(34, 197, 94);
}

.metric-info {
    display: flex;
    flex-direction: column;
}

.metric-value {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 2.8rem;
    font-weight: 600;
    color: white;
    line-height: 1;
}

.metric-label {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    color: #666;
    margin-top: 0.4rem;
}

.chart-container {
    background: #202020;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 2rem;
}

.chart-title {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.6rem;
    font-weight: 500;
    color: white;
    margin: 0 0 2rem;
}

.chart-wrapper {
    height: 250px;
}

.chart-empty {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.chart-empty p {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.4rem;
    color: #666;
}

.simple-chart {
    height: 100%;
}

.chart-bars {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    height: 200px;
    padding-bottom: 30px;
    gap: 4px;
}

.chart-bar-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
}

.chart-bar {
    width: 100%;
    max-width: 40px;
    background: linear-gradient(
        to top,
        rgb(151, 71, 255),
        rgba(151, 71, 255, 0.5)
    );
    border-radius: 4px 4px 0 0;
    position: relative;
    transition: height 0.3s ease;
}

.bar-value {
    position: absolute;
    top: -20px;
    left: 50%;
    transform: translateX(-50%);
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.1rem;
    color: #a0a0a0;
}

.bar-label {
    position: absolute;
    bottom: -25px;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1rem;
    color: #666;
    white-space: nowrap;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.6rem;
}

.stats-card {
    background: #202020;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 2rem;
}

.stats-card.wide {
    grid-column: span 2;
}

.stats-title {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.6rem;
    font-weight: 500;
    color: white;
    margin: 0 0 1.6rem;
}

.stats-empty {
    padding: 2rem;
    text-align: center;
}

.stats-empty p {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.4rem;
    color: #666;
}

.stats-list {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
}

.stats-item {
    display: flex;
    align-items: center;
    gap: 1.2rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
}

.stats-rank {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(151, 71, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    color: rgb(151, 71, 255);
}

.stats-name {
    flex: 1;
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.4rem;
    color: #a0a0a0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.stats-value {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.3rem;
    color: #666;
}

.highlights-list {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
}

.highlight-item {
    padding: 1.2rem;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
    border-left: 3px solid rgb(151, 71, 255);
}

.highlight-count {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    color: rgb(151, 71, 255);
}

.highlight-text {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.4rem;
    color: #898989;
    margin: 0.8rem 0 0;
    line-height: 1.5;
    font-style: italic;
}

/* ============ QUIZZES STYLES ============ */

.quizzes-list {
    display: flex;
    flex-direction: column;
    gap: 1.6rem;
}

.quiz-card {
    background: #202020;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 2rem;
}

.quiz-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.2rem;
}

.quiz-info {
}

.quiz-title {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.8rem;
    font-weight: 500;
    color: white;
    margin: 0 0 0.4rem;
}

.quiz-module {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    color: #666;
}

.quiz-actions {
    display: flex;
    gap: 0.8rem;
}

.quiz-meta {
    display: flex;
    gap: 2rem;
    margin-bottom: 1.6rem;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.3rem;
    color: #666;
}

.quiz-stats {
    display: flex;
    gap: 3.2rem;
    padding-top: 1.6rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.quiz-stats .stat {
    display: flex;
    flex-direction: column;
}

.quiz-stats .stat-value {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 2.4rem;
    font-weight: 600;
    color: white;
}

.quiz-stats .stat-label {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    color: #666;
}

.quiz-editor {
}

.editor-header {
    display: flex;
    align-items: center;
    gap: 2rem;
    margin-bottom: 2.4rem;
}

.editor-header h3 {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 2rem;
    font-weight: 600;
    color: white;
    margin: 0;
}

.quiz-form {
    background: #202020;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 2.4rem;
}

.questions-section {
    background: #202020;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 2rem;
}

.questions-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
}

.questions-header h4 {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.6rem;
    font-weight: 500;
    color: white;
    margin: 0;
}

.empty-questions {
    padding: 3rem;
    text-align: center;
    color: #666;
}

.questions-list {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
}

.question-card {
    background: #252525;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 1.6rem;
}

.question-header {
    display: flex;
    align-items: center;
    gap: 1.2rem;
    margin-bottom: 1rem;
}

.question-number {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    font-weight: 600;
    color: rgb(151, 71, 255);
}

.question-type-badge {
    padding: 0.3rem 0.8rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.1rem;
    color: #898989;
}

.question-points {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.2rem;
    color: #666;
    margin-left: auto;
}

.question-text {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.5rem;
    color: white;
    margin: 0 0 1.2rem;
    line-height: 1.5;
}

.question-options {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    margin-bottom: 1.2rem;
}

.question-options .option {
    padding: 0.8rem 1.2rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 6px;
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.4rem;
    color: #898989;
}

.question-options .option.correct {
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
    border: 1px solid rgba(34, 197, 94, 0.3);
}

.question-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.8rem;
}

.icon-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #666;
    cursor: pointer;
    transition: all 0.2s;
}

.icon-btn:hover {
    border-color: rgba(255, 255, 255, 0.3);
    color: white;
}

.icon-btn.danger:hover {
    border-color: rgba(239, 68, 68, 0.5);
    color: #ef4444;
}

.question-modal {
    max-width: 600px;
}

.option-input-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
}

.option-letter {
    width: 24px;
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.4rem;
    font-weight: 600;
    color: #666;
}

.option-input-row .form-input {
    flex: 1;
}

.option-input-row .radio-label {
    white-space: nowrap;
}
</style>
