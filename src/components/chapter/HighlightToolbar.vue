<script setup>
// Highlight toolbar (#18 split): this parent owns the risky selection/
// positioning core — the Teleport + Transition shell, the floating position,
// the create-vs-edit mode coordination, the active-highlight watch, and the
// single-open-panel orchestration. Presentational sub-units (color picker,
// edit action bar, note/tag/delete panels) live in ./highlight-toolbar/ and
// take props in / emit intent out, mirroring the dashboard section-split
// pattern. The public contract (props + emits) is unchanged for ChapterView.
//
// Sharing (OPENBRAIN-128): a new highlight is always private. On an existing
// one, "Share with readers" sets is_public through the same update-highlight
// event as a recolour; the database counts public highlights into
// trending_highlights (anonymously), which the chapter timeline shows. The
// switch is offered only to a signed-in reader, once the database has the
// migration that keeps a shared row private (useTrendingSharing).
import { ref, watch, useId } from "vue";
import CloseIcon from "@/icons/custom/CloseIcon.vue";
import Switch from "@/components/dashboard/shared/Switch.vue";
import { HIGHLIGHT_COLORS } from "@/composables/useHighlights";
import { useTrendingSharing } from "@/composables/useTrendingSharing";
import HighlightColorPicker from "@/components/chapter/highlight-toolbar/HighlightColorPicker.vue";
import HighlightActionBar from "@/components/chapter/highlight-toolbar/HighlightActionBar.vue";
import HighlightNotePanel from "@/components/chapter/highlight-toolbar/HighlightNotePanel.vue";
import HighlightTagPanel from "@/components/chapter/highlight-toolbar/HighlightTagPanel.vue";
import HighlightDeleteConfirm from "@/components/chapter/highlight-toolbar/HighlightDeleteConfirm.vue";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 }),
  },
  selection: {
    type: Object,
    default: null,
  },
  mode: {
    type: String,
    default: "create",
    validator: (v) => ["create", "edit"].includes(v),
  },
  activeHighlight: {
    type: Object,
    default: null,
  },
  /** The active highlight's note (a `notes` row), if it has one. */
  note: {
    type: Object,
    default: null,
  },
  /** Open straight on the note (the selection's "Note" button). */
  openNote: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  "highlight",
  "cancel",
  "update-highlight",
  "delete-highlight",
  "save-note",
]);

// Edit mode: the active highlight's sharing, updated as soon as it is toggled
// and put back if the save fails, with shareError saying so.
const isPublic = ref(false);
const shareError = ref("");
const shareId = useId();
let sharePicks = 0;
const { sharingReady } = useTrendingSharing();

// Edit mode panels
const showNotePanel = ref(false);
const showTagPanel = ref(false);
const showDeleteConfirm = ref(false);
const showOverflowMenu = ref(false);

// Note input
const noteContent = ref("");

// Tag input
const tagInput = ref("");
const localTags = ref([]);

// Reset panels when toolbar closes or mode changes
watch(
  () => props.visible,
  (isVisible) => {
    if (!isVisible) {
      resetPanels();
    }
  }
);

watch(
  () => props.activeHighlight,
  (hl) => {
    if (hl) {
      // Notes live in the notes table; highlights.note is the old column.
      noteContent.value = props.note?.content ?? hl.note ?? "";
      localTags.value = [...(hl.tags || [])];
      isPublic.value = hl.is_public || false;
      shareError.value = "";
      if (props.openNote) toggleNotePanel(true);
    } else {
      resetPanels();
    }
  },
  { immediate: true }
);
// The note row can arrive after the highlight (notes load separately).
watch(
  () => props.note,
  (note) => {
    if (props.activeHighlight && !showNotePanel.value)
      noteContent.value = note?.content ?? props.activeHighlight.note ?? "";
  }
);

