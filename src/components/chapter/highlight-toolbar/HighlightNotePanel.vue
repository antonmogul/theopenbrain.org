<script setup>
// HighlightToolbar sub-unit (#18 split): the note editor panel.
// Presentational — the note text is a two-way binding (v-model) the parent
// shares; Save emits `save`. The panel only mounts when the parent opens it
// (it lives behind v-if inside a <Transition>), so autofocusing the textarea
// on mount reproduces the parent's previous nextTick focus-on-open behavior.
import { onMounted, ref } from "vue";

const note = defineModel("note", { type: String, default: "" });
defineEmits(["save"]);

const noteTextarea = ref(null);

onMounted(() => {
  noteTextarea.value?.focus();
});
</script>

<template>
  <div class="hl-panel">
    <textarea
      ref="noteTextarea"
      v-model="note"
      class="hl-textarea"
      placeholder="Write a note..."
      rows="3"
      data-testid="edit-note-textarea"
    ></textarea>
    <div class="hl-panel-actions">
      <button
        @click="$emit('save')"
        class="hl-btn-save"
        data-testid="edit-note-save"
      >
        Save
      </button>
    </div>
  </div>
</template>

<style scoped>
.hl-panel {
  background: rgb(var(--color-paper));
  border-radius: 10px;
  padding: 10px 12px;
  box-shadow: 0 4px 16px rgb(var(--color-ink) / 0.16),
    0 0 0 1px rgb(var(--color-line));
}

.hl-textarea {
  width: 100%;
  min-width: 260px;
  padding: 8px 10px;
  background: rgb(var(--color-bg));
  border: 1px solid rgb(var(--color-line));
  border-radius: 6px;
  color: rgb(var(--color-ink));
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 13px;
  resize: none;
  transition: border-color 0.15s;
}

.hl-textarea:focus {
  outline: none;
  border-color: rgb(var(--color-accent));
}

.hl-textarea::placeholder {
  color: rgb(var(--color-mute));
}

.hl-panel-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 8px;
}

.hl-btn-save {
  padding: 4px 14px;
  background: rgb(var(--color-accent));
  color: rgb(var(--color-paper));
  border: none;
  border-radius: 5px;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s;
}

.hl-btn-save:hover {
  background: rgb(var(--color-accent) / 0.85);
}
</style>
