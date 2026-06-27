<script setup>
// HighlightToolbar sub-unit (#18 split): the delete-confirmation panel.
// Presentational — emits `cancel` (dismiss) and `confirm` (delete); the parent
// owns the actual delete + panel-visibility state.
defineEmits(["cancel", "confirm"]);
</script>

<template>
  <div class="hl-panel hl-panel-delete">
    <span class="hl-delete-text">Delete this highlight?</span>
    <div class="hl-panel-actions">
      <button @click="$emit('cancel')" class="hl-btn-cancel">Cancel</button>
      <button
        @click="$emit('confirm')"
        class="hl-btn-delete"
        data-testid="confirm-delete-btn"
      >
        Delete
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

.hl-panel-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 8px;
}

.hl-btn-cancel {
  padding: 4px 14px;
  background: transparent;
  color: rgb(var(--color-mute));
  border: 1px solid rgb(var(--color-line));
  border-radius: 5px;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.12s;
}

.hl-btn-cancel:hover {
  background: rgb(var(--color-ink) / 0.06);
  color: rgb(var(--color-ink));
}

.hl-btn-delete {
  padding: 4px 14px;
  background: rgb(var(--color-warn));
  color: rgb(var(--color-paper));
  border: none;
  border-radius: 5px;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s;
}

.hl-btn-delete:hover {
  background: rgb(var(--color-warn) / 0.85);
}

/* Delete confirmation */
.hl-panel-delete {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hl-delete-text {
  color: rgb(var(--color-warn));
  font-size: 13px;
  font-family: "IBM Plex Sans", sans-serif;
  white-space: nowrap;
}
</style>