function resetPanels() {
  showNotePanel.value = false;
  showTagPanel.value = false;
  showDeleteConfirm.value = false;
  showOverflowMenu.value = false;
  noteContent.value = "";
  tagInput.value = "";
  localTags.value = [];
  isPublic.value = false;
  shareError.value = "";
}

// === Create mode handlers ===

function onHighlight(color) {
  emit("highlight", {
    color,
    isPublic: false,
    withNote: false,
  });
}

// "Note" on a fresh selection: highlight it (in the first colour) and open
// the note, so a note does not need a highlight first (Stuart, 24 Sep;
// OPENBRAIN-103).
function onNote() {
  emit("highlight", {
    color: HIGHLIGHT_COLORS[0].value,
    isPublic: false,
    withNote: true,
  });
}

// Color-pick dispatcher: create mode highlights, edit mode recolors.
function onColorPick(color) {
  if (props.mode === "edit") {
    onChangeColor(color);
  } else {
    onHighlight(color);
  }
}

// === Edit mode handlers ===

function onChangeColor(color) {
  if (!props.activeHighlight) return;
  emit("update-highlight", {
    id: props.activeHighlight.id,
    updates: { color },
  });
}

// The column name, not createHighlight's isPublic: updateHighlight PATCHes
// `updates` as they are. ChapterView calls `done(saved)` once the PATCH
// settles: on a failure the switch goes back and says so, unless the reader
// has toggled again or moved to another highlight since (review of #119:
// it used to stay on while the highlight was still private).
function onSharePick(shared) {
  if (!props.activeHighlight) return;
  const id = props.activeHighlight.id;
  const pick = ++sharePicks;
  isPublic.value = shared;
  shareError.value = "";
  emit("update-highlight", {
    id,
    updates: { is_public: shared },
    done: (saved) => {
      if (saved || pick !== sharePicks || props.activeHighlight?.id !== id)
        return;
      isPublic.value = !shared;
      shareError.value = shared
        ? "Couldn't share this highlight. Try again."
        : "Couldn't stop sharing this highlight. Try again.";
    },
  });
}

function toggleNotePanel(force) {
  showNotePanel.value = force === true ? true : !showNotePanel.value;
  showTagPanel.value = false;
  showDeleteConfirm.value = false;
  showOverflowMenu.value = false;
}

function toggleTagPanel() {
  showTagPanel.value = !showTagPanel.value;
  showNotePanel.value = false;
  showDeleteConfirm.value = false;
  showOverflowMenu.value = false;
}

function saveNote() {
  if (!props.activeHighlight) return;
  const content = noteContent.value.trim();
  emit("save-note", {
    highlightId: props.activeHighlight.id,
    paragraphId: props.activeHighlight.paragraph_id,
    noteId: props.note?.id || null,
    content,
  });
  showNotePanel.value = false;
}

function addTag() {
  const tag = tagInput.value.trim().toLowerCase();
  if (!tag || localTags.value.includes(tag)) {
    tagInput.value = "";
    return;
  }
  localTags.value.push(tag);
  tagInput.value = "";
  saveTags();
}

function removeTag(index) {
  localTags.value.splice(index, 1);
  saveTags();
}

function saveTags() {
  if (!props.activeHighlight) return;
  emit("update-highlight", {
    id: props.activeHighlight.id,
    updates: { tags: [...localTags.value] },
  });
}

function onTagKeydown(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    addTag();
  }
}

function toggleDeleteConfirm() {
  showDeleteConfirm.value = !showDeleteConfirm.value;
  showNotePanel.value = false;
  showTagPanel.value = false;
  showOverflowMenu.value = false;
}

function confirmDelete() {
  if (!props.activeHighlight) return;
  emit("delete-highlight", props.activeHighlight.id);
  showDeleteConfirm.value = false;
}

function toggleOverflowMenu() {
  showOverflowMenu.value = !showOverflowMenu.value;
  showNotePanel.value = false;
  showTagPanel.value = false;
  showDeleteConfirm.value = false;
}

