<script setup>
// Chapter block editor — extracted from DashboardView's Chapters section.
// Owns local UI state (block selection, editor content, drag state) and the
// pure block<->HTML transforms. DB writes are emitted to the parent, which owns
// the data fetches + shared media picker:
//   @save     { paragraphId, content: { blocks }, contentText }  -> parent PATCHes + refreshes
//   @reorder  { sectionId, orderedIds: string[] }                -> parent PATCHes order_index + refreshes
//   @attach-media  block   -> parent opens the media picker for this block
//   @detach-media  block   -> parent clears the block's media
// Props are the already-fetched content; the parent re-passes them after a refresh.
import { ref, computed, watch, nextTick, onBeforeUnmount } from "vue";
import TipTapEditor from "@/components/Editor/TipTapEditor.vue";
import { StatGrid, StatCard, Button } from "@/components/dashboard/shared";

const props = defineProps({
  sections: { type: Array, default: () => [] },
  paragraphs: { type: Array, default: () => [] },
  mediaItems: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
  saveStatus: { type: String, default: "" },
});
const emit = defineEmits(["save", "reorder", "attach-media", "detach-media"]);

// --- local UI state ---
const flatBlocks = ref([]);
const selectedBlock = ref(null);
const editorContent = ref("");
const highlightedBlockId = ref(null);
const contentPreviewRef = ref(null);
const draggedBlockId = ref(null);
const dragOverBlockId = ref(null);
let scrollObserver = null;

