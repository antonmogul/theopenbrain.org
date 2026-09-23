<script setup>
/*
 * Chapter block page — /dashboard/chapters/:slug (OPENBRAIN-60, plan Phase 2).
 *
 * One roomy column per chapter: every paragraph row renders as the reader
 * shows it (BlockPreview: citations, figures, running widgets), and clicking
 * one edits it in place (ParagraphEditor, lossless schema). Saves go straight
 * to the chapter with Undo; a published chapter asks once before the first
 * edit. Inserting, moving and deleting blocks arrive in Phase 2b.
 */
import { computed, nextTick, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useChapterEditor } from "@/composables/useChapterEditor";
import BlockPreview from "@/components/chapterEditor/BlockPreview.vue";
import ParagraphEditor from "@/components/chapterEditor/ParagraphEditor.vue";
import {
  StatusBadge,
  Button,
  ConfirmDialog,
  LoadingState,
  ErrorState,
} from "@/components/dashboard/shared";

const route = useRoute();
const ed = useChapterEditor(route.params.slug);

const editingId = ref(null);
const editError = ref("");
const toast = ref(null);
let toastTimer = null;
const confirmedLive = ref(false);
const pendingEditId = ref(null);

const isPublished = computed(() => ed.module.value?.status === "published");
const readerHref = computed(() =>
  ed.module.value
    ? `/chapter/${ed.module.value.order_index}/${ed.module.value.slug}`
    : "#"
);
const savedLabel = computed(() => {
  if (ed.saving.value) return "Saving…";
  if (!ed.lastSavedAt.value) return "No changes yet";
  return `Saved ${ed.lastSavedAt.value.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
});

function showToast(message, { undo = false, error = false } = {}) {
  clearTimeout(toastTimer);
  toast.value = { message, undo, error };
  toastTimer = setTimeout(() => (toast.value = null), undo ? 10000 : 5000);
}

function startEdit(p) {
  if (editingId.value === p.id) return;
  if (isPublished.value && !confirmedLive.value) {
    pendingEditId.value = p.id;
    return;
  }
  editError.value = "";
  editingId.value = p.id;
}

function confirmLive() {
  confirmedLive.value = true;
  const id = pendingEditId.value;
  pendingEditId.value = null;
  const p = ed.paragraphs.value.find((x) => x.id === id);
  if (p) startEdit(p);
}

async function save(p, blocks) {
  editError.value = "";
  try {
    await ed.saveBlocks(p.id, blocks, "Edit");
    editingId.value = null;
    showToast("Saved.", { undo: true });
  } catch (err) {
    console.error("Chapter editor save failed:", err);
    editError.value = err.message || "Couldn't save. Try again.";
  }
}

async function undo() {
  clearTimeout(toastTimer);
  toast.value = null;
  try {
    const label = await ed.undo();
    if (label) showToast(`Undid: ${label.toLowerCase()}.`);
  } catch (err) {
    showToast(`Couldn't undo: ${err.message}`, { error: true });
  }
}