function copyText() {
  const text = props.activeHighlight?.selected_text;
  if (text) {
    navigator.clipboard.writeText(text);
  }
  showOverflowMenu.value = false;
}

function onCancel() {
  emit("cancel");
}
</script>

<template>
  <Teleport to="body">
    <Transition name="toolbar">
      <div
        v-if="visible"
        data-highlight-toolbar
        data-testid="highlight-toolbar"
        class="hl-toolbar"
        :class="{ 'is-above': position.above }"
        :style="{
          top: position.y + 'px',
          left: position.x + 'px',
        }"
        @mousedown.stop
      >
        <!-- Main pill bar -->
        <div class="hl-pill">
          <!-- Color dots -->
          <HighlightColorPicker
            :mode="mode"
            :active-color="activeHighlight?.color"
            @pick="onColorPick"
          />

          <!-- Divider -->
          <div class="hl-divider"></div>

          <!-- Edit mode actions -->
          <HighlightActionBar
            v-if="mode === 'edit'"
            :note-panel-active="showNotePanel"
            :tag-panel-active="showTagPanel"
            :delete-confirm-active="showDeleteConfirm"
            :overflow-open="showOverflowMenu"
            @toggle-note="toggleNotePanel"
            @toggle-tag="toggleTagPanel"
            @toggle-delete="toggleDeleteConfirm"
            @toggle-overflow="toggleOverflowMenu"
            @copy-text="copyText"
          />

          <!-- Create mode actions: a note straight away, or cancel -->
          <template v-else>
            <button
              type="button"
              class="hl-note-btn"
              title="Highlight and add a note"
              data-testid="create-note"
              @click="onNote"
            >
              Note
            </button>
            <button
              @click="onCancel"
              class="hl-action hl-action-cancel"
              title="Cancel"
            >
              <CloseIcon :width="16" :height="16" />
            </button>
          </template>
        </div>

        <!-- Expandable panels (edit mode only) -->
        <template v-if="mode === 'edit'">
          <!-- Sharing: by the pill unless another panel is open, once the
               database keeps shared rows private -->
          <div
            v-if="
              sharingReady &&
              !showNotePanel &&
              !showTagPanel &&
              !showDeleteConfirm
            "
            class="hl-share"
            data-testid="share-row"
          >
            <label
              :id="`${shareId}-label`"
              :for="shareId"
              class="hl-share-label"
            >
              Share with readers
            </label>
            <Switch
              :id="shareId"
              :checked="isPublic"
              :aria-labelledby="`${shareId}-label`"
              :aria-describedby="
                shareError
                  ? `${shareId}-help ${shareId}-error`
                  : `${shareId}-help`
              "
              class="hl-share-switch"
              data-testid="share-switch"
              @update:checked="onSharePick"
            />
            <p :id="`${shareId}-help`" class="hl-share-help">
              Counts toward Trending. Your name isn't shown.
            </p>
            <p
              v-if="shareError"
              :id="`${shareId}-error`"
              class="hl-share-error"
              role="alert"
              data-testid="share-error"
            >
              {{ shareError }}
            </p>
          </div>

          <!-- Note panel -->
          <Transition name="panel">
            <HighlightNotePanel
              v-if="showNotePanel"
              v-model:note="noteContent"
              @save="saveNote"
            />
          </Transition>

          <!-- Tag panel -->
          <Transition name="panel">
            <HighlightTagPanel
              v-if="showTagPanel"
              :tags="localTags"
              v-model:tag-input="tagInput"
              @remove="removeTag"
              @keydown="onTagKeydown"
            />
          </Transition>

          <!-- Delete confirmation -->
          <Transition name="panel">
            <HighlightDeleteConfirm
              v-if="showDeleteConfirm"
              @cancel="showDeleteConfirm = false"
              @confirm="confirmDelete"
            />
          </Transition>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* === Themed pill toolbar (Readwise Reader style) ===
   Chrome (surfaces, text, borders, hover, accent, destructive) is driven by
   brand.css tokens so the toolbar follows [data-theme] / [data-accent]. The
   highlight swatch colors are intentionally theme-fixed and bound inline from
   HIGHLIGHT_COLORS (single source) inside HighlightColorPicker. Sub-unit chrome
   (color dots, action buttons, panels) is scoped to each extracted child. */
