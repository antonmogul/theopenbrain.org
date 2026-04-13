<script setup>
import { ref, computed, inject, onMounted } from "vue";
import { HIGHLIGHT_COLORS } from "@/composables/useHighlights";
import { useTrendingHighlights } from "@/composables/useTrendingHighlights";

defineProps({
  moduleId: {
    type: String,
    default: null,
  },
});

// Injected from ChapterView — shared state, no duplicate API calls
const highlightsCtx = inject("highlights", null);
const notesCtx = inject("notes", null);

const highlights = highlightsCtx?.highlights;
const notes = notesCtx?.notes;
const fetchNotes = notesCtx?.fetchNotes;
const createNote = notesCtx?.createNote;
const updateNote = notesCtx?.updateNote;
const deleteNote = notesCtx?.deleteNote;

// Trending highlights
const {
  trending,
  loading: trendingLoading,
  fetchTrending,
  scrollToHighlight: scrollToTrendingHighlight,
  formatRelativeTime,
  truncateText,
} = useTrendingHighlights({ limit: 10 });

// Sub-navigation state
const activeView = ref("highlights"); // "highlights" | "notes" | "trending"

// Color filter state — null means "show all"
const selectedColor = ref(null);

function toggleColorFilter(color) {
  selectedColor.value = selectedColor.value === color ? null : color;
}

// Filtered highlights based on selected color
const filteredHighlights = computed(() => {
  if (!highlights?.value) return [];
  if (!selectedColor.value) return highlights.value;
  return highlights.value.filter((h) => h.color === selectedColor.value);
});

// Notes UI state (migrated from NotesSidebar)
const isAddingNote = ref(false);
const newNoteContent = ref("");
const editingNoteId = ref(null);
const editNoteContent = ref("");
const deleteConfirmId = ref(null);

onMounted(() => {
  fetchTrending();
});

// === Highlight helpers ===
function scrollToHighlightInText(highlight) {
  const el = document.querySelector(`[data-paragraph-id="${highlight.paragraph_id}"]`);
  if (el) {
    // Account for fixed top bar (~50px) + some breathing room
    const topBarOffset = 60;
    const y = el.getBoundingClientRect().top + window.scrollY - topBarOffset;
    window.scrollTo({ top: y, behavior: "smooth" });
    // Brief flash effect
    el.classList.add("ring-2", "ring-violet-400", "bg-violet-50");
    setTimeout(() => el.classList.remove("ring-2", "ring-violet-400", "bg-violet-50"), 2000);
  }
}

function getColorBorder(color) {
  const map = {
    yellow: "#fcd34d",
    green: "#86efac",
    blue: "#93c5fd",
    pink: "#f9a8d4",
    purple: "#c4b5fd",
  };
  return map[color] || map.yellow;
}

// === Notes handlers (migrated from NotesSidebar) ===
function startNewNote() {
  isAddingNote.value = true;
  newNoteContent.value = "";
}

function cancelNewNote() {
  isAddingNote.value = false;
  newNoteContent.value = "";
}

async function saveNewNote() {
  if (!newNoteContent.value.trim() || !createNote) return;
  try {
    await createNote({ content: newNoteContent.value.trim() });
    cancelNewNote();
  } catch (e) {
    console.error("NotebookTab: Error saving note:", e);
  }
}

function startEditNote(note) {
  editingNoteId.value = note.id;
  editNoteContent.value = note.content;
}

function cancelEditNote() {
  editingNoteId.value = null;
  editNoteContent.value = "";
}

async function saveEditNote() {
  if (!editNoteContent.value.trim() || !editingNoteId.value || !updateNote) return;
  try {
    await updateNote(editingNoteId.value, editNoteContent.value.trim());
    cancelEditNote();
  } catch (e) {
    console.error("NotebookTab: Error updating note:", e);
  }
}

function confirmDeleteNote(noteId) {
  deleteConfirmId.value = noteId;
}

function cancelDelete() {
  deleteConfirmId.value = null;
}

