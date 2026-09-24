<script setup>
/*
 * Chapter block page — /dashboard/chapters/:slug (OPENBRAIN-60/61, plan
 * Phase 2).
 *
 * One roomy column per chapter: every paragraph row renders as the reader
 * shows it (BlockPreview: citations, figures, running widgets). Click a
 * block to edit it in place (ParagraphEditor, lossless schema); hover for
 * its toolbar (move, figure, image / widget settings, delete); the "+"
 * between blocks inserts text, a heading, a quote, a list, an image from
 * the library, or a widget. Every change saves straight to the chapter with
 * Undo; on a published chapter the first change asks once.
 */
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useChapterEditor } from "@/composables/useChapterEditor";
import BlockPreview from "@/components/chapterEditor/BlockPreview.vue";
import ParagraphEditor from "@/components/chapterEditor/ParagraphEditor.vue";
import InsertMenu from "@/components/chapterEditor/InsertMenu.vue";
import WidgetPicker from "@/components/chapterEditor/WidgetPicker.vue";
import MediaPicker from "@/components/chapterEditor/MediaPicker.vue";
import { placementsForChapter } from "@/widgets/placements";
import { coverForModule } from "@/helper/chapterCover";
import { imageUrl } from "@/editor/media.mjs";
import { planPlacementConversion } from "@/editor/placementsToBlocks";
import {
  StatusBadge,
  Button,
  ConfirmDialog,
  BaseModal,
  FormField,
  LoadingState,
  ErrorState,
} from "@/components/dashboard/shared";

const route = useRoute();
const ed = useChapterEditor(route.params.slug);

const editingId = ref(null);
const editError = ref("");
const toast = ref(null);
let toastTimer = null;

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
  toastTimer = setTimeout(() => (toast.value = null), undo ? 10000 : 6000);
}

// ---- published chapters ask once before the first change ----
const confirmedLive = ref(false);
const pendingAction = ref(null);
function whenLive(action) {
  if (isPublished.value && !confirmedLive.value) pendingAction.value = action;
  else action();
}
function confirmLive() {
  confirmedLive.value = true;
  const action = pendingAction.value;
  pendingAction.value = null;
  action?.();
}

async function attempt(fn, done) {
  try {
    await fn();
    if (done) showToast(done, { undo: true });
    return true;
  } catch (err) {
    console.error("Chapter editor:", err);
    showToast(err.message || "Couldn't save. Try again.", { error: true });
    return false;
  }
}