// --- pure transforms (verbatim from DashboardView) ---
function blocksToHtml(blocks) {
  if (!blocks || !Array.isArray(blocks)) return "";
  return blocks
    .map((block) => {
      switch (block.type) {
        case "heading": {
          const level = block.level || 2;
          return `<h${level}>${block.content || ""}</h${level}>`;
        }
        case "paragraph":
        case "text":
          return `<p>${block.content || ""}</p>`;
        case "list": {
          const items = (block.items || []).map((item) => `<li>${item}</li>`).join("");
          return block.ordered ? `<ol>${items}</ol>` : `<ul>${items}</ul>`;
        }
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

function htmlToBlocks(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const blocks = [];
  doc.body.childNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();
      if (tagName.match(/^h[1-6]$/)) {
        blocks.push({ type: "heading", level: parseInt(tagName[1]), content: node.textContent });
      } else if (tagName === "p") {
        blocks.push({ type: "paragraph", content: node.innerHTML });
      } else if (tagName === "ul") {
        blocks.push({ type: "list", ordered: false, items: Array.from(node.querySelectorAll("li")).map((li) => li.textContent) });
      } else if (tagName === "ol") {
        blocks.push({ type: "list", ordered: true, items: Array.from(node.querySelectorAll("li")).map((li) => li.textContent) });
      } else if (tagName === "blockquote") {
        blocks.push({ type: "blockquote", content: node.textContent });
      } else if (tagName === "pre") {
        blocks.push({ type: "code", content: node.textContent });
      } else if (tagName === "img") {
        blocks.push({ type: "image", src: node.getAttribute("src"), alt: node.getAttribute("alt") || "" });
      }
    }
  });
  return blocks;
}

function getBlockPreview(paragraph) {
  const text = paragraph.content_text || "";
  const stripped = text.replace(/<[^>]*>/g, "").trim();
  return stripped.length > 60 ? stripped.slice(0, 60) + "..." : stripped;
}

function buildFlatBlocks() {
  const blocks = [];
  props.sections.forEach((section, sectionIndex) => {
    blocks.push({
      type: "section",
      id: section.id,
      title: section.title,
      slug: section.slug,
      depth: 0,
      sectionId: section.id,
      sectionIndex,
      orderIndex: section.order_index,
    });
    const sectionParagraphs = props.paragraphs
      .filter((p) => p.section_id === section.id)
      .sort((a, b) => a.order_index - b.order_index);
    sectionParagraphs.forEach((p, paraIndex) => {
      const wordCount = (p.content_text || "").split(/\s+/).filter(Boolean).length;
      const jsonBlocks = p.content?.blocks || [];
      const htmlContent = blocksToHtml(jsonBlocks);
      blocks.push({
        type: "paragraph",
        id: p.id,
        content: p.content,
        contentText: p.content_text,
        htmlContent,
        preview: getBlockPreview(p),
        depth: 1,
        sectionId: section.id,
        sectionTitle: section.title,
        orderIndex: p.order_index,
        paraIndex,
        isSubsectionHeader: p.is_subsection_header,
        wordCount,
        animationId: p.animation_id || null,
        animationTrigger: p.animation_trigger || null,
        animationTitle: p.animation_id
          ? props.mediaItems.find((m) => m.id === p.animation_id)?.title ||
            props.mediaItems.find((m) => m.id === p.animation_id)?.animation_key ||
            p.animation_trigger ||
            "Media"
          : null,
      });
    });
  });
  flatBlocks.value = blocks;
}

// Rebuild blocks whenever the source content changes (parent refresh), and
// re-point the selected block at its refreshed copy so the editor stays in sync.
watch(
  () => [props.sections, props.paragraphs, props.mediaItems],
  () => {
    buildFlatBlocks();
    if (selectedBlock.value) {
      const updated = flatBlocks.value.find((b) => b.id === selectedBlock.value.id);
      if (updated) selectedBlock.value = updated;
    }
    setupScrollObserver();
  },
  { immediate: true, deep: true }
);

// --- selection ---
function selectBlock(block) {
  if (block.type === "section") return; // sections not editable
  selectedBlock.value = block;
  const blocks = block.content?.blocks || [];
  editorContent.value = blocksToHtml(blocks);
}
function clearSelection() {
  selectedBlock.value = null;
  editorContent.value = "";
}

// --- save (emit to parent) ---
function save() {
  if (!selectedBlock.value) return;
  const blocks = htmlToBlocks(editorContent.value);
  const contentText = blocks
    .map((b) => b.content || b.items?.join(" ") || "")
    .join(" ")
    .replace(/<[^>]*>/g, "");
  emit("save", { paragraphId: selectedBlock.value.id, content: { blocks }, contentText });
}

// --- drag & drop (reorder within a section; emit ordered ids to parent) ---
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
function handleDrop(e, targetBlock) {
  e.preventDefault();
  const dragged = flatBlocks.value.find((b) => b.id === draggedBlockId.value);
  if (
    !draggedBlockId.value ||
    targetBlock.type === "section" ||
    !dragged ||
    dragged.sectionId !== targetBlock.sectionId
  ) {
    draggedBlockId.value = null;
    dragOverBlockId.value = null;
    return;
  }
  const sectionBlocks = flatBlocks.value
    .filter((b) => b.type === "paragraph" && b.sectionId === targetBlock.sectionId)
    .sort((a, b) => a.orderIndex - b.orderIndex);
  const draggedIndex = sectionBlocks.findIndex((b) => b.id === dragged.id);
  const targetIndex = sectionBlocks.findIndex((b) => b.id === targetBlock.id);
  if (draggedIndex !== targetIndex) {
    sectionBlocks.splice(draggedIndex, 1);
    sectionBlocks.splice(targetIndex, 0, dragged);
    emit("reorder", { sectionId: targetBlock.sectionId, orderedIds: sectionBlocks.map((b) => b.id) });
  }
  draggedBlockId.value = null;
  dragOverBlockId.value = null;
}
function handleDragEnd() {
  draggedBlockId.value = null;
  dragOverBlockId.value = null;
}

// --- scroll sync (preview highlight) ---
function setupScrollObserver() {
  if (scrollObserver) {
    scrollObserver.disconnect();
    scrollObserver = null;
  }
  nextTick(() => {
    if (!contentPreviewRef.value) return;
    scrollObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            highlightedBlockId.value = entry.target.dataset.blockId || null;
          }
        });
      },
      { root: contentPreviewRef.value, threshold: 0.5 }
    );
    contentPreviewRef.value
      .querySelectorAll("[data-block-id]")
      ?.forEach((el) => scrollObserver.observe(el));
  });
}
onBeforeUnmount(() => scrollObserver?.disconnect());

const chapterStats = computed(() => {
  const sections = props.sections.length;
  const paragraphs = flatBlocks.value.filter((b) => b.type === "paragraph").length;
  const words = props.paragraphs.reduce(
    (sum, p) => sum + (p.content_text || "").split(/\s+/).filter(Boolean).length,
    0
  );
  const readingTime = Math.ceil(words / 200);
  return { sections, paragraphs, words, readingTime };
});
</script>

