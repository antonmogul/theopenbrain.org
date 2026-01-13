<script setup>
import { ref, onMounted, watch } from "vue";
import { useNotes } from "@/composables/useNotes";

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  moduleId: {
    type: String,
    default: null,
  },
  sectionId: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(["close"]);

const { notes, loading, fetchNotes, createNote, updateNote, deleteNote } =
  useNotes({ moduleId: props.moduleId });

// UI State
const isAddingNote = ref(false);
const newNoteContent = ref("");
const editingNoteId = ref(null);
const editNoteContent = ref("");
const deleteConfirmId = ref(null);

// Fetch notes when sidebar opens
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      fetchNotes({ moduleId: props.moduleId, sectionId: props.sectionId });
    }
  }
);

onMounted(() => {
  if (props.isOpen) {
    fetchNotes({ moduleId: props.moduleId, sectionId: props.sectionId });
  }
});

// Add note actions
function startNewNote() {
  isAddingNote.value = true;
  newNoteContent.value = "";
}

function cancelNewNote() {
  isAddingNote.value = false;
  newNoteContent.value = "";
}

async function saveNewNote() {
  if (!newNoteContent.value.trim()) return;

  try {
    await createNote({
      content: newNoteContent.value.trim(),
      moduleId: props.moduleId,
      sectionId: props.sectionId,
    });
    cancelNewNote();
  } catch (e) {
    console.error("Error saving note:", e);
  }
}

// Edit note actions
function startEditNote(note) {
  editingNoteId.value = note.id;
  editNoteContent.value = note.content;
}

function cancelEditNote() {
  editingNoteId.value = null;
  editNoteContent.value = "";
}

async function saveEditNote() {
  if (!editNoteContent.value.trim() || !editingNoteId.value) return;

  try {
    await updateNote(editingNoteId.value, editNoteContent.value.trim());
    cancelEditNote();
  } catch (e) {
    console.error("Error updating note:", e);
  }
}

// Delete note actions
function confirmDeleteNote(noteId) {
  deleteConfirmId.value = noteId;
}

function cancelDelete() {
  deleteConfirmId.value = null;
}

async function executeDelete() {
  if (!deleteConfirmId.value) return;

  try {
    await deleteNote(deleteConfirmId.value);
    deleteConfirmId.value = null;
  } catch (e) {
    console.error("Error deleting note:", e);
  }
}

