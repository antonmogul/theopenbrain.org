<script setup>
// Highlight toolbar (#18 split): this parent owns the risky selection/
// positioning core — the Teleport + Transition shell, the floating position,
// the create-vs-edit mode coordination, the active-highlight watch, and the
// single-open-panel orchestration. Presentational sub-units (color picker,
// edit action bar, note/tag/delete panels) live in ./highlight-toolbar/ and
// take props in / emit intent out, mirroring the dashboard section-split
// pattern. The public contract (props + emits) is unchanged for ChapterView.
import { ref, watch } from "vue";
import CloseIcon from "@/icons/custom/CloseIcon.vue";
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
});

const emit = defineEmits([
  "highlight",
  "cancel",
  "update-highlight",
  "delete-highlight",
  "save-note",
]);

// Shared state
const isPublic = ref(false);

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
  },
);

watch(
  () => props.activeHighlight,
  (hl) => {
    if (hl) {
      noteContent.value = hl.note || "";
      localTags.value = [...(hl.tags || [])];
      isPublic.value = hl.is_public || false;
    } else {
      resetPanels();
    }
  },
  { immediate: true },
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
}

// === Create mode handlers ===

function onHighlight(color) {
  emit("highlight", {
    color,
    isPublic: isPublic.value,
    withNote: false,
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

function toggleNotePanel() {
  showNotePanel.value = !showNotePanel.value;
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

          <!-- Create mode actions -->
          <button
            v-else
            @click="onCancel"
            class="hl-action hl-action-cancel"
            title="Cancel"
          >
            <CloseIcon :width="16" :height="16" />
          </button>
        </div>

        <!-- Expandable panels (edit mode only) -->
        <template v-if="mode === 'edit'">
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

.hl-pill {
  background: rgb(var(--color-paper));
  border-radius: 10px;
  padding: 6px 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 4px 20px rgb(var(--color-ink) / 0.18),
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
.hl-action {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
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