<template>
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
              title="Click to remove media"
              @click.stop="emit('detach-media', block)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              {{ block.animationTrigger || 'Media' }}
              <span class="media-badge-x">&times;</span>
            </span>
            <button
              v-else
              type="button"
              class="attach-media-btn"
              title="Attach animation or media"
              @click.stop="emit('attach-media', block)"
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
      <div v-if="!selectedBlock" class="stats-panel">
        <StatGrid :columns="4">
          <StatCard :value="chapterStats.sections" label="Sections" />
          <StatCard :value="chapterStats.paragraphs" label="Paragraphs" />
          <StatCard :value="chapterStats.words" label="Words" />
          <StatCard :value="chapterStats.readingTime" label="Min read" />
        </StatGrid>

        <div ref="contentPreviewRef" class="content-preview">
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

      <div v-else class="editor-content">
        <div class="editor-head">
          <Button variant="ghost" size="sm" @click="clearSelection">← Back to overview</Button>
          <h4 class="editing-title">Editing: {{ selectedBlock.preview || "Paragraph" }}</h4>
        </div>

        <TipTapEditor v-model="editorContent" placeholder="Start writing..." />

        <div class="editor-footer">
          <span v-if="saveStatus" class="save-status" :class="{ error: saveStatus.includes('Error') }">{{ saveStatus }}</span>
          <Button variant="solid" size="sm" :loading="saving" @click="save">{{ saving ? "Saving…" : "Save" }}</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chapter-editor-layout { display: grid; grid-template-columns: 340px 1fr; min-height: 480px; }
@media (max-width: 1100px) { .chapter-editor-layout { grid-template-columns: 1fr; } }

.blocks-sidebar { border-right: 1px solid rgb(var(--color-line)); }
@media (max-width: 1100px) { .blocks-sidebar { border-right: 0; border-bottom: 1px solid rgb(var(--color-line)); } }
.blocks-list { max-height: 600px; overflow-y: auto; padding: 8px; }
.blocks-list::-webkit-scrollbar { width: 8px; }
.blocks-list::-webkit-scrollbar-track { background: transparent; }
.blocks-list::-webkit-scrollbar-thumb { background: rgb(var(--color-ink) / 0.15); border-radius: 999px; }

.block-item {
  display: flex; align-items: center; gap: 8px; padding: 8px 10px;
  border-radius: 4px; cursor: pointer; transition: background 0.12s ease;
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
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.selected-arrow { color: rgb(var(--color-accent)); flex: none; }

.media-badge {
  display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px;
  font-family: var(--font-mono); font-size: 1rem; border-radius: 999px;
  background: rgb(var(--color-accent) / 0.12); color: rgb(var(--color-accent));
  flex: none; cursor: pointer;
}
.media-badge:hover { background: rgb(var(--color-accent) / 0.2); }
.media-badge-x { font-size: 1.3rem; line-height: 1; }
.attach-media-btn {
  display: inline-flex; align-items: center; justify-content: center; padding: 4px;
  border: 1px solid rgb(var(--color-line)); border-radius: 4px; background: transparent;
  color: rgb(var(--color-mute)); cursor: pointer; flex: none; opacity: 0; transition: opacity 0.12s ease;
}
.block-item:hover .attach-media-btn { opacity: 1; }
.attach-media-btn:hover { color: rgb(var(--color-accent)); border-color: rgb(var(--color-accent)); }

.editor-panel { padding: 20px; min-width: 0; }
.stats-panel { display: flex; flex-direction: column; gap: 20px; }

.content-preview { border: 1px solid rgb(var(--color-line)); border-radius: 4px; overflow: hidden; }
.preview-title {
  font-family: var(--font-mono); font-size: 1.1rem; text-transform: uppercase;
  letter-spacing: 0.08em; color: rgb(var(--color-mute)); margin: 0; padding: 12px 16px;
  border-bottom: 1px solid rgb(var(--color-line));
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
  font-family: var(--font-mono); font-size: 1rem; text-transform: uppercase;
  letter-spacing: 0.08em; padding: 2px 8px; border-radius: 999px;
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
</style>
