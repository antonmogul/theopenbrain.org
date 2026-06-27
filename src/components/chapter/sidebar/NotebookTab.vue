<script setup>
import { ref, computed, inject, onMounted } from "vue";
import { HIGHLIGHT_COLORS, HIGHLIGHT_HEX } from "@/composables/useHighlights";
import { useTrendingHighlights } from "@/composables/useTrendingHighlights";
import { dateTime as formatDate } from "@/utils/format";
import { EmptyState, LoadingState, Button } from "@/components/dashboard/shared";

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
    // Brief flash effect (accent token, not legacy violet)
    el.classList.add("ob-flash");
    setTimeout(() => el.classList.remove("ob-flash"), 2000);
  }
}

function getColorBorder(color) {
  return HIGHLIGHT_HEX[color] || HIGHLIGHT_HEX.yellow;
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

      <EmptyState
        v-if="!highlights || highlights.length === 0"
        title="No highlights yet"
        message="Select text in the chapter to create highlights"
      />
      <EmptyState
        v-else-if="filteredHighlights.length === 0"
        :title="`No ${selectedColor} highlights`"
        message="Try a different color filter"
      />
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
          <Button variant="outline" size="sm" @click="cancelNewNote">Cancel</Button>
          <Button
            variant="solid"
            size="sm"
            :disabled="!newNoteContent.trim()"
            @click="saveNewNote"
          >Save</Button>
        </div>
      </div>

      <!-- Notes list -->
      <div v-if="notes && notes.length > 0" class="items-list">
        <div v-for="note in notes" :key="note.id" class="note-card">
          <!-- Delete confirmation -->
          <div v-if="deleteConfirmId === note.id" class="delete-confirm">
            <p>Delete this note?</p>
            <div class="confirm-actions">
              <Button variant="outline" size="sm" @click="cancelDelete">Cancel</Button>
              <Button variant="danger" size="sm" @click="executeDelete">Delete</Button>
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
                <Button variant="outline" size="sm" @click="cancelEditNote">Cancel</Button>
                <Button variant="solid" size="sm" @click="saveEditNote">Save</Button>
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
      <EmptyState
        v-if="!isAddingNote && (!notes || notes.length === 0)"
        title="No notes yet"
        message="Highlight text or click &quot;Add Note&quot; to get started"
      />
    </div>

    <!-- TRENDING VIEW -->
    <div v-if="activeView === 'trending'" class="view-content">
      <LoadingState v-if="trendingLoading" message="Loading trending…" />

      <EmptyState
        v-else-if="trending.length === 0"
        title="No trending highlights"
        message="Be the first to highlight something!"
      />

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
/* Notebook tab — matches prototype FloatingPanel notebook (tools.jsx):
   text sub-tabs with teal count badge, color-filter row, borderless highlight
   rows (3px color bar + italic-serif quote + mono date). Token-driven. */
.notebook-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: var(--font-body);
}

/* Sub-navigation — text tabs, not pills */
.sub-nav {
  display: flex;
  gap: 16px;
  padding: 12px 18px 0;
  border-bottom: 1px solid rgb(var(--color-line));
}

.pill {
  padding: 0 0 10px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  font-family: var(--font-mono);
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgb(var(--color-mute));
  cursor: pointer;
  transition: color 0.12s ease, border-color 0.12s ease;
  display: flex;
  align-items: center;
  gap: 5px;
}

.pill:hover {
  color: rgb(var(--color-ink));
}

.pill.active {
  color: rgb(var(--color-ink));
  border-bottom-color: rgb(var(--color-ink));
}

.badge {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  background: rgb(var(--color-complete));
  color: #0a3d33;
  padding: 1px 6px;
  border-radius: 999px;
}

/* View content */
.view-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 18px;
}

.items-list {
  display: flex;
  flex-direction: column;
}

