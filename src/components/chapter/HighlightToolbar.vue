<script setup>
import { ref, watch, nextTick } from "vue";
import { HIGHLIGHT_COLORS } from "@/composables/useHighlights";

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
const noteTextarea = ref(null);

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
  if (showNotePanel.value) {
    nextTick(() => noteTextarea.value?.focus());
  }
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
          <div class="hl-colors">
            <button
              v-for="color in HIGHLIGHT_COLORS"
              :key="color.value"
              @click="
                mode === 'edit'
                  ? onChangeColor(color.value)
                  : onHighlight(color.value)
              "
              class="hl-color-dot"
              :class="[
                `dot-${color.value}`,
                {
                  'dot-active':
                    mode === 'edit' &&
                    activeHighlight?.color === color.value,
                },
              ]"
              :title="color.name"
              :data-testid="`highlight-${color.value}`"
            >
              <!-- Checkmark for active color in edit mode -->
              <svg
                v-if="
                  mode === 'edit' &&
                  activeHighlight?.color === color.value
                "
                class="dot-check"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="2,6 5,9 10,3" />
              </svg>
            </button>
          </div>

          <!-- Divider -->
          <div class="hl-divider"></div>

          <!-- Edit mode actions -->
          <template v-if="mode === 'edit'">
            <!-- Note button -->
            <button
              @click="toggleNotePanel"
              class="hl-action"
              :class="{ 'hl-action-active': showNotePanel }"
              title="Add note"
              data-testid="edit-note-btn"
            >
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
                  d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5"
                />
                <path
                  d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                />
              </svg>
            </button>

            <!-- Tag button -->
            <button
              @click="toggleTagPanel"
              class="hl-action"
              :class="{ 'hl-action-active': showTagPanel }"
              title="Add tags"
              data-testid="edit-tag-btn"
            >
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
                  d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"
                />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
            </button>

            <!-- Delete button -->
            <button
              @click="toggleDeleteConfirm"
              class="hl-action hl-action-danger"
              :class="{ 'hl-action-active': showDeleteConfirm }"
              title="Delete highlight"
              data-testid="edit-delete-btn"
            >
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
                <polyline points="3 6 5 6 21 6" />
                <path
                  d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                />
              </svg>
            </button>

            <!-- Overflow menu -->
            <div class="hl-overflow-wrap">
              <button
                @click="toggleOverflowMenu"
                class="hl-action"
                title="More actions"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>

              <!-- Overflow dropdown -->
              <div v-if="showOverflowMenu" class="hl-dropdown">
                <button @click="copyText" class="hl-dropdown-item">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <rect
                      x="9"
                      y="9"
                      width="13"
                      height="13"
                      rx="2"
                      ry="2"
                    />
                    <path
                      d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                    />
                  </svg>
                  Copy text
                </button>
              </div>
            </div>
          </template>

          <!-- Create mode actions -->
          <template v-else>
            <button
              @click="onCancel"
              class="hl-action hl-action-cancel"
              title="Cancel"
            >
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
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </template>
        </div>

        <!-- Expandable panels (edit mode only) -->
        <template v-if="mode === 'edit'">
          <!-- Note panel -->
          <Transition name="panel">
            <div v-if="showNotePanel" class="hl-panel">
              <textarea
                ref="noteTextarea"
                v-model="noteContent"
                class="hl-textarea"
                placeholder="Write a note..."
                rows="3"
                data-testid="edit-note-textarea"
              ></textarea>
              <div class="hl-panel-actions">
                <button
                  @click="saveNote"
                  class="hl-btn-save"
                  data-testid="edit-note-save"
                >
                  Save
                </button>
              </div>
            </div>
          </Transition>

          <!-- Tag panel -->
          <Transition name="panel">
            <div v-if="showTagPanel" class="hl-panel">
              <div class="hl-tags-list">
                <span
                  v-for="(tag, i) in localTags"
                  :key="tag"
                  class="hl-tag-chip"
                >
                  {{ tag }}
                  <button
                    @click="removeTag(i)"
                    class="hl-tag-remove"
                    :data-testid="`remove-tag-${tag}`"
                  >
                    &times;
                  </button>
                </span>
                <input
                  v-model="tagInput"
                  @keydown="onTagKeydown"
                  class="hl-tag-input"
                  placeholder="Add tag..."
                  data-testid="edit-tag-input"
                />
              </div>
            </div>
          </Transition>

          <!-- Delete confirmation -->
          <Transition name="panel">
            <div v-if="showDeleteConfirm" class="hl-panel hl-panel-delete">
              <span class="hl-delete-text">Delete this highlight?</span>
              <div class="hl-panel-actions">
                <button
                  @click="showDeleteConfirm = false"
                  class="hl-btn-cancel"
                >
                  Cancel
                </button>
                <button
                  @click="confirmDelete"
                  class="hl-btn-delete"
                  data-testid="confirm-delete-btn"
                >
                  Delete
                </button>
              </div>
            </div>
          </Transition>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* === Dark pill toolbar (Readwise Reader style) === */
