<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";
import { supabase } from "@/lib/supabase";
import TipTapEditor from "@/components/Editor/TipTapEditor.vue";

const router = useRouter();
const { isCreator, loading, userRole } = useAuth();

// Editor state
const editorContent = ref("");
const selectedParagraph = ref(null);
const paragraphs = ref([]);
const loadingParagraphs = ref(false);
const saving = ref(false);
const saveStatus = ref("");

// Fetch paragraphs from Supabase
const fetchParagraphs = async () => {
    loadingParagraphs.value = true;
    try {
        const { data, error } = await supabase
            .from("paragraphs")
            .select(
                `
        id,
        order_index,
        content,
        sections (
          id,
          title,
          order_index,
          modules (
            id,
            title,
            order_index
          )
        )
      `,
            )
            .order("order_index", { ascending: true });

        if (error) throw error;
        paragraphs.value = data || [];
    } catch (err) {
        console.error("Error fetching paragraphs:", err);
    } finally {
        loadingParagraphs.value = false;
    }
};

// Select a paragraph for editing
const selectParagraph = (paragraph) => {
    selectedParagraph.value = paragraph;
    // Convert JSONB content blocks to HTML for editing
    const blocks = paragraph.content?.blocks || [];
    editorContent.value = blocksToHtml(blocks);
    saveStatus.value = "";
};