/* Color filter */
.color-filter {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 -18px 0;
  padding: 12px 18px;
  border-bottom: 1px solid rgb(var(--color-line));
}

.color-dot-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1.5px solid transparent;
  background: none;
  border-radius: 50%;
  cursor: pointer;
  transition: border-color 0.12s ease;
  padding: 0;
}

.color-dot-btn:hover {
  border-color: rgb(var(--color-line));
}

.color-dot-btn.active {
  border-color: rgb(var(--color-ink));
}

.dot-all {
  font-family: var(--font-mono);
  font-size: 1rem;
  color: rgb(var(--color-mute));
}

.color-dot-btn.active .dot-all {
  color: rgb(var(--color-ink));
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
  margin: 0 0 6px;
}

.tag-chip {
  display: inline-block;
  padding: 1px 8px;
  background: rgb(var(--color-accent) / 0.12);
  color: rgb(var(--color-accent));
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* Highlight rows — borderless, hairline-separated, color bar + serif quote */
.highlight-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid rgb(var(--color-line));
  cursor: pointer;
  transition: padding-left 0.12s ease;
}

.highlight-item:hover {
  padding-left: 4px;
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
  font-size: 1.3rem;
  color: rgb(var(--color-ink));
  line-height: 1.5;
  margin: 0 0 6px 0;
  font-style: italic;
}

.item-date {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgb(var(--color-mute));
}

/* Notes */
.add-note-section {
  margin: 8px 0 12px;
}

.add-note-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  background: rgb(var(--color-ink));
  color: rgb(var(--color-paper));
  border: none;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: background 0.12s ease;
}

.add-note-btn:hover {
  background: rgb(var(--color-ink) / 0.85);
}

.note-editor {
  border: 1px solid rgb(var(--color-line));
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 12px;
}

.note-editor.inline {
  border: none;
  padding: 0;
  margin-top: 8px;
}

.note-textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid rgb(var(--color-line));
  border-radius: 4px;
  font-family: var(--font-body);
  font-size: 1.4rem;
  resize: none;
  transition: border-color 0.12s ease;
}

.note-textarea:focus {
  outline: none;
  border-color: rgb(var(--color-ink));
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 8px;
}

.note-card {
  padding: 14px 0;
  border-bottom: 1px solid rgb(var(--color-line));
}

.highlight-preview {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 8px;
  background: rgb(var(--color-bg));
  border-radius: 4px;
  margin-bottom: 8px;
  font-size: 1.3rem;
  color: rgb(var(--color-mute));
  font-style: italic;
}

.preview-text {
  line-height: 1.4;
}

.note-content {
  font-size: 1.4rem;
  color: rgb(var(--color-ink));
  line-height: 1.55;
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
  font-family: var(--font-mono);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--color-mute));
  cursor: pointer;
  padding: 3px 6px;
  border-radius: 4px;
  transition: color 0.12s ease;
}

.action-btn:hover { color: rgb(var(--color-ink)); }
.action-btn.danger:hover { color: rgb(var(--color-accent)); }

.delete-confirm {
  text-align: center;
  padding: 6px;
}

.delete-confirm p {
  margin: 0 0 8px 0;
  font-size: 1.3rem;
  color: rgb(var(--color-ink));
}

.confirm-actions {
  display: flex;
  justify-content: center;
  gap: 6px;
}

/* Trending rows — same austere treatment, no yellow card */
.trending-item {
  padding: 12px 0;
  border-bottom: 1px solid rgb(var(--color-line));
  cursor: pointer;
  transition: padding-left 0.12s ease;
}

.trending-item:hover {
  padding-left: 4px;
}

.trending-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-mono);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--color-mute));
  margin-top: 6px;
}

.people-count {
  display: flex;
  align-items: center;
  gap: 4px;
  color: rgb(var(--color-accent));
}

.people-count svg { opacity: 0.8; }

.time-ago { color: rgb(var(--color-mute)); }
</style>