.hl-toolbar {
  position: absolute;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hl-pill {
  background: #1f2937;
  border-radius: 10px;
  padding: 6px 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.06);
}

/* Color dots */
.hl-colors {
  display: flex;
  align-items: center;
  gap: 4px;
}

.hl-color-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.12s ease, border-color 0.12s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.hl-color-dot:hover {
  transform: scale(1.15);
}

.hl-color-dot.dot-active {
  border-color: rgba(255, 255, 255, 0.8);
}

.dot-yellow  { background-color: #fcd34d; }
.dot-green   { background-color: #86efac; }
.dot-blue    { background-color: #93c5fd; }
.dot-pink    { background-color: #f9a8d4; }
.dot-purple  { background-color: #c4b5fd; }

.dot-check {
  width: 10px;
  height: 10px;
  color: #1f2937;
}

/* Divider */
.hl-divider {
  width: 1px;
  height: 20px;
  background: #374151;
  margin: 0 4px;
}

/* Action buttons */
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
  color: #9ca3af;
  transition: all 0.12s ease;
}

.hl-action:hover {
  background: #374151;
  color: #e5e7eb;
}

.hl-action-active {
  background: #374151;
  color: #60a5fa;
}

.hl-action-danger:hover {
  color: #f87171;
}

.hl-action-cancel:hover {
  color: #f87171;
}

/* Overflow menu */
.hl-overflow-wrap {
  position: relative;
}

.hl-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: #1f2937;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  min-width: 130px;
}

.hl-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: #d1d5db;
  font-size: 13px;
  font-family: "IBM Plex Sans", sans-serif;
  cursor: pointer;
  transition: background 0.1s;
}

.hl-dropdown-item:hover {
  background: #374151;
  color: #f3f4f6;
}

/* === Expandable panels === */
.hl-panel {
  background: #1f2937;
  border-radius: 10px;
  padding: 10px 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.hl-textarea {
  width: 100%;
  min-width: 260px;
  padding: 8px 10px;
  background: #111827;
  border: 1px solid #374151;
  border-radius: 6px;
  color: #e5e7eb;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 13px;
  resize: none;
  transition: border-color 0.15s;
}

.hl-textarea:focus {
  outline: none;
  border-color: #60a5fa;
}

.hl-textarea::placeholder {
  color: #6b7280;
}

.hl-panel-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 8px;
}

.hl-btn-save {
  padding: 4px 14px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 5px;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s;
}

.hl-btn-save:hover {
  background: #2563eb;
}

.hl-btn-cancel {
  padding: 4px 14px;
  background: transparent;
  color: #9ca3af;
  border: 1px solid #374151;
  border-radius: 5px;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.12s;
}

.hl-btn-cancel:hover {
  background: #374151;
  color: #d1d5db;
}

.hl-btn-delete {
  padding: 4px 14px;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 5px;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s;
}

.hl-btn-delete:hover {
  background: #b91c1c;
}

/* Tags */
.hl-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  min-width: 240px;
}

.hl-tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: #374151;
  color: #d1d5db;
  border-radius: 12px;
  font-size: 12px;
  font-family: "IBM Plex Sans", sans-serif;
}

.hl-tag-remove {
  width: 14px;
  height: 14px;
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.1s;
}

.hl-tag-remove:hover {
  background: #4b5563;
  color: #f87171;
}

.hl-tag-input {
  flex: 1;
  min-width: 80px;
  padding: 4px 8px;
  background: #111827;
  border: 1px solid #374151;
  border-radius: 6px;
  color: #e5e7eb;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 12px;
}

.hl-tag-input:focus {
  outline: none;
  border-color: #60a5fa;
}

.hl-tag-input::placeholder {
  color: #6b7280;
}

/* Delete confirmation */
.hl-panel-delete {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hl-delete-text {
  color: #f87171;
  font-size: 13px;
  font-family: "IBM Plex Sans", sans-serif;
  white-space: nowrap;
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