// ---- editing a block ----
function startEdit(p) {
  if (editingId.value === p.id) return;
  whenLive(() => {
    pendingInsert.value = null;
    editError.value = "";
    editingId.value = p.id;
  });
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

// ---- inserting ----
// Text-like blocks open in the editor first and are only created on Save,
// so cancelling leaves nothing behind.
const pendingInsert = ref(null); // { sectionId, index, blocks }
const STARTERS = {
  text: [{ type: "text", content: "" }],
  heading: [{ type: "heading", level: 3, content: "" }],
  quote: [{ type: "blockquote", content: "" }],
  list: [{ type: "list", ordered: false, items: [""] }],
  // A subsection heading: its text is the title in the contents list.
  subsection: [{ type: "text", content: "" }],
};
const pickerFor = ref(null); // { kind: "image"|"widget"|"figure"|"widget-edit", ... }

function onInsert(sectionId, index, type) {
  whenLive(() => {
    editingId.value = null;
    if (STARTERS[type]) {
      pendingInsert.value = {
        sectionId,
        index,
        blocks: STARTERS[type],
        kind: type,
      };
    } else {
      pickerFor.value = { kind: type, sectionId, index };
    }
  });
}

async function savePendingInsert(blocks) {
  const { sectionId, index, kind } = pendingInsert.value;
  editError.value = "";
  try {
    if (kind === "subsection") {
      const { adopted } = await ed.insertSubsection(sectionId, index, blocks);
      pendingInsert.value = null;
      showToast(
        adopted
          ? `Subsection added, with the ${adopted === 1 ? "block" : `${adopted} blocks`} below it. Use ← Out to take one out.`
          : "Subsection added. Use → In on the blocks that belong to it.",
        { undo: true }
      );
      return;
    }
    await ed.insertParagraph(sectionId, index, blocks);
    pendingInsert.value = null;
    showToast("Block added.", { undo: true });
  } catch (err) {
    console.error("Chapter editor insert failed:", err);
    editError.value = err.message || "Couldn't add the block. Try again.";
  }
}

async function onPickImage(m) {
  const { sectionId, index } = pickerFor.value;
  pickerFor.value = null;
  await attempt(
    () =>
      ed.insertParagraph(sectionId, index, [
        {
          type: "image",
          src: m.image_file_url,
          alt: m.title || "",
          caption: m.title || "",
        },
      ]),
    "Image added. Hover it for Image settings to change the caption."
  );
}

// ---- cover (OPENBRAIN-67) ----
const cover = computed(() => coverForModule(ed.module.value));
const coverIsDefault = computed(() => !ed.module.value?.cover_image_url);
const coverMediaId = computed(() => {
  const url = ed.module.value?.cover_image_url;
  return (
    (url &&
      ed.media.value.find(
        (m) => m.media_type === "image" && imageUrl(m.image_file_url) === url
      )?.id) ||
    null
  );
});
function chooseCover() {
  whenLive(() => (pickerFor.value = { kind: "cover" }));
}
async function applyCover(url, done) {
  pickerFor.value = null;
  await attempt(() => ed.setCover(url), done);
}
const onPickCover = (m) =>
  applyCover(imageUrl(m.image_file_url), `Cover set: ${m.title || "image"}.`);
function onUploadedCover({ media }) {
  ed.media.value = [...ed.media.value, media];
  applyCover(imageUrl(media.image_file_url), "Cover uploaded and set.");
}

async function onUploadedImage({ media, alt, caption }) {
  ed.media.value = [...ed.media.value, media];
  const { sectionId, index } = pickerFor.value;
  pickerFor.value = null;
  await attempt(
    () =>
      ed.insertParagraph(sectionId, index, [
        { type: "image", src: media.image_file_url, alt, caption },
      ]),
    "Image uploaded and added."
  );
}

async function onWidgetDone(block) {
  const target = pickerFor.value;
  pickerFor.value = null;
  if (target.kind === "widget-edit") {
    const p = ed.paragraphs.value.find((x) => x.id === target.paragraphId);
    const blocks = (p.content?.blocks || []).map((b, i) =>
      i === target.blockIndex ? block : b
    );
    await attempt(
      () => ed.saveBlocks(p.id, blocks, "Widget settings"),
      "Widget updated."
    );
  } else {
    await attempt(
      () => ed.insertParagraph(target.sectionId, target.index, [block]),
      "Widget added."
    );
  }
}

// ---- block toolbar ----
const widgetIndex = (p) =>
  (p.content?.blocks || []).findIndex((b) => b.type === "widget");
const imageIndex = (p) =>
  (p.content?.blocks || []).findIndex((b) => b.type === "image");

function editWidget(p) {
  whenLive(() => {
    const i = widgetIndex(p);
    pickerFor.value = {
      kind: "widget-edit",
      paragraphId: p.id,
      blockIndex: i,
      initial: p.content.blocks[i],
    };
  });
}

function move(p, dir) {
  whenLive(() =>
    attempt(
      () => ed.moveParagraph(p.id, dir),
      dir < 0 ? "Moved up." : "Moved down."
    )
  );
}

// ---- subsections (OPENBRAIN-70) ----
function shift(p, dir) {
  whenLive(async () => {
    try {
      const moved = await ed.shiftLevel(p.id, dir);
      showToast(
        dir > 0
          ? "Moved into the subsection."
          : moved > 1
            ? `Moved out of the subsection, with the ${moved - 1 === 1 ? "block" : `${moved - 1} blocks`} after it.`
            : "Moved out of the subsection.",
        { undo: true }
      );
    } catch (err) {
      console.error("Chapter editor:", err);
      showToast(err.message || "Couldn't save. Try again.", { error: true });
    }
  });
}
function ungroup(p) {
  whenLive(() =>
    attempt(
      () => ed.ungroupSubsection(p.id),
      "Subsection removed; its heading and blocks stay as ordinary text."
    )
  );
}

function chooseFigure(p) {
  whenLive(() => (pickerFor.value = { kind: "figure", paragraphId: p.id }));
}
async function onPickFigure(m) {
  const { paragraphId } = pickerFor.value;
  pickerFor.value = null;
  const p = ed.paragraphs.value.find((x) => x.id === paragraphId);
  await attempt(
    () => ed.setFigure(paragraphId, m.id, p?.animation_trigger || "auto"),
    `Figure set: ${m.title || m.animation_key}.`
  );
}
async function onRemoveFigure() {
  const { paragraphId } = pickerFor.value;
  pickerFor.value = null;
  await attempt(() => ed.setFigure(paragraphId, null), "Figure removed.");
}

// Image settings: alt text (required for the reader) and caption.
const imageForm = ref(null); // { paragraphId, blockIndex, alt, caption }
function editImage(p) {
  whenLive(() => {
    const i = imageIndex(p);
    const b = p.content.blocks[i];
    imageForm.value = {
      paragraphId: p.id,
      blockIndex: i,
      alt: b.alt || "",
      caption: b.caption || "",
    };
  });
}
async function saveImage() {
  const f = imageForm.value;
  const p = ed.paragraphs.value.find((x) => x.id === f.paragraphId);
  const blocks = p.content.blocks.map((b, i) =>
    i === f.blockIndex
      ? { ...b, alt: f.alt.trim(), caption: f.caption.trim() }
      : b
  );
  imageForm.value = null;
  await attempt(
    () => ed.saveBlocks(p.id, blocks, "Image settings"),
    "Image updated."
  );
}

const pendingDelete = ref(null);
function askDelete(p) {
  whenLive(() => (pendingDelete.value = p));
}
async function confirmDelete() {
  const p = pendingDelete.value;
  pendingDelete.value = null;
  if (editingId.value === p.id) editingId.value = null;
  await attempt(() => ed.deleteParagraph(p.id), "Block deleted.");
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

const rowsOf = (sectionId) => ed.paragraphsBySection.value.get(sectionId) || [];

// ---- sections (OPENBRAIN-62) ----
const renaming = ref(null); // { id, title }
function startRename(sec) {
  whenLive(() => (renaming.value = { id: sec.id, title: sec.title }));
}
async function saveRename() {
  const r = renaming.value;
  renaming.value = null;
  const title = r.title.trim();
  const current = ed.sections.value.find((x) => x.id === r.id)?.title;
  if (!title || title === current) return;
  await attempt(() => ed.renameSection(r.id, title), "Section renamed.");
}
function moveSec(sec, dir) {
  whenLive(() =>
    attempt(
      () => ed.moveSection(sec.id, dir),
      dir < 0 ? "Section moved up." : "Section moved down."
    )
  );
}
const newSection = ref(null); // { index, title }
function askAddSection(index) {
  whenLive(() => (newSection.value = { index, title: "" }));
}
async function saveNewSection() {
  const { index, title } = newSection.value;
  if (!title.trim()) return;
  newSection.value = null;
  const created = await attempt(
    () => ed.addSection(index, title.trim()),
    "Section added."
  );
  if (created)
    setTimeout(() => scrollToSection(ed.sections.value[index]?.id), 50);
}
function deleteSec(sec) {
  whenLive(() => attempt(() => ed.deleteSection(sec.id), "Section deleted."));
}

// ---- widgets still placed in code (src/widgets/placements.js) ----
const placementPlan = computed(() => {
  if (!ed.module.value) return { ready: [], unresolved: [] };
  const existing = new Set(
    ed.paragraphs.value.flatMap((p) =>
      (p.content?.blocks || [])
        .filter((b) => b.type === "widget")
        .map((b) => b.widgetId)
    )
  );
  return planPlacementConversion({
    placements: placementsForChapter(ed.module.value.slug),
    sections: ed.sections.value,
    rowsBySection: ed.paragraphsBySection.value,
    existingWidgetIds: existing,
  });
});
const converting = ref(false);
function convertPlacements() {
  whenLive(async () => {
    converting.value = true;
    const n = placementPlan.value.ready.length;
    await attempt(
      () => ed.convertPlacements(placementPlan.value.ready),
      `${n} widget${n === 1 ? " is" : "s are"} now blocks you can move and edit.`
    );
    converting.value = false;
  });
}
const excerpt = (p) =>
  (p.content_text || "this block").slice(0, 80) +
  ((p.content_text || "").length > 80 ? "…" : "");

onMounted(async () => {
  await ed.load();
  if (ed.module.value)
    document.title = `Edit · ${ed.module.value.title} · The Open Brain`;
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
        <button
          type="button"
          class="ce-toc-item ce-toc-add"
          @click="askAddSection(ed.sections.value.length)"
        >
          <span class="ce-toc-n">+</span>
          <span>Add section</span>
        </button>
      </nav>

      <main class="ce-main">
        <div v-if="placementPlan.ready.length" class="ce-banner" role="note">
          <p>
            <strong
              >{{ placementPlan.ready.length }} widget{{
                placementPlan.ready.length === 1 ? " is" : "s are"
              }}
              placed by code</strong
            >
            ({{ placementPlan.ready.map((r) => r.block.title).join(", ") }}), so
            {{ placementPlan.ready.length === 1 ? "it" : "they" }} can't be
            moved or edited here yet.
          </p>
          <Button
            variant="solid"
            size="sm"
            :loading="converting"
            @click="convertPlacements"
            >Make editable</Button
          >
        </div>

        <section class="ce-cover" aria-label="Cover image">
          <img :src="cover" alt="" class="ce-cover-img" />
          <div class="ce-cover-meta">
            <h2>Cover image</h2>
            <p>
              The full-screen image that opens the chapter{{
                coverIsDefault
                  ? ". This is the default; choose one to replace it."
                  : ", also shown on the chapter's card in the library."
              }}
            </p>
            <Button variant="outline" size="sm" @click="chooseCover"
              >Change cover</Button
            >
          </div>
        </section>

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
            <div class="ce-section-row">
              <span class="ce-section-n">Section {{ i + 1 }}</span>
              <span class="ce-spacer" />
              <div
                class="ce-sec-tools"
                role="toolbar"
                :aria-label="`Section: ${s.title}`"
              >
                <button type="button" @click="startRename(s)">Rename</button>
                <button
                  type="button"
                  aria-label="Move section up"
                  :disabled="i === 0"
                  @click="moveSec(s, -1)"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Move section down"
                  :disabled="i === ed.sections.value.length - 1"
                  @click="moveSec(s, 1)"
                >
                  ↓
                </button>
                <button
                  v-if="!rowsOf(s.id).length"
                  type="button"
                  class="is-danger"
                  @click="deleteSec(s)"
                >
                  Delete
                </button>
              </div>
            </div>
            <form
              v-if="renaming?.id === s.id"
              class="ce-rename"
              @submit.prevent="saveRename"
            >
              <input
                :id="`rename-${s.id}`"
                v-model="renaming.title"
                type="text"
                aria-label="Section title"
                @keydown.esc="renaming = null"
                @vue:mounted="({ el }) => el.focus()"
              />
              <Button variant="solid" size="sm" @click="saveRename"
                >Save</Button
              >
              <Button variant="ghost" size="sm" @click="renaming = null"
                >Cancel</Button
              >
            </form>
            <h2 v-else>{{ s.title }}</h2>
          </header>

          <template v-for="(p, pi) in rowsOf(s.id)" :key="p.id">
            <!-- A new block being written before paragraph pi -->
            <div
              v-if="
                pendingInsert &&
                pendingInsert.sectionId === s.id &&
                pendingInsert.index === pi
              "
              class="ce-block is-editing"
            >
              <ParagraphEditor
                :blocks="pendingInsert.blocks"
                :saving="ed.saving.value"
                :error="editError"
                @save="savePendingInsert"
                @cancel="pendingInsert = null"
              />
            </div>
            <InsertMenu
              v-else
              :label="`Add a block before: ${excerpt(p)}`"
              @choose="(t) => onInsert(s.id, pi, t)"
            />

            <div
              class="ce-block"
              :class="{
                'is-editing': editingId === p.id,
                'is-sub':
                  (p.subsection_level || 0) > 0 && !p.is_subsection_header,
                'is-sub2': (p.subsection_level || 0) > 1,
                'is-subhead': p.is_subsection_header,
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
              <template v-else>
                <div
                  class="ce-block-view"
                  role="button"
                  tabindex="0"
                  :aria-label="`Edit: ${excerpt(p)}`"
                  @click="startEdit(p)"
                  @keydown.enter.self.prevent="startEdit(p)"
                >
                  <BlockPreview
                    :paragraph="p"
                    :media-by-id="ed.mediaById.value"
                  />
                </div>
                <div
                  class="ce-tools"
                  role="toolbar"
                  :aria-label="`Block: ${excerpt(p)}`"
                >
                  <button type="button" title="Edit" @click="startEdit(p)">
                    Edit
                  </button>
                  <button
                    type="button"
                    title="Move up"
                    aria-label="Move up"
                    :disabled="pi === 0"
                    @click="move(p, -1)"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    title="Move down"
                    aria-label="Move down"
                    :disabled="pi === rowsOf(s.id).length - 1"
                    @click="move(p, 1)"
                  >
                    ↓
                  </button>
                  <button
                    v-if="p.is_subsection_header"
                    type="button"
                    title="Turn this subsection back into ordinary blocks"
                    @click="ungroup(p)"
                  >
                    Ungroup
                  </button>
                  <template v-else>
                    <button
                      v-if="ed.canIndent(p.id)"
                      type="button"
                      title="Move into the subsection above"
                      @click="shift(p, 1)"
                    >
                      → In
                    </button>
                    <button
                      v-if="(p.subsection_level || 0) > 0"
                      type="button"
                      title="Move out of the subsection"
                      @click="shift(p, -1)"
                    >
                      ← Out
                    </button>
                  </template>
                  <button type="button" @click="chooseFigure(p)">
                    {{ p.animation_id ? "Figure…" : "+ Figure" }}
                  </button>
                  <button
                    v-if="imageIndex(p) >= 0"
                    type="button"
                    @click="editImage(p)"
                  >
                    Image settings
                  </button>
                  <button
                    v-if="widgetIndex(p) >= 0"
                    type="button"
                    @click="editWidget(p)"
                  >
                    Widget settings
                  </button>
                  <button type="button" class="is-danger" @click="askDelete(p)">
                    Delete
                  </button>
                </div>
              </template>
            </div>
          </template>

          <!-- End of the section: a new block after the last paragraph -->
          <div
            v-if="
              pendingInsert &&
              pendingInsert.sectionId === s.id &&
              pendingInsert.index === rowsOf(s.id).length
            "
            class="ce-block is-editing"
          >
            <ParagraphEditor
              :blocks="pendingInsert.blocks"
              :saving="ed.saving.value"
              :error="editError"
              @save="savePendingInsert"
              @cancel="pendingInsert = null"
            />
          </div>
          <InsertMenu
            v-else
            :label="`Add a block at the end of ${s.title}`"
            @choose="(t) => onInsert(s.id, rowsOf(s.id).length, t)"
          />
          <p v-if="!rowsOf(s.id).length" class="ce-empty">
            No paragraphs in this section yet. Use + to add one.
          </p>
        </section>
        <form
          v-if="newSection"
          class="ce-rename ce-new-section"
          @submit.prevent="saveNewSection"
        >
          <input
            id="new-section-title"
            v-model="newSection.title"
            type="text"
            placeholder="New section title"
            aria-label="New section title"
            @keydown.esc="newSection = null"
            @vue:mounted="({ el }) => el.focus()"
          />
          <Button
            variant="solid"
            size="sm"
            :disabled="!newSection.title.trim()"
            @click="saveNewSection"
            >Add section</Button
          >
          <Button variant="ghost" size="sm" @click="newSection = null"
            >Cancel</Button
          >
        </form>
        <button
          v-else
          type="button"
          class="ce-add-section"
          @click="askAddSection(ed.sections.value.length)"
        >
          + Add section
        </button>
      </main>
    </div>

    <ConfirmDialog
      :model-value="!!pendingAction"
      title="Change a published chapter?"
      confirm-label="Continue"
      variant="warn"
      @update:model-value="(open) => !open && (pendingAction = null)"
      @confirm="confirmLive"
    >
      <strong>{{ ed.module.value?.title }}</strong> is published, so saved
      changes reach readers straight away. Each one can be undone. Drafts, which
      hold changes back until you publish them, come in a later phase.
    </ConfirmDialog>

    <ConfirmDialog
      :model-value="!!pendingDelete"
      title="Delete this block?"
      confirm-label="Delete block"
      @update:model-value="(open) => !open && (pendingDelete = null)"
      @confirm="confirmDelete"
    >
      “{{ pendingDelete && excerpt(pendingDelete) }}” is removed from the
      chapter. Readers' highlights and notes on it are deleted too. Undo brings
      the block back, but not their highlights.
    </ConfirmDialog>

    <WidgetPicker
      :open="pickerFor?.kind === 'widget' || pickerFor?.kind === 'widget-edit'"
      :initial="pickerFor?.kind === 'widget-edit' ? pickerFor.initial : null"
      :chapter-slug="ed.module.value?.slug || ''"
      @done="onWidgetDone"
      @close="pickerFor = null"
    />

    <MediaPicker
      :open="pickerFor?.kind === 'image'"
      :media="ed.media.value"
      :types="['image']"
      title="Add an image"
      :upload-slug="ed.module.value?.slug || ''"
      @pick="onPickImage"
      @uploaded="onUploadedImage"
      @close="pickerFor = null"
    />

    <MediaPicker
      :open="pickerFor?.kind === 'cover'"
      :media="ed.media.value"
      :types="['image']"
      title="Choose the chapter's cover"
      :current-id="coverIsDefault ? null : coverMediaId || 'custom'"
      remove-label="Use the default cover"
      :upload-slug="ed.module.value?.slug || ''"
      @pick="onPickCover"
      @uploaded="onUploadedCover"
      @remove="applyCover(null, 'Cover reset to the default.')"
      @close="pickerFor = null"
    />

    <MediaPicker
      :open="pickerFor?.kind === 'figure'"
      :media="ed.media.value"
      :types="['lottie', 'video', 'youtube']"
      title="Choose this paragraph's figure"
      :current-id="
        pickerFor?.kind === 'figure'
          ? ed.paragraphs.value.find((x) => x.id === pickerFor.paragraphId)
              ?.animation_id || null
          : null
      "
      @pick="onPickFigure"
      @remove="onRemoveFigure"
      @close="pickerFor = null"
    />

    <BaseModal
      :model-value="!!imageForm"
      title="Image settings"
      size="md"
      @update:model-value="(v) => !v && (imageForm = null)"
      @close="imageForm = null"
    >
      <form v-if="imageForm" class="ce-form" @submit.prevent="saveImage">
        <FormField
          label="Alt text"
          hint="Describe the image for people who can't see it. Required."
        >
          <input id="img-alt" v-model="imageForm.alt" type="text" required />
        </FormField>
        <FormField label="Caption" hint="Shown under the image in the reader.">
          <textarea id="img-caption" v-model="imageForm.caption" rows="3" />
        </FormField>
      </form>
      <template #footer>
        <Button variant="ghost" size="sm" @click="imageForm = null"
          >Cancel</Button
        >
        <Button
          variant="solid"
          size="sm"
          :disabled="!imageForm?.alt.trim()"
          @click="saveImage"
          >Save</Button
        >
      </template>
    </BaseModal>

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
.ce-cover {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border: 1px solid rgb(var(--color-line));
  border-radius: 10px;
  background: rgb(var(--color-paper));
}
.ce-cover-img {
  width: 200px;
  max-width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  border-radius: 6px;
  background: rgb(var(--color-bg));
}
.ce-cover-meta {
  flex: 1 1 240px;
  display: grid;
  gap: 6px;
  justify-items: start;
  font-family: var(--font-ui);
}
.ce-cover-meta h2 {
  margin: 0;
  font-size: 1rem;
}
.ce-cover-meta p {
  margin: 0;
  font-size: 0.875rem;
  color: rgb(var(--color-mute));
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
/* Blocks inside a subsection hang off a rule from its heading (OPENBRAIN-70). */
.ce-block.is-subhead {
  margin-top: 12px;
}
.ce-block.is-subhead::before {
  content: "Subsection";
  display: block;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--color-accent));
}
.ce-block.is-sub {
  margin-left: 12px;
  padding-left: 14px;
  border-left: 2px solid rgb(var(--color-accent) / 0.35);
}
.ce-block.is-sub2 {
  margin-left: 32px;
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
.ce-block {
  display: grid;
}
.ce-tools {
  position: absolute;
  top: -14px;
  right: -8px;
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 3px;
  border: 1px solid rgb(var(--color-line));
  border-radius: 999px;
  background: rgb(var(--color-paper));
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.06);
  opacity: 0;
  transform: translateY(-2px);
  transition: opacity 0.12s ease;
  pointer-events: none;
}
.ce-block:hover .ce-tools,
.ce-block:focus-within .ce-tools {
  opacity: 1;
  pointer-events: auto;
}
.ce-tools button {
  padding: 3px 9px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgb(var(--color-ink));
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}
.ce-tools button:hover:not(:disabled),
.ce-tools button:focus-visible {
  background: rgb(var(--color-line));
  outline: none;
}
.ce-tools button:disabled {
  opacity: 0.35;
  cursor: default;
}
.ce-tools .is-danger {
  color: rgb(var(--color-accent));
}
.ce-section-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ce-sec-tools {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.12s ease;
}
.ce-section-head:hover .ce-sec-tools,
.ce-section-head:focus-within .ce-sec-tools {
  opacity: 1;
}
.ce-sec-tools button {
  padding: 3px 9px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgb(var(--color-ink));
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}
.ce-sec-tools button:hover:not(:disabled),
.ce-sec-tools button:focus-visible {
  background: rgb(var(--color-line));
  outline: none;
}
.ce-sec-tools button:disabled {
  opacity: 0.35;
}
.ce-sec-tools .is-danger {
  color: rgb(var(--color-accent));
}
.ce-rename {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.ce-rename input {
  flex: 1 1 18rem;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid rgb(var(--color-accent) / 0.5);
  border-radius: 6px;
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  font-family: var(--font-ui);
  font-size: 1.25rem;
  font-weight: 600;
}
.ce-rename input:focus-visible {
  outline: 2px solid rgb(var(--color-accent));
  outline-offset: 1px;
}
.ce-add-section {
  justify-self: start;
  padding: 10px 16px;
  border: 1px dashed rgb(var(--color-line));
  border-radius: 8px;
  background: transparent;
  color: rgb(var(--color-mute));
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}
.ce-add-section:hover,
.ce-add-section:focus-visible {
  border-color: rgb(var(--color-accent));
  color: rgb(var(--color-accent));
  outline: none;
}
.ce-toc-add {
  margin-top: 6px;
  color: rgb(var(--color-mute));
}
.ce-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
  padding: 12px 14px;
  border: 1px solid rgb(var(--color-accent) / 0.35);
  border-radius: 8px;
  background: rgb(var(--color-accent) / 0.06);
  font-family: var(--font-ui);
  font-size: 0.875rem;
}
.ce-banner p {
  flex: 1 1 20rem;
  margin: 0;
}
.ce-form {
  display: grid;
  gap: 14px;
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
