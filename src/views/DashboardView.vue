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

// Watch for section changes to fetch chapters
watch(activeSection, (newSection) => {
    if (newSection === "chapters" && chapters.value.length === 0) {
        fetchAllChapters();
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
                    <div class="section-placeholder">
                        <h2>Version Management</h2>
                        <p>
                            Release new versions (v1.0, v1.1...) and manage
                            content history.
                        </p>
                    </div>
                </section>

                <!-- Media Section -->
                <section
                    v-else-if="activeSection === 'media'"
                    class="section-content"
                >
                    <div class="section-placeholder">
                        <h2>Media Library</h2>
                        <p>
                            Upload and manage images, animations, datasets, and
                            Python code.
                        </p>
                    </div>
                </section>

                <!-- Users Section -->
                <section
                    v-else-if="activeSection === 'users'"
                    class="section-content"
                >
                    <div class="section-placeholder">
                        <h2>User Management</h2>
                        <p>View and manage professors and students.</p>
                    </div>
                </section>

                <!-- Analytics Section -->
                <section
                    v-else-if="activeSection === 'analytics'"
                    class="section-content"
                >
                    <div class="section-placeholder">
                        <h2>Analytics Dashboard</h2>
                        <p>
                            View detailed analytics for reads, quiz scores,
                            professor usage, and student engagement.
                        </p>
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
</style>