function scrollToSection(id) {
  document
    .getElementById(`sec-${id}`)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

onMounted(async () => {
  await ed.load();
  if (ed.module.value)
    document.title = `Edit · ${ed.module.value.title} · The Open Brain`;
  await nextTick();
});
</script>

<template>
  <div class="ce">
    <header class="ce-top">
      <router-link to="/dashboard?section=chapters" class="ce-back"
        >← Chapters</router-link
      >
      <div v-if="ed.module.value" class="ce-title">
        <span class="ce-eyebrow"
          >Chapter {{ ed.module.value.order_index }}</span
        >
        <h1>{{ ed.module.value.title }}</h1>
      </div>
      <StatusBadge
        v-if="ed.module.value"
        :status="ed.module.value.status || 'draft'"
      />
      <span class="ce-spacer" />
      <span class="ce-saved" :class="{ 'is-saving': ed.saving.value }">{{
        savedLabel
      }}</span>
      <Button
        v-if="ed.undoStack.value.length"
        variant="ghost"
        size="sm"
        @click="undo"
        >Undo</Button
      >
      <a :href="readerHref" target="_blank" rel="noopener" class="ce-link"
        >Preview in reader ↗</a
      >
    </header>

    <LoadingState v-if="ed.loading.value" message="Loading chapter…" />
    <ErrorState
      v-else-if="ed.error.value"
      :message="ed.error.value"
      @retry="ed.load"
    />

    <div v-else-if="ed.module.value" class="ce-body">
      <nav class="ce-toc" aria-label="Sections">
        <p class="ce-toc-head">
          {{ ed.stats.value.sections }} sections ·
          {{ ed.stats.value.words.toLocaleString() }} words ·
          {{ ed.stats.value.minutes }} min
        </p>
        <button
          v-for="(s, i) in ed.sections.value"
          :key="s.id"
          type="button"
          class="ce-toc-item"
          @click="scrollToSection(s.id)"
        >
          <span class="ce-toc-n">{{ i + 1 }}</span>
          <span>{{ s.title }}</span>
        </button>
      </nav>

      <main class="ce-main">
        <p v-if="isPublished" class="ce-live-note">
          This chapter is published: saved edits reach readers straight away.
          Every save can be undone.
        </p>

        <section
          v-for="(s, i) in ed.sections.value"
          :id="`sec-${s.id}`"
          :key="s.id"
          class="ce-section"
        >
          <header class="ce-section-head">
            <span class="ce-section-n">Section {{ i + 1 }}</span>
            <h2>{{ s.title }}</h2>
          </header>

          <div
            v-for="p in ed.paragraphsBySection.value.get(s.id) || []"
            :key="p.id"
            class="ce-block"
            :class="{
              'is-editing': editingId === p.id,
              'is-sub': (p.subsection_level || 0) > 0,
            }"
          >
            <ParagraphEditor
              v-if="editingId === p.id"
              :blocks="p.content?.blocks || []"
              :saving="ed.saving.value"
              :error="editError"
              @save="(blocks) => save(p, blocks)"
              @cancel="editingId = null"
            />
            <div
              v-else
              class="ce-block-view"
              role="button"
              tabindex="0"
              :aria-label="`Edit: ${(p.content_text || 'paragraph').slice(0, 60)}`"
              @click="startEdit(p)"
              @keydown.enter.self.prevent="startEdit(p)"
            >
              <BlockPreview :paragraph="p" :media-by-id="ed.mediaById.value" />
              <span class="ce-edit-hint" aria-hidden="true">Edit</span>
            </div>
          </div>

          <p
            v-if="!(ed.paragraphsBySection.value.get(s.id) || []).length"
            class="ce-empty"
          >
            No paragraphs in this section yet.
          </p>
        </section>
      </main>
    </div>

    <ConfirmDialog
      :model-value="!!pendingEditId"
      title="Edit a published chapter?"
      confirm-label="Edit anyway"
      variant="warn"
      @update:model-value="(open) => !open && (pendingEditId = null)"
      @confirm="confirmLive"
    >
      <strong>{{ ed.module.value?.title }}</strong> is published. Saved edits
      reach readers straight away. You can undo each save. Drafts, which hold
      edits back until you publish them, come in a later phase.
    </ConfirmDialog>

    <div
      v-if="toast"
      class="ce-toast"
      :class="{ 'is-error': toast.error }"
      role="status"
      aria-live="polite"
    >
      <span>{{ toast.message }}</span>
      <button
        v-if="toast.undo"
        type="button"
        class="ce-toast-undo"
        @click="undo"
      >
        Undo
      </button>
      <button
        type="button"
        class="ce-toast-close"
        aria-label="Dismiss"
        @click="toast = null"
      >
        &times;
      </button>
    </div>
  </div>
</template>