// Convert JSONB blocks to HTML
const blocksToHtml = (blocks) => {
    return blocks
        .map((block) => {
            switch (block.type) {
                case "heading":
                    const level = block.level || 2;
                    return `<h${level}>${block.content || ""}</h${level}>`;
                case "paragraph":
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
};

// Convert HTML back to JSONB blocks
const htmlToBlocks = (html) => {
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
};

// Save paragraph to Supabase
const saveParagraph = async () => {
    if (!selectedParagraph.value) return;

    saving.value = true;
    saveStatus.value = "";

    try {
        const blocks = htmlToBlocks(editorContent.value);
        const { error } = await supabase
            .from("paragraphs")
            .update({
                content: { blocks },
                updated_at: new Date().toISOString(),
            })
            .eq("id", selectedParagraph.value.id);

        if (error) throw error;

        // Update local state
        selectedParagraph.value.content = { blocks };
        saveStatus.value = "Saved successfully!";

        // Refresh the list
        await fetchParagraphs();
    } catch (err) {
        console.error("Error saving paragraph:", err);
        saveStatus.value = "Error saving: " + err.message;
    } finally {
        saving.value = false;
    }
};

// Get paragraph title for display
const getParagraphTitle = (paragraph) => {
    const blocks = paragraph.content?.blocks || [];
    const firstHeading = blocks.find((b) => b.type === "heading");
    if (firstHeading) return firstHeading.content;

    const firstParagraph = blocks.find((b) => b.type === "paragraph");
    if (firstParagraph) {
        const text = firstParagraph.content.replace(/<[^>]*>/g, "");
        return text.slice(0, 50) + (text.length > 50 ? "..." : "");
    }

    return `Paragraph ${paragraph.order_index + 1}`;
};

onMounted(() => {
    fetchParagraphs();
});
</script>

<template>
    <main class="min-h-screen bg-darker text-white pt-24 px-12">
        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center h-[60vh]">
            <div class="text-xl text-light">Loading...</div>
        </div>

        <!-- Not a Creator -->
        <div
            v-else-if="!isCreator"
            class="flex flex-col items-center justify-center h-[60vh] gap-6"
        >
            <h1 class="text-4xl font-semibold">Access Denied</h1>
            <p class="text-light text-lg">
                The content editor is only available to users with the Creator
                role.
            </p>
            <p class="text-light">
                Your current role:
                <span class="text-violet font-mono uppercase">{{
                    userRole || "none"
                }}</span>
            </p>
            <button
                @click="router.push('/dashboard')"
                class="uppercase bg-violet text-white font-mono px-8 py-3 rounded-full hover:bg-white hover:text-black transition-colors"
            >
                Go to Dashboard
            </button>
        </div>

        <!-- Editor (Creator Only) -->
        <div v-else class="max-w-7xl mx-auto">
            <header class="flex justify-between items-center mb-8">
                <div>
                    <h1 class="text-4xl font-semibold mb-2">Content Editor</h1>
                    <p class="text-light">Create and edit chapter content</p>
                </div>
                <button
                    @click="router.push('/dashboard')"
                    class="uppercase bg-transparent border border-light text-light font-mono px-6 py-2 rounded-full hover:bg-white hover:text-black hover:border-white transition-colors"
                >
                    Back to Dashboard
                </button>
            </header>

            <div class="grid grid-cols-12 gap-8">
                <!-- Sidebar - Paragraph List -->
                <aside class="col-span-4 lg:col-span-3">
                    <div class="sticky top-24">
                        <h2 class="text-lg font-semibold mb-4">
                            Content Blocks
                        </h2>

                        <div v-if="loadingParagraphs" class="text-light">
                            Loading content...
                        </div>

                        <div
                            v-else
                            class="space-y-2 max-h-[70vh] overflow-y-auto pr-2"
                        >
                            <button
                                v-for="paragraph in paragraphs"
                                :key="paragraph.id"
                                @click="selectParagraph(paragraph)"
                                class="w-full text-left p-3 rounded-lg transition-all"
                                :class="
                                    selectedParagraph?.id === paragraph.id
                                        ? 'bg-violet/20 border border-violet'
                                        : 'bg-white/5 border border-transparent hover:bg-white/10'
                                "
                            >
                                <div class="text-sm font-medium truncate">
                                    {{ getParagraphTitle(paragraph) }}
                                </div>
                                <div class="text-xs text-light mt-1">
                                    {{
                                        paragraph.sections?.modules?.title ||
                                        "Unknown Module"
                                    }}
                                </div>
                            </button>
                        </div>
                    </div>
                </aside>

                <!-- Main Editor Area -->
                <div class="col-span-8 lg:col-span-9">
                    <div
                        v-if="!selectedParagraph"
                        class="text-center py-20 text-light"
                    >
                        <p class="text-xl mb-4">
                            Select a content block to edit
                        </p>
                        <p>Choose from the list on the left to begin editing</p>
                    </div>

                    <div v-else>
                        <!-- Editor Header -->
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-xl font-semibold">
                                Editing:
                                {{ getParagraphTitle(selectedParagraph) }}
                            </h3>
                            <div class="flex items-center gap-4">
                                <span
                                    v-if="saveStatus"
                                    :class="
                                        saveStatus.includes('Error')
                                            ? 'text-red-400'
                                            : 'text-green-400'
                                    "
                                    class="text-sm"
                                >
                                    {{ saveStatus }}
                                </span>
                                <button
                                    @click="saveParagraph"
                                    :disabled="saving"
                                    class="uppercase bg-violet text-white font-mono px-6 py-2 rounded-full hover:bg-white hover:text-black transition-colors disabled:opacity-50"
                                >
                                    {{ saving ? "Saving..." : "Save Changes" }}
                                </button>
                            </div>
                        </div>

                        <!-- TipTap Editor -->
                        <TipTapEditor
                            v-model="editorContent"
                            placeholder="Start writing your content..."
                        />

                        <!-- Preview Info -->
                        <div class="mt-6 p-4 bg-white/5 rounded-lg">
                            <h4 class="font-semibold mb-2">Content Info</h4>
                            <div
                                class="grid grid-cols-2 gap-4 text-sm text-light"
                            >
                                <div>
                                    <span class="text-white">Section:</span>
                                    {{
                                        selectedParagraph.sections?.title ||
                                        "Unknown"
                                    }}
                                </div>
                                <div>
                                    <span class="text-white">Module:</span>
                                    {{
                                        selectedParagraph.sections?.modules
                                            ?.title || "Unknown"
                                    }}
                                </div>
                                <div>
                                    <span class="text-white">Order:</span>
                                    {{ selectedParagraph.order_index + 1 }}
                                </div>
                                <div>
                                    <span class="text-white">ID:</span>
                                    {{ selectedParagraph.id }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>

<style scoped>
/* Scrollbar styling for sidebar */
aside ::-webkit-scrollbar {
    width: 4px;
}

aside ::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 2px;
}

aside ::-webkit-scrollbar-thumb {
    background: rgba(151, 71, 255, 0.5);
    border-radius: 2px;
}

aside ::-webkit-scrollbar-thumb:hover {
    background: rgba(151, 71, 255, 0.7);
}
</style>