// Format date
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
  <Teleport to="body">
    <Transition name="sidebar">
      <aside
        v-if="isOpen"
        class="notes-sidebar"
        data-testid="notes-sidebar"
      >
        <!-- Header -->
        <div class="sidebar-header">
          <h2 class="sidebar-title">My Notes</h2>
          <button @click="$emit('close')" class="close-btn">
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
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Add note button -->
        <div class="add-note-section">
          <button
            @click="startNewNote"
            class="add-note-btn"
            data-testid="add-note-btn"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Note
          </button>
        </div>

        <!-- Notes list -->
        <div class="notes-list">
          <!-- Loading state -->
          <div v-if="loading" class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading notes...</p>
          </div>

          <!-- New note editor -->
          <div v-if="isAddingNote" class="note-editor">
            <textarea
              v-model="newNoteContent"
              class="note-textarea"
              placeholder="Write your note..."
              rows="4"
              autofocus
              data-testid="note-textarea"
            ></textarea>
            <div class="editor-actions">
              <button @click="cancelNewNote" class="btn-secondary">
                Cancel
              </button>
              <button
                @click="saveNewNote"
                :disabled="!newNoteContent.trim()"
                class="btn-primary"
                data-testid="save-note-btn"
              >
                Save
              </button>
            </div>
          </div>

          <!-- Existing notes -->
          <div
            v-for="note in notes"
            :key="note.id"
            class="note-card"
          >
            <!-- Delete confirmation -->
            <div v-if="deleteConfirmId === note.id" class="delete-confirm">
              <p>Delete this note?</p>
              <div class="confirm-actions">
                <button @click="cancelDelete" class="btn-secondary">
                  Cancel
                </button>
                <button @click="executeDelete" class="btn-danger">
                  Delete
                </button>
              </div>
            </div>

            <!-- Note content -->
            <template v-else>
              <!-- Linked highlight preview -->
              <div v-if="note.highlight" class="highlight-preview">
                <span
                  class="highlight-marker"
                  :class="`bg-${note.highlight.color || 'yellow'}-200`"
                ></span>
                <span class="highlight-text">
                  "{{ note.highlight.selected_text }}"
                </span>
              </div>

              <!-- Edit mode -->
              <div v-if="editingNoteId === note.id" class="note-editor inline">
                <textarea
                  v-model="editNoteContent"
                  class="note-textarea"
                  rows="4"
                ></textarea>
                <div class="editor-actions">
                  <button @click="cancelEditNote" class="btn-secondary">
                    Cancel
                  </button>
                  <button @click="saveEditNote" class="btn-primary">
                    Save
                  </button>
                </div>
              </div>

              <!-- View mode -->
              <template v-else>
                <p class="note-content">{{ note.content }}</p>
                <div class="note-footer">
                  <span class="note-date">{{ formatDate(note.created_at) }}</span>
                  <div class="note-actions">
                    <button @click="startEditNote(note)" class="action-btn">
                      Edit
                    </button>
                    <button
                      @click="confirmDeleteNote(note.id)"
                      class="action-btn danger"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </template>
            </template>
          </div>

          <!-- Empty state -->
          <div
            v-if="!loading && notes.length === 0 && !isAddingNote"
            class="empty-state"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5"
              ></path>
              <path
                d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
              ></path>
            </svg>
            <p class="empty-title">No notes yet</p>
            <p class="empty-text">
              Highlight text or click "Add Note" to get started
            </p>
          </div>
        </div>
      </aside>
    </Transition>

    <!-- Backdrop -->
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="sidebar-backdrop"
        @click="$emit('close')"
      ></div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.notes-sidebar {
  position: fixed;
  right: 0;
  top: 0;
  height: 100vh;
  width: 360px;
  background: white;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.sidebar-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 999;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.sidebar-title {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  transition: all 0.15s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.add-note-section {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #f3f4f6;
}

.add-note-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.add-note-btn:hover {
  background: #2563eb;
}

.notes-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.5rem;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #6b7280;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 0.5rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.note-editor {
  background: #f0f9ff;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.note-editor.inline {
  background: white;
  padding: 0;
  margin-top: 0.5rem;
}

.note-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 0.9375rem;
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
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.btn-primary {
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 0.5rem 1rem;
  background: white;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-secondary:hover {
  background: #f3f4f6;
  color: #374151;
}

.btn-danger {
  padding: 0.5rem 1rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-danger:hover {
  background: #dc2626;
}

.note-card {
  background: #f9fafb;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  transition: all 0.15s;
}

.note-card:hover {
  background: #f3f4f6;
}

.highlight-preview {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem;
  background: white;
  border-radius: 4px;
  border-left: 3px solid #fcd34d;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  color: #6b7280;
  font-style: italic;
}

.highlight-marker {
  width: 4px;
  height: 16px;
  border-radius: 2px;
  flex-shrink: 0;
}

.highlight-text {
  line-height: 1.4;
}

.note-content {
  font-size: 0.9375rem;
  color: #374151;
  line-height: 1.5;
  margin: 0;
  white-space: pre-wrap;
}

.note-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.75rem;
}

.note-date {
  font-size: 0.75rem;
  color: #9ca3af;
}

.note-actions {
  display: flex;
  gap: 0.5rem;
  opacity: 0;
  transition: opacity 0.15s;
}

.note-card:hover .note-actions {
  opacity: 1;
}

.action-btn {
  background: none;
  border: none;
  font-size: 0.75rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: all 0.15s;
}

.action-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

.action-btn.danger:hover {
  background: #fef2f2;
  color: #ef4444;
}

.delete-confirm {
  text-align: center;
  padding: 0.5rem;
}

.delete-confirm p {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  color: #374151;
}

.confirm-actions {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: #9ca3af;
  text-align: center;
}

.empty-state svg {
  margin-bottom: 1rem;
  color: #d1d5db;
}

.empty-title {
  font-size: 1rem;
  font-weight: 500;
  color: #6b7280;
  margin: 0 0 0.25rem 0;
}

.empty-text {
  font-size: 0.875rem;
  margin: 0;
}

/* Transitions */
.sidebar-enter-active,
.sidebar-leave-active {
  transition: transform 0.25s ease;
}

.sidebar-enter-from,
.sidebar-leave-to {
  transform: translateX(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Highlight color classes */
.bg-yellow-200 {
  background-color: #fef08a;
}
.bg-green-200 {
  background-color: #bbf7d0;
}
.bg-blue-200 {
  background-color: #bfdbfe;
}
.bg-pink-200 {
  background-color: #fbcfe8;
}
.bg-purple-200 {
  background-color: #ddd6fe;
}
</style>
