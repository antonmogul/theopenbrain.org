<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  highlight: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["save", "cancel"]);

const noteContent = ref("");

// Reset content when modal opens
watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) {
      noteContent.value = "";
    }
  }
);

function handleSave() {
  if (!noteContent.value.trim()) return;
  emit("save", noteContent.value.trim());
  noteContent.value = "";
}

function handleCancel() {
  noteContent.value = "";
  emit("cancel");
}

// Close on escape key
function handleKeydown(e) {
  if (e.key === "Escape") {
    handleCancel();
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="modal-overlay"
        @click.self="handleCancel"
        @keydown="handleKeydown"
      >
        <div class="modal-content" role="dialog" aria-modal="true">
          <div class="modal-header">
            <h3 class="modal-title">Add Note</h3>
            <button @click="handleCancel" class="close-btn">
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

          <!-- Highlight preview -->
          <div v-if="highlight?.selectedText" class="highlight-preview">
            <div class="preview-label">Highlighted text:</div>
            <div class="preview-text">"{{ highlight.selectedText }}"</div>
          </div>

          <div class="modal-body">
            <textarea
              v-model="noteContent"
              class="note-textarea"
              placeholder="Write your note about this highlight..."
              rows="5"
              autofocus
              data-testid="note-modal-textarea"
            ></textarea>
          </div>

          <div class="modal-footer">
            <button @click="handleCancel" class="btn-secondary">Cancel</button>
            <button
              @click="handleSave"
              :disabled="!noteContent.trim()"
              class="btn-primary"
              data-testid="save-highlight-note"
            >
              Save Note
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 1.125rem;
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

.highlight-preview {
  padding: 1rem 1.5rem;
  background: #fefce8;
  border-bottom: 1px solid #fef08a;
}

.preview-label {
  font-size: 0.75rem;
  color: #92400e;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.preview-text {
  font-size: 0.9375rem;
  color: #78350f;
  font-style: italic;
  line-height: 1.5;
}

.modal-body {
  padding: 1.5rem;
}

.note-textarea {
  width: 100%;
  padding: 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 0.9375rem;
  resize: none;
  transition: all 0.15s;
}

.note-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
  border-radius: 0 0 12px 12px;
}

.btn-primary {
  padding: 0.625rem 1.25rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 0.9375rem;
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
  padding: 0.625rem 1.25rem;
  background: white;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-secondary:hover {
  background: #f3f4f6;
  color: #374151;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95);
}
</style>