async function executeDelete() {
  if (!deleteConfirmId.value || !deleteNote) return;
  try {
    await deleteNote(deleteConfirmId.value);
    deleteConfirmId.value = null;
  } catch (e) {
    console.error("NotebookTab: Error deleting note:", e);
  }
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
</script>

<template>
  <div class="notebook-tab">
    <!-- Sub-navigation pills -->
    <div class="sub-nav">
      <button
        class="pill"
        :class="{ active: activeView === 'highlights' }"
        @click="activeView = 'highlights'"
      >
        Highlights
        <span v-if="highlights?.length" class="badge">{{ highlights.length }}</span>
      </button>
      <button
        class="pill"
        :class="{ active: activeView === 'notes' }"
        @click="activeView = 'notes'"
      >
        Notes
        <span v-if="notes?.length" class="badge">{{ notes.length }}</span>
      </button>
      <button
        class="pill"
        :class="{ active: activeView === 'trending' }"
        @click="activeView = 'trending'"
      >
        Trending
      </button>
    </div>

    <!-- HIGHLIGHTS VIEW -->
    <div v-if="activeView === 'highlights'" class="view-content">
      <!-- Color filter dots -->
      <div v-if="highlights?.length" class="color-filter">
        <button
          class="color-dot-btn"
          :class="{ active: !selectedColor }"
          @click="selectedColor = null"
          title="All colors"
        >
          <span class="dot-all">All</span>
        </button>
        <button
          v-for="c in HIGHLIGHT_COLORS"
          :key="c.value"
          class="color-dot-btn"
          :class="{ active: selectedColor === c.value }"
          @click="toggleColorFilter(c.value)"
          :title="c.name"
        >
          <span class="color-dot" :style="{ backgroundColor: getColorBorder(c.value) }"></span>
        </button>
      </div>

      <div v-if="!highlights || highlights.length === 0" class="empty-state">
        <p class="empty-title">No highlights yet</p>
        <p class="empty-text">Select text in the chapter to create highlights</p>
      </div>
      <div v-else-if="filteredHighlights.length === 0" class="empty-state">
        <p class="empty-title">No {{ selectedColor }} highlights</p>
        <p class="empty-text">Try a different color filter</p>
      </div>
      <div v-else class="items-list">
        <div
          v-for="h in filteredHighlights"
          :key="h.id"
          class="highlight-item"
          @click="scrollToHighlightInText(h)"
        >
          <div
            class="color-border"
            :style="{ backgroundColor: getColorBorder(h.color) }"
          ></div>
          <div class="item-body">
            <p class="item-text">"{{ h.selected_text?.length > 120 ? h.selected_text.slice(0, 120) + '...' : h.selected_text }}"</p>
            <div v-if="h.tags?.length" class="tag-list">
              <span v-for="tag in h.tags" :key="tag" class="tag-chip">{{ tag }}</span>
            </div>
            <span class="item-date">{{ formatDate(h.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- NOTES VIEW -->
    <div v-if="activeView === 'notes'" class="view-content">
      <!-- Add note button -->
      <div class="add-note-section">
        <button @click="startNewNote" class="add-note-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Note
        </button>
      </div>

      <!-- New note editor -->
      <div v-if="isAddingNote" class="note-editor">
        <textarea
          v-model="newNoteContent"
          class="note-textarea"
          placeholder="Write your note..."
          rows="4"
          autofocus
        ></textarea>
        <div class="editor-actions">
          <button @click="cancelNewNote" class="btn-secondary">Cancel</button>
          <button
            @click="saveNewNote"
            :disabled="!newNoteContent.trim()"
            class="btn-primary"
          >Save</button>
        </div>
      </div>

      <!-- Notes list -->
      <div v-if="notes && notes.length > 0" class="items-list">
        <div v-for="note in notes" :key="note.id" class="note-card">
          <!-- Delete confirmation -->
          <div v-if="deleteConfirmId === note.id" class="delete-confirm">
            <p>Delete this note?</p>
            <div class="confirm-actions">
              <button @click="cancelDelete" class="btn-secondary">Cancel</button>
              <button @click="executeDelete" class="btn-danger">Delete</button>
            </div>
          </div>

          <template v-else>
            <!-- Linked highlight preview -->
            <div v-if="note.highlight" class="highlight-preview">
              <div
                class="color-border-sm"
                :style="{ backgroundColor: getColorBorder(note.highlight.color || 'yellow') }"
              ></div>
              <span class="preview-text">"{{ note.highlight.selected_text }}"</span>
            </div>

            <!-- Edit mode -->
            <div v-if="editingNoteId === note.id" class="note-editor inline">
              <textarea v-model="editNoteContent" class="note-textarea" rows="4"></textarea>
              <div class="editor-actions">
                <button @click="cancelEditNote" class="btn-secondary">Cancel</button>
                <button @click="saveEditNote" class="btn-primary">Save</button>
              </div>
            </div>

            <!-- View mode -->
            <template v-else>
              <p class="note-content">{{ note.content }}</p>
              <div class="note-footer">
                <span class="item-date">{{ formatDate(note.created_at) }}</span>
                <div class="note-actions">
                  <button @click="startEditNote(note)" class="action-btn">Edit</button>
                  <button @click="confirmDeleteNote(note.id)" class="action-btn danger">Delete</button>
                </div>
              </div>
            </template>
          </template>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="!isAddingNote && (!notes || notes.length === 0)" class="empty-state">
        <p class="empty-title">No notes yet</p>
        <p class="empty-text">Highlight text or click "Add Note" to get started</p>
      </div>
    </div>

    <!-- TRENDING VIEW -->
    <div v-if="activeView === 'trending'" class="view-content">
      <div v-if="trendingLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading trending...</p>
      </div>

      <div v-else-if="trending.length === 0" class="empty-state">
        <p class="empty-title">No trending highlights</p>
        <p class="empty-text">Be the first to highlight something!</p>
      </div>

      <div v-else class="items-list">
        <div
          v-for="item in trending"
          :key="item.id"
          class="trending-item"
          @click="scrollToTrendingHighlight(item)"
        >
          <p class="item-text">"{{ truncateText(item.selected_text, 100) }}"</p>
          <div class="trending-meta">
            <span class="people-count">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
              </svg>
              {{ item.highlight_count }} {{ item.highlight_count === 1 ? "person" : "people" }}
            </span>
            <span class="time-ago">{{ formatRelativeTime(item.last_highlighted_at) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notebook-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Sub-navigation pills */
.sub-nav {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  background: #fafafa;
}

.pill {
  flex: 1;
  padding: 8px 8px;
  background: none;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.pill:hover {
  background: #f3f4f6;
  color: #374151;
}

.pill.active {
  background: #ede9fe;
  color: #7c3aed;
}

.badge {
  font-size: 12px;
  background: #e5e7eb;
  color: #6b7280;
  padding: 1px 6px;
  border-radius: 10px;
  font-weight: 600;
}

.pill.active .badge {
  background: #c4b5fd;
  color: #5b21b6;
}

/* View content */
.view-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Color filter */
.color-filter {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f3f4f6;
}

.color-dot-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 2px solid transparent;
  background: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;
}

.color-dot-btn:hover {
  border-color: #d1d5db;
}

.color-dot-btn.active {
  border-color: #374151;
}

.dot-all {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
}

.color-dot-btn.active .dot-all {
  color: #374151;
}

.color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
}

/* Tag chips */
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 4px 0;
}

.tag-chip {
  display: inline-block;
  padding: 1px 8px;
  background: #ede9fe;
  color: #6d28d9;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

/* Highlight items */
.highlight-item {
  display: flex;
  gap: 10px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.highlight-item:hover {
  background: #f3f4f6;
  transform: translateX(2px);
}

.color-border {
  width: 3px;
  border-radius: 2px;
  flex-shrink: 0;
}

.color-border-sm {
  width: 3px;
  height: 100%;
  min-height: 16px;
  border-radius: 2px;
  flex-shrink: 0;
}

.item-body {
  flex: 1;
  min-width: 0;
}

.item-text {
  font-size: 14px;
  color: #374151;
  line-height: 1.5;
  margin: 0 0 4px 0;
  font-style: italic;
}

.item-date {
  font-size: 12px;
  color: #9ca3af;
}

/* Notes */
.add-note-section {
  margin-bottom: 12px;
}

.add-note-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.add-note-btn:hover {
  background: #2563eb;
}

.note-editor {
  background: #f0f9ff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.note-editor.inline {
  background: white;
  padding: 0;
  margin-top: 8px;
}

.note-textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 15px;
  resize: none;
  transition: border-color 0.15s;
}

.note-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 8px;
}

.btn-primary {
  padding: 6px 12px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-primary:hover { background: #2563eb; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-secondary {
  padding: 6px 12px;
  background: white;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-secondary:hover { background: #f3f4f6; }

.btn-danger {
  padding: 6px 12px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-danger:hover { background: #dc2626; }

.note-card {
  background: #f9fafb;
  border-radius: 8px;
  padding: 12px;
  transition: all 0.15s;
}

.note-card:hover {
  background: #f3f4f6;
}

.highlight-preview {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 8px;
  background: white;
  border-radius: 4px;
  margin-bottom: 8px;
  font-size: 14px;
  color: #6b7280;
  font-style: italic;
}

.preview-text {
  line-height: 1.4;
}

.note-content {
  font-size: 15px;
  color: #374151;
  line-height: 1.5;
  margin: 0;
  white-space: pre-wrap;
}

.note-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.note-actions {
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.15s;
}

.note-card:hover .note-actions {
  opacity: 1;
}

.action-btn {
  background: none;
  border: none;
  font-size: 12px;
  color: #6b7280;
  cursor: pointer;
  padding: 3px 6px;
  border-radius: 4px;
  transition: all 0.15s;
}

.action-btn:hover { background: #e5e7eb; color: #374151; }
.action-btn.danger:hover { background: #fef2f2; color: #ef4444; }

.delete-confirm {
  text-align: center;
  padding: 6px;
}

.delete-confirm p {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #374151;
}

.confirm-actions {
  display: flex;
  justify-content: center;
  gap: 6px;
}

/* Trending items */
.trending-item {
  padding: 12px;
  background: #fefce8;
  border: 1px solid #fef08a;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.trending-item:hover {
  background: #fef9c3;
  transform: translateX(2px);
}

.trending-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #6b7280;
  margin-top: 6px;
}

.people-count {
  display: flex;
  align-items: center;
  gap: 4px;
}

.people-count svg { opacity: 0.7; }

.time-ago { color: #9ca3af; }

/* Shared states */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  color: #9ca3af;
  text-align: center;
}

.empty-title {
  font-size: 16px;
  font-weight: 500;
  color: #6b7280;
  margin: 0 0 4px 0;
}

.empty-text {
  font-size: 14px;
  margin: 0;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px;
  color: #6b7280;
  font-size: 14px;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e7eb;
  border-top-color: #8b5cf6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 8px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