.hl-toolbar {
  position: absolute;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* Above the passage (position.above, useTextSelection): `top` is the
   toolbar's bottom edge, and `translate` lifts it by its own rendered
   height (share row and any open panel included) so it never covers the
   passage. The pill stays nearest the passage; the rest stacks above it.
   `translate`, not `transform`, which the enter/leave transition sets. */
.hl-toolbar.is-above {
  flex-direction: column-reverse;
  translate: 0 -100%;
}

.hl-pill {
  background: rgb(var(--color-paper));
  border-radius: var(--radius-control);
  padding: 6px 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow:
    0 4px 20px rgb(var(--color-ink) / 0.18),
    0 0 0 1px rgb(var(--color-line));
}

/* Divider */
.hl-divider {
  width: 1px;
  height: 20px;
  background: rgb(var(--color-line));
  margin: 0 4px;
}

/* Create-mode cancel button (edit-mode actions live in HighlightActionBar). */
.hl-note-btn {
  height: 28px;
  padding: 0 0.625rem;
  border: 1px solid rgb(var(--color-line));
  border-radius: var(--radius-control);
  background: transparent;
  color: rgb(var(--color-ink));
  font: 0.75rem/1 var(--font-mono);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}
.hl-note-btn:hover {
  background: rgb(var(--color-ink) / 0.06);
}

.hl-action {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: var(--radius-control);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--color-mute));
  transition: all 0.12s ease;
}

.hl-action:hover {
  background: rgb(var(--color-ink) / 0.06);
  color: rgb(var(--color-ink));
}

.hl-action-cancel:hover {
  color: rgb(var(--color-warn));
}

/* Sharing row. width 0 + min-width 100% keeps it to the pill's width (the
   help text wraps instead of widening the toolbar); the label is the switch's
   name and a bigger tap target for it. */
.hl-share {
  width: 0;
  min-width: 100%;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  column-gap: 12px;
  row-gap: 2px;
  padding: 8px 12px 10px;
  background: rgb(var(--color-paper));
  border-radius: var(--radius-control);
  box-shadow:
    0 4px 16px rgb(var(--color-ink) / 0.16),
    0 0 0 1px rgb(var(--color-line));
}

.hl-share-label {
  min-height: 32px;
  display: flex;
  align-items: center;
  font-family: var(--font-ui);
  font-size: var(--ui-size-13);
  color: rgb(var(--color-ink));
  cursor: pointer;
}

.hl-share-help {
  grid-column: 1 / -1;
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--ui-size-11);
  line-height: 1.4;
  color: rgb(var(--color-mute));
}

/* A failed share: ink on paper with the warn mark, like the reader's
   progress save error (ChapterView .save-error). */
.hl-share-error {
  grid-column: 1 / -1;
  margin: 4px 0 0;
  padding-left: 8px;
  border-left: 3px solid rgb(var(--color-warn));
  font-family: var(--font-ui);
  font-size: var(--ui-size-11);
  font-weight: 600;
  line-height: 1.4;
  color: rgb(var(--color-ink));
}

.hl-share-switch:focus-visible {
  outline: 3px solid rgb(var(--color-accent));
  outline-offset: 2px;
}

/* === Transitions === */
.toolbar-enter-active,
.toolbar-leave-active {
  transition: all 0.15s ease;
}

.toolbar-enter-from,
.toolbar-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

.panel-enter-active,
.panel-leave-active {
  transition: all 0.15s ease;
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