<style scoped>
.ce {
  min-height: 100vh;
  background: rgb(var(--color-bg));
  color: rgb(var(--color-ink));
}
.ce-top {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  padding: 12px clamp(16px, 3vw, 40px);
  background: rgb(var(--color-paper));
  border-bottom: 1px solid rgb(var(--color-line));
}
.ce-back,
.ce-link {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--color-ink));
  text-decoration: none;
  padding: 6px 10px;
  border-radius: 999px;
}
.ce-back:hover,
.ce-link:hover,
.ce-back:focus-visible,
.ce-link:focus-visible {
  background: rgb(var(--color-line));
}
.ce-title {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.ce-title h1 {
  margin: 0;
  font-family: var(--font-ui);
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.2;
}
.ce-eyebrow,
.ce-saved,
.ce-toc-head,
.ce-section-n {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--color-mute));
}
.ce-saved.is-saving {
  color: rgb(var(--color-accent));
}
.ce-spacer {
  flex: 1;
}
.ce-body {
  display: grid;
  grid-template-columns: minmax(0, 15rem) minmax(0, 46rem);
  justify-content: center;
  gap: clamp(24px, 4vw, 64px);
  padding: 32px clamp(16px, 3vw, 40px) 120px;
}
@media (max-width: 900px) {
  .ce-body {
    grid-template-columns: minmax(0, 1fr);
  }
  .ce-toc {
    display: none;
  }
}
.ce-toc {
  position: sticky;
  top: 88px;
  align-self: start;
  display: grid;
  gap: 2px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}
.ce-toc-head {
  margin: 0 0 10px;
}
.ce-toc-item {
  display: grid;
  grid-template-columns: 1.5rem 1fr;
  gap: 6px;
  padding: 6px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: rgb(var(--color-ink));
  font-family: var(--font-ui);
  font-size: 0.875rem;
  line-height: 1.35;
  text-align: left;
  cursor: pointer;
}
.ce-toc-item:hover,
.ce-toc-item:focus-visible {
  background: rgb(var(--color-line) / 0.7);
}
.ce-toc-n {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: rgb(var(--color-chapter, var(--color-accent)));
}
.ce-main {
  display: grid;
  gap: 48px;
  min-width: 0;
}
.ce-live-note {
  margin: 0;
  padding: 10px 14px;
  border-radius: 6px;
  background: rgb(var(--color-warn) / 0.14);
  font-family: var(--font-ui);
  font-size: 0.875rem;
}
.ce-section {
  display: grid;
  gap: 6px;
  scroll-margin-top: 88px;
}
.ce-section-head {
  display: grid;
  gap: 4px;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgb(var(--color-line));
}
.ce-section-head h2 {
  margin: 0;
  font-family: var(--font-ui);
  font-size: 1.625rem;
  font-weight: 600;
  line-height: 1.2;
}
.ce-block {
  position: relative;
}
.ce-block.is-sub {
  margin-left: 12px;
}
.ce-block-view {
  position: relative;
  padding: 10px 14px;
  margin: 0 -14px;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: text;
}
.ce-block-view:hover,
.ce-block-view:focus-visible {
  border-color: rgb(var(--color-line));
  background: rgb(var(--color-paper));
  outline: none;
}
.ce-block-view:focus-visible {
  border-color: rgb(var(--color-accent) / 0.6);
}
.ce-edit-hint {
  position: absolute;
  top: 8px;
  right: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgb(var(--color-ink));
  color: rgb(var(--color-bg));
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0;
  transition: opacity 0.12s ease;
}
.ce-block-view:hover .ce-edit-hint,
.ce-block-view:focus-visible .ce-edit-hint {
  opacity: 1;
}
.ce-empty {
  margin: 0;
  color: rgb(var(--color-mute));
  font-style: italic;
}
.ce-toast {
  position: fixed;
  left: 50%;
  bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  z-index: 60;
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: calc(100vw - 32px);
  padding: 10px 12px 10px 16px;
  border-radius: 8px;
  background: rgb(var(--color-ink));
  color: rgb(var(--color-bg));
  font-family: var(--font-ui);
  font-size: 0.875rem;
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.18);
}
.ce-toast.is-error {
  background: rgb(var(--color-accent));
  color: #fff;
}
.ce-toast-undo,
.ce-toast-close {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.ce-toast-undo {
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.ce-toast-close {
  font-size: 1.125rem;
  opacity: 0.7;
}
</style>
